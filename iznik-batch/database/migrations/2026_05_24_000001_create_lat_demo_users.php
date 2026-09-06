<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

// Creates demo users for Lend & Tend development/testing.
//
// FAIL-SAFE: demo users (incl. an Admin-role account with a hard-coded,
// publicly-known password) are ONLY seeded in local/testing environments, or
// when CREATE_DEMO_USERS is explicitly set to 'true'. In every other
// environment — including production, where APP_ENV is unset and Laravel
// defaults it to 'production' — this migration does nothing. This is the
// opposite of the previous opt-OUT default, which silently created a
// login-as-admin backdoor on any environment that forgot to set
// CREATE_DEMO_USERS=false (the flag was set nowhere in the repo).
return new class extends Migration
{
    private array $demoUsers = [
        ['email' => 'lend@test.com',  'fullname' => 'Demo Lender',  'systemrole' => 'User'],
        ['email' => 'tend@test.com',  'fullname' => 'Demo Tender',  'systemrole' => 'User'],
        ['email' => 'admin@test.com', 'fullname' => 'Demo Admin',   'systemrole' => 'Admin'],
    ];

    public function up(): void
    {
        $optIn = getenv('CREATE_DEMO_USERS');
        $env = getenv('APP_ENV') ?: 'production';

        // Explicit off always wins.
        if ($optIn === 'false') {
            return;
        }
        // Outside local/testing, require an explicit opt-in.
        if (!in_array($env, ['local', 'testing'], true) && $optIn !== 'true') {
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
