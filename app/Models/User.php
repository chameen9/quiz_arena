<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasApiTokens, Notifiable;

    protected $fillable = [
        'name', 'handle', 'email', 'password', 'role', 'batch',
    ];

    protected $hidden = [
        'password', 'remember_token',
    ];

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
        ];
    }

    public function isAdmin(): bool
    {
        return $this->role === 'admin';
    }

    public function progress(): HasMany
    {
        return $this->hasMany(Progress::class);
    }

    public function attempts(): HasMany
    {
        return $this->hasMany(ChallengeAttempt::class);
    }

    public function roomsCleared(): int
    {
        return $this->progress()->where('completed', true)->count();
    }

    public function totalPoints(): int
    {
        return (int) $this->progress()->sum('score');
    }
}
