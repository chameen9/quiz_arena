<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        // default instructor / admin account
        User::firstOrCreate(
            ['email' => 'admin@codeverse.dev'],
            [
                'name' => 'Instructor',
                'handle' => 'instructor',
                'password' => 'admin123', // hashed via cast
                'role' => 'admin',
            ]
        );

        // a demo student so the leaderboard isn't empty of real players
        User::firstOrCreate(
            ['email' => 'student@codeverse.dev'],
            [
                'name' => 'Demo Student',
                'handle' => 'demo_student',
                'password' => 'student123',
                'role' => 'student',
            ]
        );

        $this->call([
            ModuleSeeder::class,
            LeaderboardSeeder::class,
        ]);
    }
}
