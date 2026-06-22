<?php

namespace App\Console\Commands\Lat;

use App\Mail\Lat\ActivityAlertMail;
use App\Mail\Traits\FeatureFlags;
use App\Services\EmailSpoolerService;
use App\Services\Lat\LatMailService;
use Illuminate\Console\Command;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

/**
 * "New gardens near you" — alerts ACTIVE L&T users when new Offer/Wanted
 * listings appear within their travel radius.
 *
 * "Active" = an active lender (has an Offer with no agreement yet) OR a
 * still-looking tender (open Wanted, or lat_still_looking != 'not_looking').
 *
 * Respects users.settings.lat_alerts.{enabled,frequency} (instant/daily/weekly,
 * weekly only on Mondays) and dedupes via users.settings.lat_alerted_msgids
 * (rolling, capped at 500). MJML email, spooled (or sent directly with --no-spool).
 */
class SendActivityAlertsCommand extends Command
{
    use FeatureFlags;

    public const EMAIL_TYPE = 'LatActivityAlert';

    protected $signature = 'lat:send-activity-alerts
                            {--dry-run : Preview without sending}
                            {--hours=24 : How many hours back to look for new listings}
                            {--no-spool : Send directly instead of spooling}';

    protected $description = 'Alert active L&T users about new garden listings within their travel radius';

    public function handle(LatMailService $lat, EmailSpoolerService $spooler): int
    {
        if (!self::isEmailTypeEnabled(self::EMAIL_TYPE)) {
            $this->info(self::EMAIL_TYPE . ' disabled via FREEGLE_MAIL_ENABLED_TYPES.');
            return self::SUCCESS;
        }

        $dryRun = (bool) $this->option('dry-run');
        $spool = !$this->option('no-spool');
        $hours = (int) $this->option('hours');
        $groupId = $lat->worldGroupId();
        $isMonday = Carbon::now()->isMonday();
        $since = Carbon::now()->subHours($hours);
        $sent = 0;

        if (!$groupId) {
            $this->error('LAT_WORLD_GROUPID not set — aborting.');
            return self::FAILURE;
        }

        // New, visible (Approved) Offer/Wanted listings in the L&T world group.
        $newMessages = DB::table('messages')
            ->join('messages_groups', 'messages.id', '=', 'messages_groups.msgid')
            ->where('messages_groups.groupid', $groupId)
            ->where('messages_groups.collection', 'Approved')
            ->where('messages.arrival', '>=', $since)
            ->whereIn('messages.type', ['Offer', 'Wanted'])
            ->whereNull('messages.deleted')
            ->whereNotNull('messages.lat')
            ->whereNotNull('messages.lng')
            ->select('messages.id', 'messages.subject', 'messages.type', 'messages.textbody', 'messages.lat', 'messages.lng', 'messages.fromuser')
            ->get();

        if ($newMessages->isEmpty()) {
            $this->info('No new listings found.');
            return self::SUCCESS;
        }

        // Only ACTIVE users are eligible recipients.
        $active = array_flip(array_merge($lat->activeLenderIds(), $lat->stillLookingTenderIds()));

        foreach ($lat->membersWithLocation() as $user) {
            if (!isset($active[$user->id]) || empty($user->email)) {
                continue;
            }

            $alerts = $user->settings['lat_alerts'] ?? [];
            if (($alerts['enabled'] ?? true) === false) {
                continue;
            }
            $frequency = $alerts['frequency'] ?? 'daily';
            if ($frequency === 'weekly' && !$isMonday) {
                continue;
            }

            $alreadyAlerted = $user->settings['lat_alerted_msgids'] ?? [];
            $radiusKm = (float) ($user->settings['lat_travelRadius'] ?? 10);

            $nearby = [];
            foreach ($newMessages as $msg) {
                if ((int) $msg->fromuser === $user->id) {
                    continue; // don't alert about your own listing
                }
                if (in_array($msg->id, $alreadyAlerted)) {
                    continue;
                }
                $dist = $lat->haversineKm($user->lat, $user->lng, (float) $msg->lat, (float) $msg->lng);
                if ($dist <= $radiusKm) {
                    $nearby[] = [
                        'id' => $msg->id,
                        'subject' => $msg->subject,
                        'type' => $msg->type,
                        'text' => $lat->listingSnippet($msg->textbody),
                        'imageUrl' => $lat->messageImageUrl((int) $msg->id),
                        'distance_km' => round($dist, 1),
                    ];
                }
            }

            if (empty($nearby)) {
                continue;
            }

            if ($dryRun) {
                $this->info("[DRY RUN] Would alert user {$user->id} ({$user->fullname}) about " . count($nearby) . ' listing(s)');
                $sent++;
                continue;
            }

            $mailable = new ActivityAlertMail(
                recipientEmail: $user->email,
                recipientName: $user->fullname,
                userId: $user->id,
                newListings: $nearby,
            );

            try {
                if ($spool) {
                    $spooler->spool($mailable, $user->email, self::EMAIL_TYPE);
                } else {
                    Mail::to($user->email)->send($mailable);
                }
                $sent++;

                $newAlerted = array_values(array_unique(array_merge($alreadyAlerted, array_column($nearby, 'id'))));
                if (count($newAlerted) > 500) {
                    $newAlerted = array_slice($newAlerted, -500);
                }
                $settings = $user->settings;
                $settings['lat_alerted_msgids'] = $newAlerted;
                $lat->saveSettings($user->id, $settings);
            } catch (\Throwable $e) {
                Log::warning('lat:send-activity-alerts — mail failed', ['userid' => $user->id, 'error' => $e->getMessage()]);
            }
        }

        $prefix = $dryRun ? '[DRY RUN] Would send' : 'Sent';
        $this->info("{$prefix} {$sent} activity alert email(s).");
        Log::info('lat:send-activity-alerts', ['sent' => $sent, 'new_listings' => $newMessages->count(), 'dry_run' => $dryRun, 'spool' => $spool]);

        return self::SUCCESS;
    }
}
