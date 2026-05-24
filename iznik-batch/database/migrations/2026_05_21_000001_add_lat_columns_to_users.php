<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

// Lend & Tend schema addition.
// The ONLY addition needed: a single world-spanning Freegle group so that
// L&T garden listings (Freegle messages) can be filtered away from regular
// Freegle listings. All other data (users, auth, location, profiles, chat,
// notifications, blocking, word filtering) uses existing Freegle tables unchanged.
return new class extends Migration
{
    public function up(): void
    {
        if (!DB::table('groups')->where('nameshort', 'lendandtend-world')->exists()) {
            DB::statement('INSERT INTO `groups` (id, nameshort, namefull, nameabbr, type, onhere, polyindex)
                VALUES (1000000, \'lendandtend-world\', \'Lend and Tend - World\', \'LAT\', \'Other\', 0,
                ST_GeomFromText(\'POINT(0 0)\', 3857))');
        }
    }

    public function down(): void
    {
        DB::table('groups')->where('nameshort', 'lendandtend-world')->delete();
    }
};
