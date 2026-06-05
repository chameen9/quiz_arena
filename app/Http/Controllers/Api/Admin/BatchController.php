<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Batch;
use App\Models\BatchRoomAccess;
use App\Models\User;
use Illuminate\Http\Request;

class BatchController extends Controller
{
    /** GET /api/admin/batches */
    public function index()
    {
        $batches = Batch::orderBy('name')->get();
        $names   = $batches->pluck('name');

        $accessRows = BatchRoomAccess::whereIn('batch', $names)->get()->groupBy('batch');

        $studentsByBatch = User::where('role', 'student')
            ->with('progress')
            ->orderBy('created_at', 'desc')
            ->get()
            ->groupBy('batch');

        $result = $batches->map(fn ($b) => [
            'batch'         => $b->name,
            'test_mode'     => (bool) $b->test_mode,
            'rooms'         => $accessRows->get($b->name, collect())
                ->map(fn ($r) => ['module_id' => $r->module_id, 'max_attempts' => $r->max_attempts])
                ->values(),
            // legacy field kept for session/room access checks
            'module_ids'    => $accessRows->get($b->name, collect())->pluck('module_id')->values(),
            'student_count' => $studentsByBatch->get($b->name, collect())->count(),
            'students'      => $studentsByBatch->get($b->name, collect())
                ->map(fn ($u) => self::studentRow($u))->values(),
        ]);

        $unassigned = User::where('role', 'student')
            ->with('progress')
            ->where(function ($q) use ($names) {
                $q->whereNull('batch')->orWhere('batch', '')->orWhereNotIn('batch', $names);
            })
            ->orderBy('created_at', 'desc')
            ->get()
            ->map(fn ($u) => self::studentRow($u))
            ->values();

        return response()->json(['batches' => $result, 'unassigned' => $unassigned]);
    }

    /** POST /api/admin/batches */
    public function store(Request $request)
    {
        $data  = $request->validate(['name' => ['required', 'string', 'max:64', 'unique:batches,name']]);
        $batch = Batch::create(['name' => trim($data['name']), 'test_mode' => false]);

        return response()->json([
            'batch' => ['batch' => $batch->name, 'test_mode' => false, 'rooms' => [], 'module_ids' => [], 'student_count' => 0, 'students' => []],
        ], 201);
    }

    /** DELETE /api/admin/batches/{batch} */
    public function destroy(string $batch)
    {
        Batch::where('name', $batch)->delete();
        BatchRoomAccess::where('batch', $batch)->delete();

        return response()->json(['ok' => true]);
    }

    /**
     * PUT /api/admin/batches/{batch}/access
     * body: { rooms: [{module_id, max_attempts}], test_mode: bool }
     */
    public function update(Request $request, string $batch)
    {
        $data = $request->validate([
            'rooms'                   => ['present', 'array'],
            'rooms.*.module_id'       => ['required', 'integer', 'exists:modules,id'],
            'rooms.*.max_attempts'    => ['nullable', 'integer', 'min:0'],
            'test_mode'               => ['sometimes', 'boolean'],
        ]);

        BatchRoomAccess::where('batch', $batch)->delete();
        foreach ($data['rooms'] as $row) {
            BatchRoomAccess::create([
                'batch'        => $batch,
                'module_id'    => $row['module_id'],
                'max_attempts' => isset($row['max_attempts']) && $row['max_attempts'] > 0 ? $row['max_attempts'] : null,
            ]);
        }

        if (array_key_exists('test_mode', $data)) {
            Batch::where('name', $batch)->update(['test_mode' => $data['test_mode']]);
        }

        return response()->json(['ok' => true]);
    }

    private static function studentRow(User $u): array
    {
        return [
            'id'            => $u->id,
            'handle'        => $u->handle ?: $u->name,
            'email'         => $u->email,
            'batch'         => $u->batch,
            'gender'        => $u->gender ?? 'm',
            'avatar_color'  => $u->avatar_color ?? '#00E5FF',
            'joined'        => $u->created_at?->format('Y-m-d'),
            'total_points'  => (int) $u->progress->sum('score'),
            'rooms_cleared' => $u->progress->where('completed', true)->count(),
        ];
    }
}
