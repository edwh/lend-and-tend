#!/usr/bin/env bash
# Low-downtime deploy for lat-nuxt (run ON the VM, from /var/www/lat).
#
# WHY: lat-nuxt builds its Nuxt .output at container START. So
# `docker compose ... up -d --force-recreate lat-nuxt` spins up a FRESH
# container that rebuilds .output for ~2 minutes — and Caddy serves the 502
# maintenance page the whole time.
#
# .output lives in the container's writable layer, which SURVIVES `docker
# restart` (only recreate/rm discards it). So for code changes to the
# bind-mounted lat/ dirs (components, pages, layouts, assets, public,
# nuxt.config, branding.config) we can rebuild in place and just restart:
#   1. rebuild .output INSIDE the running container — it keeps serving the
#      previous build throughout (verified: HTTP 200 for the whole build), then
#   2. `docker restart` — a ~2 second swap to the freshly-built .output.
#
# Use this for FRONTEND CODE changes. For ENV / compose / override changes you
# still need a real recreate: `docker compose ... up -d lat-nuxt`.
set -euo pipefail
cd /var/www/lat

echo "[deploy-lat-nuxt] rebuilding .output in the running container (site stays up)…"
docker exec lat-nuxt sh -lc 'cd /app/lat && npm run build'

echo "[deploy-lat-nuxt] restarting lat-nuxt (~2s swap)…"
docker restart lat-nuxt >/dev/null

echo "[deploy-lat-nuxt] done."
