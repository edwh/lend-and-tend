# Lend & Tend Adversarial Review — Shipping Readiness

**Generated:** 2026-05-24  
**Scope:** Comprehensive audit of L&T infrastructure, email delivery, background jobs, database integrity, and operational readiness.

## Executive Summary

**Status:** NOT READY TO SHIP. Critical gaps in email delivery, testing, and operational readiness prevent L&T from functioning as a real product.

**Most Critical Issues:**
1. **L&T emails are not being sent** — `ActivityAlertMail` and `CheckinReminderMail` are defined but NOT in the `FREEGLE_MAIL_ENABLED_TYPES` allowlist. Emails will silently fail.
2. **No test coverage** — Zero tests for the two L&T-specific commands (`lat:send-activity-alerts`, `lat:send-checkin-reminders`). Cannot verify behavior or detect regressions.
3. **Database schema incomplete** — L&T user settings are stored in the generic `users.settings` JSON column, but no schema definition or type hints exist. Data integrity is fragile.
4. **Missing agreement confirmation flow** — Spec says users should get emails after both parties accept a bilateral promise, but no command exists to detect or send these emails.
5. **Email trigger conditions untested** — The Haversine distance calculation, agreement window selection, and settings JSON parsing have no unit tests and are vulnerable to off-by-one bugs.

---

## By Area

### 1. Email Delivery

#### Finding 1.1: L&T Emails Not Whitelisted for Sending
**Severity:** CRITICAL  
**Area:** Email  
**Finding:**
The two L&T mail classes (`ActivityAlertMail`, `CheckinReminderMail`) are implemented and scheduled, but they will NEVER be sent because they are not listed in the `FREEGLE_MAIL_ENABLED_TYPES` allowlist. The Laravel `MjmlMailable` base class checks this allowlist before queuing any email. Users will receive no activity alerts or check-in reminders.

**Evidence:**
- `iznik-batch/app/Mail/Lat/ActivityAlertMail.php` — class exists and is importable
- `iznik-batch/app/Mail/Lat/CheckinReminderMail.php` — class exists and is importable
- `iznik-batch/app/Console/Commands/Lat/SendActivityAlertsCommand.php:115` — calls `Mail::to($emailAddr)->send(new ActivityAlertMail(...))`
- `iznik-batch/app/Console/Commands/Lat/SendCheckinRemindersCommand.php:82` — calls `Mail::to($email)->send(new CheckinReminderMail(...))`
- `iznik-batch/app/Mail/MjmlMailable.php` (base class) — checks `config('freegle.mail.enabled_types')` and silently discards emails if the mail class name is not in the list
- `docker-compose.yml:1393` — `FREEGLE_MAIL_ENABLED_TYPES` includes `Welcome,ChatNotification,ChatNotificationUser2Mod,ChatNotificationMod2Mod,Digest,UnifiedDigest,DonationThank,DonationAsk,ChaseUp,AutoRepost,MessageExpiry,NotificationChaseUp,StoriesNewsletter` — **NO `ActivityAlert` or `CheckinReminder`**
- `.env.example` — no mention of LAT email types

**Suggested fix:**
1. Add `ActivityAlert` and `CheckinReminder` to the `FREEGLE_MAIL_ENABLED_TYPES` allowlist in `docker-compose.yml` env var.
2. Add to `.env.example` for production deployments.
3. Add integration tests that verify the emails are actually queued (not silently discarded).

---

#### Finding 1.2: CheckinReminderMail Payload Errors
**Severity:** HIGH  
**Area:** Email  
**Finding:**
The `CheckinReminderMail` uses hard-coded placeholder endpoints (`/checkin/{agreementId}?status=...`) that don't exist in the L&T frontend. When users click these buttons, they will 404.

**Evidence:**
- `iznik-batch/resources/views/emails/lat/checkin-reminder.blade.php:8,12,16` — buttons link to `{{ $userSite }}/checkin/{{ $agreementId }}?status=growing|ok|not_working`
- `iznik-nuxt3/lat/pages/` — no `checkin.vue` or similar page exists to handle these links
- No frontend component to display check-in status selection and submit it back to the API

**Suggested fix:**
1. Create `iznik-nuxt3/lat/pages/checkin/[id].vue` page to handle the check-in status submission.
2. Create a Go API endpoint `POST /apiv2/agreements/{id}/checkin` to accept and store check-in status.
3. Verify the endpoint is called before shipping emails.

---

#### Finding 1.3: ActivityAlertMail Uses Markdown Template, Not MJML
**Severity:** MEDIUM  
**Area:** Email  
**Finding:**
`ActivityAlertMail` uses a markdown template (`markdown: 'emails.lat.activity-alert'`) instead of MJML like other L&T emails. This causes inconsistent styling and misses the brand design guidelines in `branding.config.ts`.

**Evidence:**
- `iznik-batch/app/Mail/Lat/ActivityAlertMail.php:30-35` — uses `Content(markdown: 'emails.lat.activity-alert')`
- `iznik-batch/app/Mail/Lat/CheckinReminderMail.php` — missing Content method entirely (defaults to markdown search)
- `iznik-batch/resources/views/emails/lat/activity-alert.blade.php` — markdown template
- `iznik-batch/resources/views/emails/lat/checkin-reminder.blade.php` — markdown template
- Other L&T mails: not using MJML (they should be)
- Style tiles in `iznik-nuxt3/lat/branding.config.ts` define precise color palette, fonts, and spacing — emails don't use any of this

