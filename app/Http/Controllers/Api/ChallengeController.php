<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Batch;
use App\Models\BatchRoomAccess;
use App\Models\Challenge;
use App\Models\ChallengeAttempt;
use App\Models\Module;
use App\Models\Progress;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ChallengeController extends Controller
{
    public function submit(Request $request, Challenge $challenge)
    {
        $data = $request->validate([
            'answer'     => ['present'],
            'time_taken' => ['nullable', 'numeric'],
        ]);

        $user      = $request->user();
        $timeTaken = (float) ($data['time_taken'] ?? 0);
        $answer    = $data['answer'] ?? null;
        $module    = $challenge->module;

        // determine test mode: batch-level OR this specific room's attempts exhausted
        $batchTestMode = $user->batch
            ? (bool) Batch::where('name', $user->batch)->value('test_mode')
            : false;

        $testMode = $batchTestMode;
        if (! $testMode && $user->batch) {
            $maxAttempts = BatchRoomAccess::where('batch', $user->batch)
                ->where('module_id', $module->id)
                ->value('max_attempts');
            if ($maxAttempts !== null) {
                $used     = (int) Progress::where('user_id', $user->id)
                    ->where('module_id', $module->id)
                    ->value('attempts');
                // attempts is incremented by startAttempt before first submit;
                // > max means they've gone past the limit (entering practice mode)
                $testMode = $used > $maxAttempts;
            }
        }

        $timedOut = $timeTaken >= $challenge->time_limit;
        $correct  = ! $timedOut && $challenge->grade($answer);

        $pointsAwarded = 0;
        if ($correct) {
            $remaining     = max(0, $challenge->time_limit - $timeTaken);
            $bonus         = (int) round(($remaining / max(1, $challenge->time_limit)) * ($challenge->points * 0.3));
            $pointsAwarded = $challenge->points + $bonus;
        }

        $result = DB::transaction(function () use ($user, $challenge, $module, $correct, $pointsAwarded, $testMode) {
            // always record attempt for personal feedback
            $attempt = ChallengeAttempt::firstOrNew([
                'user_id'      => $user->id,
                'challenge_id' => $challenge->id,
            ]);
            if (! $attempt->exists || $pointsAwarded > $attempt->points) {
                $attempt->points  = $pointsAwarded;
                $attempt->correct = $correct || $attempt->correct;
                $attempt->save();
            }

            $lastId          = Challenge::where('module_id', $module->id)->orderByDesc('order')->value('id');
            $moduleCompleted = $challenge->id === $lastId;
            $nextRoomUnlocked = false;

            if ($moduleCompleted) {
                $challengeIds = Challenge::where('module_id', $module->id)->pluck('id');
                $roomScore    = (int) ChallengeAttempt::where('user_id', $user->id)
                    ->whereIn('challenge_id', $challengeIds)
                    ->sum('points');

                $progress = Progress::firstOrNew([
                    'user_id'   => $user->id,
                    'module_id' => $module->id,
                ]);
                $wasCompleted = (bool) $progress->completed;

                if (! $progress->exists) {
                    $progress->score     = 0;
                    $progress->completed = false;
                    $progress->attempts  = 0;
                }

                // test mode: don't update leaderboard score
                $progress->score     = $testMode ? $progress->score : max((int) $progress->score, $roomScore);
                $progress->completed = true;
                $progress->save();

                $next             = Module::where('sequence', '>', $module->sequence)->orderBy('sequence')->first();
                $nextRoomUnlocked = $next !== null && ! $wasCompleted;
            }

            return compact('moduleCompleted', 'nextRoomUnlocked');
        });

        return response()->json([
            'correct'            => $correct,
            'timed_out'          => $timedOut,
            'points_awarded'     => $pointsAwarded,
            'correct_answer'     => $challenge->correctDisplay(),
            'hint'               => $challenge->hint,
            'module_completed'   => $result['moduleCompleted'],
            'next_room_unlocked' => $result['nextRoomUnlocked'],
            'test_mode'          => $testMode,
        ]);
    }
}
