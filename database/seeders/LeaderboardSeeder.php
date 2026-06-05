<?php

namespace Database\Seeders;

use App\Models\LeaderboardSeed;
use Illuminate\Database\Seeder;

class LeaderboardSeeder extends Seeder
{
    public function run(): void
    {
        $rows = [
            // demo NPC rows removed — leaderboard shows real students only
        ];

        foreach ($rows as [$name, $cleared, $points]) {
            LeaderboardSeed::create([
                'name' => $name,
                'rooms_cleared' => $cleared,
                'total_points' => $points,
            ]);
        }
    }
}
