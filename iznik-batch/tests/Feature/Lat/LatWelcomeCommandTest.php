<?php

namespace Tests\Feature\Lat;

use App\Mail\Lat\WelcomeMail;
use App\Models\Group;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

/**
 * The welcome email goes out automatically: a scheduled run picks up every
 * account created recently that has not been welcomed (sign-up creates the
 * user; the world-group membership only appears on first post), sends
 * exactly one welcome, and records it in users.settings.lat_welcome_sent_at so
 * a re-run never sends twice. The manual --user / --email modes still work.
 */
class LatWelcomeCommandTest extends TestCase
{
    private Group $group;

    protected function setUp(): void
    {
        parent::setUp();
        $this->group = $this->createTestGroup();
        config(['freegle.lat.world_groupid' => $this->group->id]);

        // The scheduled mode selects by account creation, and other tests in
        // this run leave recent accounts behind. Stamp them as already
        // welcomed so only the accounts each test creates are candidates.
        DB::table('users')
            ->where('added', '>=', now()->subDays(3))
            ->update(['settings' => DB::raw("JSON_SET(COALESCE(settings, '{}'), '$.lat_welcome_sent_at', '2000-01-01T00:00:00+00:00')")]);
    }

    private function email(User $u): string
    {
        return DB::table('users_emails')->where('userid', $u->id)->orderByDesc('preferred')->value('email');
    }

    /** An account created $joinedAgo ago, with optional settings (no group membership yet). */
    private function joiner(string $joinedAgo = '-5 minutes', array $settings = []): User
    {
        // The model casts `settings` to an array, so pass the array itself: a
        // pre-encoded string would be encoded again and read back as a string.
        return $this->createTestUser(['added' => now()->modify($joinedAgo), 'settings' => $settings ?: null]);
    }

    private function sentAt(User $u): ?string
    {
        $settings = json_decode(DB::table('users')->where('id', $u->id)->value('settings') ?? '{}', true) ?: [];

        return $settings['lat_welcome_sent_at'] ?? null;
    }

    public function test_auto_mode_welcomes_each_new_member_once_and_records_it(): void
    {
        $lender = $this->joiner('-5 minutes', ['lat_role' => 'lender']);
        $tender = $this->joiner('-10 minutes', ['lat_role' => 'tender']);
        $lenderEmail = $this->email($lender);
        $tenderEmail = $this->email($tender);

        Mail::fake();
        $this->artisan('lat:send-welcome', ['--no-spool' => true])->assertSuccessful();

        Mail::assertSent(WelcomeMail::class, 2);
        Mail::assertSent(WelcomeMail::class, fn ($m) => $m->recipientEmail === $lenderEmail && $m->role === 'lender');
        Mail::assertSent(WelcomeMail::class, fn ($m) => $m->recipientEmail === $tenderEmail && $m->role === 'tender');
        $this->assertNotNull($this->sentAt($lender));
        $this->assertNotNull($this->sentAt($tender));

        // A second run sends nothing more.
        $this->artisan('lat:send-welcome', ['--no-spool' => true])->assertSuccessful();
        Mail::assertSent(WelcomeMail::class, 2);
    }

    public function test_auto_mode_skips_members_already_welcomed(): void
    {
        $this->joiner('-5 minutes', ['lat_role' => 'tender', 'lat_welcome_sent_at' => '2026-10-01T10:00:00+00:00']);

        Mail::fake();
        $this->artisan('lat:send-welcome', ['--no-spool' => true])->assertSuccessful();

        Mail::assertNothingSent();
    }

    public function test_auto_mode_skips_members_who_joined_before_the_lookback(): void
    {
        $old = $this->joiner('-3 days', ['lat_role' => 'lender']);
        $new = $this->joiner('-1 hour', ['lat_role' => 'lender']);
        $newEmail = $this->email($new);

        Mail::fake();
        $this->artisan('lat:send-welcome', ['--no-spool' => true, '--hours' => 48])->assertSuccessful();

        Mail::assertSent(WelcomeMail::class, 1);
        Mail::assertSent(WelcomeMail::class, fn ($m) => $m->recipientEmail === $newEmail);
        $this->assertNull($this->sentAt($old));
    }

    public function test_auto_mode_welcomes_a_brand_new_account_with_no_membership_yet(): void
    {
        // Signing up creates the user only; the world-group membership appears
        // on first post. The welcome must not wait for that.
        $u = $this->joiner('-2 minutes', ['lat_role' => 'tender']);
        $this->assertSame(0, DB::table('memberships')->where('userid', $u->id)->count());
        $email = $this->email($u);

        Mail::fake();
        $this->artisan('lat:send-welcome', ['--no-spool' => true])->assertSuccessful();

        Mail::assertSent(WelcomeMail::class, fn ($m) => $m->recipientEmail === $email);
    }

    public function test_auto_mode_skips_deleted_accounts(): void
    {
        $this->joiner('-5 minutes', ['lat_role' => 'tender'])->update(['deleted' => now()]);

        Mail::fake();
        $this->artisan('lat:send-welcome', ['--no-spool' => true])->assertSuccessful();

        Mail::assertNothingSent();
    }

    public function test_manual_user_mode_still_sends_to_that_member(): void
    {
        $u = $this->joiner('-5 minutes', ['lat_role' => 'both']);
        $email = $this->email($u);

        Mail::fake();
        $this->artisan('lat:send-welcome', ['--user' => $u->id, '--no-spool' => true])->assertSuccessful();

        Mail::assertSent(WelcomeMail::class, 1);
        Mail::assertSent(WelcomeMail::class, fn ($m) => $m->recipientEmail === $email && $m->role === 'both');
        $this->assertNotNull($this->sentAt($u));
    }

    public function test_manual_trial_mode_sends_to_an_address_without_recording_anything(): void
    {
        Mail::fake();
        $this->artisan('lat:send-welcome', ['--email' => 'trial@example.com', '--name' => 'Trial', '--role' => 'lender', '--no-spool' => true])
            ->assertSuccessful();

        Mail::assertSent(WelcomeMail::class, fn ($m) => $m->recipientEmail === 'trial@example.com' && $m->role === 'lender');
    }

    public function test_dry_run_sends_nothing_and_records_nothing(): void
    {
        $u = $this->joiner('-5 minutes', ['lat_role' => 'tender']);

        Mail::fake();
        $this->artisan('lat:send-welcome', ['--dry-run' => true])->assertSuccessful();

        Mail::assertNothingSent();
        $this->assertNull($this->sentAt($u));
    }
}
