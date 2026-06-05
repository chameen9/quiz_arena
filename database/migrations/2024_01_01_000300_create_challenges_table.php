<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('challenges', function (Blueprint $table) {
            $table->id();
            $table->foreignId('module_id')->constrained()->cascadeOnDelete();
            $table->unsignedInteger('order')->default(0);
            $table->enum('type', ['mcq', 'msq', 'text', 'regex'])->default('mcq');
            $table->text('prompt');
            $table->longText('material')->nullable();   // optional code block
            $table->string('language')->default('text');
            $table->longText('image')->nullable();       // optional data URL (stem image)

            // choice types: options = [{id,text,image}], correct = [optionId,...]
            $table->json('options')->nullable();
            $table->json('correct')->nullable();

            // text type
            $table->text('answer')->nullable();

            // regex type
            $table->text('answer_pattern')->nullable();
            $table->text('answer_display')->nullable();

            $table->text('hint')->nullable();
            $table->unsignedInteger('points')->default(100);
            $table->unsignedInteger('time_limit')->default(30);
            $table->timestamps();

            $table->index(['module_id', 'order']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('challenges');
    }
};
