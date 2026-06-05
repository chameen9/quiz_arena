<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Challenge extends Model
{
    protected $fillable = [
        'module_id', 'order', 'type', 'prompt', 'material', 'language', 'image',
        'options', 'correct', 'answer', 'answer_pattern', 'answer_display',
        'hint', 'points', 'time_limit',
    ];

    protected $casts = [
        'options' => 'array',
        'correct' => 'array',
        'points' => 'integer',
        'time_limit' => 'integer',
    ];

    public function module(): BelongsTo
    {
        return $this->belongsTo(Module::class);
    }

    public function isChoice(): bool
    {
        return in_array($this->type, ['mcq', 'msq'], true);
    }

    /** Student-facing payload — strips correct answers. */
    public function toPublicArray(): array
    {
        $base = [
            'id' => $this->id,
            'type' => $this->type,
            'prompt' => $this->prompt,
            'material' => $this->material,
            'language' => $this->language,
            'image' => $this->image,
            'hint' => $this->hint,
            'points' => $this->points,
            'time_limit' => $this->time_limit,
        ];

        if ($this->isChoice()) {
            $base['multi'] = $this->type === 'msq';
            $base['options'] = collect($this->options ?? [])->map(fn ($o) => [
                'id' => $o['id'] ?? null,
                'text' => $o['text'] ?? '',
                'image' => $o['image'] ?? null,
            ])->values()->all();
        } else {
            $base['options'] = null;
        }

        return $base;
    }

    /** Full payload for the admin console (includes answers). */
    public function toAdminArray(): array
    {
        return [
            'id' => $this->id,
            'type' => $this->type,
            'prompt' => $this->prompt,
            'material' => $this->material ?? '',
            'language' => $this->language,
            'image' => $this->image,
            'options' => $this->options ?? [],
            'correct' => $this->correct ?? [],
            'answer' => $this->answer ?? '',
            'answer_pattern' => $this->answer_pattern ?? '',
            'answer_display' => $this->answer_display ?? '',
            'hint' => $this->hint ?? '',
            'points' => $this->points,
            'time_limit' => $this->time_limit,
        ];
    }

    /** Grade a submitted answer against this challenge. */
    public function grade($answer): bool
    {
        if ($this->type === 'regex') {
            $pattern = $this->answer_pattern ?? '';
            if ($pattern === '') {
                return false;
            }
            $delimited = '/'.str_replace('/', '\\/', $pattern).'/i';
            return @preg_match($delimited, is_string($answer) ? trim($answer) : '') === 1;
        }

        if ($this->isChoice()) {
            $selected = is_array($answer) ? $answer : ($answer !== null && $answer !== '' ? [$answer] : []);
            $selected = array_values(array_unique(array_map('strval', $selected)));
            $correct = array_values(array_map('strval', $this->correct ?? []));
            sort($selected);
            sort($correct);
            return count($correct) > 0 && $selected === $correct;
        }

        // text
        $norm = fn ($s) => trim(preg_replace('/\s+/', ' ', mb_strtolower((string) $s)));
        return $norm($answer) === $norm($this->answer);
    }

    public function correctDisplay(): string
    {
        if ($this->type === 'regex') {
            return $this->answer_display ?: $this->answer_pattern ?: '';
        }
        if ($this->isChoice()) {
            $options = collect($this->options ?? []);
            return collect($this->correct ?? [])->map(function ($id) use ($options) {
                $idx = $options->search(fn ($o) => ($o['id'] ?? null) === $id);
                if ($idx === false) {
                    return $id;
                }
                $o = $options[$idx];
                $label = $o['text'] ?? '';
                if ($label === '') {
                    $label = 'Option '.chr(65 + $idx).(($o['image'] ?? null) ? ' [image]' : '');
                }
                return $label;
            })->implode(', ');
        }
        return (string) $this->answer;
    }
}
