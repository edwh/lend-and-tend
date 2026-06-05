<?php

namespace App\Mail\Lat;

use App\Mail\MjmlMailable;
use App\Mail\Traits\LoggableEmail;
use App\Mail\Traits\TrackableEmail;
use Illuminate\Mail\Mailables\Address;
use Illuminate\Mail\Mailables\Envelope;

/**
 * "Good news — a garden's being shared near you." Sent to nearby L&T members
 * when a new agreement is confirmed, to share the good news and nudge them to
 * list or find a garden themselves. Deliberately general — it never names the
 * garden or the people involved.
 */
class MatchGoodNewsMail extends MjmlMailable
{
    use LoggableEmail, TrackableEmail;

    public function __construct(
        public string $recipientEmail,
        public string $recipientName,
        public ?int $userId,
        public ?float $distanceKm = null,
    ) {
        parent::__construct();

        if (config('freegle.email_tracking_enabled', true)) {
            $this->initTracking(
                'LatMatchGoodNews',
                $this->recipientEmail,
                $this->userId,
                null,
                $this->getSubject(),
            );
        }
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
        return '🌱 Good news — a garden is being shared near you';
    }

    public function build(): static
    {
        $site = rtrim(config('freegle.sites.user'), '/');

        return $this->mjmlView(
            'emails.mjml.lat.match-good-news',
            array_merge([
                'email' => $this->recipientEmail,
                'firstName' => LatNames::first($this->recipientName),
                'distanceKm' => $this->distanceKm,
                'lendUrl' => $this->trackedUrl($site . '/lend', 'cta_lend', 'cta'),
                'tendUrl' => $this->trackedUrl($site . '/tend', 'cta_tend', 'cta'),
                'mapUrl' => $this->trackedUrl($site . '/map', 'cta_map', 'cta'),
                'settingsUrl' => $this->trackedUrl($site . '/settings', 'footer_settings', 'settings'),
                'unsubscribeUrl' => $site . '/settings',
            ], $this->getTrackingData()),
            'emails.text.lat.match-good-news',
        )->to($this->recipientEmail)
            ->applyLogging('LatMatchGoodNews');
    }
}
