<?php

namespace App\Console\Commands\Lat;

use App\Mail\Lat\CheckinReminderMail;
use Illuminate\Console\Command;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

/**
 * Sends check-in reminder emails to both parties of a garden-sharing agreement.
 *
 * Intervals: 14d / 30d / 90d / 180d after promisedat.
 * Each interval is sent at most once per agreement (tracked in checkin_reminders_sent).
 */
class SendCheckinRemindersCommand extends Command
{
    protected $signature = 'lat:send-checkin-reminders
                            {--dry-run : Preview without sending}';

    protected $description = 'Send check-in reminder emails to garden-sharing agreement parties';

    /** Days after promisedat → label shown in email */
    private const INTERVALS = [
        14  => '2 weeks',
        30  => '1 month',
        90  => '3 months',
        180 => '6 months',
    ];

    public function handle(): int
    {
        $dryRun = (bool) $this->option('dry-run');
        $userSite = rtrim(env('FREEGLE_USER_SITE', 'http://localhost:4002'), '/');
        $sent = 0;

        foreach (self::INTERVALS as $days => $label) {
            $key = "{$days}d";
            $windowStart = Carbon::now()->subDays($days + 1);
            $windowEnd   = Carbon::now()->subDays($days);

            $agreements = DB::table('messages_promises')
                ->whereNotNull('promisedat')
                ->whereBetween('promisedat', [$windowStart, $windowEnd])
                ->get();

            foreach ($agreements as $agreement) {
                $remindersSent = json_decode($agreement->checkin_reminders_sent ?? '{}', true);
                if (!empty($remindersSent[$key])) {
                    continue;
                }

                $users = DB::table('users')
                    ->whereIn('id', [$agreement->userid])
                    ->get()
                    ->keyBy('id');

                // The agreement msgid links to the lender's message; find the other party via chat.
                $lender = $this->getUserById($agreement->userid);
                $tender = $this->getOtherPartyFromChat($agreement->msgid, $agreement->userid);

                if (!$lender || !$tender) {
                    continue;
                }

                if ($dryRun) {
                    $this->info("[DRY RUN] Would send {$key} reminder for agreement {$agreement->id} to {$lender->fullname} and {$tender->fullname}");
                    $sent += 2;
                    continue;
                }

                foreach ([
                    [$lender, $tender->fullname],
                    [$tender, $lender->fullname],
                ] as [$recipient, $otherName]) {
                    $email = $recipient->email_preferred ?? null;
                    if (!$email) continue;

                    try {
                        Mail::to($email)->send(new CheckinReminderMail(
                            recipientName: $recipient->fullname,
                            otherName: $otherName,
                            agreementId: $agreement->id,
                            intervalLabel: $label,
                            userSite: $userSite,
                        ));
                        $sent++;
                    } catch (\Throwable $e) {
                        Log::warning('lat:send-checkin-reminders — mail failed', [
                            'agreement' => $agreement->id,
                            'userid' => $recipient->id,
                            'error' => $e->getMessage(),
                        ]);
                    }
                }

                // Mark this interval as sent so we don't re-send.
                $remindersSent[$key] = Carbon::now()->toIso8601String();
                DB::table('messages_promises')
                    ->where('id', $agreement->id)
                    ->update(['checkin_reminders_sent' => json_encode($remindersSent)]);
            }
        }

        $prefix = $dryRun ? '[DRY RUN] Would send' : 'Sent';
        $this->info("{$prefix} {$sent} check-in reminder email(s).");
        Log::info('lat:send-checkin-reminders', ['sent' => $sent, 'dry_run' => $dryRun]);

        return self::SUCCESS;
    }

    private function getUserById(int $id): ?object
    {
        $user = DB::table('users')->where('id', $id)->first();
        if (!$user) return null;
        $emails = DB::table('users_emails')
            ->where('userid', $id)
            ->orderBy('preferred', 'desc')
            ->get();
        $user->email_preferred = $emails->first()?->email;
        return $user;
    }

    private function getOtherPartyFromChat(int $msgid, int $knownUserId): ?object
    {
        // Find a chat room that references this message and involves knownUserId.
        $room = DB::table('chat_rooms')
            ->where('refmsgid', $msgid)
            ->first();

        if (!$room) return null;

        $otherId = $room->user1 === $knownUserId ? $room->user2 : $room->user1;
        return $this->getUserById($otherId);
    }
}
