<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Batch;
use App\Models\BatchRoomAccess;
use App\Models\LeaderboardSeed;
use App\Models\Module;
use App\Models\User;
use Illuminate\Http\Request;

class LeaderboardController extends Controller
{
    public function index(Request $request)
    {
        $me   = $request->user();
        $view = $request->query('view', 'all');

        // batch view: same-batch students only, respects test_mode for display
        if ($view === 'batch' && $me?->batch) {
            $users = User::where('role', 'student')
                ->where('batch', $me->batch)
                ->with('progress')
                ->get();

            $rows = $users->map(fn ($u) => [
                'name'          => $u->handle ?: $u->name,
                'batch'         => $u->batch,
                'rooms_cleared' => $u->progress->where('completed', true)->count(),
                'total_points'  => (int) $u->progress->sum('score'),
                'you'           => $u->id === $me->id,
            ])->all();

            usort($rows, fn ($a, $b) =>
                [$b['total_points'], $b['rooms_cleared']] <=> [$a['total_points'], $a['rooms_cleared']]);

            $batchCount = BatchRoomAccess::where('batch', $me->batch)->count();
            $roomsTotal = $batchCount > 0 ? $batchCount : Module::count();

            return response()->json([
                'leaderboard' => array_values($rows),
                'view'        => 'batch',
                'batch'       => $me->batch,
                'rooms_total' => $roomsTotal,
            ]);
        }

        // test-mode batches are excluded from all-time leaderboard
        $testModeBatches = Batch::where('test_mode', true)->pluck('name');

        $rows = LeaderboardSeed::all()->map(fn ($s) => [
            'name'          => $s->name,
            'batch'         => null,
            'rooms_cleared' => $s->rooms_cleared,
            'total_points'  => $s->total_points,
            'you'           => false,
        ])->values()->all();

        foreach (User::where('role', 'student')->with('progress')->get() as $u) {
            // skip test-mode batch students from all-time board
            if ($u->batch && $testModeBatches->contains($u->batch)) continue;

            $rows[] = [
                'name'          => $u->handle ?: $u->name,
                'batch'         => $u->batch,
                'rooms_cleared' => $u->progress->where('completed', true)->count(),
                'total_points'  => (int) $u->progress->sum('score'),
                'you'           => $me && $u->id === $me->id,
            ];
        }

        usort($rows, fn ($a, $b) =>
            [$b['total_points'], $b['rooms_cleared']] <=> [$a['total_points'], $a['rooms_cleared']]);

        return response()->json([
            'leaderboard' => array_values($rows),
            'view'        => 'all',
            'rooms_total' => Module::count(),
        ]);
    }
}
