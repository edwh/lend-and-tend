<?php

namespace App\Mail\Lat;

use App\Mail\MjmlMailable;
use App\Mail\Traits\LoggableEmail;
use App\Mail\Traits\TrackableEmail;
use Illuminate\Mail\Mailables\Address;
use Illuminate\Mail\Mailables\Envelope;

/**
 * Welcome email for a brand-new L&T member, sent just after they join.
 *
 * Role-aware: a lender is nudged to list their garden, a tender to find one,
 * and "both"/unknown gets the neutral "explore the map" path. Mirrors the
 * other L&T mailables (MJML via the Sidecar, spooled to the smart host).
 */
class WelcomeMail extends MjmlMailable
{
    use LoggableEmail, TrackableEmail;

    public function __construct(
        public string $recipientEmail,
        public string $recipientName,
        public ?int $userId,
        public ?string $role = null,
    ) {
        parent::__construct();

        if (config('freegle.email_tracking_enabled', true)) {
            $this->initTracking(
                'LatWelcome',
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
        return '🌱 Welcome to ' . config('freegle.branding.name') . '!';
    }

    public function build(): static
    {
        $site = rtrim(config('freegle.sites.user'), '/');
        $role = in_array($this->role, ['lender', 'tender', 'both'], true) ? $this->role : 'both';

        return $this->mjmlView(
            'emails.mjml.lat.welcome',
            array_merge([
                'email' => $this->recipientEmail,
                'firstName' => LatNames::first($this->recipientName),
                'role' => $role,
                'mapUrl' => $this->trackedUrl($site . '/map', 'welcome_map', 'cta'),
                'lendUrl' => $this->trackedUrl($site . '/lend', 'welcome_lend', 'cta'),
                'tendUrl' => $this->trackedUrl($site . '/tend', 'welcome_tend', 'cta'),
                'rulesUrl' => $this->trackedUrl($site . '/ground-rules', 'welcome_rules', 'info'),
                'settingsUrl' => $this->trackedUrl($site . '/settings', 'footer_settings', 'settings'),
                'unsubscribeUrl' => $site . '/settings',
            ], $this->getTrackingData()),
            'emails.text.lat.welcome',
        )->to($this->recipientEmail)
            ->applyLogging('LatWelcome');
    }
}
