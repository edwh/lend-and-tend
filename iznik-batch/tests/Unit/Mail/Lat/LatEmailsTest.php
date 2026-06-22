<?php

namespace Tests\Unit\Mail\Lat;

use App\Mail\Lat\ActivityAlertMail;
use App\Mail\Lat\CheckinReminderMail;
use App\Mail\Lat\MatchGoodNewsMail;
use App\Mail\Lat\MonthlyCheckinMail;
use App\Mail\Lat\OtherGardensMail;
use App\Mail\Lat\StillLookingMail;
use App\Mail\Lat\WelcomeMail;
use Tests\TestCase;

/**
 * Unit coverage for every L&T mailable: construction, subject, From address,
 * recipient-id tracking, and that build() renders the MJML template to HTML
 * (via the MJML sidecar) without leaking template syntax.
 */
class LatEmailsTest extends TestCase
{
    private function listings(): array
    {
        return [
            ['id' => 101, 'subject' => 'Sunny back garden', 'type' => 'Offer', 'distance_km' => 1.2],
            ['id' => 102, 'subject' => 'Wanted: a veg patch', 'type' => 'Wanted', 'distance_km' => 3.4],
        ];
    }

    /** @return array<string,\App\Mail\MjmlMailable> */
    private function allMailables(string $email): array
    {
        return [
            'activity' => new ActivityAlertMail($email, 'Sam Tender', 4085, $this->listings()),
            'checkin' => new CheckinReminderMail($email, 'Sam Tender', 4085, 'Priya', 71, '2-week'),
            'match' => new MatchGoodNewsMail($email, 'Sam Tender', 4085, 2.5),
            'stilllooking' => new StillLookingMail($email, 'Sam Tender', 4085, 'Priya'),
            'othergardens' => new OtherGardensMail($email, 'Priya Lender', 4084, 'Sam'),
            'monthly' => new MonthlyCheckinMail($email, 'Sam Tender', 4085, 'tender', 3),
            'welcome' => new WelcomeMail($email, 'Sam Tender', 4085, 'lender'),
        ];
    }

    public function test_all_mailables_have_noreply_from_and_nonempty_subject(): void
    {
        foreach ($this->allMailables($this->uniqueEmail('lat')) as $key => $mail) {
            $envelope = $mail->envelope();
            $this->assertNotNull($envelope->from, "$key has no From");
            $this->assertEquals(config('freegle.mail.noreply_addr'), $envelope->from->address, "$key wrong From");
            $this->assertNotEmpty($envelope->subject, "$key has empty subject");
        }
    }

    public function test_subjects_are_lat_branded(): void
    {
        $mails = $this->allMailables($this->uniqueEmail('lat'));
        $this->assertStringContainsString('garden listings', $mails['activity']->envelope()->subject);
        $this->assertStringContainsString('2-week', $mails['checkin']->envelope()->subject);
        $this->assertStringContainsString('near you', $mails['match']->envelope()->subject);
        $this->assertStringContainsString('Still looking', $mails['stilllooking']->envelope()->subject);
        $this->assertStringContainsString('tender', $mails['othergardens']->envelope()->subject);
        $this->assertStringContainsString('keen', $mails['monthly']->envelope()->subject);
        $this->assertStringContainsString('Welcome', $mails['welcome']->envelope()->subject);
    }

    public function test_welcome_is_role_aware(): void
    {
        $email = $this->uniqueEmail('lat');
        $lenderHtml = (new WelcomeMail($email, 'Sam', 1, 'lender'))->build()->render();
        $tenderHtml = (new WelcomeMail($email, 'Sam', 1, 'tender'))->build()->render();
        $this->assertStringContainsString('Share your garden', $lenderHtml);
        $this->assertStringContainsString('Find a garden to tend', $tenderHtml);
    }

    public function test_recipient_user_id_is_exposed_for_headers(): void
    {
        foreach ($this->allMailables($this->uniqueEmail('lat')) as $key => $mail) {
            $ref = new \ReflectionMethod($mail, 'getRecipientUserId');
            $ref->setAccessible(true);
            $this->assertNotNull($ref->invoke($mail), "$key has no recipient user id");
        }
    }

    public function test_each_mailable_renders_to_html_without_template_leaks(): void
    {
        foreach ($this->allMailables($this->uniqueEmail('lat')) as $key => $mail) {
            $this->assertInstanceOf(get_class($mail), $mail->build(), "$key build() did not return self");

            // Mailable::render() compiles the MJML (via the sidecar) to HTML.
            $html = $mail->render();
            $this->assertNotEmpty($html, "$key rendered empty HTML");
            $this->assertStringNotContainsString('<mjml', $html, "$key leaked raw MJML");
            $this->assertStringNotContainsString('<mj-', $html, "$key leaked raw MJML tags");
            $this->assertStringNotContainsString('{{', $html, "$key leaked Blade");
            $this->assertStringContainsString('unsubscribe', strtolower($html), "$key missing unsubscribe");
        }
    }

    public function test_listing_snippet_never_leaks_address_or_phone(): void
    {
        $svc = app(\App\Services\Lat\LatMailService::class);
        $body = json_encode([
            'description' => 'A sunny veg patch, novice-friendly.',
            'address' => '34 Alexandra Gardens, S1 2AB',
            'postcode' => 'S1 2AB',
            'phone' => '07700 900123',
        ]);

        $snippet = $svc->listingSnippet($body);

        $this->assertStringContainsString('sunny veg patch', $snippet);
        $this->assertStringNotContainsString('Alexandra Gardens', $snippet, 'snippet leaked the address');
        $this->assertStringNotContainsString('07700', $snippet, 'snippet leaked the phone');
        $this->assertStringNotContainsString('{', $snippet, 'snippet leaked raw JSON');

        // A body with no description yields nothing rather than dumping JSON.
        $this->assertNull($svc->listingSnippet(json_encode(['address' => '1 Private Road'])));
        // Plain-text (non-JSON) bodies pass through unchanged.
        $this->assertEquals('Just some plain text', $svc->listingSnippet('Just some plain text'));
    }
}
