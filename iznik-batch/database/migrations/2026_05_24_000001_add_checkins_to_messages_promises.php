<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasColumn('messages_promises', 'checkins')) {
            return;
        }

        Schema::table('messages_promises', function (Blueprint $table) {
            // JSON array of check-in objects: [{userid, status, note, checkedat}]
            $table->json('checkins')->nullable()->after('terms');
            // Tracks which reminder intervals have been sent: {"14d": "2026-06-06T...", ...}
            $table->json('checkin_reminders_sent')->nullable()->after('checkins');
        });
    }

    public function down(): void
    {
        Schema::table('messages_promises', function (Blueprint $table) {
            $table->dropColumn(['checkins', 'checkin_reminders_sent']);
        });
    }
};
