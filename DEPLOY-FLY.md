# Fly.io Deployment Guide for Lend & Tend

This guide walks you through deploying the Lend & Tend (L&T) application to Fly.io, a serverless container platform with built-in scale-to-zero and private networking.

## Architecture

L&T is a two-service stack:

1. **Frontend** (`lat-frontend`): Nuxt 3 SSR service on port 3000. Public-facing.
2. **API** (`lat-api`): Go API server on port 8192. Public-facing (for browser `/apiv2` requests) and reachable from frontend over Fly's private network (`.flycast`).

Both services auto-suspend to zero machines when idle (instant resume via auto-start), using Fly's `performance` machines (dedicated CPU, no shared-cpu). Each has at most 1 running instance at a time during normal operation.

## Prerequisites

1. **Install Fly CLI**: [flyctl.io](https://fly.io/docs/getting-started/installing-flyctl/)
2. **Sign up for Fly.io** and authenticate: `flyctl auth login`
3. **Prepare a MySQL database** (choice of: Fly Postgres with MySQL shim, PlanetScale, AWS RDS, or local). Ensure credentials and schema are ready.

## Deployment Steps

### 1. Create Fly Apps

```bash
# Create frontend app
flyctl apps create lat-frontend

# Create API app
flyctl apps create lat-api
```

### 2. Set Secrets for API Server

The Go API reads database credentials and config from environment variables. Set these via Fly secrets (encrypted in transit and at rest):

```bash
# For lat-api, set all required database and app config
flyctl -a lat-api secrets set \
  MYSQL_HOST=<your-mysql-host> \
  MYSQL_PORT=3306 \
  MYSQL_DBNAME=iznik \
  MYSQL_USER=<your-mysql-user> \
  MYSQL_PASSWORD=<your-mysql-password> \
  MYSQL_PROTOCOL=tcp \
  SENTRY_DSN=https://...@sentry.io/... \
  JWT_SECRET=<your-jwt-secret-key>
```

**Required secrets for lat-api:**
- `MYSQL_HOST` — MySQL hostname or IP
- `MYSQL_PORT` — MySQL port (default 3306)
- `MYSQL_DBNAME` — Database name (default `iznik`)
- `MYSQL_USER` — MySQL username
- `MYSQL_PASSWORD` — MySQL password
- `MYSQL_PROTOCOL` — Connection protocol (`tcp` or `unix`)
- `JWT_SECRET` — Secret key for signing JWTs (generate a strong random string)
- `SENTRY_DSN` (optional) — Sentry error tracking URL

### 3. Set Secrets for Frontend

The Nuxt frontend needs the public API URL:

```bash
flyctl -a lat-frontend secrets set \
  IZNIK_API_V2=https://lat-api.fly.dev/apiv2 \
  LAT_WORLD_GROUPID=<world-groupid> \
  SENTRY_DSN=https://...@sentry.io/...
```

**Required secrets for lat-frontend:**
- `IZNIK_API_V2` — Public URL of the Go API (typically `https://lat-api.fly.dev/apiv2`)
- `LAT_WORLD_GROUPID` — Freegle world group ID for L&T listings (set by migrations)
- `SENTRY_DSN` (optional) — Sentry error tracking URL

### 4. Deploy API Server

```bash
cd iznik-server-go
flyctl deploy --app lat-api
```

Monitor the build and deployment:

```bash
# Watch logs in real-time
flyctl -a lat-api logs -f

# Check status and machine details
flyctl -a lat-api status
```

### 5. Deploy Frontend

```bash
cd iznik-nuxt3
flyctl deploy --app lat-frontend
```

Monitor:

```bash
flyctl -a lat-frontend logs -f
flyctl -a lat-frontend status
```

## Database Setup

The database schema is created by Laravel migrations in `iznik-batch/database/migrations/`. You have three options:

### Option A: Fly Postgres (recommended for testing)

```bash
flyctl postgres create
```

This creates a managed Postgres. You can add a MySQL shim, but note that Fly's native MySQL is currently in beta. Set `MYSQL_HOST` to the Postgres service hostname.

### Option B: PlanetScale (MySQL hosting)

1. Create account at [planetscale.com](https://planetscale.com)
2. Create a database branch
3. Use connection credentials for `MYSQL_HOST`, `MYSQL_USER`, `MYSQL_PASSWORD`
4. Set `MYSQL_PROTOCOL=tcp`

### Option C: External RDS / managed MySQL

Use your own managed MySQL instance. Ensure:
- Database allows incoming connections from Fly's public IP ranges
- Schema is initialized by running Laravel migrations

**To initialize schema** (after database is running):

```bash
# From iznik-batch directory, connect to your database and run migrations
cd iznik-batch
php artisan migrate --database=mysql
```

## Verification

### Test the API is running

```bash
curl https://lat-api.fly.dev/api/version
```

Expected response: `{ "git": "...", "timestamp": "..." }`

### Test the frontend loads

```bash
curl https://lat-frontend.fly.dev/
```

Should return HTML (Nuxt SSR page).

### Test scale-to-zero behavior

Scale-to-zero is enabled by default (`min_machines_running = 0` in fly.toml). To verify:

1. Check status (should show 0 machines running after ~5 min idle):
   ```bash
   flyctl -a lat-api status
   flyctl -a lat-frontend status
   ```

2. Hit the app URL — machines auto-resume within seconds (check logs during wake):
   ```bash
   flyctl -a lat-api logs -f
   ```

3. Watch machine come online in status output.

## Troubleshooting

### Build fails: `npm ci` or `go mod download` timeouts

- Increase timeout: `flyctl deploy --quiet --remote-only --build-arg BUILDKIT_STEP_LOG_MAX_SIZE=5000000`
- Check Fly docs for network issues in your region

### Database connection refused

- Verify `MYSQL_HOST` is reachable from Fly (not a private IP)
- Check firewall rules allow Fly's IP ranges
- Run `mysql -h <MYSQL_HOST> -u <user> -p` locally to test credentials

### Frontend shows "API unreachable"

- Verify `IZNIK_API_V2` secret is set correctly
- Check lat-api logs: `flyctl -a lat-api logs -f`
- Test from CLI: `curl https://lat-api.fly.dev/apiv2/groups`

### Machine won't auto-start after suspension

- Check if `auto_start_machines = true` in fly.toml (it should be)
- Check if min_machines_running is 0
- Try manual restart: `flyctl -a <app> scale count 1`

## Scaling & Cost Control

Default configuration:
- **CPU**: 1x performance (dedicated, no sharing)
- **RAM**: 512 MB
- **Machines**: Suspend when idle (RAM kept, instant resume), scale to 0 when fully stopped
- **Billing**: Pay only for runtime + small egress; suspended machines are free

To adjust:

```bash
# Scale up max concurrent machines
flyctl -a lat-api scale count 2

# Change machine size (careful with costs)
flyctl -a lat-api scale memory 1024  # 1GB RAM
```

## Monitoring & Logs

```bash
# Tail logs from both apps
flyctl -a lat-frontend logs -f &
flyctl -a lat-api logs -f

# Check specific machine
flyctl -a lat-api machines list
flyctl -a lat-api logs -f --machine <machine-id>

# Metrics (requires paid plan)
flyctl -a lat-api status --verbose
```

## Updating Secrets

If you need to rotate a secret:

```bash
flyctl -a lat-api secrets set MYSQL_PASSWORD=<new-password>
```

This triggers a redeploy of affected machines.

## Rolling Back

If a deploy goes wrong:

```bash
# List recent releases
flyctl -a lat-api releases

# Rollback to previous release
flyctl -a lat-api releases rollback
```

## Additional Resources

- [Fly.io Docs](https://fly.io/docs/)
- [Nuxt on Fly](https://fly.io/docs/languages-and-frameworks/nuxt/)
- [Go on Fly](https://fly.io/docs/languages-and-frameworks/golang/)
- [Scale to Zero](https://fly.io/docs/apps/scale-to-zero/)
