<?php

namespace App\Console\Commands\Lat;

use App\Mail\Lat\MatchGoodNewsMail;
use App\Mail\Traits\FeatureFlags;
use App\Services\EmailSpoolerService;
use App\Services\Lat\LatMailService;
use Illuminate\Console\Command;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

/**
 * "Good news — a garden's being shared near you." When an agreement is newly
 * confirmed, tell nearby L&T members (within config lat.match_radius_km) the
 * good news and nudge them to take part. The two parties are excluded, opt-out
 * (lat_alerts.enabled = false) is respected, and each recipient is told about a
 * given match at most once (users.settings.lat_match_alerted_promiseids).
 */
class SendMatchNewsCommand extends Command
{
    use FeatureFlags;

    public const EMAIL_TYPE = 'LatMatchGoodNews';

    protected $signature = 'lat:send-match-news
                            {--dry-run : Preview without sending}
                            {--hours=168 : How far back to look for newly-confirmed agreements}
                            {--no-spool : Send directly instead of spooling}';

    protected $description = 'Tell nearby L&T members the good news when a garden gets matched';

    public function handle(LatMailService $lat, EmailSpoolerService $spooler): int
    {
        if (!self::isEmailTypeEnabled(self::EMAIL_TYPE)) {
            $this->info(self::EMAIL_TYPE . ' disabled via FREEGLE_MAIL_ENABLED_TYPES.');
            return self::SUCCESS;
        }

        $dryRun = (bool) $this->option('dry-run');
        $spool = !$this->option('no-spool');
        $groupId = $lat->worldGroupId();
        $radiusKm = (float) config('freegle.lat.match_radius_km', 5);
        $since = Carbon::now()->subHours((int) $this->option('hours'));
        $sent = 0;

        // Confirmed agreements in the world group, recently accepted.
        $matches = DB::table('messages_promises as mp')
            ->join('messages_groups as mg', 'mg.msgid', '=', 'mp.msgid')
            ->where('mg.groupid', $groupId)
            ->whereNotNull('mp.acceptedat')
            ->where('mp.acceptedat', '>=', $since)
            ->select('mp.id', 'mp.msgid', 'mp.userid')
            ->get();

        if ($matches->isEmpty()) {
            $this->info('No newly-confirmed agreements found.');
            return self::SUCCESS;
        }

        foreach ($matches as $match) {
            $loc = $lat->messageLatLng((int) $match->msgid);
            if (!$loc) {
                continue;
            }
            $parties = $lat->agreementParties((int) $match->msgid, (int) $match->userid);
            $nearby = $lat->usersNearPoint($loc['lat'], $loc['lng'], $radiusKm, [$parties['lender'], $parties['tender']]);

            foreach ($nearby as $user) {
                $alerts = $user->settings['lat_alerts'] ?? [];
                if (($alerts['enabled'] ?? true) === false) {
                    continue;
                }
                $alerted = $user->settings['lat_match_alerted_promiseids'] ?? [];
                if (in_array($match->id, $alerted)) {
                    continue;
                }

                if ($dryRun) {
                    $this->info("[DRY RUN] Would tell user {$user->id} about match {$match->id} ({$user->distance_km} km)");
                    $sent++;
                    continue;
                }

                $mailable = new MatchGoodNewsMail(
                    recipientEmail: $user->email,
                    recipientName: $user->fullname,
                    userId: $user->id,
                    distanceKm: $user->distance_km,
                );
                try {
                    if ($spool) {
                        $spooler->spool($mailable, $user->email, self::EMAIL_TYPE);
                    } else {
                        Mail::to($user->email)->send($mailable);
                    }
                    $sent++;

                    $alerted[] = $match->id;
                    if (count($alerted) > 500) {
                        $alerted = array_slice($alerted, -500);
                    }
                    $settings = $user->settings;
                    $settings['lat_match_alerted_promiseids'] = array_values(array_unique($alerted));
                    $lat->saveSettings($user->id, $settings);
                    // Keep the in-memory copy in step so a second match this run dedupes too.
                    $user->settings = $settings;
                } catch (\Throwable $e) {
                    Log::warning('lat:send-match-news — mail failed', ['userid' => $user->id, 'match' => $match->id, 'error' => $e->getMessage()]);
                }
            }
        }

        $prefix = $dryRun ? '[DRY RUN] Would send' : 'Sent';
        $this->info("{$prefix} {$sent} good-news email(s) across {$matches->count()} match(es) within {$radiusKm} km.");
        Log::info('lat:send-match-news', ['sent' => $sent, 'matches' => $matches->count(), 'radius_km' => $radiusKm, 'dry_run' => $dryRun, 'spool' => $spool]);

        return self::SUCCESS;
    }
}
