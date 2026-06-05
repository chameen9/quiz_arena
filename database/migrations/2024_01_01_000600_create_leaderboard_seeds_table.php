<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Static "rival" competitors shown on the leaderboard alongside real users.
        Schema::create('leaderboard_seeds', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->unsignedInteger('rooms_cleared')->default(0);
            $table->unsignedInteger('total_points')->default(0);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('leaderboard_seeds');
    }
};
