<?php

namespace Tests\Feature\Lat;

use App\Mail\Lat\ActivityAlertMail;
use App\Mail\Lat\CheckinReminderMail;
use App\Mail\Lat\MatchGoodNewsMail;
use App\Mail\Lat\MonthlyCheckinMail;
use App\Mail\Lat\OtherGardensMail;
use App\Mail\Lat\StillLookingMail;
use App\Models\Group;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

/**
 * Behavioural coverage of the L&T mail commands: who gets each email, the
 * "active recipient" gate, dedup, the accepted-agreement gate, and exclusion
 * of the matched parties. All run with --no-spool so Mail::fake() sees the sends.
 */
class LatMailCommandsTest extends TestCase
{
    private Group $group;

    protected function setUp(): void
    {
        parent::setUp();
        $this->group = $this->createTestGroup();
        // Point the L&T world group at our throwaway test group.
        config(['freegle.lat.world_groupid' => $this->group->id]);
    }

    private function email(User $u): string
    {
        return DB::table('users_emails')->where('userid', $u->id)->orderByDesc('preferred')->value('email');
    }

    /** A member who has posted a message of the given type in the world group (so they have a location). */
    private function member(string $type, array $msgAttrs = []): User
    {
        $u = $this->createTestUser();
        $this->createMembership($u, $this->group);
        $this->createTestMessage($u, $this->group, array_merge(['type' => $type], $msgAttrs));

        return $u;
    }

    private function promise(int $msgid, int $tenderId, ?\Illuminate\Support\Carbon $acceptedAt): void
    {
        DB::table('messages_promises')->insert([
            'msgid' => $msgid,
            'userid' => $tenderId,
            'promisedat' => now()->subDays(1),
            'acceptedat' => $acceptedAt,
            'acceptedby' => $acceptedAt ? $tenderId : null,
        ]);
    }

    public function test_activity_alert_goes_to_active_nearby_user(): void
    {
        // Active lender posts a brand-new Offer; a still-looking tender is nearby.
        $lender = $this->member('Offer', ['arrival' => now()]);
        $tender = $this->member('Wanted', ['arrival' => now()->subDays(40)]);

        Mail::fake();
        $this->artisan('lat:send-activity-alerts', ['--no-spool' => true, '--hours' => 24])->assertSuccessful();

        $tenderEmail = $this->email($tender);
        Mail::assertSent(ActivityAlertMail::class, fn ($m) => $m->recipientEmail === $tenderEmail);
    }

    public function test_activity_alert_respects_disabled_setting(): void
    {
        $lender = $this->member('Offer', ['arrival' => now()]);
        $tender = $this->member('Wanted', ['arrival' => now()->subDays(40)]);
        $tender->settings = ['lat_alerts' => ['enabled' => false]];
        $tender->save();

        Mail::fake();
        $this->artisan('lat:send-activity-alerts', ['--no-spool' => true, '--hours' => 24])->assertSuccessful();

        $tenderEmail = $this->email($tender);
        Mail::assertNotSent(ActivityAlertMail::class, fn ($m) => $m->recipientEmail === $tenderEmail);
    }

    public function test_activity_alert_dedupes_across_runs(): void
    {
        $this->member('Offer', ['arrival' => now()]);
        $this->member('Wanted', ['arrival' => now()->subDays(40)]);

        Mail::fake();
        $this->artisan('lat:send-activity-alerts', ['--no-spool' => true, '--hours' => 24])->assertSuccessful();
        $this->artisan('lat:send-activity-alerts', ['--no-spool' => true, '--hours' => 24])->assertSuccessful();

        // The second run must not re-alert anyone about the same listing.
        Mail::assertSent(ActivityAlertMail::class, 1);
    }

    public function test_checkin_reminders_email_both_parties_for_accepted_agreement(): void
    {
        $lender = $this->member('Offer');
        $offer = DB::table('messages')->where('fromuser', $lender->id)->value('id');
        $tender = $this->createTestUser();
        $this->createMembership($tender, $this->group);
        $this->promise((int) $offer, $tender->id, now()->subDays(14)->subHours(2));

        Mail::fake();
        $this->artisan('lat:send-checkin-reminders', ['--no-spool' => true])->assertSuccessful();

        Mail::assertSent(CheckinReminderMail::class, 2);
    }

    public function test_checkin_reminders_skip_unaccepted_agreement(): void
    {
        $lender = $this->member('Offer');
        $offer = DB::table('messages')->where('fromuser', $lender->id)->value('id');
        $tender = $this->createTestUser();
        $this->createMembership($tender, $this->group);
        $this->promise((int) $offer, $tender->id, null); // proposed, not accepted

        Mail::fake();
        $this->artisan('lat:send-checkin-reminders', ['--no-spool' => true])->assertSuccessful();

        Mail::assertNothingSent();
    }

    public function test_match_news_tells_bystanders_but_not_the_parties(): void
    {
        $lender = $this->member('Offer');
        $offer = DB::table('messages')->where('fromuser', $lender->id)->value('id');
        $tender = $this->createTestUser();
        $this->createMembership($tender, $this->group);
        $this->promise((int) $offer, $tender->id, now()->subHours(1)); // just confirmed

        $bystander = $this->member('Wanted'); // nearby member with a location

        Mail::fake();
        $this->artisan('lat:send-match-news', ['--no-spool' => true])->assertSuccessful();

        $bystanderEmail = $this->email($bystander);
        $lenderEmail = $this->email($lender);
        Mail::assertSent(MatchGoodNewsMail::class, fn ($m) => $m->recipientEmail === $bystanderEmail);
        Mail::assertNotSent(MatchGoodNewsMail::class, fn ($m) => $m->recipientEmail === $lenderEmail);
    }

    public function test_post_agreement_prompts_ask_each_party_their_question(): void
    {
        $lender = $this->member('Offer');
        $offer = DB::table('messages')->where('fromuser', $lender->id)->value('id');
        $tender = $this->createTestUser();
        $this->createMembership($tender, $this->group);
        $this->promise((int) $offer, $tender->id, now()->subHours(2));

        Mail::fake();
        $this->artisan('lat:send-post-agreement-prompts', ['--no-spool' => true])->assertSuccessful();

        $tenderEmail = $this->email($tender);
        $lenderEmail = $this->email($lender);
        Mail::assertSent(StillLookingMail::class, fn ($m) => $m->recipientEmail === $tenderEmail);
        Mail::assertSent(OtherGardensMail::class, fn ($m) => $m->recipientEmail === $lenderEmail);
    }

    public function test_monthly_checkin_emails_active_user_and_respects_optout(): void
    {
        $lender = $this->member('Offer'); // active lender (no promise)

        Mail::fake();
        $this->artisan('lat:send-monthly-checkin', ['--no-spool' => true])->assertSuccessful();
        $lenderEmail = $this->email($lender);
        Mail::assertSent(MonthlyCheckinMail::class, fn ($m) => $m->recipientEmail === $lenderEmail);

        // Opt-out + already sent this month → nothing more.
        Mail::fake();
        $this->artisan('lat:send-monthly-checkin', ['--no-spool' => true])->assertSuccessful();
        Mail::assertNotSent(MonthlyCheckinMail::class, fn ($m) => $m->recipientEmail === $lenderEmail);
    }
}
