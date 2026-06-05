<?php

namespace App\Mail\Lat;

use App\Mail\MjmlMailable;
use App\Mail\Traits\LoggableEmail;
use App\Mail\Traits\TrackableEmail;
use Illuminate\Mail\Mailables\Address;
use Illuminate\Mail\Mailables\Envelope;

/**
 * "New gardens near you" — sent to an active L&T user when new Offer/Wanted
 * listings appear within their travel radius.
 */
class ActivityAlertMail extends MjmlMailable
{
    use LoggableEmail, TrackableEmail;

    /**
     * @param array<int,array{id:int,subject:string,type:string,distance_km:float}> $newListings
     */
    public function __construct(
        public string $recipientEmail,
        public string $recipientName,
        public ?int $userId,
        public array $newListings,
    ) {
        parent::__construct();

        if (config('freegle.email_tracking_enabled', true)) {
            $this->initTracking(
                'LatActivityAlert',
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
        $count = count($this->newListings);
        $noun = $count === 1 ? 'garden listing' : 'garden listings';

        return "🌱 {$count} new {$noun} near you on " . config('freegle.branding.name');
    }

    public function build(): static
    {
        $site = rtrim(config('freegle.sites.user'), '/');

        $listings = array_map(function ($l) use ($site) {
            return [
                'subject' => $l['subject'] ?? 'A garden',
                'isOffer' => ($l['type'] ?? 'Offer') === 'Offer',
                'distance_km' => $l['distance_km'] ?? null,
                'url' => $this->trackedUrl($site . '/garden/' . ($l['id'] ?? ''), 'cta_listing', 'cta'),
            ];
        }, $this->newListings);

        return $this->mjmlView(
            'emails.mjml.lat.activity-alert',
            array_merge([
                'email' => $this->recipientEmail,
                'firstName' => LatNames::first($this->recipientName),
                'listings' => $listings,
                'count' => count($listings),
                'mapUrl' => $this->trackedUrl($site . '/map', 'cta_map', 'cta'),
                'settingsUrl' => $this->trackedUrl($site . '/settings', 'footer_settings', 'settings'),
                'unsubscribeUrl' => $site . '/settings',
            ], $this->getTrackingData()),
            'emails.text.lat.activity-alert',
        )->to($this->recipientEmail)
            ->applyLogging('LatActivityAlert');
    }
}