**Suggested fix:**
1. Convert both templates to MJML in `resources/views/emails/mjml/lat/`.
2. Update mail classes to extend `MjmlMailable` and use proper MJML content.
3. Use the Freegle header/footer MJML components for brand consistency.

---

### 2. Background Jobs & Scheduling

#### Finding 2.1: L&T Commands Only Run in LAT_BATCH_ONLY Mode
**Severity:** HIGH  
**Area:** Background job  
**Finding:**
The two L&T commands (`lat:send-activity-alerts`, `lat:send-checkin-reminders`) are ONLY scheduled when `LAT_BATCH_ONLY=true` in `routes/console.php:34-56`. In normal batch mode (the default), these commands never run. In production, you must explicitly set this flag, but it's not documented or validated.

**Evidence:**
- `iznik-batch/routes/console.php:34-56` — entire LAT schedule block is guarded by `if (getenv('LAT_BATCH_ONLY') === 'true')`
- `docker-compose.yml:1319-1400` — batch container environment has NO `LAT_BATCH_ONLY` set (will default to false)
- `.env.example` — no mention of `LAT_BATCH_ONLY`
- `.env.background.example` — no mention of `LAT_BATCH_ONLY`
- No log message or warning when `LAT_BATCH_ONLY` is not set (silent failure)

**Suggested fix:**
1. Add `LAT_BATCH_ONLY=false` to `.env.example` and `.env.background.example` with a comment explaining the flag.
2. In the console.php conditional, emit a Log::warning() when `LAT_BATCH_ONLY` is false so operators know the commands are disabled.
3. Change the guard logic: Instead of a blanket on/off switch, schedule the commands unconditionally and add a feature flag inside each command to conditionally enable/disable sending (like other Freegle commands).

---

#### Finding 2.2: Missing "Agreement Confirmed" Email
**Severity:** CRITICAL  
**Area:** Background job  
**Finding:**
The spec in `iznik-nuxt3/lat/branding.config.ts:138` defines `checkinScheduleDays: [14, 30, 90, 180]` but implies that check-in emails are sent AFTER both parties agree to an arrangement. However, there is no command that sends an immediate "your arrangement has been accepted" email when a bilateral promise is confirmed.

Users receive NO email confirming the arrangement has been finalized. They only get reminders 14+ days later. This creates confusion about whether the arrangement actually started.

**Evidence:**
- `iznik-nuxt3/lat/branding.config.ts:138` — defines checkin schedule but not a "confirmed" email
- `iznik-batch/app/Console/Commands/Lat/SendCheckinRemindersCommand.php` — only sends reminders at fixed intervals, not a confirmation email
- No mail class exists for `AgreementConfirmedMail` or similar
- No mention in `plans/active/laravel-batch-jobs-implementation.md` of a confirmation email

**Suggested fix:**
1. Create `iznik-batch/app/Mail/Lat/AgreementConfirmedMail.php` with details about the arrangement, other party contact info, and first check-in date.
2. Create `iznik-batch/app/Console/Commands/Lat/SendAgreementConfirmationCommand.php` that triggers when both parties have signed (`messages_promises.promisedat` is populated AND both users have accepted).
3. Schedule in `routes/console.php` to run every minute (like chat notifications).
4. Test that both parties receive the email within seconds of the second signature.

---

#### Finding 2.3: No Reactivation Check-in Emails
**Severity:** MEDIUM  
**Area:** Background job  
**Finding:**
Per `branding.config.ts:139`, there should be an inactivity alert (`inactivityAlertDays: 90`) that prompts users with a "still interested?" check-in email after 90 days. No such command exists.

**Evidence:**
- `iznik-nuxt3/lat/branding.config.ts:139` — defines `inactivityAlertDays: 90`
- No command in `iznik-batch/app/Console/Commands/Lat/` matching this pattern
- `iznik-batch/routes/console.php` — no scheduling of an inactivity check-in job

**Suggested fix:**
1. Create `iznik-batch/app/Console/Commands/Lat/SendInactivityAlertsCommand.php` that finds agreements older than 90 days with no recent check-ins and sends a "still interested?" prompt.
2. Add to schedule.
3. Test with agreements that have aged 90+ days without recent activity.

---

### 3. Test Coverage

#### Finding 3.1: Zero Unit Tests for L&T Commands
**Severity:** CRITICAL  
**Area:** Testing  
**Finding:**
The two implemented L&T commands have NO test coverage. No unit tests, no feature tests, no integration tests. This means:
- Behavior changes go undetected.
- Off-by-one bugs in date windows are invisible.
- Email payload encoding breaks silently.
- Future refactors will break L&T without warning.

**Evidence:**
- `find /home/edward/lend-and-tend/iznik-batch/tests -name "*[Ll]at*"` — returns no L&T test files
- No test files for `SendActivityAlertsCommand` or `SendCheckinRemindersCommand`
- No test files for `ActivityAlertMail` or `CheckinReminderMail`

