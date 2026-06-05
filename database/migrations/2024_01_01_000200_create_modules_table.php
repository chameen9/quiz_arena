<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('modules', function (Blueprint $table) {
            $table->id();
            $table->unsignedInteger('sequence')->index();
            $table->string('title');
            $table->string('type')->default('mixed'); // freeform label, e.g. "mcq", "mixed"
            $table->string('icon')->default('dom');    // glyph key used by the UI
            $table->text('blurb')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('modules');
    }
};
