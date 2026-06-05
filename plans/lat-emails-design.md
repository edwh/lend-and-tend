# Lend & Tend — email set design

Goal (user): *"a rich, tested, modern set of emails which you've verified."* Like Freegle:
MJML templates → rendered via the MJML **Sidecar** → sent through the Freegle spooler to an
SMTP smart host (Mailgun in prod; Mailpit in dev). Tests for all; reviewed in Mailpit.

## Reality vs the brief (faithful correction)

The brief says "via Postgres and a smart host." The actual Freegle mechanism in `iznik-batch`
is a **file-based spooler** (`EmailSpoolerService` → `storage/spool/mail/*`), drained by
`mail:spool:process --daemon` to an **SMTP smart host** (the relay that fronts Mailgun in prod).
There is **no Postgres queue and no Mailgun API driver** anywhere in the code. We build on the
real Freegle path (spooler → SMTP smart host), which *is* "like Freegle." Dev → Mailpit on :4025.

## What already exists (and its faults)

- `lat:send-activity-alerts` + `ActivityAlertMail` (task a): works, but is a **plain Markdown
  Mailable** (not MJML/Sidecar), no spooler, no tracking headers, no FeatureFlags, no tests, and
  alerts **every** located user (no "active user" gate).
- `lat:send-checkin-reminders` + `CheckinReminderMail` (milestone check-ins, task d): same
  Markdown/no-spooler faults, **plus a real bug** — it finds the other party via
  `chat_rooms.refmsgid`, a column that does not exist, so it **never sends**. It also doesn't
  filter on accepted agreements and isn't scoped to the L&T group.
