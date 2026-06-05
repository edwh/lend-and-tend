<?php

namespace Tests\Feature\Mail;

use App\Mail\Lat\ActivityAlertMail;
use App\Mail\Lat\MatchGoodNewsMail;
use App\Mail\Lat\StillLookingMail;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\Mail;
use Tests\Support\MailpitHelper;
use Tests\TestCase;

/**
 * Integration tests: actually render the MJML through the Sidecar and deliver
 * to the L&T Mailpit catcher, then verify subject + body via the Mailpit API.
 * Confirms the whole pipeline (Blade -> MJML -> sidecar -> SMTP) works.
 */
class LatEmailIntegrationTest extends TestCase
{
    protected MailpitHelper $mailpit;
    protected string $testRunId;

    protected function setUp(): void
    {
        parent::setUp();
        $this->testRunId = uniqid('lat_', true);

        // L&T sends via the lat-mailpit catcher (not Freegle's 'mailpit').
        Config::set('mail.default', 'smtp');
        Config::set('mail.mailers.smtp.host', 'lat-mailpit');
        Config::set('mail.mailers.smtp.port', 1025);

        $this->mailpit = new MailpitHelper('http://lat-mailpit:8025');
    }

    protected function uniqueEmail(string $prefix = 'test', string $domain = 'example.com'): string
    {
        return "{$prefix}_{$this->testRunId}@{$domain}";
    }

    protected function isMailpitAvailable(): bool
    {
        $ch = curl_init('http://lat-mailpit:8025/api/v1/messages');
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 2);
        curl_setopt($ch, CURLOPT_TIMEOUT, 5);
        curl_exec($ch);
        $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        return $code === 200;
    }

    public function test_activity_alert_delivered_and_rendered(): void
    {
        if (!$this->isMailpitAvailable()) {
            $this->markTestSkipped('lat-mailpit is not available.');
        }

        $to = $this->uniqueEmail('activity');
        Mail::to($to)->send(new ActivityAlertMail($to, 'Sam Tender', null, [
            ['id' => 101, 'subject' => 'A sunny back garden', 'type' => 'Offer', 'distance_km' => 1.1],
        ]));

        $message = $this->mailpit->assertMessageSentTo($to);
        $this->assertStringContainsString('garden listing', $this->mailpit->getSubject($message));
        $this->assertTrue($this->mailpit->bodyContains($message, 'A sunny back garden'), 'listing subject missing');
        $this->assertTrue($this->mailpit->bodyContains($message, $to), 'footer should contain recipient');
    }

    public function test_match_good_news_delivered_and_general(): void
    {
        if (!$this->isMailpitAvailable()) {
            $this->markTestSkipped('lat-mailpit is not available.');
        }

        $to = $this->uniqueEmail('match');
        Mail::to($to)->send(new MatchGoodNewsMail($to, 'Sam', null, 2.5));

        $message = $this->mailpit->assertMessageSentTo($to);
        $this->assertTrue($this->mailpit->bodyContains($message, 'being shared near you'), 'good-news copy missing');
        // Privacy: must not name a specific garden subject.
        $this->assertFalse($this->mailpit->bodyContains($message, 'OFFER:'), 'must not leak a listing subject');
    }

    public function test_still_looking_has_both_choices(): void
    {
        if (!$this->isMailpitAvailable()) {
            $this->markTestSkipped('lat-mailpit is not available.');
        }

        $to = $this->uniqueEmail('stilllooking');
        Mail::to($to)->send(new StillLookingMail($to, 'Sam', null, 'Priya'));

        $message = $this->mailpit->assertMessageSentTo($to);
        $this->assertTrue($this->mailpit->bodyContains($message, 'still-looking'), 'should link to the still-looking page');
        $this->assertTrue($this->mailpit->bodyContains($message, 'Priya'), "should mention the other party's name");
    }
}
