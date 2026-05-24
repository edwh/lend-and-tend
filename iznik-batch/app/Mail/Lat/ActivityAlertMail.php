<?php

namespace App\Mail\Lat;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class ActivityAlertMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public readonly string $recipientName,
        public readonly array  $newListings,  // [{subject, type, distance_km, id}]
        public readonly string $userSite,
    ) {}

    public function envelope(): Envelope
    {
        $count = count($this->newListings);
        $noun  = $count === 1 ? 'new garden listing' : 'new garden listings';
        return new Envelope(
            subject: "{$count} {$noun} near you on Lend & Tend",
        );
    }

    public function content(): Content
    {
        return new Content(
            markdown: 'emails.lat.activity-alert',
        );
    }
}
