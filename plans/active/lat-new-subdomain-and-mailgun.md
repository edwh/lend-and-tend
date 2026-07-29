# Runbook: `new.lendandtend.com` subdomain + Mailgun outbound email

Goal: serve the L&T app on the public subdomain **`new.lendandtend.com`** (the apex
`lendandtend.com` + `www` stay on the existing Squarespace marketing site) and switch
outbound email from the dev **Mailpit** catcher to **Mailgun** (real delivery).

Decisions locked in (2026-07-29):
- Sender: **`From: noreply@lendandtend.com`**, DKIM-signed by the Mailgun sending
  domain `mg.lendandtend.com` (relaxed DMARC alignment — same org domain — passes).
- `new.lendandtend.com` stays **`noindex`** during the beta (existing X-Robots-Tag).
- Mailgun **SMTP relay** (not the HTTP API) — no new Composer package.

STATUS 2026-07-29:
- `mg.lendandtend.com` is set up + verified in Mailgun's **US region** (DNS shows
  `v=spf1 include:mailgun.org ~all`, `pic._domainkey.mg`, `mxa/mxb.mailgun.org`).
  So SMTP host is **`smtp.mailgun.org`** (NOT the EU `smtp.eu.mailgun.org` in the
  older notes). If EU data residency is wanted, recreate the domain in EU + redo DNS.
- SMTP creds **validated by live test**: user `lendandtend@mg.lendandtend.com`,
  STARTTLS on 587. A test send From `noreply@lendandtend.com` → an external inbox
  was accepted for delivery. Password lives on the VM (`.env`), never in the repo.
- DONE 2026-07-29: `new.lendandtend.com` A/AAAA added (185.44.252.153 / 2a03:2800:500::54c).
  Caddy site block extended (live `/etc/caddy/Caddyfile`), **Let's Encrypt cert issued**
  (CN=new.lendandtend.com, valid Jul 29→Oct 27). VM `.env` + `docker-compose.override.yml`
  repointed all app URLs (IZNIK_API_V2, NUXT_PUBLIC_API_URL, FREEGLE_USER_SITE, LAT_USER_SITE,
  LAT_TUS_PUBLIC_URL, LAT_DELIVERY_PUBLIC_URL, Stripe URLs) katapult→new.lendandtend.com,
  added `new.lendandtend.com:host-gateway`. lat-nuxt/batch-worker/lat-delivery recreated
  (lat-nuxt rebuilt ~2min). VERIFIED: site 200, cert valid, /apiv2 200 same-origin, app renders.
  DMARC fixed via `_dmarc.lendandtend.com` TXT (relaxed alignment; passes on fresh lookup —
  Gmail shows green after its 60-min negative-cache from the first test expires).

- STILL PENDING (separate, need go-ahead — both outward-facing):
  1. **VM batch email still on Mailpit**, NOT Mailgun. To cut over: set `LAT_MAIL_HOST=smtp.mailgun.org`,
     `LAT_MAIL_PORT=587`, `LAT_MAIL_USERNAME=lendandtend@mg.lendandtend.com`, `LAT_MAIL_PASSWORD=<validated>`,
     `LAT_MAIL_SCHEME=smtp` in VM `.env`, recreate lat-batch-worker + lat-nuxt (contact form). Real email starts flowing.
  2. **Frontend code deploy** (magic-link passwordless login, new white landing, og-tag fix in
     `lat/layouts/default.vue`, contact-form Mailgun auth) — committed locally but NOT on the VM.
     CAUTION: the VM checkout's git history has diverged from local (VM at `342fe14`), so this
     deploy needs care, not a naive pull. Until it lands: VM login is still password-based, the
     landing is the older hero, and 3 social-meta tags (og:image/og:url/twitter:image) still point
     at the katapult host (cosmetic — katapult still serves).
  3. Optional: redirect the katapult host → new.lendandtend.com to fully retire it (its client-side
     now calls new. cross-origin).

## Current state (verified 2026-07-29)

- DNS host: **Crazy Domains** (`ns1/ns2.crazydomains.com`). Apex + `www` → Squarespace.
  MX → Google Workspace. `new.lendandtend.com` does not resolve yet.
- VM: `lat.lend-and-tend.katapult.cloud` = **A `185.44.252.153`**, **AAAA `2a03:2800:500::54c`**.
  Caddy 2.x reverse proxy, compose at `/var/www/lat`, container prefix `lat-`.
  SSH: `ssh -i ~/.ssh/lat_vm_ed25519 -o IdentitiesOnly=yes root@lat.lend-and-tend.katapult.cloud`.
- Mail today: `lat-batch-worker` → `lat-mailpit`, outbound effectively disabled.
  Live `FREEGLE_MAIL_ENABLED_TYPES` was missing `LatLoginLink` (the passwordless
  sign-in email) — fixed in the repo default; **must also be set live on cutover**.
- Two independent mail paths, both must reach Mailgun:
  1. Laravel batch-worker (all `Lat*` emails incl. `LatLoginLink`) — driven by `LAT_MAIL_*`.
  2. Nuxt contact form `iznik-nuxt3/lat/server/api/contact.post.ts` (nodemailer) —
     now shares the same `LAT_MAIL_*` creds via `SMTP_*` on `lat-nuxt`.

## Repo changes already made (uncommitted, NOT deployed)

- `deploy/caddy/Caddyfile` — added `new.lendandtend.com` to the site-block label
  (shares config with the katapult hostname; katapult kept as fallback).
