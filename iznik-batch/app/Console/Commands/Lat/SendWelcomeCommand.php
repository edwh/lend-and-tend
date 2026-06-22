<?php

namespace App\Console\Commands\Lat;

use App\Mail\Lat\WelcomeMail;
use App\Mail\Traits\FeatureFlags;
use App\Services\EmailSpoolerService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

/**
 * Sends the L&T welcome email. Two modes:
 *   --user=<id>            look up the member's email / name / lat_role and send
 *   --email=<addr>         send a one-off trial (with optional --name / --role)
 *
 * Role drives the call-to-action (lender → list a garden, tender → find one).
 */
class SendWelcomeCommand extends Command
{
    use FeatureFlags;

    public const EMAIL_TYPE = 'LatWelcome';

    protected $signature = 'lat:send-welcome
                            {--user= : Send to this user id (looks up email/name/role)}
                            {--email= : Send a one-off trial to this address}
                            {--name= : Recipient name (use with --email)}
                            {--role= : lender|tender|both (use with --email)}
                            {--dry-run : Preview without sending}
                            {--no-spool : Send directly instead of spooling}';

    protected $description = 'Send the L&T welcome email (to a user id, or a trial to an address)';

    public function handle(EmailSpoolerService $spooler): int
    {
        if (!self::isEmailTypeEnabled(self::EMAIL_TYPE)) {
            $this->info(self::EMAIL_TYPE . ' disabled via FREEGLE_MAIL_ENABLED_TYPES.');
            return self::SUCCESS;
        }

        $dryRun = (bool) $this->option('dry-run');
        $spool = !$this->option('no-spool');

        if ($userId = $this->option('user')) {
            $user = DB::table('users')->where('id', (int) $userId)->first();
            $email = DB::table('users_emails')->where('userid', (int) $userId)->value('email');
            if (!$user || empty($email)) {
                $this->error("User {$userId} not found or has no email.");
                return self::FAILURE;
            }
            $settings = json_decode($user->settings ?? '{}', true) ?: [];
            $r = ['email' => $email, 'name' => $user->fullname ?? '', 'userId' => (int) $user->id, 'role' => $settings['lat_role'] ?? null];
        } elseif ($email = $this->option('email')) {
            $r = ['email' => $email, 'name' => (string) $this->option('name'), 'userId' => null, 'role' => $this->option('role')];
        } else {
            $this->error('Provide --user=<id> or --email=<address>.');
            return self::FAILURE;
        }

        if ($dryRun) {
            $this->info("[DRY RUN] Would send welcome to {$r['email']} (role: " . ($r['role'] ?? 'both') . ').');
            return self::SUCCESS;
        }

        $mailable = new WelcomeMail($r['email'], $r['name'], $r['userId'], $r['role']);
        try {
            if ($spool) {
                $spooler->spool($mailable, $r['email'], self::EMAIL_TYPE);
            } else {
                Mail::to($r['email'])->send($mailable);
            }
            $this->info("Sent welcome email to {$r['email']}.");
            Log::info('lat:send-welcome', ['email' => $r['email'], 'spool' => $spool]);
        } catch (\Throwable $e) {
            Log::warning('lat:send-welcome — mail failed', ['email' => $r['email'], 'error' => $e->getMessage()]);
            $this->error("Failed: {$e->getMessage()}");
            return self::FAILURE;
        }

        return self::SUCCESS;
    }
}
