<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // track attempt count per user/room
        Schema::table('progress', function (Blueprint $table) {
            $table->unsignedInteger('attempts')->default(0)->after('completed');
        });

        // max attempts per batch-room pair (null = unlimited)
        Schema::table('batch_room_access', function (Blueprint $table) {
            $table->unsignedInteger('max_attempts')->nullable()->after('module_id');
        });

        // test mode flag per batch
        Schema::table('batches', function (Blueprint $table) {
            $table->boolean('test_mode')->default(false)->after('name');
        });
    }

    public function down(): void
    {
        Schema::table('progress', fn ($t) => $t->dropColumn('attempts'));
        Schema::table('batch_room_access', fn ($t) => $t->dropColumn('max_attempts'));
        Schema::table('batches', fn ($t) => $t->dropColumn('test_mode'));
    }
};
