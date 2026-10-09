<?php

namespace App\Console\Commands\Lat;

use App\Mail\Lat\WelcomeMail;
use App\Mail\Traits\FeatureFlags;
use App\Services\EmailSpoolerService;
use App\Services\Lat\LatMailService;
use Illuminate\Console\Command;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

/**
 * Sends the L&T welcome email. Three modes:
 *   (no options)           scheduled: welcome every account created in the last
 *                          --hours that has not been welcomed yet; records users.settings.lat_welcome_sent_at so a
 *                          re-run never sends twice
 *   --user=<id>            send (again) to one member, and record it
 *   --email=<addr>         send a one-off trial (with optional --name / --role);
 *                          nothing is recorded
 *
 * Role (settings.lat_role) drives the call-to-action: lender → list a garden,
 * tender → find one, both/unknown → explore the map.
 */
class SendWelcomeCommand extends Command
{
    use FeatureFlags;

    public const EMAIL_TYPE = 'LatWelcome';

    public const SENT_KEY = 'lat_welcome_sent_at';

    protected $signature = 'lat:send-welcome
                            {--user= : Send to this user id (looks up email/name/role)}
                            {--email= : Send a one-off trial to this address}
                            {--name= : Recipient name (use with --email)}
                            {--role= : lender|tender|both (use with --email)}
                            {--hours=48 : Scheduled mode: welcome accounts created within this many hours}
                            {--dry-run : Preview without sending}
                            {--no-spool : Send directly instead of spooling}';

    protected $description = 'Welcome new L&T members (scheduled), or send to one user id / a trial address';

    public function handle(EmailSpoolerService $spooler, LatMailService $lat): int
    {
        if (!self::isEmailTypeEnabled(self::EMAIL_TYPE)) {
            $this->info(self::EMAIL_TYPE . ' disabled via FREEGLE_MAIL_ENABLED_TYPES.');
            return self::SUCCESS;
        }

        $dryRun = (bool) $this->option('dry-run');
        $spool = !$this->option('no-spool');

        if ($email = $this->option('email')) {
            $r = ['email' => $email, 'name' => (string) $this->option('name'), 'userId' => null, 'role' => $this->option('role')];

            return $this->send($r, $spooler, $lat, $spool, $dryRun, false) ? self::SUCCESS : self::FAILURE;
        }

        if ($userId = $this->option('user')) {
            $user = $lat->userRecord((int) $userId);
            if (!$user || empty($user->email)) {
                $this->error("User {$userId} not found or has no email.");
                return self::FAILURE;
            }
            $r = $this->recipient($user);

            return $this->send($r, $spooler, $lat, $spool, $dryRun, true) ? self::SUCCESS : self::FAILURE;
        }

        // Scheduled mode: every account created recently that has not been
        // welcomed. Account creation is the signal, not world-group membership:
        // signing up creates the user, but the membership only appears when
        // they first post, which could be days later or never. This deployment
        // has its own database, so every account here is a Lend & Tend member.
        // The recorded timestamp, not the lookback, prevents a second welcome;
        // the lookback just bounds the query.
        $since = Carbon::now()->subHours(max(1, (int) $this->option('hours')));
        $joiners = DB::table('users')
            ->where('added', '>=', $since)
            ->whereNull('deleted')
            ->orderBy('added')
            ->pluck('id');

        $sent = 0;
        foreach ($joiners as $userId) {
            $user = $lat->userRecord((int) $userId);
            if (!$user || empty($user->email) || !empty($user->settings[self::SENT_KEY] ?? null)) {
                continue;
            }
            if ($this->send($this->recipient($user), $spooler, $lat, $spool, $dryRun, true)) {
                $sent++;
            }
        }

        $prefix = $dryRun ? '[DRY RUN] Would send' : 'Sent';
        $this->info("{$prefix} {$sent} welcome email(s) to {$joiners->count()} recent joiner(s).");
        Log::info('lat:send-welcome', ['sent' => $sent, 'joiners' => $joiners->count(), 'dry_run' => $dryRun, 'spool' => $spool]);

        return self::SUCCESS;
    }

    /** @return array{email: string, name: string, userId: int, role: ?string} */
    private function recipient(object $user): array
    {
        return [
            'email' => $user->email,
            'name' => $user->fullname ?? '',
            'userId' => (int) $user->id,
            'role' => $user->settings['lat_role'] ?? null,
        ];
    }

    /**
     * Send one welcome. With $record, stamp users.settings.lat_welcome_sent_at
     * (read-merge-write of the settings JSON) so it is never sent twice.
     */
    private function send(array $r, EmailSpoolerService $spooler, LatMailService $lat, bool $spool, bool $dryRun, bool $record): bool
    {
        if ($dryRun) {
            $this->info("[DRY RUN] Would send welcome to {$r['email']} (role: " . ($r['role'] ?? 'both') . ').');
            return true;
        }

        $mailable = new WelcomeMail($r['email'], $r['name'], $r['userId'], $r['role']);
        try {
            if ($spool) {
                $spooler->spool($mailable, $r['email'], self::EMAIL_TYPE);
            } else {
                Mail::to($r['email'])->send($mailable);
            }
            if ($record && $r['userId']) {
                $user = $lat->userRecord($r['userId']);
                $settings = $user ? $user->settings : [];
                $settings[self::SENT_KEY] = Carbon::now()->toIso8601String();
                $lat->saveSettings($r['userId'], $settings);
            }
            $this->info("Sent welcome email to {$r['email']}.");
            Log::info('lat:send-welcome', ['email' => $r['email'], 'userid' => $r['userId'], 'spool' => $spool]);

            return true;
        } catch (\Throwable $e) {
            Log::warning('lat:send-welcome — mail failed', ['email' => $r['email'], 'error' => $e->getMessage()]);
            $this->error("Failed: {$e->getMessage()}");

            return false;
        }
    }
}
