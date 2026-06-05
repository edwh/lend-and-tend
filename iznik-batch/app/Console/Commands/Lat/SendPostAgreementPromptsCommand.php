<?php

namespace App\Console\Commands\Lat;

use App\Mail\Lat\LatNames;
use App\Mail\Lat\OtherGardensMail;
use App\Mail\Lat\StillLookingMail;
use App\Mail\Traits\FeatureFlags;
use App\Services\EmailSpoolerService;
use App\Services\Lat\LatMailService;
use Illuminate\Console\Command;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

/**
 * Just after an agreement is confirmed, ask each party the right question:
 *   - the TENDER: "still looking for other gardens?"  (StillLookingMail)
 *   - the LENDER: "have you other gardens to share?"   (OtherGardensMail)
 *
 * Sent once per party per agreement, tracked in
 * users.settings.lat_post_agreement_prompts[msgid].
 */
class SendPostAgreementPromptsCommand extends Command
{
    use FeatureFlags;

    public const TENDER_TYPE = 'LatStillLooking';
    public const LENDER_TYPE = 'LatOtherGardens';

    protected $signature = 'lat:send-post-agreement-prompts
                            {--dry-run : Preview without sending}
                            {--days=3 : Look back this many days for newly-confirmed agreements}
                            {--no-spool : Send directly instead of spooling}';

    protected $description = 'Ask the tender if still looking and the lender if they have other gardens, just after an agreement';

    public function handle(LatMailService $lat, EmailSpoolerService $spooler): int
    {
        $tenderEnabled = self::isEmailTypeEnabled(self::TENDER_TYPE);
        $lenderEnabled = self::isEmailTypeEnabled(self::LENDER_TYPE);
        if (!$tenderEnabled && !$lenderEnabled) {
            $this->info('Post-agreement prompts disabled via FREEGLE_MAIL_ENABLED_TYPES.');
            return self::SUCCESS;
        }

        $dryRun = (bool) $this->option('dry-run');
        $spool = !$this->option('no-spool');
        $groupId = $lat->worldGroupId();
        $since = Carbon::now()->subDays((int) $this->option('days'));
        $sent = 0;

        $agreements = DB::table('messages_promises as mp')
            ->join('messages_groups as mg', 'mg.msgid', '=', 'mp.msgid')
            ->where('mg.groupid', $groupId)
            ->whereNotNull('mp.acceptedat')
            ->where('mp.acceptedat', '>=', $since)
            ->select('mp.id', 'mp.msgid', 'mp.userid')
            ->get();

        if ($agreements->isEmpty()) {
            $this->info('No newly-confirmed agreements found.');
            return self::SUCCESS;
        }

        foreach ($agreements as $agreement) {
            $msgid = (int) $agreement->msgid;
            $parties = $lat->agreementParties($msgid, (int) $agreement->userid);
            $lender = $lat->userRecord($parties['lender']);
            $tender = $lat->userRecord($parties['tender']);
            if (!$lender || !$tender) {
                continue;
            }

            // Tender: still looking for other gardens?
            if ($tenderEnabled) {
                $sent += $this->maybeSend($lat, $spooler, $spool, $dryRun, $tender, $msgid, self::TENDER_TYPE, fn () => new StillLookingMail(
                    recipientEmail: $tender->email,
                    recipientName: $tender->fullname,
                    userId: $tender->id,
                    otherName: LatNames::first($lender->fullname) ?? 'your garden host',
                ));
            }

            // Lender: any other gardens to share?
            if ($lenderEnabled) {
                $sent += $this->maybeSend($lat, $spooler, $spool, $dryRun, $lender, $msgid, self::LENDER_TYPE, fn () => new OtherGardensMail(
                    recipientEmail: $lender->email,
                    recipientName: $lender->fullname,
                    userId: $lender->id,
                    otherName: LatNames::first($tender->fullname) ?? 'your tender',
                ));
            }
        }

        $prefix = $dryRun ? '[DRY RUN] Would send' : 'Sent';
        $this->info("{$prefix} {$sent} post-agreement prompt email(s).");
        Log::info('lat:send-post-agreement-prompts', ['sent' => $sent, 'agreements' => $agreements->count(), 'dry_run' => $dryRun, 'spool' => $spool]);

        return self::SUCCESS;
    }

    /**
     * Send a prompt to a party unless they've already had one for this agreement.
     * Returns 1 if sent (or would send in dry-run), else 0.
     */
    private function maybeSend(LatMailService $lat, EmailSpoolerService $spooler, bool $spool, bool $dryRun, object $user, int $msgid, string $type, callable $make): int
    {
        if (empty($user->email)) {
            return 0;
        }
        $prompts = $user->settings['lat_post_agreement_prompts'] ?? [];
        if (!empty($prompts[$msgid])) {
            return 0;
        }

        if ($dryRun) {
            $this->info("[DRY RUN] Would send {$type} to user {$user->id} for agreement msg {$msgid}");
            return 1;
        }

        try {
            $mailable = $make();
            if ($spool) {
                $spooler->spool($mailable, $user->email, $type);
            } else {
                Mail::to($user->email)->send($mailable);
            }
            $prompts[$msgid] = Carbon::now()->toIso8601String();
            $settings = $user->settings;
            $settings['lat_post_agreement_prompts'] = $prompts;
            $lat->saveSettings($user->id, $settings);
            $user->settings = $settings;

            return 1;
        } catch (\Throwable $e) {
            Log::warning('lat:send-post-agreement-prompts — mail failed', ['userid' => $user->id, 'type' => $type, 'msgid' => $msgid, 'error' => $e->getMessage()]);
            return 0;
        }
    }
}
