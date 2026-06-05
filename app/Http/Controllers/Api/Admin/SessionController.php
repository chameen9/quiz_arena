<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\GameSession;
use Illuminate\Http\Request;

class SessionController extends Controller
{
    public function index(Request $request)
    {
        $sessions = GameSession::where('admin_id', $request->user()->id)
            ->withCount('participants')
            ->latest()
            ->get();

        return response()->json(['sessions' => $sessions]);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'title'        => ['required', 'string', 'max:120'],
            'module_ids'   => ['required', 'array', 'min:1'],
            'module_ids.*' => ['integer', 'exists:modules,id'],
        ]);

        $session = GameSession::create([
            'code'       => $this->generateCode(),
            'title'      => $data['title'],
            'admin_id'   => $request->user()->id,
            'module_ids' => $data['module_ids'],
            'status'     => 'active',
        ]);

        return response()->json(['session' => $session->loadCount('participants')], 201);
    }

    public function update(Request $request, GameSession $gameSession)
    {
        abort_if($gameSession->admin_id !== $request->user()->id, 403);

        $data = $request->validate(['status' => ['required', 'in:active,closed']]);
        $gameSession->update($data);

        return response()->json(['session' => $gameSession->loadCount('participants')]);
    }

    public function destroy(Request $request, GameSession $gameSession)
    {
        abort_if($gameSession->admin_id !== $request->user()->id, 403);
        $gameSession->delete();

        return response()->json(['ok' => true]);
    }

    private function generateCode(): string
    {
        $chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        do {
            $code = '';
            for ($i = 0; $i < 6; $i++) {
                $code .= $chars[random_int(0, strlen($chars) - 1)];
            }
        } while (GameSession::where('code', $code)->exists());

        return $code;
    }
}