- **No MJML Sidecar** in `docker-compose.lat.yml`; the batch-worker has no `MJML_URL`, so any
  `MjmlMailable` would fail to render. The batch-worker image is also **stale** (the `Lat`
  commands aren't even in the running container).

## Verified data model (ground-truthed against the dev DB)

- Agreement = one `messages_promises` row. **lender = `messages.fromuser`** (join on `mp.msgid`);
  **tender = `messages_promises.userid`** (the party promised to). Confirmed by data
  (msg 1073: fromuser 4084 = lender, promise.userid 4085 = tender). The old check-in code's
  lender/tender labels are backwards and its chat lookup is wrong — both parties are available
  directly without any chat join.
- Confirmed agreement = `messages_promises.acceptedat IS NOT NULL`.
- Active lender (no agreement) = an `Offer` in the L&T group with no `messages_promises` row and
  no outcome. Still-looking tender = an open `Wanted` in the L&T group (no outcome) — schema-free.
- User location: `users.lastlocation → locations.lat/lng`. L&T group id = `LAT_WORLD_GROUPID`
  (1000000). Per-user state lives in `users.settings` JSON (e.g. `lat_alerts`, `lat_travelRadius`
  (km, default 10), `lat_alerted_msgids`, `lat_agreements`, `lat_waitlist_reminders`).

## Design decisions (the bits the brief asked me to "think through")

1. **"Active" recipients for new-listing alerts (a):** restrict to users who are an *active
   lender* (Offer, no agreement) **or** a *still-looking tender* (open Wanted, or
   `lat_still_looking.status != 'not_looking'`). Keep the existing radius/frequency/dedup logic.

2. **Tender "still looking" model (b):** no schema change. Primary signal = an open `Wanted`
   message. Override stored in `users.settings.lat_still_looking = {status:'looking'|'not_looking',
   updatedAt}`, set by a **post-agreement prompt email** with one-click CTAs that land on L&T
   pages and write the flag via the existing authenticated user-settings API (no new Go endpoint).
   - Tender prompt: *"Still looking for other gardens?"* → `/still-looking?choice=…`
   - Lender prompt: *"Do you have other gardens to share, or is this it?"* → `/share-another?choice=…`

3. **"Nearby" for the match good-news email (c):** garden-sharing is hyper-local, so use a fixed
   radius around the **matched garden's** location — `LAT_MATCH_RADIUS_KM`, default **5 km** —
   to L&T members, **excluding the two parties**, respecting `lat_alerts.enabled`, deduped per
   recipient via `settings.lat_match_alerted_promiseids`. Tone: celebratory + a nudge to
   list/find. (Configurable so we can widen it if volume is low.)

4. **Monthly check-in (d):** two distinct things, both kept:
   - *Matched pairs* → the existing **milestone** reminders (14/30/90/180d), fixed.
   - *Active-but-unmatched users* → a new **monthly** nudge (`lat:send-monthly-checkin`), gated by
     `lat_waitlist_reminders` (default true), deduped per calendar month via
     `settings.lat_last_monthly_checkin`.

## The email set (all `MjmlMailable`: MJML + hand-written text, tracking headers, spooler, FeatureFlags, footer)

| Mailable | Command | Trigger / audience |
|---|---|---|
| `LatActivityAlertMail` (rebuild) | `lat:send-activity-alerts` | New Offers/Wanteds near active users (task a) |
| `LatCheckinReminderMail` (rebuild+fix) | `lat:send-checkin-reminders` | Matched pair, at 14/30/90/180d (task d) |
| `LatMatchGoodNewsMail` (new) | `lat:send-match-news` | L&T members within 5 km of a new match (task c) |
| `LatStillLookingMail` (new, tender) | `lat:send-post-agreement-prompts` | Tender, just after agreement (task b) |
| `LatOtherGardensMail` (new, lender) | `lat:send-post-agreement-prompts` | Lender, just after agreement (task b) |
| `LatMonthlyCheckinMail` (new) | `lat:send-monthly-checkin` | Active unmatched users, monthly (task d) |

Shared: `App\Services\Lat\LatMailService` (spatial + active-user + settings helpers) and L&T MJML
partials (`emails/mjml/lat/partials/{head,footer}`, `components/header`) — L&T palette, and a
footer **without** Freegle's charity/HMRC boilerplate.

Branding flows from env (`FREEGLE_SITE_NAME="Lend & Tend"`, logo, noreply) — already mostly set.

## Build order

1. Infra: `lat-mjml` sidecar + `MJML_URL` + mail env; rebuild batch-worker. (#12)
2. Shared partials + `LatMailService`. (#13)
3. Rebuild activity-alert + checkin as MJML; fix checkin bug + active gate. (#14)
4. New emails: match-news, post-agreement prompts, monthly check-in; schedule all. (#15)
5. Frontend landing pages for the still-looking flow. (#16)
6. Tests (Unit + Feature + Mailpit Integration) + visual Mailpit review of every email. (#17)

## Running the tests (L&T status container)

L&T now has its own status container (`lat-status`, `docker-compose.lat.yml`) — the
same one Freegle uses, with the Laravel runner parameterised (env, Freegle-preserving
defaults) to target `lend-and-tend-batch-worker` / `lat-percona`. The repo's test hook
routes test runs through it. Exposed on host port **8082** (8081 is Freegle's).

```bash
# Run the L&T email tests (Unit + Feature):
curl -s -X POST http://localhost:8082/api/tests/laravel \
  -H 'Content-Type: application/json' -d '{"filter":"LatEmails|LatMailCommands"}'
# Mailpit integration suite:
curl -s -X POST http://localhost:8082/api/tests/laravel \
  -H 'Content-Type: application/json' -d '{"filter":"Lat","testsuite":"Integration"}'
# Poll:
curl -s http://localhost:8082/api/tests/laravel/status
```

Verified green: **15 L&T email tests** (12 Unit+Feature, 3 Mailpit Integration).

## Production mail (Mailgun) needs auth

Freegle sends to its own smart host (no auth); Mailgun requires SMTP auth. The
batch-worker mail config is now env-overridable (`LAT_MAIL_HOST/PORT/USERNAME/PASSWORD/
SCHEME`, dev defaults → lat-mailpit, no auth). Set the `LAT_MAIL_*` vars on the deploy
host (see `.env.lat.example`) to authenticate to Mailgun in production.
