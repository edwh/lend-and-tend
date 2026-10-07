<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

// Lend & Tend admins must be an Owner of the world group.
//
// The Go API only returns another member's `settings` (where L&T keeps
// lat_payment, lat_role, email) to a caller who is a Moderator/Owner of at
// least one group (user.go GetUserById). The Admin systemrole passes the
// permission check but not that SELECT gate, so an admin with no membership
// saw every member as "Not joined", an empty Concessions page and no role.
//
// This adds (idempotently) an Owner membership on `lendandtend-world` for every
// user whose systemrole is Admin or Support. Data only: no tables or columns.
// It is safe to re-run; it inserts nothing that already exists.
return new class extends Migration
{
    public function up(): void
    {
        $groupId = DB::table('groups')->where('nameshort', 'lendandtend-world')->value('id');
        if (!$groupId) {
            return; // world group not created yet (migration order) - nothing to do
        }

        $admins = DB::table('users')
            ->whereIn('systemrole', ['Admin', 'Support'])
            ->whereNull('deleted')
            ->pluck('id');

        foreach ($admins as $userId) {
            $existing = DB::table('memberships')
                ->where('userid', $userId)
                ->where('groupid', $groupId)
                ->first();

            if ($existing) {
                if ($existing->role !== 'Owner') {
                    DB::table('memberships')
                        ->where('id', $existing->id)
                        ->update(['role' => 'Owner', 'collection' => 'Approved']);
                }
                continue;
            }

            DB::table('memberships')->insert([
                'userid'     => $userId,
                'groupid'    => $groupId,
                'role'       => 'Owner',
                'collection' => 'Approved',
                'added'      => now(),
            ]);
        }
    }

    public function down(): void
    {
        // Deliberately a no-op: removing an admin's membership would silently
        // break the admin pages again. Remove rows by hand if ever needed.
    }
};
