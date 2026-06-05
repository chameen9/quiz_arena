<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class BatchRoomAccess extends Model
{
    public $timestamps = false;

    protected $table = 'batch_room_access';

    protected $fillable = ['batch', 'module_id', 'max_attempts'];
}
