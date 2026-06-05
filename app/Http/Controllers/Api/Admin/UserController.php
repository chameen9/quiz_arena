<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;

class UserController extends Controller
{
    /** DELETE /api/admin/users/{user} */
    public function destroy(Request $request, User $user)
    {
        if ($user->id === $request->user()->id) {
            return response()->json(['message' => 'Cannot delete your own account.'], 422);
        }
        if ($user->role === 'admin') {
            return response()->json(['message' => 'Cannot delete admin accounts.'], 422);
        }

        $user->delete();

        return response()->json(['ok' => true]);
    }
}
