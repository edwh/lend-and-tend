<?php

namespace App\Mail\Lat;

use App\Mail\MjmlMailable;
use App\Mail\Traits\LoggableEmail;
use App\Mail\Traits\TrackableEmail;
use Illuminate\Mail\Mailables\Address;
use Illuminate\Mail\Mailables\Envelope;

/**
 * Milestone check-in for both parties of a garden-sharing agreement
 * (14d / 30d / 90d / 180d after it was made). One tap records how it's going.
 */
class CheckinReminderMail extends MjmlMailable
{
    use LoggableEmail, TrackableEmail;

    public function __construct(
        public string $recipientEmail,
        public string $recipientName,
        public ?int $userId,
        public string $otherName,
        public int $agreementId,
        public string $intervalLabel,
    ) {
        parent::__construct();

        if (config('freegle.email_tracking_enabled', true)) {
            $this->initTracking(
                'LatCheckinReminder',
                $this->recipientEmail,
                $this->userId,
                null,
                $this->getSubject(),
            );
        }
    }

    /**
     * The label the scheduler uses ("2-week") as it reads in a sentence
     * ("two weeks"), for "It's been two weeks since ...".
     */
    public static function intervalSentence(string $label): string
    {
        return match ($label) {
            '2-week' => 'two weeks',
            '1-month' => 'a month',
            '3-month' => 'three months',
            '6-month' => 'six months',
            default => str_replace('-', ' ', $label),
        };
    }

    protected function getRecipientUserId(): ?int
    {
        return $this->userId;
    }

    public function envelope(): Envelope
    {
        return new Envelope(
            from: new Address(config('freegle.mail.noreply_addr'), config('freegle.branding.name')),
            subject: $this->getSubject(),
        );
    }

    protected function getSubject(): string
    {
        return "How's it growing? Your {$this->intervalLabel} " . config('freegle.branding.name') . ' check-in';
    }

    public function build(): static
    {
        $site = rtrim(config('freegle.sites.user'), '/');
        $base = $site . '/checkin/' . $this->agreementId;

        return $this->mjmlView(
            'emails.mjml.lat.checkin-reminder',
            array_merge([
                'email' => $this->recipientEmail,
                'firstName' => LatNames::first($this->recipientName),
                'otherName' => $this->otherName,
                'intervalLabel' => $this->intervalLabel,
                'intervalSentence' => self::intervalSentence($this->intervalLabel),
                'growingUrl' => $this->trackedUrl($base . '?status=growing', 'checkin_growing', 'cta'),
                'okUrl' => $this->trackedUrl($base . '?status=ok', 'checkin_ok', 'cta'),
                'notWorkingUrl' => $this->trackedUrl($base . '?status=not_working', 'checkin_not_working', 'cta'),
                'settingsUrl' => $this->trackedUrl($site . '/settings', 'footer_settings', 'settings'),
                'unsubscribeUrl' => $site . '/settings',
            ], $this->getTrackingData()),
            'emails.text.lat.checkin-reminder',
        )->to($this->recipientEmail)
            ->applyLogging('LatCheckinReminder');
    }
}
