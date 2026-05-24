<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasColumn('messages_promises', 'terms')) {
            return;
        }

        Schema::table('messages_promises', function (Blueprint $table) {
            $table->json('terms')->nullable()->after('promisedat');
        });
    }

    public function down(): void
    {
        Schema::table('messages_promises', function (Blueprint $table) {
            $table->dropColumn('terms');
        });
    }
};
