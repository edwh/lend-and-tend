<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

// Creates demo users for Lend & Tend development/testing.
// Skipped when CREATE_DEMO_USERS env var is 'false'.
// Default: enabled (so dev environments get demo users automatically).
return new class extends Migration
{
    private array $demoUsers = [
        ['email' => 'lend@test.com',  'fullname' => 'Demo Lender',  'systemrole' => 'User'],
        ['email' => 'tend@test.com',  'fullname' => 'Demo Tender',  'systemrole' => 'User'],
        ['email' => 'admin@test.com', 'fullname' => 'Demo Admin',   'systemrole' => 'Admin'],
    ];

    public function up(): void
    {
        if (getenv('CREATE_DEMO_USERS') === 'false') {
            return;
        }

        $salt = 'lat-demo-salt';
        $hash = sha1('lendandtend' . $salt);

        foreach ($this->demoUsers as $demo) {
            if (DB::table('users_emails')->where('email', $demo['email'])->exists()) {
                continue;
            }

            $userId = DB::table('users')->insertGetId([
                'fullname'     => $demo['fullname'],
                'systemrole'   => $demo['systemrole'],
                'added'        => now(),
                'lastaccess'   => now(),
                'gotrealemail' => 1,
            ]);

            DB::table('users_emails')->insert([
                'userid'    => $userId,
                'email'     => $demo['email'],
                'preferred' => 1,
                'added'     => now(),
                'validated' => now(),
                'canon'     => strtolower($demo['email']),
                'backwards' => strrev(strtolower($demo['email'])),
            ]);

            DB::table('users_logins')->insert([
                'userid'      => $userId,
                'type'        => 'Native',
                'uid'         => $demo['email'],
                'credentials' => $hash,
                'salt'        => $salt,
                'added'       => now(),
                'lastaccess'  => now(),
            ]);
        }
    }

    public function down(): void
    {
        foreach ($this->demoUsers as $demo) {
            $row = DB::table('users_emails')->where('email', $demo['email'])->first();
            if (!$row) {
                continue;
            }
            $userId = $row->userid;
            DB::table('users_logins')->where('userid', $userId)->where('type', 'Native')->where('uid', $demo['email'])->delete();
            DB::table('users_emails')->where('userid', $userId)->delete();
            DB::table('users')->where('id', $userId)->delete();
        }
    }
};
