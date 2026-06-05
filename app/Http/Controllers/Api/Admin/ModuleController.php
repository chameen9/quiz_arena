<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Challenge;
use App\Models\Module;
use Database\Seeders\LeaderboardSeeder;
use Database\Seeders\ModuleSeeder;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class ModuleController extends Controller
{
    /** GET /api/admin/modules → { modules:[full] } */
    public function index()
    {
        $modules = Module::with('challenges')->orderBy('sequence')->get();

        return response()->json([
            'modules' => $modules->map->toAdminArray()->values(),
        ]);
    }

    /** POST /api/admin/modules → create a blank room */
    public function store()
    {
        $seq = (int) Module::max('sequence') + 1;
        $module = Module::create([
            'sequence' => $seq,
            'title' => 'New Room',
            'type' => 'mixed',
            'icon' => 'dom',
            'blurb' => 'Describe this room…',
        ]);

        return response()->json(['module' => $module->fresh()->toAdminArray()]);
    }

    /** PUT /api/admin/modules/{module} → save meta + sync questions */
    public function update(Request $request, Module $module)
    {
        $data = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'type' => ['nullable', 'string', 'max:64'],
            'icon' => ['nullable', 'string', 'max:32'],
            'blurb' => ['nullable', 'string'],
            'challenges' => ['array'],
        ]);

        DB::transaction(function () use ($module, $data, $request) {
            $module->update([
                'title' => $data['title'],
                'type' => $data['type'] ?? 'mixed',
                'icon' => $data['icon'] ?? 'dom',
                'blurb' => $data['blurb'] ?? '',
            ]);

            $keep = [];
            foreach ($request->input('challenges', []) as $i => $c) {
                $attrs = $this->mapChallenge($c, $module->id, $i);
                $cid = $c['id'] ?? null;

                $existing = is_numeric($cid)
                    ? Challenge::where('module_id', $module->id)->find($cid)
                    : null;

                if ($existing) {
                    $existing->update($attrs);
                    $keep[] = $existing->id;
                } else {
                    $keep[] = Challenge::create($attrs)->id;
                }
            }

            Challenge::where('module_id', $module->id)
                ->whereNotIn('id', $keep ?: [0])
                ->delete();
        });

        return response()->json(['module' => $module->fresh()->load('challenges')->toAdminArray()]);
    }

    /** DELETE /api/admin/modules/{module} */
    public function destroy(Module $module)
    {
        $module->delete();
        // re-pack sequences
        Module::orderBy('sequence')->get()->each(function ($m, $i) {
            $m->update(['sequence' => $i + 1]);
        });

        return response()->json(['ok' => true]);
    }

    /** POST /api/admin/modules/reorder  body { ids:[...] } */
    public function reorder(Request $request)
    {
        $ids = $request->validate(['ids' => ['required', 'array']])['ids'];
        foreach (array_values($ids) as $i => $id) {
            Module::where('id', $id)->update(['sequence' => $i + 1]);
        }

        return response()->json(['ok' => true]);
    }

    /** POST /api/admin/reset → restore default content + clear progress */
    public function reset()
    {
        DB::transaction(function () {
            Schema::disableForeignKeyConstraints();
            DB::table('challenge_attempts')->truncate();
            DB::table('progress')->truncate();
            DB::table('challenges')->truncate();
            DB::table('modules')->truncate();
            DB::table('leaderboard_seeds')->truncate();
            Schema::enableForeignKeyConstraints();

            (new ModuleSeeder)->run();
            (new LeaderboardSeeder)->run();
        });

        return response()->json(['ok' => true]);
    }

    /** Normalize an incoming question payload into DB attributes. */
    private function mapChallenge(array $c, int $moduleId, int $order): array
    {
        $type = in_array($c['type'] ?? 'mcq', ['mcq', 'msq', 'text', 'regex'], true) ? $c['type'] : 'mcq';
        $isChoice = in_array($type, ['mcq', 'msq'], true);

        return [
            'module_id' => $moduleId,
            'order' => $order,
            'type' => $type,
            'prompt' => $c['prompt'] ?? '',
            'material' => $c['material'] ?? null,
            'language' => $c['language'] ?? 'text',
            'image' => $c['image'] ?? null,
            'options' => $isChoice ? array_values(array_map(fn ($o) => [
                'id' => (string) ($o['id'] ?? uniqid('o')),
                'text' => $o['text'] ?? '',
                'image' => $o['image'] ?? null,
            ], $c['options'] ?? [])) : null,
            'correct' => $isChoice ? array_values(array_map('strval', $c['correct'] ?? [])) : null,
            'answer' => $type === 'text' ? ($c['answer'] ?? '') : null,
            'answer_pattern' => $type === 'regex' ? ($c['answer_pattern'] ?? '') : null,
            'answer_display' => $type === 'regex' ? ($c['answer_display'] ?? '') : null,
            'hint' => $c['hint'] ?? '',
            'points' => (int) ($c['points'] ?? 100),
            'time_limit' => (int) ($c['time_limit'] ?? 30),
        ];
    }
}
