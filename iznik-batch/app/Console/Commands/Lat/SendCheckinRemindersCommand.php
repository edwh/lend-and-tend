<?php

namespace App\Console\Commands\Lat;

use App\Mail\Lat\CheckinReminderMail;
use App\Mail\Traits\FeatureFlags;
use App\Services\EmailSpoolerService;
use App\Services\Lat\LatMailService;
use Illuminate\Console\Command;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

/**
 * Milestone check-in reminders to both parties of a CONFIRMED garden-sharing
 * agreement, at 14d / 30d / 90d / 180d after acceptance.
 *
 * The agreement is a messages_promises row: the lender is the Offer's owner
 * (messages.fromuser) and the tender is the party promised to
 * (messages_promises.userid). Each interval is sent at most once, tracked in
 * messages_promises.checkin_reminders_sent.
 */
class SendCheckinRemindersCommand extends Command
{
    use FeatureFlags;

    public const EMAIL_TYPE = 'LatCheckinReminder';

    /** Days after acceptance → label shown in the email. */
    private const INTERVALS = [
        14 => '2-week',
        30 => '1-month',
        90 => '3-month',
        180 => '6-month',
    ];

    protected $signature = 'lat:send-checkin-reminders
                            {--dry-run : Preview without sending}
                            {--no-spool : Send directly instead of spooling}';

    protected $description = 'Send milestone check-in emails to both parties of a confirmed garden-sharing agreement';

    public function handle(LatMailService $lat, EmailSpoolerService $spooler): int
    {
        if (!self::isEmailTypeEnabled(self::EMAIL_TYPE)) {
            $this->info(self::EMAIL_TYPE . ' disabled via FREEGLE_MAIL_ENABLED_TYPES.');
            return self::SUCCESS;
        }

        $dryRun = (bool) $this->option('dry-run');
        $spool = !$this->option('no-spool');
        $groupId = $lat->worldGroupId();
        $sent = 0;

        foreach (self::INTERVALS as $days => $label) {
            $key = "{$days}d";
            $windowStart = Carbon::now()->subDays($days + 1);
            $windowEnd = Carbon::now()->subDays($days);

            // Confirmed agreements (acceptedat set) in the L&T world group whose
            // acceptance falls in this interval's window.
            $agreements = DB::table('messages_promises as mp')
                ->join('messages_groups as mg', 'mg.msgid', '=', 'mp.msgid')
                ->where('mg.groupid', $groupId)
                ->whereNotNull('mp.acceptedat')
                ->whereBetween('mp.acceptedat', [$windowStart, $windowEnd])
                ->select('mp.id', 'mp.msgid', 'mp.userid', 'mp.checkin_reminders_sent')
                ->get();

            foreach ($agreements as $agreement) {
                $remindersSent = json_decode($agreement->checkin_reminders_sent ?? '{}', true) ?: [];
                if (!empty($remindersSent[$key])) {
                    continue;
                }

                $parties = $lat->agreementParties((int) $agreement->msgid, (int) $agreement->userid);
                $lender = $this->party($lat, $parties['lender']);
                $tender = $this->party($lat, $parties['tender']);

                if (!$lender || !$tender) {
                    continue;
                }

                if ($dryRun) {
                    $this->info("[DRY RUN] Would send {$key} reminder for agreement {$agreement->id} to {$lender->fullname} and {$tender->fullname}");
                    $sent += 2;
                    continue;
                }

                foreach ([[$lender, $tender->fullname], [$tender, $lender->fullname]] as [$recipient, $otherName]) {
                    if (empty($recipient->email)) {
                        continue;
                    }
                    $mailable = new CheckinReminderMail(
                        recipientEmail: $recipient->email,
                        recipientName: $recipient->fullname,
                        userId: $recipient->id,
                        otherName: $otherName,
                        agreementId: (int) $agreement->id,
                        intervalLabel: $label,
                    );
                    try {
                        if ($spool) {
                            $spooler->spool($mailable, $recipient->email, self::EMAIL_TYPE);
                        } else {
                            Mail::to($recipient->email)->send($mailable);
                        }
                        $sent++;
                    } catch (\Throwable $e) {
                        Log::warning('lat:send-checkin-reminders — mail failed', ['agreement' => $agreement->id, 'userid' => $recipient->id, 'error' => $e->getMessage()]);
                    }
                }

                $remindersSent[$key] = Carbon::now()->toIso8601String();
                DB::table('messages_promises')->where('id', $agreement->id)
                    ->update(['checkin_reminders_sent' => json_encode($remindersSent)]);
            }
        }

        $prefix = $dryRun ? '[DRY RUN] Would send' : 'Sent';
        $this->info("{$prefix} {$sent} check-in reminder email(s).");
        Log::info('lat:send-checkin-reminders', ['sent' => $sent, 'dry_run' => $dryRun, 'spool' => $spool]);

        return self::SUCCESS;
    }

    /**
     * A party row: { id, fullname, email } or null.
     */
    private function party(LatMailService $lat, int $userId): ?object
    {
        $user = DB::table('users')->where('id', $userId)->first(['id', 'fullname']);
        if (!$user) {
            return null;
        }
        $user->email = $lat->preferredEmail($userId);

        return $user;
    }
}
