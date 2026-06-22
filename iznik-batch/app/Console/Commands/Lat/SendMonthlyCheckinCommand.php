<?php

namespace App\Console\Commands\Lat;

use App\Mail\Lat\MonthlyCheckinMail;
use App\Mail\Traits\FeatureFlags;
use App\Services\EmailSpoolerService;
use App\Services\Lat\LatMailService;
use Illuminate\Console\Command;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

/**
 * Monthly "still keen?" nudge to ACTIVE but UNMATCHED L&T users — still-looking
 * tenders and lenders whose garden hasn't found anyone yet. Gated per user by
 * users.settings.lat_waitlist_reminders (default true) and sent at most once a
 * calendar month (users.settings.lat_last_monthly_checkin = 'YYYY-MM').
 */
class SendMonthlyCheckinCommand extends Command
{
    use FeatureFlags;

    public const EMAIL_TYPE = 'LatMonthlyCheckin';

    protected $signature = 'lat:send-monthly-checkin
                            {--dry-run : Preview without sending}
                            {--force : Ignore the once-a-month guard}
                            {--no-spool : Send directly instead of spooling}';

    protected $description = 'Monthly nudge to active, unmatched L&T users (still-looking tenders / unmatched lenders)';

    public function handle(LatMailService $lat, EmailSpoolerService $spooler): int
    {
        if (!self::isEmailTypeEnabled(self::EMAIL_TYPE)) {
            $this->info(self::EMAIL_TYPE . ' disabled via FREEGLE_MAIL_ENABLED_TYPES.');
            return self::SUCCESS;
        }

        $dryRun = (bool) $this->option('dry-run');
        $force = (bool) $this->option('force');
        $spool = !$this->option('no-spool');
        $thisMonth = Carbon::now()->format('Y-m');
        $sent = 0;

        $lenders = array_flip($lat->activeLenderIds());
        $tenders = array_flip($lat->stillLookingTenderIds());

        // Recent listings (30 days), card-ready (incl. image) so the email can
        // SHOW what's new nearby, not just count it.
        $recent = $lat->recentListings(Carbon::now()->subDays(30));

        foreach ($lat->membersWithLocation() as $user) {
            $isLender = isset($lenders[$user->id]);
            $isTender = isset($tenders[$user->id]);
            if (!$isLender && !$isTender) {
                continue;
            }
            if (empty($user->email)) {
                continue;
            }
            if (($user->settings['lat_waitlist_reminders'] ?? true) === false) {
                continue;
            }
            if (!$force && ($user->settings['lat_last_monthly_checkin'] ?? null) === $thisMonth) {
                continue;
            }

            $role = $isLender && $isTender ? 'both' : ($isLender ? 'lender' : 'tender');
            $radiusKm = (float) ($user->settings['lat_travelRadius'] ?? 10);
            $nearbyCards = [];
            foreach ($recent as $msg) {
                if ((int) $msg->fromuser === $user->id) {
                    continue;
                }
                $dist = $lat->haversineKm($user->lat, $user->lng, (float) $msg->lat, (float) $msg->lng);
                if ($dist <= $radiusKm) {
                    $nearbyCards[] = [
                        'id' => (int) $msg->id,
                        'subject' => $msg->subject,
                        'type' => $msg->type,
                        'text' => $lat->listingSnippet($msg->textbody),
                        'imageUrl' => $msg->imageUrl,
                        'distance_km' => round($dist, 1),
                    ];
                }
            }
            $newNearby = count($nearbyCards);

            if ($dryRun) {
                $this->info("[DRY RUN] Would send monthly check-in to user {$user->id} ({$role}, {$newNearby} nearby)");
                $sent++;
                continue;
            }

            $mailable = new MonthlyCheckinMail(
                recipientEmail: $user->email,
                recipientName: $user->fullname,
                userId: $user->id,
                role: $role,
                newNearbyCount: $newNearby,
                newListings: array_slice($nearbyCards, 0, 4),
            );
            try {
                if ($spool) {
                    $spooler->spool($mailable, $user->email, self::EMAIL_TYPE);
                } else {
                    Mail::to($user->email)->send($mailable);
                }
                $sent++;

                $settings = $user->settings;
                $settings['lat_last_monthly_checkin'] = $thisMonth;
                $lat->saveSettings($user->id, $settings);
            } catch (\Throwable $e) {
                Log::warning('lat:send-monthly-checkin — mail failed', ['userid' => $user->id, 'error' => $e->getMessage()]);
            }
        }

        $prefix = $dryRun ? '[DRY RUN] Would send' : 'Sent';
        $this->info("{$prefix} {$sent} monthly check-in email(s).");
        Log::info('lat:send-monthly-checkin', ['sent' => $sent, 'month' => $thisMonth, 'dry_run' => $dryRun, 'spool' => $spool]);

        return self::SUCCESS;
    }
}
