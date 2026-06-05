<?php

use App\Http\Controllers\Api\Admin\BatchController;
use App\Http\Controllers\Api\Admin\ModuleController;
use App\Http\Controllers\Api\Admin\RankingsController;
use App\Http\Controllers\Api\Admin\SessionController as AdminSessionController;
use App\Http\Controllers\Api\Admin\UserController as AdminUserController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\ChallengeController;
use App\Http\Controllers\Api\LeaderboardController;
use App\Http\Controllers\Api\RoomController;
use App\Http\Controllers\Api\SessionController;
use Illuminate\Support\Facades\Route;

// ---- public ----------------------------------------------------------
Route::post('/register', [AuthController::class, 'register']);
Route::post('/login', [AuthController::class, 'login']);
Route::get('/batches', fn () => response()->json([
    'batches' => \App\Models\Batch::orderBy('name')->pluck('name'),
]));

// ---- authenticated (Bearer token via Sanctum) ---------------------------
Route::middleware('auth:sanctum')->group(function () {
    Route::get('/me', [AuthController::class, 'me']);
    Route::post('/logout', [AuthController::class, 'logout']);

    Route::get('/rooms', [RoomController::class, 'index']);
    Route::get('/rooms/{module}', [RoomController::class, 'show']);
    Route::post('/rooms/{module}/start-attempt', [RoomController::class, 'startAttempt']);

    Route::post('/challenges/{challenge}/submit', [ChallengeController::class, 'submit']);

    Route::get('/leaderboard', [LeaderboardController::class, 'index']);

    // ---- sessions (student) ---------------------------------------------
    Route::post('/sessions/join', [SessionController::class, 'join']);
    Route::get('/sessions/{code}/leaderboard', [SessionController::class, 'leaderboard']);
    Route::get('/sessions/{code}', [SessionController::class, 'show']);

    // ---- admin only ------------------------------------------------------
    Route::middleware('admin')->prefix('admin')->group(function () {
        Route::get('/modules', [ModuleController::class, 'index']);
        Route::post('/modules', [ModuleController::class, 'store']);
        Route::put('/modules/{module}', [ModuleController::class, 'update']);
        Route::delete('/modules/{module}', [ModuleController::class, 'destroy']);
        Route::post('/modules/reorder', [ModuleController::class, 'reorder']);
        Route::post('/reset', [ModuleController::class, 'reset']);

        Route::get('/sessions', [AdminSessionController::class, 'index']);
        Route::post('/sessions', [AdminSessionController::class, 'store']);
        Route::patch('/sessions/{gameSession}', [AdminSessionController::class, 'update']);
        Route::delete('/sessions/{gameSession}', [AdminSessionController::class, 'destroy']);

        Route::delete('/users/{user}', [AdminUserController::class, 'destroy']);
        Route::get('/rankings', [RankingsController::class, 'index']);

        Route::get('/batches', [BatchController::class, 'index']);
        Route::post('/batches', [BatchController::class, 'store']);
        Route::delete('/batches/{batch}', [BatchController::class, 'destroy']);
        Route::put('/batches/{batch}/access', [BatchController::class, 'update']);
    });
});
