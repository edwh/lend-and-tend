<?php

namespace App\Mail\Lat;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class CheckinReminderMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public readonly string $recipientName,
        public readonly string $otherName,
        public readonly int $agreementId,
        public readonly string $intervalLabel,
        public readonly string $userSite,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: "How's your Lend & Tend arrangement going? ({$this->intervalLabel} check-in)",
        );
    }

    public function content(): Content
    {
        return new Content(
            markdown: 'emails.lat.checkin-reminder',
        );
    }
}
