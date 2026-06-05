<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    /** POST /api/register → { token, user:{id,name,role} } */
    public function register(Request $request)
    {
        $data = $request->validate([
            'name'         => ['required', 'string', 'min:3', 'max:20'],
            'email'        => ['required', 'email', 'max:255', 'unique:users,email'],
            'password'     => ['required', 'string', 'min:1'],
            'batch'        => ['required', 'string', 'max:64'],
            'gender'       => ['nullable', 'in:m,f'],
            'avatar_color' => ['nullable', 'string', 'max:7'],
        ]);

        $user = User::create([
            'name'         => $data['name'],
            'email'        => strtolower($data['email']),
            'password'     => $data['password'],
            'role'         => 'student',
            'batch'        => $data['batch'] ?? null,
            'handle'       => Str::of($data['name'])->lower()->replaceMatches('/\s+/', '_')->limit(16, ''),
            'gender'       => $data['gender'] ?? 'm',
            'avatar_color' => $data['avatar_color'] ?? '#00E5FF',
        ]);

        return $this->tokenResponse($user, 201);
    }

    /** POST /api/login → { token, user:{id,name,role} } */
    public function login(Request $request)
    {
        $data = $request->validate([
            'email' => ['required', 'email'],
            'password' => ['required', 'string'],
        ]);

        $user = User::where('email', strtolower($data['email']))->first();

        if (! $user || ! Hash::check($data['password'], $user->password)) {
            throw ValidationException::withMessages([
                'email' => ['Invalid email or password.'],
            ]);
        }

        return $this->tokenResponse($user);
    }

    /** GET /api/me → current user summary */
    public function me(Request $request)
    {
        $user = $request->user();

        return response()->json([
            'id'           => $user->id,
            'name'         => $user->name,
            'handle'       => $user->handle,
            'role'         => $user->role,
            'batch'        => $user->batch,
            'gender'       => $user->gender ?? 'm',
            'avatar_color' => $user->avatar_color ?? '#00E5FF',
            'total_points' => $user->totalPoints(),
            'rooms_cleared' => $user->roomsCleared(),
        ]);
    }

    /** PATCH /api/me → update handle, avatar, password */
    public function updateProfile(Request $request)
    {
        $data = $request->validate([
            'handle'           => ['sometimes', 'string', 'min:2', 'max:20'],
            'gender'           => ['sometimes', 'in:m,f'],
            'avatar_color'     => ['sometimes', 'string', 'max:7'],
            'current_password' => ['required_with:new_password', 'string'],
            'new_password'     => ['sometimes', 'string', 'min:1'],
        ]);

        $user = $request->user();

        if (isset($data['handle']))       $user->handle = $data['handle'];
        if (isset($data['gender']))       $user->gender = $data['gender'];
        if (isset($data['avatar_color'])) $user->avatar_color = $data['avatar_color'];

        if (isset($data['new_password'])) {
            if (! Hash::check($data['current_password'], $user->password)) {
                return response()->json(['message' => 'Current password is incorrect.'], 422);
            }
            $user->password = $data['new_password'];
        }

        $user->save();

        return response()->json([
            'id'           => $user->id,
            'name'         => $user->name,
            'handle'       => $user->handle,
            'role'         => $user->role,
            'batch'        => $user->batch,
            'gender'       => $user->gender ?? 'm',
            'avatar_color' => $user->avatar_color ?? '#00E5FF',
            'total_points' => $user->totalPoints(),
            'rooms_cleared' => $user->roomsCleared(),
        ]);
    }

    /** POST /api/logout → revoke current token */
    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()?->delete();

        return response()->json(['ok' => true]);
    }

    private function tokenResponse(User $user, int $status = 200)
    {
        $token = $user->createToken('arena')->plainTextToken;

        return response()->json([
            'token' => $token,
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'role' => $user->role,
            ],
        ], $status);
    }
}
