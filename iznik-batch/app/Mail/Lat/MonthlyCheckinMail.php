<?php

namespace App\Mail\Lat;

use App\Mail\MjmlMailable;
use App\Mail\Traits\LoggableEmail;
use App\Mail\Traits\TrackableEmail;
use Illuminate\Mail\Mailables\Address;
use Illuminate\Mail\Mailables\Envelope;

/**
 * Monthly nudge to active but unmatched L&T users — still-looking tenders and
 * lenders whose garden hasn't found anyone yet. Gentle "still keen?" with a
 * count of what's new nearby. Gated per user by lat_waitlist_reminders.
 */
class MonthlyCheckinMail extends MjmlMailable
{
    use LoggableEmail, TrackableEmail;

    /**
     * @param string $role 'lender' | 'tender' | 'both'
     */
    public function __construct(
        public string $recipientEmail,
        public string $recipientName,
        public ?int $userId,
        public string $role,
        public int $newNearbyCount = 0,
    ) {
        parent::__construct();

        if (config('freegle.email_tracking_enabled', true)) {
            $this->initTracking(
                'LatMonthlyCheckin',
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
        return '🌱 Still keen to grow? Your ' . config('freegle.branding.name') . ' check-in';
    }

    public function build(): static
    {
        $site = rtrim(config('freegle.sites.user'), '/');

        return $this->mjmlView(
            'emails.mjml.lat.monthly-checkin',
            array_merge([
                'email' => $this->recipientEmail,
                'firstName' => LatNames::first($this->recipientName),
                'role' => $this->role,
                'newNearbyCount' => $this->newNearbyCount,
                'mapUrl' => $this->trackedUrl($site . '/map', 'cta_map', 'cta'),
                'lendUrl' => $this->trackedUrl($site . '/lend', 'cta_lend', 'cta'),
                'tendUrl' => $this->trackedUrl($site . '/tend', 'cta_tend', 'cta'),
                'stillLookingUrl' => $this->trackedUrl($site . '/still-looking?choice=looking', 'monthly_still_looking', 'cta'),
                'doneUrl' => $this->trackedUrl($site . '/still-looking?choice=done', 'monthly_done', 'cta'),
                'settingsUrl' => $this->trackedUrl($site . '/settings', 'footer_settings', 'settings'),
                'unsubscribeUrl' => $site . '/settings',
            ], $this->getTrackingData()),
            'emails.text.lat.monthly-checkin',
        )->to($this->recipientEmail)
            ->applyLogging('LatMonthlyCheckin');
    }
}
