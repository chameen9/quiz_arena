<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class GameSession extends Model
{
    protected $table = 'game_sessions';

    protected $fillable = ['code', 'title', 'admin_id', 'module_ids', 'status'];

    protected $casts = ['module_ids' => 'array'];

    public function participants()
    {
        return $this->hasMany(SessionParticipant::class, 'session_id');
    }
}
