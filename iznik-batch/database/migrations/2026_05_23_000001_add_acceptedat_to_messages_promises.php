<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasColumn('messages_promises', 'acceptedat')) {
            return;
        }

        Schema::table('messages_promises', function (Blueprint $table) {
            $table->timestamp('acceptedat')->nullable()->after('terms');
            $table->unsignedBigInteger('acceptedby')->nullable()->after('acceptedat');
        });
    }

    public function down(): void
    {
        Schema::table('messages_promises', function (Blueprint $table) {
            $table->dropColumn(['acceptedat', 'acceptedby']);
        });
    }
};
