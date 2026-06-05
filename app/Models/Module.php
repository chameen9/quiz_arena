<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Module extends Model
{
    protected $fillable = ['sequence', 'title', 'type', 'icon', 'blurb'];

    public function challenges(): HasMany
    {
        return $this->hasMany(Challenge::class)->orderBy('order');
    }

    public function progress(): HasMany
    {
        return $this->hasMany(Progress::class);
    }

    /** Public (student) representation — no answer keys. */
    public function toPublicArray(): array
    {
        return [
            'id' => $this->id,
            'sequence' => $this->sequence,
            'title' => $this->title,
            'type' => $this->type,
            'icon' => $this->icon,
            'blurb' => $this->blurb,
        ];
    }

    /** Full representation for the admin console (includes answers). */
    public function toAdminArray(): array
    {
        return array_merge($this->toPublicArray(), [
            'challenges' => $this->challenges->map->toAdminArray()->values()->all(),
        ]);
    }
}
