<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class LeaderboardSeed extends Model
{
    protected $fillable = ['name', 'rooms_cleared', 'total_points'];

    protected $casts = [
        'rooms_cleared' => 'integer',
        'total_points' => 'integer',
    ];
}
