<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('batch_room_access', function (Blueprint $table) {
            $table->id();
            $table->string('batch', 64);
            $table->foreignId('module_id')->constrained()->cascadeOnDelete();
            $table->unique(['batch', 'module_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('batch_room_access');
    }
};
