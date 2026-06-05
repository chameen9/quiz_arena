<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Challenge;
use App\Models\ChallengeAttempt;
use App\Models\GameSession;
use App\Models\Module;
use App\Models\Progress;
use App\Models\SessionParticipant;
use App\Models\User;
use Illuminate\Http\Request;

class SessionController extends Controller
{
    public function join(Request $request)
    {
        $data = $request->validate(['code' => ['required', 'string', 'max:10']]);
        $code = strtoupper(trim($data['code']));

        $session = GameSession::where('code', $code)->where('status', 'active')->first();
        if (! $session) {
            return response()->json(['message' => 'Session not found or has ended.'], 404);
        }

        SessionParticipant::firstOrCreate([
            'session_id' => $session->id,
            'user_id'    => $request->user()->id,
        ]);

        return response()->json(['session' => $this->sessionPayload($session)]);
    }

    public function show(Request $request, string $code)
    {
        $session = GameSession::where('code', strtoupper($code))->first();
        if (! $session) {
            return response()->json(['message' => 'Session not found.'], 404);
        }

        $user = $request->user();
        $isParticipant = SessionParticipant::where('session_id', $session->id)
            ->where('user_id', $user->id)->exists();

        if (! $isParticipant && $user->role !== 'admin') {
            return response()->json(['message' => 'Join the session first.'], 403);
        }

        return response()->json(['session' => $this->sessionPayload($session)]);
    }

    public function leaderboard(Request $request, string $code)
    {
        $session = GameSession::where('code', strtoupper($code))->first();
        if (! $session) {
            return response()->json(['message' => 'Session not found.'], 404);
        }

        $user = $request->user();
        $isParticipant = SessionParticipant::where('session_id', $session->id)
            ->where('user_id', $user->id)->exists();

        if (! $isParticipant && $user->role !== 'admin') {
            return response()->json(['message' => 'Join the session first.'], 403);
        }

        $participantIds = SessionParticipant::where('session_id', $session->id)->pluck('user_id');
        $challengeIds   = Challenge::whereIn('module_id', $session->module_ids)->pluck('id');
        $roomsTotal     = count($session->module_ids);

        $scores = ChallengeAttempt::whereIn('user_id', $participantIds)
            ->whereIn('challenge_id', $challengeIds)
            ->groupBy('user_id')
            ->selectRaw('user_id, SUM(points) as total_points')
            ->get()
            ->keyBy('user_id');

        $clearedMap = Progress::whereIn('user_id', $participantIds)
            ->whereIn('module_id', $session->module_ids)
            ->where('completed', true)
            ->selectRaw('user_id, COUNT(*) as cnt')
            ->groupBy('user_id')
            ->get()
            ->keyBy('user_id');

        $myId = $user->id;
        $rows = User::whereIn('id', $participantIds)->get()
            ->map(function ($u) use ($scores, $clearedMap, $myId, $roomsTotal) {
                return [
                    'id'            => $u->id,
                    'name'          => $u->handle,
                    'batch'         => $u->batch,
                    'total_points'  => isset($scores[$u->id]) ? (int) $scores[$u->id]->total_points : 0,
                    'rooms_cleared' => isset($clearedMap[$u->id]) ? (int) $clearedMap[$u->id]->cnt : 0,
                    'you'           => $u->id === $myId,
                ];
            })
            ->sortByDesc('total_points')
            ->values();

        return response()->json([
            'leaderboard' => $rows,
            'session'     => [
                'code'        => $session->code,
                'title'       => $session->title,
                'status'      => $session->status,
                'rooms_total' => $roomsTotal,
            ],
        ]);
    }

    private function sessionPayload(GameSession $session): array
    {
        $modules = Module::whereIn('id', $session->module_ids)
            ->orderBy('sequence')
            ->get(['id', 'title', 'sequence', 'type', 'blurb', 'icon']);

        return [
            'id'                 => $session->id,
            'code'               => $session->code,
            'title'              => $session->title,
            'status'             => $session->status,
            'module_ids'         => $session->module_ids,
            'modules'            => $modules,
            'participants_count' => $session->participants()->count(),
        ];
    }
}
