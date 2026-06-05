<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\BatchRoomAccess;
use App\Models\Module;
use App\Models\User;
use Illuminate\Http\Request;

class RankingsController extends Controller
{
    /** GET /api/admin/rankings?batch=ESOFT */
    public function index(Request $request)
    {
        $batch = $request->query('batch');

        $query = User::where('role', 'student')->with('progress');
        if ($batch) {
            $query->where('batch', $batch);
        }

        $users = $query->get();

        $rows = $users->map(function ($u) {
            return [
                'id'            => $u->id,
                'name'          => $u->handle ?: $u->name,
                'batch'         => $u->batch,
                'gender'        => $u->gender ?? 'm',
                'avatar_color'  => $u->avatar_color ?? '#00E5FF',
                'total_points'  => (int) $u->progress->sum('score'),
                'rooms_cleared' => $u->progress->where('completed', true)->count(),
            ];
        })
        ->sortByDesc('total_points')
        ->values();

        // rooms_total: if filtering by batch, use batch room count; else global
        $roomsTotal = Module::count();
        if ($batch) {
            $batchCount = BatchRoomAccess::where('batch', $batch)->count();
            if ($batchCount > 0) $roomsTotal = $batchCount;
        }

        return response()->json([
            'leaderboard' => $rows,
            'rooms_total' => $roomsTotal,
            'batch'       => $batch,
        ]);
    }
}