- `docker-compose.lat.yml`
  - `FREEGLE_MAIL_ENABLED_TYPES` now includes `LatLoginLink`.
  - `lat-batch-worker` `FREEGLE_USER_SITE` env-indirected → `${LAT_USER_SITE:-http://localhost:4002}`.
  - `lat-nuxt` contact-form SMTP env now `${LAT_MAIL_HOST/PORT/USERNAME/PASSWORD}`
    (was hardcoded `lat-mailpit:1025`, no auth).
- `iznik-nuxt3/lat/server/api/contact.post.ts` — nodemailer now does SMTP AUTH +
  STARTTLS when creds are present (Mailgun), plaintext to Mailpit when not (dev).
- `iznik-nuxt3/lat/layouts/default.vue` — `og:url` / `og:image` / `twitter:image`
  derive from `USER_SITE` instead of a hardcoded katapult literal.

## Manual steps — the human does these (I have no Mailgun account / Crazy Domains API)

### 1. Mailgun account — click-by-click (EU)
1. mailgun.com → **Sign up**. New accounts need a **credit card** (the old free
   5k/mo plan is retired; it's pay-as-you-go "Flex" with a small free daily cap)
   and **phone verification**.
2. **Set the region to EU** — the sending domain must be created in the **EU**
   region so its hosts are `smtp.eu.mailgun.org` / `api.eu.mailgun.net`
   (data residency in the EU). A domain created under a US-region account uses US
   hosts and won't match our config.
3. Dashboard → **Send → Domains → Add New Domain**:
   - Domain: **`mg.lendandtend.com`**, Region: **EU**, default DKIM key length.
   - Add Domain. Mailgun then shows the DNS records (see step 2 below).
4. Add the DNS records at Crazy Domains, then click **Verify DNS Settings** in
   Mailgun. Wait for SPF + DKIM to go green (minutes–hours).
5. **Domain → SMTP credentials**: login is `postmaster@mg.lendandtend.com`; reveal
   or reset the password → that's `LAT_MAIL_PASSWORD`. Host `smtp.eu.mailgun.org`,
   port `587` (STARTTLS).
6. Heads-up: brand-new Mailgun accounts can sit in an anti-abuse **review/sandbox**
   state until approved — if the first live test doesn't deliver to an arbitrary
   inbox, check the account isn't pending approval before assuming a config bug.

### 2. DNS records at Crazy Domains
| Purpose | Type | Host/Name | Value |
|---|---|---|---|
| App subdomain → VM | A | `new` | `185.44.252.153` |
| App subdomain → VM (IPv6) | AAAA | `new` | `2a03:2800:500::54c` |
| Mailgun SPF | TXT | `mg` | `v=spf1 include:eu.mailgun.org ~all` |
| Mailgun DKIM | TXT | `<selector>._domainkey.mg` | *(exact value from Mailgun dashboard)* |

- DKIM selector + value are generated by Mailgun — copy them verbatim.
- MX (`mg` → `mxa/mxb.eu.mailgun.org`) and tracking CNAME (`email.mg` → `eu.mailgun.org`)
  are OPTIONAL and skipped: L&T doesn't process bounces and has click-tracking disabled.
- Wait for Mailgun to show the domain **Verified** (DNS propagation: minutes–hours).

## Deploy steps — I do these once DNS is in + Mailgun verified (awaiting go-ahead)

1. Get the updated repo onto the VM (`/var/www/lat`).
2. Set in the VM's `docker-compose.override.yml` (or `.env`):
   ```
   LAT_MAIL_HOST=smtp.mailgun.org          # US region (see STATUS)
   LAT_MAIL_PORT=587
   LAT_MAIL_USERNAME=lendandtend@mg.lendandtend.com
   LAT_MAIL_PASSWORD=<the validated SMTP password>
   LAT_MAIL_SCHEME=smtp
   LAT_USER_SITE=https://new.lendandtend.com
   LAT_ASSET_BASE_URL=https://new.lendandtend.com
   ```
   (and set `IZNIK_API_V2=https://new.lendandtend.com/apiv2`, `USER_SITE` for lat-nuxt).
   Confirm `FREEGLE_MAIL_ENABLED_TYPES` includes `LatLoginLink` live.
3. Deploy Caddy AFTER the A record resolves (else the LE cert for `new.` fails+retries):
   `scp deploy/caddy/Caddyfile root@vm:/etc/caddy/Caddyfile`
   `ssh root@vm 'caddy validate --config /etc/caddy/Caddyfile && systemctl reload caddy'`
4. Recreate app containers to pick up env:
   `docker compose -f docker-compose.lat.yml up -d lat-batch lat-batch-worker lat-nuxt`
   (rebuild `lat-nuxt` if the image bundles the changed `default.vue`/`contact.post.ts`).
5. **Verify end-to-end**: trigger a real sign-in email to a live inbox (Gmail),
   confirm it arrives, and check SPF + DKIM both **pass** in the received headers.
   Also submit the contact form and confirm it lands.

## Follow-ups (noted, not blocking)
- `README.md:162-164,204` still point at the abandoned Fly.io deploy — fix.
- `deploy/caddy/Caddyfile` header comment says `conf/caddy/...`; real path is `deploy/caddy/...`.
- `iznik-batch/config/config/` (+ nested) are inert git-tracked duplicate config dirs.
- Pre-existing lint debt: `default.vue` unused `user` var; eslint lacks a TS parser for `server/api/*.ts`.
