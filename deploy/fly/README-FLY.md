# Lend & Tend on Fly.io

A faithful translation of the Katapult `docker-compose.lat.yml` stack to Fly.io.
Each compose service becomes its own Fly app; a small Caddy **proxy** app
reproduces the single-hostname, path-based routing (Fly's edge routes by
hostname, not path). Everything **scales to zero** except the DB (`lat-mysql`)
and the Laravel scheduler (`lat-batch`), which must stay always-on. The API and
Nuxt use **baked images** (`deploy/fly/{api,nuxt}/Dockerfile` — build at image
time, not container start) so they can scale to zero at all.

**Measured cold starts** (first request after idle): Nuxt ~4 s; **API ~30 s**
(machine wake + DB pool + knn index build — it's app init, not compile). Warm
is instant. If the API's cold start is too slow on your critical path, set
`min_machines_running = 1` in `api.fly.toml` to keep it warm (cheap:
shared-cpu-1x/1 GB). Same knob makes any app always-on.

> **Status: deployed and verified end-to-end on 2026-08-26** at
> `https://lat-proxy.fly.dev` (public path → SSR, apiv2, uploads, image
> delivery all green; Katapult DB + uploads migrated). Live cutover is still
> pending DNS. `lat-admin` (moderator console) is not yet deployed — same
> compile-at-start shape as nuxt; deploy when needed.

> This is a config translation to review and iterate on with `fly deploy` — not
> a one-shot. It does **not** replace the live Katapult deployment until you
> repoint DNS (last step). See the root `CLAUDE.md`: Fly was previously
> abandoned in favour of Katapult; this revisits it on request.

## Topology

| Compose service | Fly app | Public? | Image / build | Notes |
|---|---|---|---|---|
| caddy | **lat-proxy** | ✅ 443 | `proxy/` (Caddy) | path router; Fly-managed TLS |
| lat-nuxt | lat-nuxt | private | `iznik-nuxt3` + `lat/Dockerfile` | SSR; :4002 |
| lat-api | lat-api | private | `iznik-server-go` | Go apiv2; :8192 |
| lat-admin | lat-admin | private | `iznik-nuxt3` + `modtools-lat/Dockerfile` | :4003 |
| batch-worker | lat-batch | private, no port | `iznik-batch` + `docker/Dockerfile` | **always-on** scheduler; migrations via release_command |
| lat-percona | lat-mysql | private | `mysql/` (Percona 8) | volume `lat_mysql_data`; **always-on**; reached via `.internal` |
| lat-redis | lat-redis | private | `redis:7-alpine` | semaphore only, no volume |
| lat-mjml | lat-mjml | private | `adrianrudnik/mjml-server` | :80 |
| lat-tusd | lat-tusd | private | `tusd/` | uploads; volume `lat_tusd_data`; :8080 |
| lat-delivery | lat-delivery | private | `delivery/` (weserv + confs) | :80 |
| lat-mailpit | — | — | — | **skipped** — prod mail is Mailgun |
| lat-status | — | — | — | **skipped** — dev/CI only |

Private apps talk over Fly's network at `<app>.flycast:<port>` (flycast, so a
stopped machine auto-starts on the first connection). **Every private service
therefore needs an explicit `[[services.ports]]` block** — without it the
flycast address isn't routed and connections are reset (see gotchas).

