<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Batch;
use App\Models\BatchRoomAccess;
use App\Models\Module;
use App\Models\Progress;
use Illuminate\Http\Request;

class RoomController extends Controller
{
    public function index(Request $request)
    {
        $user     = $request->user();
        $modules  = Module::withCount('challenges')->orderBy('sequence')->get();
        $progress = $user->progress()->get()->keyBy('module_id');

        $batchIds      = $this->batchModuleIds($user);
        $accessMap     = $this->batchAccessMap($user);
        $batchTestMode = $this->isBatchTestMode($user);

        if ($batchIds !== null) {
            $modules = $modules->whereIn('id', $batchIds)->values();
        }

        $prevCompleted = true;
        $rooms = $modules->map(function (Module $m) use (&$prevCompleted, $progress, $user, $accessMap, $batchTestMode) {
            $p           = $progress->get($m->id);
            $completed   = (bool) ($p->completed ?? false);
            $score       = (int) ($p->score ?? 0);
            $attempts    = (int) ($p->attempts ?? 0);
            $maxAttempts = $accessMap[$m->id] ?? null;
            // exhausted when attempts exceed limit; on the last valid attempt (attempts == limit) room is still normal
            $exhausted   = $maxAttempts !== null && $attempts > $maxAttempts;
            $roomTestMode = $batchTestMode || $exhausted;

            $unlocked      = $prevCompleted || $user->isAdmin();
            $prevCompleted = $completed;

            return [
                'id'              => $m->id,
                'sequence'        => $m->sequence,
                'title'           => $m->title,
                'type'            => $m->type,
                'icon'            => $m->icon,
                'blurb'           => $m->blurb,
                'challenge_count' => $m->challenges_count,
                'unlocked'        => $unlocked,
                'completed'       => $completed,
                'score'           => $score,
                'attempts'        => $attempts,
                'max_attempts'    => $maxAttempts,
                'exhausted'       => $exhausted,
                'test_mode'       => $roomTestMode,
            ];
        });

        return response()->json(['rooms' => $rooms->values(), 'test_mode' => $batchTestMode]);
    }

    public function show(Request $request, Module $module)
    {
        $user = $request->user();

        if (! $user->isAdmin() && ! $this->isUnlocked($user, $module)) {
            return response()->json(['message' => 'Clear the previous room first.'], 403);
        }

        // exhausted rooms are still enterable — they go into practice mode (no score saved)
        $accessMap   = $this->batchAccessMap($user);
        $maxAttempts = $accessMap[$module->id] ?? null;
        $attempts    = $maxAttempts !== null
            ? (int) $user->progress()->where('module_id', $module->id)->value('attempts')
            : 0;
        $exhausted    = $maxAttempts !== null && $attempts > $maxAttempts;
        $roomTestMode = $this->isBatchTestMode($user) || $exhausted;

        $module->load('challenges');

        return response()->json([
            'module'       => $module->toPublicArray(),
            'challenges'   => $module->challenges->map->toPublicArray()->values(),
            'test_mode'    => $roomTestMode,
            'exhausted'    => $exhausted,
            'attempts'     => $attempts,
            'max_attempts' => $maxAttempts,
        ]);
    }

    public function startAttempt(Request $request, Module $module)
    {
        $user = $request->user();

        $progress = Progress::firstOrNew([
            'user_id'   => $user->id,
            'module_id' => $module->id,
        ]);

        if (! $progress->exists) {
            $progress->score     = 0;
            $progress->completed = false;
        }

        $progress->attempts = ($progress->attempts ?? 0) + 1;
        $progress->save();

        return response()->json(['attempts' => $progress->attempts]);
    }

    private function batchModuleIds($user): ?\Illuminate\Support\Collection
    {
        if (! $user->batch) return null;
        $ids = BatchRoomAccess::where('batch', $user->batch)->pluck('module_id');
        return $ids->isNotEmpty() ? $ids : null;
    }

    private function batchAccessMap($user): array
    {
        if (! $user->batch) return [];
        return BatchRoomAccess::where('batch', $user->batch)
            ->get(['module_id', 'max_attempts'])
            ->keyBy('module_id')
            ->map(fn ($r) => $r->max_attempts)
            ->toArray();
    }

    private function isBatchTestMode($user): bool
    {
        if (! $user->batch) return false;
        return (bool) Batch::where('name', $user->batch)->value('test_mode');
    }

    private function isUnlocked($user, Module $module): bool
    {
        $batchIds = $this->batchModuleIds($user);

        if ($batchIds !== null) {
            if (! $batchIds->contains($module->id)) return false;
            $prev = Module::whereIn('id', $batchIds)
                ->where('sequence', '<', $module->sequence)
                ->orderByDesc('sequence')->first();
            if (! $prev) return true;
            return (bool) $user->progress()->where('module_id', $prev->id)->where('completed', true)->exists();
        }

        $prev = Module::where('sequence', '<', $module->sequence)->orderByDesc('sequence')->first();
        if (! $prev) return true;
        return (bool) $user->progress()->where('module_id', $prev->id)->where('completed', true)->exists();
    }
}
