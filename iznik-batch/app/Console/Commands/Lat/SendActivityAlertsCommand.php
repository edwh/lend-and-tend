<?php

namespace App\Console\Commands\Lat;

use App\Mail\Lat\ActivityAlertMail;
use Illuminate\Console\Command;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

/**
 * Sends "new listing near you" alert emails to existing users when new gardens appear
 * within their declared travel radius.
 *
 * Runs daily. Respects lat_alerts.enabled and lat_alerts.frequency user settings:
 *   - instant  → sent immediately by this daily run (once per day max)
 *   - daily    → sent by this daily run
 *   - weekly   → sent only on Monday
 *
 * Avoids re-alerting about the same listing by tracking alerted message IDs per user
 * in users_settings (lat_alerted_msgids — rolling array capped at 500).
 */
class SendActivityAlertsCommand extends Command
{
    protected $signature = 'lat:send-activity-alerts
                            {--dry-run : Preview without sending}
                            {--hours=24 : How many hours back to look for new listings}';

    protected $description = 'Alert existing users about new garden listings within their travel radius';

    private const EARTH_RADIUS_KM = 6371;

    public function handle(): int
    {
        $dryRun   = (bool) $this->option('dry-run');
        $hours    = (int)  $this->option('hours');
        $userSite = rtrim(env('FREEGLE_USER_SITE', 'http://localhost:4002'), '/');
        $groupId  = (int) config('freegle.lat.world_groupid', 0);
        $isMonday = Carbon::now()->isMonday();
        $since    = Carbon::now()->subHours($hours);
        $sent     = 0;

        if (!$groupId) {
            $this->error('LAT_WORLD_GROUPID not set — aborting.');
            return self::FAILURE;
        }

        // New messages posted to the LAT world group in the window.
        $newMessages = DB::table('messages')
            ->join('messages_groups', 'messages.id', '=', 'messages_groups.msgid')
            ->where('messages_groups.groupid', $groupId)
            ->where('messages.arrival', '>=', $since)
            ->whereIn('messages.type', ['Offer', 'Wanted'])
            ->whereNotNull('messages.lat')
            ->whereNotNull('messages.lng')
            ->select('messages.id', 'messages.subject', 'messages.type', 'messages.lat', 'messages.lng', 'messages.fromuser')
            ->get();

        if ($newMessages->isEmpty()) {
            $this->info('No new listings found.');
            return self::SUCCESS;
        }

        // All existing active users with a location who didn't just post these messages.
        // User location is stored via users.lastlocation → locations.lat/lng.
        $newPosterIds = $newMessages->pluck('fromuser')->filter()->unique()->values()->all();

        $existingUsers = DB::table('users')
            ->join('locations', 'users.lastlocation', '=', 'locations.id')
            ->whereNotNull('users.lastlocation')
            ->whereNotIn('users.id', $newPosterIds)
            ->whereNotNull('users.settings')
            ->select('users.id', 'users.fullname', 'users.settings', 'locations.lat', 'locations.lng')
            ->get();

        foreach ($existingUsers as $user) {
            $settings  = json_decode($user->settings ?? '{}', true);
            $alerts    = $settings['lat_alerts'] ?? [];
            $enabled   = $alerts['enabled'] ?? true;
            $frequency = $alerts['frequency'] ?? 'weekly';

            if (!$enabled) continue;
            if ($frequency === 'weekly' && !$isMonday) continue;

            $alreadyAlerted = $settings['lat_alerted_msgids'] ?? [];
            $radiusKm       = (float) ($settings['lat_travelRadius'] ?? 10);

            $nearby = [];
            foreach ($newMessages as $msg) {
                if (in_array($msg->id, $alreadyAlerted)) continue;
                $dist = $this->haversineKm($user->lat, $user->lng, $msg->lat, $msg->lng);
                if ($dist <= $radiusKm) {
                    $nearby[] = [
                        'id'          => $msg->id,
                        'subject'     => $msg->subject,
                        'type'        => $msg->type,
                        'distance_km' => round($dist, 1),
                    ];
                }
            }

            if (empty($nearby)) continue;

            $emailAddr = $this->getPreferredEmail($user->id);
            if (!$emailAddr) continue;

            if ($dryRun) {
                $this->info("[DRY RUN] Would alert user {$user->id} ({$user->fullname}) about " . count($nearby) . " listing(s)");
                $sent++;
                continue;
            }

            try {
                Mail::to($emailAddr)->send(new ActivityAlertMail(
                    recipientName: $user->fullname,
                    newListings: $nearby,
                    userSite: $userSite,
                ));
                $sent++;

                // Update alerted IDs (cap at 500 to avoid unbounded growth).
                $newAlerted = array_values(array_unique(array_merge($alreadyAlerted, array_column($nearby, 'id'))));
                if (count($newAlerted) > 500) {
                    $newAlerted = array_slice($newAlerted, -500);
                }
                $settings['lat_alerted_msgids'] = $newAlerted;
                DB::table('users')
                    ->where('id', $user->id)
                    ->update(['settings' => json_encode($settings)]);
            } catch (\Throwable $e) {
                Log::warning('lat:send-activity-alerts — mail failed', [
                    'userid' => $user->id,
                    'error'  => $e->getMessage(),
                ]);
            }
        }

        $prefix = $dryRun ? '[DRY RUN] Would send' : 'Sent';
        $this->info("{$prefix} {$sent} activity alert email(s).");
        Log::info('lat:send-activity-alerts', ['sent' => $sent, 'new_listings' => $newMessages->count(), 'dry_run' => $dryRun]);

        return self::SUCCESS;
    }

    private function haversineKm(float $lat1, float $lng1, float $lat2, float $lng2): float
    {
        $dLat = deg2rad($lat2 - $lat1);
        $dLng = deg2rad($lng2 - $lng1);
        $a    = sin($dLat / 2) ** 2 + cos(deg2rad($lat1)) * cos(deg2rad($lat2)) * sin($dLng / 2) ** 2;
        return self::EARTH_RADIUS_KM * 2 * asin(sqrt($a));
    }

    private function getPreferredEmail(int $userId): ?string
    {
        return DB::table('users_emails')
            ->where('userid', $userId)
            ->orderBy('preferred', 'desc')
            ->value('email');
    }
}
