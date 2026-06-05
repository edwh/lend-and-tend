<?php

namespace App\Mail\Lat;

use App\Mail\MjmlMailable;
use App\Mail\Traits\LoggableEmail;
use App\Mail\Traits\TrackableEmail;
use Illuminate\Mail\Mailables\Address;
use Illuminate\Mail\Mailables\Envelope;

/**
 * Post-agreement prompt for the TENDER: now you've got a garden, are you still
 * looking for others? Records their answer in users.settings.lat_still_looking
 * via the /still-looking landing page.
 */
class StillLookingMail extends MjmlMailable
{
    use LoggableEmail, TrackableEmail;

    public function __construct(
        public string $recipientEmail,
        public string $recipientName,
        public ?int $userId,
        public string $otherName,
    ) {
        parent::__construct();

        if (config('freegle.email_tracking_enabled', true)) {
            $this->initTracking(
                'LatStillLooking',
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
        return '🌱 Enjoy your new garden! Still looking for more?';
    }

    public function build(): static
    {
        $site = rtrim(config('freegle.sites.user'), '/');

        return $this->mjmlView(
            'emails.mjml.lat.still-looking',
            array_merge([
                'email' => $this->recipientEmail,
                'firstName' => LatNames::first($this->recipientName),
                'otherName' => $this->otherName,
                'lookingUrl' => $this->trackedUrl($site . '/still-looking?choice=looking', 'still_looking_yes', 'cta'),
                'doneUrl' => $this->trackedUrl($site . '/still-looking?choice=done', 'still_looking_no', 'cta'),
                'settingsUrl' => $this->trackedUrl($site . '/settings', 'footer_settings', 'settings'),
                'unsubscribeUrl' => $site . '/settings',
            ], $this->getTrackingData()),
            'emails.text.lat.still-looking',
        )->to($this->recipientEmail)
            ->applyLogging('LatStillLooking');
    }
}