**Suggested fix:**
1. Create `iznik-batch/tests/Feature/Commands/Lat/SendActivityAlertsCommandTest.php` with:
   - Test: no alerts sent if `lat_alerts.enabled` is false
   - Test: no alerts sent if frequency is `weekly` and today is not Monday
   - Test: alerts sent only for messages within the user's radius
   - Test: duplicate listings (same ID) are not re-alerted
   - Test: correct email count sent (one per user with nearby listings)
   - Test: Haversine distance calculation is accurate (≤ 1m tolerance)

2. Create `iznik-batch/tests/Feature/Commands/Lat/SendCheckinRemindersCommandTest.php` with:
   - Test: reminders sent at exactly 14d, 30d, 90d, 180d windows
   - Test: reminders sent only once per interval (subsequent runs don't re-send)
   - Test: both parties receive the email
   - Test: email includes correct interval label ("2 weeks", "1 month", etc.)
   - Test: dry-run mode doesn't send emails but reports counts
   - Test: missing agreement data (no user or no other party) is skipped gracefully

3. Add to CircleCI test suite so failures block deployment.

---

#### Finding 3.2: No Integration Tests for Email Sending
**Severity:** HIGH  
**Area:** Testing  
**Finding:**
There are no integration tests that verify emails actually reach Mailpit (the test SMTP server). The command tests should verify that:
- The mailable is instantiated with correct parameters.
- The email subject is rendered correctly.
- The body contains expected text (user name, listing details, links).

Without these, email template changes break silently.

**Evidence:**
- No test files in `iznik-batch/tests/Integration/`
- No Mailpit interactions in any test
- `iznik-batch/tests/Feature/` tests use `Mail::fake()` (mocking) rather than real SMTP

**Suggested fix:**
1. Create `iznik-batch/tests/Integration/Commands/Lat/SendActivityAlertsIntegrationTest.php`:
   - Create test data: a user with a location and radius, new messages within that radius
   - Run the command
   - Query Mailpit HTTP API to retrieve the sent email
   - Assert subject contains listing count and "Lend & Tend"
   - Assert body contains listing subjects and distances

2. Do the same for check-in reminders.

3. Add to CircleCI with a separate test suite (slower, needs Mailpit).

---

### 4. Database Schema & Data Integrity

#### Finding 4.1: L&T User Settings Have No Schema Definition
**Severity:** HIGH  
**Area:** Database  
**Finding:**
L&T user settings (location radius, alert frequency, alerted message IDs) are stored in the generic `users.settings` JSON column. There is no:
- Schema definition or migration documenting the expected structure
- Type hints in the Model
- Validation code
- Index on the JSON path for query efficiency
- Default value migration for existing users

The L&T commands assume a specific JSON structure but don't validate it. Bad data silently breaks the commands.

**Evidence:**
- `iznik-batch/app/Console/Commands/Lat/SendActivityAlertsCommand.php:78-88` — raw `json_decode()` with no validation:
  ```php
  $settings = json_decode($user->settings ?? '{}', true);
  $alerts = $settings['lat_alerts'] ?? [];
  $enabled = $alerts['enabled'] ?? true;
  $frequency = $alerts['frequency'] ?? 'weekly';
  ```
- `iznik-batch/app/Console/Commands/Lat/SendCheckinRemindersCommand.php:50` — same pattern
- No migration to set default `lat_alerts` structure for existing users
- No User model cast for the JSON structure

**Suggested fix:**
1. Create a migration `2026_05_25_000001_add_lat_settings_defaults_to_users.php`:
   ```php
   DB::statement('UPDATE users SET settings = JSON_SET(
       IFNULL(settings, "{}"),
       "$.lat_alerts", 
       JSON_OBJECT("enabled", true, "frequency", "daily")
   ) WHERE JSON_EXTRACT(settings, "$.lat_alerts") IS NULL');
   ```

2. Add a Casts in the User model:
   ```php
   protected $casts = [
       'settings' => LatUserSettingsCast::class,
   ];
   ```

3. Create `app/Casts/LatUserSettingsCast.php` that validates and defaults the structure:
   ```php
   class LatUserSettingsCast implements CastsAttributes {
       public function get($model, $key, $value, $attributes) {
           $decoded = json_decode($value ?? '{}', true);
           return array_merge([
               'lat_alerts' => ['enabled' => true, 'frequency' => 'daily'],
               'lat_alerted_msgids' => [],
               'lat_travelRadius' => 10,
           ], $decoded);
       }
   }
   ```

4. Use the model in commands instead of raw JSON:
   ```php
   $settings = $user->settings; // Automatically casted
   $enabled = $settings['lat_alerts']['enabled'];
   ```

---

#### Finding 4.2: Missing Agreement Metadata Columns
**Severity:** MEDIUM  
**Area:** Database  
**Finding:**
The `messages_promises` table (used for L&T agreements) is missing columns that the branding spec implies should exist:
- `checkin_reminders_sent` (currently stored, but no schema)
- Last check-in timestamp and status (for the inactivity logic)
- Concession fee payment status (spec mentions "Free if you receive Universal Credit, Pension Credit", but no way to track this)

**Evidence:**
- `iznik-batch/app/Console/Commands/Lat/SendCheckinRemindersCommand.php:50` — assumes `checkin_reminders_sent` column exists:
  ```php
  $remindersSent = json_decode($agreement->checkin_reminders_sent ?? '{}', true);
  ```
- No migration creating this column (it's assumed to exist from upstream Freegle schema)
- `iznik-nuxt3/lat/branding.config.ts:138` — defines check-in schedule but no schema to store responses
- No way to query "which users haven't checked in for 90+ days"

**Suggested fix:**
1. Create migration to add columns if they don't exist:
   ```php
   Schema::table('messages_promises', function (Blueprint $table) {
       if (!Schema::hasColumn('messages_promises', 'checkin_reminders_sent')) {
           $table->json('checkin_reminders_sent')->nullable();
       }
       if (!Schema::hasColumn('messages_promises', 'last_checkin_at')) {
           $table->timestamp('last_checkin_at')->nullable();
       }
       if (!Schema::hasColumn('messages_promises', 'last_checkin_status')) {
           $table->enum('last_checkin_status', ['growing', 'ok', 'not_working'])->nullable();
       }
   });
   ```

2. Document the schema in a README or data dictionary.

---

#### Finding 4.3: L&T World Group ID Hardcoded Fallback
**Severity:** MEDIUM  
**Area:** Database  
**Finding:**
The `SendActivityAlertsCommand` uses `config('freegle.lat.world_groupid', 0)` which defaults to 0 if the config is missing. This is safer than a hard-coded number, but:
- The migration creates the group with ID 1000000, but the config default is 0 (mismatch)
- No validation that the group actually exists
- No fallback if the group was accidentally deleted

**Evidence:**
- `iznik-batch/database/migrations/2026_05_21_000001_add_lat_columns_to_users.php:15-18` — creates group with `id = 1000000`
- `iznik-batch/config/freegle.php:335` — `'world_groupid' => (int) env('LAT_WORLD_GROUPID', 1000000)` (correct in config)
- `iznik-batch/app/Console/Commands/Lat/SendActivityAlertsCommand.php:39` — `(int) config('freegle.lat.world_groupid', 0)` (wrong fallback)

**Suggested fix:**
1. Standardize the fallback: `config('freegle.lat.world_groupid')` (no fallback in the command).
2. Add a health check in the command:
   ```php
   if (!$groupId || !DB::table('groups')->where('id', $groupId)->exists()) {
       $this->error('LAT world group not found (ID: ' . $groupId . ')');
       return self::FAILURE;
   }
   ```

---

### 5. Operational & Security

#### Finding 5.1: No Rate Limiting on Distance Calculations
**Severity:** MEDIUM  
**Area:** Security  
**Finding:**
The activity-alert command runs a Haversine calculation for EVERY user × EVERY new message combination without any caching or rate limiting. With 100 new listings and 1000 users, this is 100k float calculations per day. This is not a DOS vector (it's internal), but it's inefficient and could be abused if exposed via an API endpoint.

**Evidence:**
- `iznik-batch/app/Console/Commands/Lat/SendActivityAlertsCommand.php:89-101` — nested loops with `haversineKm()` called per message per user
- No caching of distance calculations
- No batch processing or spatial index usage

**Suggested fix:**
1. Use database spatial indexing instead: `ST_Distance_Sphere()` in a single query
2. Cache user location + radius preferences in a dedicated table indexed by user ID
3. If an API endpoint is added later to check distances, add rate limiting

---

#### Finding 5.2: No Logging of Email Failures
**Severity:** MEDIUM  
**Area:** Observability  
**Finding:**
When an email fails to send, the command catches the exception and logs it, but there is NO alerting to Sentry or operators. A sustained email failure (e.g., SMTP down) goes unnoticed until users complain.

**Evidence:**
- `iznik-batch/app/Console/Commands/Lat/SendActivityAlertsCommand.php:131-136` — catches exception and logs a warning, but doesn't re-throw or alert
- `iznik-batch/app/Console/Commands/Lat/SendCheckinRemindersCommand.php:90-96` — same pattern
- No Sentry integration in the catch blocks
- No `monitor:email-health` check for LAT emails

**Suggested fix:**
1. In catch blocks, call `Sentry::captureException($e)` in addition to logging:
   ```php
   catch (\Throwable $e) {
       Log::error('lat:send-activity-alerts — mail failed', [
           'userid' => $user->id,
           'error' => $e->getMessage(),
       ]);
       Sentry::captureException($e);
   }
   ```

2. Add a check to `monitor:email-health` command to verify LAT emails are being sent at expected rates.

---

#### Finding 5.3: Missing Dry-Run Logging
**Severity:** LOW  
**Area:** Observability  
**Finding:**
The `--dry-run` option logs to console but doesn't match the structured logging of production runs. Makes it hard to compare expected vs. actual email volumes.

**Evidence:**
- `iznik-batch/app/Console/Commands/Lat/SendActivityAlertsCommand.php:108-110` — logs to console only
- `iznik-batch/app/Console/Commands/Lat/SendActivityAlertsCommand.php:141` — different log format for dry-run vs. production

**Suggested fix:**
Use the same `Log::info()` format for both modes, just include `'dry_run' => true` in the payload (already done on line 141 of activity alerts, good practice).

---

### 6. Spec Gaps

#### Finding 6.1: Agreement Lifecycle Missing from Plan
**Severity:** MEDIUM  
**Area:** Spec gap  
**Finding:**
The `laravel-batch-jobs-implementation.md` plan has no mention of L&T-specific batch jobs. The implementation plan covers Freegle's 127 original scripts but assumes L&T is a "thin layer" on top. This means:
- No acceptance criteria for L&T batch jobs
- No mention of agreement lifecycle (confirmation, check-in, inactivity alerts)
- No testing strategy for L&T-specific flows

**Evidence:**
- `plans/active/laravel-batch-jobs-implementation.md` — 1234 lines, zero mentions of "lat", "agreement", "promise", or "tend"
- `plans/active/digestchanges.md` — about Freegle digests, not L&T
- No L&T-specific implementation plan

**Suggested fix:**
1. Create `plans/active/lat-batch-implementation.md` documenting:
   - Agreement confirmation email flow
   - Check-in reminder schedule and implementation
   - Inactivity alerts
   - Email template design
   - Test requirements
   - Success criteria

---

#### Finding 6.2: No Feature Flag for L&T Emails
**Severity:** MEDIUM  
**Area:** Spec gap  
**Finding:**
Unlike other Freegle batch jobs (which can be toggled via `FREEGLE_MAIL_ENABLED_TYPES`), L&T emails have an all-or-nothing flag (`LAT_BATCH_ONLY`). This makes it impossible to:
- Run L&T batch jobs alongside Freegle batch jobs
- Gradually enable L&T features (e.g., enable activity alerts before check-in reminders)
- Have a production batch container that handles both Freegle and L&T

**Evidence:**
- `iznik-batch/routes/console.php:34-56` — entire LAT block guarded by boolean flag
- `docker-compose.yml` — no way to enable L&T jobs selectively

**Suggested fix:**
1. Refactor the guard logic to enable individual commands, like Freegle jobs:
   ```php
   if (env('LAT_ACTIVITY_ALERTS_ENABLED', false)) {
       Schedule::command('lat:send-activity-alerts')...
   }
   ```

2. Add to `FREEGLE_MAIL_ENABLED_TYPES` allowlist (not as a separate flag).

---

### 7. Networking & Deployment

#### Finding 7.1: LAT User Site URL Not Configured for Production
**Severity:** HIGH  
**Area:** Deployment  
**Finding:**
L&T emails use `env('FREEGLE_USER_SITE')` to build links. In `.env.example` and `.env.background.example`, there is NO entry for the production L&T site URL. This means:
- In production, links default to `https://www.ilovefreegle.org` (Freegle's site, not L&T)
- Users clicking email links go to the wrong site
- Feature flag `LAT_BATCH_ONLY` is activated without a corresponding site URL

**Evidence:**
- `iznik-batch/app/Console/Commands/Lat/SendActivityAlertsCommand.php:38` — uses `env('FREEGLE_USER_SITE', 'http://localhost:4002')`
- `iznik-batch/app/Console/Commands/Lat/SendCheckinRemindersCommand.php:36` — same
- `.env.example` — no `FREEGLE_USER_SITE` or `LAT_USER_SITE` entry
- `.env.background.example` — no entry

**Suggested fix:**
1. Add to `.env.example`:
   ```
   # L&T Site (garden-sharing platform) — different from Freegle
   LAT_USER_SITE=https://www.lendandtend.com
   ```

2. Update commands to use this:
   ```php
   $userSite = rtrim(env('LAT_USER_SITE', env('FREEGLE_USER_SITE')), '/');
   ```

3. Update `docker-compose.yml` with:
   ```
   - LAT_USER_SITE=http://lat-dev-local.localhost:${PORT_LAT_DEV_LOCAL:-4002}
   ```

---

#### Finding 7.2: No Sentry Integration for L&T Errors
**Severity:** MEDIUM  
**Area:** Observability  
**Finding:**
L&T commands don't report errors to Sentry. If email sending fails, agreement querying fails, or data corruption occurs, there is no alerting beyond console logs (which rotate and expire).

**Evidence:**
- `iznik-batch/app/Console/Commands/Lat/SendActivityAlertsCommand.php:131` — catches exception but no Sentry call
- `iznik-batch/app/Console/Commands/Lat/SendCheckinRemindersCommand.php:91` — same
- `iznik-batch/.env` or `.env.background` — no `SENTRY_LARAVEL_DSN`

**Suggested fix:**
1. Ensure `SENTRY_LARAVEL_DSN` is set in production (already a template in `.env.background.example`)
2. Call `Sentry::captureException()` in catch blocks for L&T commands
3. Add dedicated Sentry tags so L&T errors are easy to filter:
   ```php
   Sentry::captureException($e, function (Event $event) {
       $event->setTag('system', 'lat');
       $event->setTag('command', 'send-activity-alerts');
   });
   ```

---

## Summary Table

| Severity | Count | Areas |
|----------|-------|-------|
| **CRITICAL** | 3 | Emails not whitelisted, Zero test coverage, Missing agreement confirmation |
| **HIGH** | 5 | Email endpoints 404, L&T commands only in batch-only mode, L&T site URL not configured, User settings no schema, Integration tests missing |
| **MEDIUM** | 6 | MJML/markdown inconsistency, Reactivation check-in missing, Missing metadata columns, World group ID fallback, Rate limiting, Spec gap on batch plan, No feature flag for L&T |
| **LOW** | 2 | Dry-run logging inconsistency, No Sentry integration (though templates exist) |

---

## Blockers Before Shipping

Do NOT mark L&T as ready to ship until:

1. **✗ → ✓** `ActivityAlertMail` and `CheckinReminderMail` are added to `FREEGLE_MAIL_ENABLED_TYPES` allowlist and verified to send to Mailpit
2. **✗ → ✓** Unit tests for `SendActivityAlertsCommand` and `SendCheckinRemindersCommand` exist and pass
3. **✗ → ✓** Integration tests verify emails arrive in Mailpit with correct content
4. **✗ → ✓** Check-in endpoint (`POST /apiv2/agreements/{id}/checkin`) is implemented and tested
5. **✗ → ✓** Agreement confirmation email is implemented and tested
6. **✗ → ✓** L&T user settings schema migration is deployed
7. **✗ → ✓** `LAT_USER_SITE` environment variable is configured in production `.env.background`
8. **✗ → ✓** `LAT_BATCH_ONLY` flag behavior is documented or refactored

---

## Recommended Next Steps

**Phase 1: Email Delivery (Week 1)**
- [ ] Add `ActivityAlert,CheckinReminder` to allowlist
- [ ] Verify emails send to Mailpit
- [ ] Convert Markdown templates to MJML
- [ ] Implement check-in endpoint

**Phase 2: Testing (Week 1-2)**
- [ ] Write unit tests for both L&T commands
- [ ] Write integration tests with Mailpit
- [ ] Add to CircleCI test suite

**Phase 3: Data Integrity (Week 2)**
- [ ] Create user settings schema migration
- [ ] Create agreement metadata migration
- [ ] Add casts to models

**Phase 4: Operations (Week 2-3)**
- [ ] Configure `LAT_USER_SITE` in production
- [ ] Add Sentry integration to catch blocks
- [ ] Document `LAT_BATCH_ONLY` or refactor to per-command flags
- [ ] Add health checks for email delivery rates

**Phase 5: Spec Gaps (Week 3)**
- [ ] Implement agreement confirmation email
- [ ] Implement inactivity alert command
- [ ] Create `lat-batch-implementation.md` plan

---

## SSR / Prerender (added 2026-05-24, first prod deploy on Katapult VM)

The upstream Freegle Nuxt config has `crawlLinks: true` and a route map that
the prerenderer walks at build time. In L&T this fails because Freegle paths
like `/essex`, `/wakefield`, etc. call `/authority/<id>` against the API and
there is **no UK authority data in the L&T database** — the prerenderer gets
404s and `nitro` exits non-zero, taking down the whole build.

**Workaround in place:** `lat/nuxt.config.ts` overrides `nitro.prerender` to
`{ crawlLinks: false, routes: [], failOnError: false }`. So every request
SSRs per-hit; nothing is statically generated.

**Why this matters:**
- We give up the first-paint perf benefit Freegle's prerender provides for
  the public landing surfaces (`/`, browse pages, etc.).
- We carry a permanent SSR fan-out for routes the user never hits.
- The fix isn't "turn prerender back on" — that re-creates the 404 crash.
  Either:
  1. Curate an L&T-only prerender list in `lat/nuxt.config.ts` (`routes: ['/']`
     and any other safe static pages), with `crawlLinks: false` to stop the
     walk into authority territory, OR
  2. Stub the authority endpoints in `iznik-server-go` for L&T so they return
     200 with empty bodies instead of 404, OR
  3. Pre-seed the L&T DB with a minimal authority table (probably overkill).

**Also tied to this issue:** when SSR ran inside the lat-nuxt container, it
tried to fetch the public API URL and connected to its own container's
`127.0.0.1:443`, where nothing listens. Fixed by adding
`extra_hosts: lat.lend-and-tend.katapult.cloud:host-gateway` to the
compose override so SSR fetches resolve to the host's Caddy. A cleaner
long-term answer is to split runtime config into an SSR-internal base URL
(e.g. `http://lat-api:8192/apiv2`) and a public browser base URL.

- [ ] Decide between curated prerender list vs API-side stubbing
- [ ] Re-enable prerender for `/` once authority 404s are handled
- [ ] Split SSR-internal vs browser API base URLs in runtime config

---

## Shared Freegle infrastructure leaks into L&T HTML (added 2026-05-25)

**How surfaced:** `view-source` on `https://lat.lend-and-tend.katapult.cloud/` shows 68 "freegle" references. Local dev (`http://localhost:4002/`) showed 62. After the head-meta + Prebid/GoogleTag script-filter fixes done in this session, local is down to **20**. Every one of the remaining 20 leaks is a Freegle URL or domain name baked into the page — pure shared-infrastructure exposure, not branding text we forgot to override.

**What's still being shared (env-var driven, applies to local + prod identically):**

| Concern | Surfaces as | Source | L&T need? |
|---|---|---|---|
| `USER_SITE` = `https://www.ilovefreegle.org` | `og:url` (now overridden by useHead), navbar logo `<img src=…/icon.png>`, all email link bases | env var (default in `nuxt.config.ts`) | Should be `https://lat.lend-and-tend.katapult.cloud`. |
| `USER_DOMAIN` = `ilovefreegle.org` | Cookies, domain restrictions in Pinia hydration JSON | env var | Should be `lend-and-tend.katapult.cloud`. |
| `IMAGE_SITE` = `https://images.ilovefreegle.org` | Image URL builder (anything not uploaded by users) | env var | Either point at an L&T-branded CDN, or keep the dependency but document it. |
| `IMAGE_DELIVERY` = `https://delivery.ilovefreegle.org` | `<link rel=preconnect>`, `<link rel=dns-prefetch>`, `<img srcset>` URLs | env var | Image-resize CDN (weserv-style). Either rebrand domain or document the dependency openly. |
| `OSM_TILE` = `https://tiles.ilovefreegle.org/...` | Map tile URLs (no leaks in view-source, but every map tile request reveals the dependency) | env var | Could stand up an `lat-tiles.…` alias OR document. |
| `GEOCODE` = `https://geocode.ilovefreegle.org/api` | Geocoder requests (one of the LAT_USE_FREEGLE_GEOCODER toggle paths) | env var | Currently `LAT_USE_FREEGLE_GEOCODER=false` in production — already side-stepped via postcodes.io. Safe. |
| `TUS_UPLOADER` = `https://uploads.ilovefreegle.org:8080` | Resumable upload endpoint | env var | Either rebrand domain or document. |
| `MODTOOLS_SITE` = `https://modtools.org` | Not visible on L&T pages but present in `window.__NUXT__` | env var | Cosmetic — could be blanked for L&T builds, but harmless. |
| `SENTRY_DSN` = Freegle project key | Sentry tags errors as `freegle` | env var | L&T errors going into Freegle Sentry confuses oncall. Spin up an L&T Sentry project. |
| `delivery.ilovefreegle.org` (navbar logo `src`) | `<img>` for the navbar icon, served from Freegle's CDN | upstream `branding.config.ts` defaults | Once `USER_SITE` is L&T'd, the icon URL becomes `lend-and-tend.katapult.cloud/icon.png` — but **that file doesn't exist yet** in lat's `public/`. Need to drop an L&T `icon.png` (used for OG image, navbar logo, etc.). |

**Why this matters beyond aesthetics:**

1. **Trust / brand**: anyone right-clicking → view-source sees a site that *says* it's Lend & Tend in copy but *behaves* as ilovefreegle.org under the hood. Looks like a clone or a phishing site.
2. **Privacy / GDPR**: `delivery.ilovefreegle.org` (and friends) is a third-party domain from the user's perspective. Image-delivery CDNs see request headers including `Referer: https://lat.lend-and-tend.katapult.cloud/` — every L&T pageview is logged on a Freegle-owned domain. Worth a privacy-policy line.
3. **Operational coupling**: an outage of `delivery.ilovefreegle.org` takes L&T images down. An L&T deploy doesn't insulate against Freegle infrastructure failure.
4. **Confused observability**: Sentry events from L&T land in Freegle's project; oncall sees noise; root cause analysis crosses teams.

**Suggested fix (cheap first):**

1. **Stand up L&T-branded CNAMEs that proxy to the existing Freegle infra**, OR run lightweight reverse-proxies on the Katapult VM:
   - `cdn.lendandtend.com` → `delivery.ilovefreegle.org`
   - `tiles.lendandtend.com` → `tiles.ilovefreegle.org`
   - `uploads.lendandtend.com` → `uploads.ilovefreegle.org:8080`
   - `images.lendandtend.com` → `images.ilovefreegle.org`
   No new infrastructure to operate — just rebrand the customer-visible URL.
2. **Set lat-specific env vars** in the lat container's `.env` (or docker-compose lat override) so `USER_SITE`, `USER_DOMAIN`, `IMAGE_SITE`, `IMAGE_DELIVERY`, `OSM_TILE`, `TUS_UPLOADER` all use the lendandtend.com (or katapult.cloud) hostnames.
3. **Drop an L&T `icon.png` into `lat/public/`** (or `iznik-nuxt3/public/lat/icon.png`) so once `USER_SITE` is rebranded the navbar/og:image actually resolves to an L&T-branded image. The current `lat/public/images/lat/logo.png` is the right asset; need either a copy or a route.
4. **Create an L&T Sentry project** and point `SENTRY_DSN` at it for lat builds.
5. **Document any unavoidable shared dependencies** in the privacy policy: "Lend & Tend uses the same image-delivery CDN as our sister site Freegle (operated by …). Your image requests are routed via …".

**Status of what's already done in this session (lat layer, local only):**
- [x] Re-registered og/twitter meta tags at runtime in `lat/layouts/default.vue` so the upstream Freegle og:title / og:site_name / og:description / twitter:title / twitter:description don't win the @unhead dedupe.
- [x] Added author, apple-mobile-web-app-title, og:image, og:url, twitter:image, twitter:image:alt, twitter:site overrides on the same useHead.
- [x] Added a `lat/nuxt.config.ts` module that filters the upstream Prebid/GoogleTag inline `<script>` out of `app.head.script` (it carried `wrappername: "26548_Freegle"` and ~17 `/22794232631/freegle_*` ad slot codes — pure Freegle monetization L&T doesn't use). Local freegle-string count: 62 → 20.
- [x] **Stood up L&T-owned tusd + delivery (weserv) containers** as services in `docker-compose.lat.yml` (`lat-tusd` on host port 4080, `lat-delivery` on host port 4081). Set `TUS_UPLOADER` and `IMAGE_DELIVERY` env vars on lat-nuxt + `UPLOADS` and `IMAGE_DELIVERY` env vars on lat-api so the apiv2 `GetImageDeliveryUrl` constructs URLs against L&T containers, not Freegle's. Live garden image (uid `24f377ac…`) migrated into local tusd at original uid so existing DB rows resolve. Playwright spec `test-lat-upload-routing.spec.js` regression-guards the routing (asserts upload requests hit lat-tusd, not `uploads.ilovefreegle.org` / `images.ilovefreegle.org`).
- [x] Pinned `USER_SITE` env var on lat-nuxt to `http://localhost:4002` (dev) / `${LAT_USER_SITE}` (prod) so og:url + `/icon.png` references resolve to L&T host. Dropped an L&T `icon.png` in `lat/public/` (copy of `images/lat/logo.png`).

**Known remaining leak — navbar SSR fallback (not a data-path issue):**
The upstream `iznik-nuxt3/app.vue:58-72` `<template #fallback>` block for the `<ClientOnly>` navbar **hard-codes** the navbar logo `<picture srcset=…>` with `delivery.ilovefreegle.org` URLs as the no-JS fallback. This fires before client-side hydration replaces the navbar with the lat-branded one. Fix path: either (a) override `app.vue` in `lat/` with an L&T fallback (heavy — duplicates the whole upstream app shell), or (b) submit an upstream PR to make the fallback URL configurable. Tracked as separate finding because the routing infra is sound — only the static branding asset is wrong.

- [ ] Stand up L&T-branded CNAMEs for the shared CDN / tile / upload domains
- [ ] Set lat-specific runtime config env vars (USER_SITE, USER_DOMAIN, IMAGE_*, OSM_TILE, TUS_UPLOADER)
- [ ] Provide an L&T `icon.png` so `og:image` and the navbar logo aren't Freegle's
- [ ] Spin up a dedicated L&T Sentry project
- [ ] Add a privacy-policy line about any infrastructure remaining shared

---

## Tender can't see Garden Sharing Agreement via /message API (added 2026-05-25)

`AgreementForm.vue` displays the agreement state by reading
`currentPromise = message.promises[0]`, where `message` comes from
`GET /apiv2/message/{id}`. For the **lender** this works — the API
returns `promises: [...]` because they own the listing.

For the **tender** (the other party named in the agreement), the Go
server explicitly strips this:

```go
// iznik-server-go/message/message.go:502
if message.Fromuser != myid {
    // Shouldn't see promise details, but should see if it's promised to them.
    for i := range message.MessagePromises {
        if message.MessagePromises[i].Userid == myid {
            message.PromisedToYou = true
        }
    }
    message.MessagePromises = nil   // ← wipes the agreement terms
}
```

That's a Freegle privacy filter — promises on regular Freegle offers are
between the giver and one recipient; revealing promise details to a
recipient outside the giver-recipient context is intentional information
leakage on Freegle's model. **For L&T it's wrong** — the tender is the
counter-party in the agreement, by definition entitled to see the
terms and the accept/reject controls.

**Affected behaviour:** when a tender navigates to
`/agreement/{id}?userId={lenderId}`, the form has no `currentPromise`,
so `isProposed = false` and the page renders the "Draft" banner instead
of the proposed agreement. The tender can't see the terms or the
Accept-and-confirm button. Tests in
`tests/e2e/lat/test-lat-agreement-flow.spec.js` that exercise this path
(`tender can accept agreement`, `tender can suggest changes to
agreement`, `ChatMessagePromised shows confirmed status with
checkmark`) are currently `.skip`ped with a pointer to this note.

**Three possible fixes, ordered cleanest-first:**

1. **API change (cleanest):** make the Go server return the relevant
   promise to the tender too, restricted to the row where
   `messages_promises.userid == myid`. The existing loop already finds
   that row; just keep it instead of nilling the whole slice. Small
   change, ~5 lines in `message/message.go:502`, but it does touch
   `iznik-server-go/` which is otherwise off-limits per project rules.
2. **Frontend re-source:** read the promise from the **chat message**
   of type `Promised` (the ChatMessagePromised flow already surfaces
   it; the data is there client-side once the chat loads). The
   AgreementForm could accept a `promise` prop from its container or
   look it up via `chatStore`.
3. **Server-extend differently:** add a new L&T-only endpoint
   `/apiv2/lat/agreement/{msgid}` that returns the promise row for the
   tender or lender. Doesn't touch the existing handler but adds a new
   one — closer to "don't modify Go" but still a Go change.

Option (1) is the right answer if we relax the don't-touch rule. Until
then, the affected playwright tests stay skipped.

- [ ] Pick a fix path for tender-side agreement visibility
- [ ] Un-skip the 3 affected agreement-flow tests once fixed

---

## References

- `iznik-batch/app/Console/Commands/Lat/` — L&T command implementations
- `iznik-batch/app/Mail/Lat/` — L&T mail classes
- `iznik-batch/routes/console.php:34-56` — L&T scheduling block
- `docker-compose.yml:1393` — `FREEGLE_MAIL_ENABLED_TYPES` (no L&T emails)
- `iznik-nuxt3/lat/branding.config.ts:138-140` — L&T spec (check-in schedule, inactivity alert)
- `plans/active/laravel-batch-jobs-implementation.md` — Freegle batch plan (no L&T coverage)
