<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * L&T world group: auto-approve gardener posts.
 *
 * Background: the Freegle Go server inserts new memberships with
 *   collection='Approved', role='Member', and no ourPostingStatus value.
 * A NULL ourPostingStatus is treated as MODERATED, which means contentcheck
 * keeps every garden in collection='Pending' until a human mod approves it.
 * For L&T we want gardens visible immediately — there are no moderators in
 * the loop, and the platform is single-purpose enough that the spam-check
 * the contentcheck service runs is sufficient.
 *
 * This migration does two things, both idempotent:
 *   1) Sets groups.settings.defaultpostingstatus = 'UNMODERATED' on the L&T
 *      world group (id=1000000). This is read by the Go server for members
 *      whose ourPostingStatus is the explicit 'DEFAULT' value.
 *   2) Installs a BEFORE INSERT trigger on `memberships` that flips a
 *      NULL/empty ourPostingStatus to 'UNMODERATED' when the new row is
 *      for the L&T world group. This makes signups immediately able to
 *      post a garden that other users can see without admin intervention.
 *
 * The trigger only fires for the L&T world groupid, so Freegle membership
 * inserts elsewhere are untouched.
 */
return new class extends Migration {
    public function up(): void
    {
        // 1) Group-level default (covers any future tooling that joins
        //    with ourPostingStatus='DEFAULT' explicitly).
        DB::statement(<<<'SQL'
            UPDATE `groups`
            SET settings = JSON_SET(COALESCE(settings, '{}'), '$.defaultpostingstatus', 'UNMODERATED')
            WHERE id = 1000000
        SQL);

        // 2) Trigger — drop any prior version first for idempotency.
        DB::unprepared('DROP TRIGGER IF EXISTS lat_memberships_unmoderated_on_insert');
        DB::unprepared(<<<'SQL'
            CREATE TRIGGER lat_memberships_unmoderated_on_insert
            BEFORE INSERT ON memberships
            FOR EACH ROW
            BEGIN
                IF NEW.groupid = 1000000
                   AND (NEW.ourPostingStatus IS NULL OR NEW.ourPostingStatus = 'DEFAULT')
                THEN
                    SET NEW.ourPostingStatus = 'UNMODERATED';
                END IF;
            END
        SQL);

        // Backfill any existing L&T memberships still on NULL/DEFAULT so
        // the test users we have in place benefit too.
        DB::statement(<<<'SQL'
            UPDATE memberships
            SET ourPostingStatus = 'UNMODERATED'
            WHERE groupid = 1000000
              AND (ourPostingStatus IS NULL OR ourPostingStatus = 'DEFAULT')
        SQL);
    }

    public function down(): void
    {
        DB::unprepared('DROP TRIGGER IF EXISTS lat_memberships_unmoderated_on_insert');
        // Leave the group setting + backfilled rows alone — no good reason
        // to revert "users can post". A real rollback would set them back
        // to NULL but that doesn't restore the "couldn't post" state in
        // any useful way.
    }
};