**Exception — MySQL uses `.internal`, not `.flycast`.** flycast's fly-proxy is
for client-speaks-first protocols; MySQL's server sends the greeting first, so
proxying deadlocks the handshake ("Lost connection … reading initial
communication packet"). The Go API and batch connect to `lat-mysql.internal`
(direct 6PN, no proxy). That works only because Percona binds dual-stack
(`*`) — the IPv4-only apps (Fiber, Node) can't be reached over IPv6 `.internal`
and must go through flycast+ports.

## One-time setup

```bash
# 1. Create the apps
for a in lat-proxy lat-nuxt lat-api lat-admin lat-batch lat-mysql \
         lat-redis lat-mjml lat-tusd lat-delivery; do fly apps create "$a"; done

# 2. Private (flycast) IPs so backends are reachable + auto-start internally
for a in lat-nuxt lat-api lat-admin lat-mysql lat-redis lat-mjml lat-tusd lat-delivery; do
  fly ips allocate-v6 --private -a "$a"; done

# 3. Volumes (region must match primary_region = lhr)
fly volumes create lat_mysql_data --size 3 -r lhr -a lat-mysql
fly volumes create lat_tusd_data  --size 3 -r lhr -a lat-tusd

# 4. Secrets (never in the toml)
fly secrets set MYSQL_ROOT_PASSWORD=… MYSQL_PASSWORD=… -a lat-mysql
fly secrets set MYSQL_PASSWORD=… JWT_SECRET=… -a lat-api
fly secrets set SMTP_USERNAME=lendandtend@mg.lendandtend.com SMTP_PASSWORD=… \
                STRIPE_SECRET_KEY=… STRIPE_WEBHOOK_SECRET=… \
                LAT_SENTRY_DSN=… LAT_BLUR_SECRET=… -a lat-nuxt
fly secrets set DB_PASSWORD=… MAIL_PASSWORD=… LAT_BATCH_APP_KEY=base64:… -a lat-batch
# (MYSQL_PASSWORD / DB_PASSWORD / MAIL_PASSWORD must match the mysql + Mailgun creds.)
```

## Deploy (order matters — data + sidecars first, proxy last)

Run from the repo root. Use **absolute paths** — `-c` resolves relative to the
positional context dir, so a bare relative `-c` fails with "config file not
found". `[build] dockerfile` in each toml is likewise relative to the toml's
own dir (hence the `../../` paths). Add `--remote-only` to build on Fly. If
flyctl 401s, a bogus short `FLY_API_TOKEN` env is shadowing `~/.fly/config.yml`
— prefix commands with `env -u FLY_API_TOKEN`.

```bash
R=$PWD
# Co-located config+Dockerfile → just pass the dir (finds fly.toml in it):
fly deploy $R/deploy/fly/mysql    --remote-only
fly deploy $R/deploy/fly/tusd     --remote-only
fly deploy $R/deploy/fly/delivery --remote-only
fly deploy $R/deploy/fly/proxy    --remote-only    # do this LAST
# Image-only (no build context needed):
fly deploy $R/deploy/fly -c $R/deploy/fly/redis.fly.toml --remote-only
fly deploy $R/deploy/fly -c $R/deploy/fly/mjml.fly.toml  --remote-only
# Separate build context (source repo) + config in deploy/fly:
fly deploy $R/iznik-server-go -c $R/deploy/fly/api.fly.toml   --remote-only  # go build baked
fly deploy $R/iznik-nuxt3     -c $R/deploy/fly/nuxt.fly.toml  --remote-only  # .output baked (~15 min, on builder)
fly deploy $R/iznik-batch     -c $R/deploy/fly/batch.fly.toml --remote-only  # runs migrate --force
# fly deploy $R/iznik-nuxt3   -c $R/deploy/fly/admin.fly.toml --remote-only  # BLOCKED — see "lat-admin" below
```

api/nuxt (and admin, once unblocked) use baked Dockerfiles under
`deploy/fly/{api,nuxt,admin}/` that compile at **image-build** time (on Fly's
remote builder), so the heavy build RAM (gotcha #7) is the *builder's* problem
and the runtime VMs are small (1 GB). Only `lat-mysql` and `lat-batch` are
always-on (`min_machines_running=1`); everything else scales to zero.

### lat-admin (moderator console) — not deployed

`modtools-lat` is an **unfinished Nuxt layer** and cannot be built yet (its
`npm run build` fails — the same way under compile-at-start or the baked
Dockerfile, so it was never deployable). It `extends: ['../']` (the full parent
app) but is missing what `lat/` has for that: the `vite.css` config that injects
`_color-vars.scss` via `additionalData`, the resolve aliases, the global.scss
swap, and ~8 SCSS partials under `assets/css/`. Parent components then fail to
resolve `@/assets/css/_color-vars.scss`, `assets/css/sticky-banner.scss`, etc.
Finishing the layer (port lat's build config into `modtools-lat/nuxt.config.ts`
+ add the partials, then iterate) is a frontend task, separate from this deploy.
The Fly app, private IP, `admin.fly.toml`, and `admin/Dockerfile` are all ready
for when it builds.

## Cutover

```bash
fly certs add new.lendandtend.com -a lat-proxy   # already done; validates on cutover
# Repoint new.lendandtend.com DNS (at Crazy Domains) from the Katapult VM to Fly:
#   A     new.lendandtend.com -> 66.241.125.111            (Fly shared v4, via SNI)
#   AAAA  new.lendandtend.com -> 2a09:8280:1::17c:bb46:0   (lat-proxy dedicated v6)
# The Katapult VM keeps serving until you switch DNS. (No dedicated v4 — dropped
# to save $2/mo; Fly serves the cert on the shared v4 via SNI.)
```

## First-deploy gotchas (all fixed in these configs)

Hit while bringing the stack up for the first time — kept here so the fixes
aren't accidentally reverted:

1. **`[[services.ports]]` is mandatory for flycast.** A `[[services]]` with only
   `internal_port` is *not* routed on the `.flycast` address (connections reset).
   Every private app here now has a `[[services.ports]]` block. HTTP apps
   (api, nuxt, admin, delivery) use `handlers = ["http"]`; **redis and mjml use a
   bare `port =` (raw TCP)** — the mjml-server errors when fly-proxy parses HTTP
   for it, and redis is raw TCP anyway.
2. **MySQL: `.internal` + `mysql_native_password`.** Two separate issues:
   (a) flycast deadlocks MySQL's server-first handshake → use `lat-mysql.internal`;
   (b) Percona 8 defaults to `caching_sha2_password`, whose cold-cache auth needs
   TLS/RSA key exchange that the Go driver won't do over plaintext without
   `allowPublicKeyRetrieval=true` (not set in iznik-server-go) → "unexpected EOF".
   `mysql/lat-percona-my.cnf` sets `default-authentication-plugin=mysql_native_password`.
3. **MySQL is always-on; runs on 512 MB _only_ with the tuned cnf.** A DB
   everything connects to at startup can't reliably scale-to-zero (cold-start
   races, and `.internal` can't auto-start a stopped machine).
   `min_machines_running = 1`, `auto_stop = off`. The Go API keeps an idle pool
   of up to 200 connections (`SetMaxIdleConns(200)`, hardcoded upstream), so
   mysql must hold ~200 threads. On **stock** Percona 8 that overruns 512 MB and
   mysql goes unresponsive within a minute (tested). The fix is in
   `lat-percona-my.cnf`: **`performance_schema = OFF`** (frees ~150-300 MB) plus
   lean per-connection buffers. With that, a 512 MB machine holds all 202
   connections at ~250 MB RSS (stress-tested: 150 concurrent requests, stayed
   responsive, no OOM). Remove that tuning → back to a 1 GB floor.
4. **`lat_test` grant.** The batch entrypoint runs `CREATE DATABASE IF NOT EXISTS
   <db>_test` on boot; Percona only grants the user its main DB → release_command
   dies "Access denied … to database 'lat_test'". `mysql/initdb/01-lat-grants.sql`
   creates it and grants `lat` (runs once on a fresh volume).
5. **`UPLOADS` footgun.** Unset, iznik-server-go builds image URLs against
   Freegle's `uploads.ilovefreegle.org` (violates the self-hosted-media rule).
   `api.fly.toml` sets `UPLOADS = https://new.lendandtend.com/lat-uploads/files/`.
6. **weserv resolver.** `delivery-imagesweserv.conf` used Docker's embedded DNS
   `127.0.0.11`, which doesn't exist on Fly → image fetches fail. Changed to
   `resolver 8.8.8.8 1.1.1.1`.
7. **Build memory (now the builder's problem).** The Nuxt build peaks >2 GB and
   OOM-kills a small runtime VM; the Go API's `go run` compile OOMs at 512 MB.
   Both are now compiled at **image-build time** on Fly's remote builder (baked
   Dockerfiles), so runtime VMs are 1 GB. The one-time first attempt that ran the
   build at container start needed `lat-nuxt` at 4 GB — kept in the Dockerfile's
   `NODE_OPTIONS=--max-old-space-size=4096` for the builder.

## Caveats vs the VM

- **Cold starts (baked images):** api/nuxt build at image time, so wakes are
  fast, not 30-min rebuilds. Measured: Nuxt ~4 s, **API ~30 s** (DB pool + knn
  index build). Set `min_machines_running = 1` on either to keep it warm.
- **Batch is always-on:** a per-minute scheduler can't scale to zero. It's one
  of the two always-running machines (with mysql; both cheap, shared-cpu-1x).
- **weserv `/dev/shm`:** compose sets `shm_size=1gb`; Fly has no such knob —
  size the VM's memory accordingly and bump if resizes fail.
- **Same-origin API:** `IZNIK_API_V2` stays `https://new.lendandtend.com/apiv2`
  so the browser is same-origin; SSR calls hairpin out through the proxy. To
  save a hop you could point SSR at `http://lat-api.flycast:8192/apiv2`.
- **Mail/Sentry:** unchanged — Mailgun SMTP (secrets) and the consent-gated
  Sentry to L&T's own project; no mailpit on Fly.
