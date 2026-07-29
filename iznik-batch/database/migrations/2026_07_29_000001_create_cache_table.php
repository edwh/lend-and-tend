<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Laravel's default database cache store needs `cache` + `cache_locks`.
 * The L&T batch runs CACHE_STORE=database and uses `withoutOverlapping()`
 * (a cache-lock mutex) on its scheduled jobs, so these must exist or the
 * scheduler and `optimize:clear` error. hasTable guards keep it safe on the
 * live DB where the tables were created by hand first.
 */
return new class extends Migration {
    public function up(): void
    {
        if (!Schema::hasTable('cache')) {
            Schema::create('cache', function (Blueprint $table) {
                $table->string('key')->primary();
                $table->mediumText('value');
                $table->integer('expiration');
            });
        }

        if (!Schema::hasTable('cache_locks')) {
            Schema::create('cache_locks', function (Blueprint $table) {
                $table->string('key')->primary();
                $table->string('owner');
                $table->integer('expiration');
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('cache_locks');
        Schema::dropIfExists('cache');
    }
};
