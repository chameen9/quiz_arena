<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SessionParticipant extends Model
{
    public $timestamps = false;

    protected $fillable = ['session_id', 'user_id'];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function session()
    {
        return $this->belongsTo(GameSession::class, 'session_id');
    }
}
