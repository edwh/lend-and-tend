<?php

namespace App\Mail\Lat;

use App\Mail\MjmlMailable;
use App\Mail\Traits\LoggableEmail;
use App\Mail\Traits\TrackableEmail;
use Illuminate\Mail\Mailables\Address;
use Illuminate\Mail\Mailables\Envelope;

/**
 * Passwordless "magic link" sign-in email for L&T.
 *
 * L&T has no passwords — members sign in by requesting a one-tap link. This
 * email carries a login URL (…/?u=&k=) that app.vue consumes to authenticate
 * the member straight away. It replaces the forgot-password email for the L&T
 * deployment.
 *
 * The login URL is deliberately NOT wrapped in click tracking: it carries an
 * auth token, so it must reach the site untouched.
 */
class LoginLinkMail extends MjmlMailable
{
    use LoggableEmail, TrackableEmail;

    public function __construct(
        public int $userId,
        public string $email,
        public string $loginUrl,
    ) {
        parent::__construct();

        if (config('freegle.email_tracking_enabled', true)) {
            $this->initTracking(
                'LatLoginLink',
                $this->email,
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
        return 'Your ' . config('freegle.branding.name') . ' sign-in link';
    }

    public function build(): static
    {
        $site = rtrim(config('freegle.sites.user'), '/');

        return $this->mjmlView(
            'emails.mjml.lat.login-link',
            array_merge([
                'email' => $this->email,
                'loginUrl' => $this->loginUrl,
                'settingsUrl' => $site . '/settings',
                'unsubscribeUrl' => $site . '/settings',
            ], $this->getTrackingData()),
            'emails.text.lat.login-link',
        )->to($this->email)
            ->applyLogging('LatLoginLink');
    }
}
