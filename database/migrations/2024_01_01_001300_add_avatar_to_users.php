<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('gender', 1)->nullable()->after('batch');       // 'm' or 'f'
            $table->string('avatar_color', 7)->nullable()->after('gender'); // hex e.g. #00E5FF
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['gender', 'avatar_color']);
        });
    }
};
