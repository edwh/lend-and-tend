<?php

namespace App\Mail\Lat;

use App\Mail\MjmlMailable;
use App\Mail\Traits\LoggableEmail;
use App\Mail\Traits\TrackableEmail;
use Illuminate\Mail\Mailables\Address;
use Illuminate\Mail\Mailables\Envelope;

/**
 * Post-agreement prompt for the LENDER: your garden's found a tender — do you
 * have other gardens to share, or is this it? Routes to the /share-another
 * landing page which either starts a new listing or marks them as done.
 */
class OtherGardensMail extends MjmlMailable
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
                'LatOtherGardens',
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
        return '🌿 Your garden has found a tender — got another to share?';
    }

    public function build(): static
    {
        $site = rtrim(config('freegle.sites.user'), '/');

        return $this->mjmlView(
            'emails.mjml.lat.other-gardens',
            array_merge([
                'email' => $this->recipientEmail,
                'firstName' => LatNames::first($this->recipientName),
                'otherName' => $this->otherName,
                'moreUrl' => $this->trackedUrl($site . '/share-another?choice=more', 'other_gardens_yes', 'cta'),
                'doneUrl' => $this->trackedUrl($site . '/share-another?choice=done', 'other_gardens_no', 'cta'),
                'settingsUrl' => $this->trackedUrl($site . '/settings', 'footer_settings', 'settings'),
                'unsubscribeUrl' => $site . '/settings',
            ], $this->getTrackingData()),
            'emails.text.lat.other-gardens',
        )->to($this->recipientEmail)
            ->applyLogging('LatOtherGardens');
    }
}
