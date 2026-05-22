**See also: [codingstandards.md](codingstandards.md)** for coding rules. **Use the `ralph` skill** for any non-trivial development task. For automated execution: `./ralph.sh -t "task description"`

## Lend & Tend Architecture (READ THIS FIRST)

This repo is a **fork of Freegle**. Lend & Tend is a garden-sharing platform built as a **Nuxt 3 layer** on top of the Freegle codebase — the same pattern as `modtools`.

### The golden rule: `iznik-nuxt3/` is upstream Freegle — never touch it

`iznik-nuxt3/` must remain **identical to the upstream Freegle Nuxt3 repo**. It has a full set of stores, components, composables, API classes, and pages. The `lat/` layer extends all of that via Nuxt's layer system.

**Never modify files directly inside `iznik-nuxt3/` (outside of `lat/` and `modtools/`).**

### All L&T work goes in `iznik-nuxt3/lat/`

The `lat/` layer extends the parent (`../`) using Nuxt's `extends` config. This means:
- Every store, composable, component, and page in the parent is **already available** in `lat/`
- Only **add a file in `lat/` if you need to override or extend the upstream version**, or if it is purely new L&T functionality with no upstream equivalent
- **Before writing any new code in `lat/`, check upstream first:**
  - `iznik-nuxt3/stores/` — auth, chat, notification, message, group, user, tryst, etc.
  - `iznik-nuxt3/composables/` — useMe, useChat, useMap, useNavbar, etc.
  - `iznik-nuxt3/components/` — all Freegle UI components
  - `iznik-nuxt3/pages/` — chats, profile, settings, find, give, etc.

### What belongs in `lat/` vs upstream

| Situation | Action |
|---|---|
| Freegle already has a store/composable for it | Import and use it directly — no new file in `lat/` |
| Freegle page exists but needs L&T changes | Override by adding the same path in `lat/pages/` |
| Freegle component exists but needs L&T skin | Override by adding same path in `lat/components/` |
| Purely new L&T concept (e.g. garden map filtering by world group) | Add in `lat/` |
| New Nuxt layout for L&T | Add/override in `lat/layouts/` |

### The modtools-lat pattern

There will also be a `modtools-lat/` layer that extends `modtools/` in the same way. The same rules apply: `modtools/` is upstream, all changes go in `modtools-lat/`.

### Backend — never change

**NEVER:**
- Modify `iznik-server-go/` or `iznik-batch/` (except the one L&T migration)
- Add new Go endpoints or a new Go server
- Add new database tables or columns without explicit user approval
- Create new API concepts — use what Freegle already has

**Freegle concept → L&T concept mapping:**
- Garden listing = Freegle `message` (type=Offer for lender, type=Wanted for tender)
- Post a garden = `POST /apiv2/message` with the L&T world groupid
- Find gardens = `GET /apiv2/messages` filtered by world groupid
- Auth = existing `/apiv2/session`, `/apiv2/user` — use Freegle's `useAuthStore`
- Chat = existing `/apiv2/chat` — use Freegle's `stores/chat.js`
- User location = `users.lat` / `users.lng`
- User profile = existing Freegle profile API (`PATCH /apiv2/user`)
- Admin/roles = `users.systemrole`
- Block = `chat_roster`
- Word filter = `concern_keywords`
- Notifications = `users_notifications` — use Freegle's `stores/notification.js`
- Agreements = `promises` — use Freegle's `stores/tryst.js`

**The only schema addition:** One Laravel migration auto-creates a world-spanning Freegle group (`nameshort=lendandtend-world`) used to filter L&T listings.

**LAT Nuxt dev server:** port 4002. API at `IZNIK_API_V2` (default `http://localhost:4001/apiv2`).
**LAT Playwright tests:** `LAT_BASE_URL=http://localhost:4002 npx playwright test tests/e2e/lat/` from `iznik-nuxt3/`.

## Critical Rules

- **NEVER merge PRs.** Only humans merge PRs. Stop at "PR is ready for merge".
- **NEVER skip or make coverage optional in tests.** Fix the root cause if coverage upload fails.
- **NEVER dismiss test failures as "pre-existing" or "unrelated".** Investigate and fix all failures.
- **NEVER push unless explicitly told to** by the user.
  - **Exception**: When CI is failing on master, you may push fixes directly to master (no PR required) — same as you would fix CI failures on an open PR.

## Container Quick Reference

- **Ports**: Live in `docker-compose.ports.yml`, included via `COMPOSE_FILE` in `.env`. Never hardcode ports.
- **Container names**: Prefixed by `COMPOSE_PROJECT_NAME` (default: `freegle`). E.g. `freegle-apiv1`, `freegle-traefik`.
- **Dev containers**: File sync via `freegle-host-scripts` — no rebuild needed for code changes.
- **HMR caveat**: If changes don't appear after sync, restart container: `docker restart <container>`.
- **Production containers**: Require full rebuild (`docker-compose build <name> && docker-compose up -d <name>`).
- **Go API (apiv2)**: Requires rebuild after code changes.
- **Status container**: Restart after code changes (`docker restart status`).
- **Compose check**: Stop all containers, prune, rebuild, restart, monitor via status container.
- **Profiles**: Set `COMPOSE_PROFILES` in `.env`. Local dev: `frontend,database,backend,dev,monitoring`. See `docker-compose.yml` for profile definitions.
- **Networking**: No hardcoded IPs. Traefik handles `.localhost` routing via network aliases. Playwright uses Docker default network.
- **Playwright tests**: Run against **production container**. If debugging failures, check for container reload triggers — add to pre-optimization in `nuxt.config.js`.
- Container changes are lost on restart — always make changes locally too.

## Multi-Instance / Worktree Isolation

Multiple Docker Compose environments can run in parallel using git worktrees. Only one worktree has exposed ports at a time (the "active" one). Use `./freegle` CLI:

```bash
./freegle worktree create feature-x    # Create isolated worktree
./freegle activate feature-x           # Swap ports to feature-x
./freegle status                       # See which is active
./freegle worktree remove feature-x    # Cleanup
```

**Architecture**: Ports live in `docker-compose.ports.yml` (separate from `docker-compose.yml`). The `COMPOSE_FILE` env var controls inclusion. Secondary worktrees set `COMPOSE_FILE=docker-compose.yml` (no ports) and get a unique `COMPOSE_PROJECT_NAME` for container/volume isolation.

**Single-checkout users**: No changes needed. Default `.env` includes the ports file.

## Yesterday

Uses `docker-compose.override.yesterday.yml` (copy to `docker-compose.override.yml`). Set `COMPOSE_FILE=docker-compose.yml:docker-compose.ports.yml:docker-compose.override.yesterday.yml` in `.env`. Only dev containers run (faster startup). Uses `deploy.replicas: 0` to disable services. Don't break local dev or CircleCI when making yesterday changes.

## Database Schema

- **Laravel migrations** in `iznik-batch/database/migrations/` are the single source of truth.
- `schema.sql` is retired (historical reference only).
- Stored functions managed by migration `2026_02_20_000002_create_stored_functions.php`.
- Test databases: `scripts/setup-test-database.sh` runs `php artisan migrate`, clones schema to test DBs.

## CircleCI

- Publish orb after changes: `source .env && ~/.local/bin/circleci orb publish .circleci/orb/freegle-tests.yml freegle/tests@1.x.x`
- Check version: `~/.local/bin/circleci orb info freegle/tests`
- **Docker build caching**: Controlled by `ENABLE_DOCKER_CACHE` env var in CircleCI. Bump version suffixes in orb YAML to invalidate cache. Set to `false` for immediate rollback.
- **Auto-merge**: When all tests pass on master, auto-merges to production branch in iznik-nuxt3.
- **Self-hosted runner**: Runs in a separate WSL2 distro (`circleci-runner`), NOT in the main dev WSL. Never create worktrees for runner work.
- **Docker version on runner is pinned to 27.5.1** (`apt-mark hold docker-ce docker-ce-cli containerd.io`). Docker 28+ breaks container-to-container networking via bridge networks (per-container PREROUTING DROP rules), causing Playwright renderer freezes and test timeouts. Do NOT upgrade. See commit `5ec47b823`.

## Batch Production Container

`batch-prod` runs Laravel scheduled jobs against production DB. Secrets in `.env.background` (see `.env.background.example`). Profile: `backend`.

## Loki

Logs on `localhost:3100`. Use `-G` with `--data-urlencode` for queries. Timestamps are nanoseconds. Label values must be quoted. See `iznik-server-go/systemlogs/systemlogs.go` for Go API wrapper.

## Sentry

Status container has Sentry integration. Set `SENTRY_AUTH_TOKEN` in `.env`. See `SENTRY-INTEGRATION.md`.

## Miscellaneous

- When making app changes, update `README-APP.md`.
- Never merge the whole `app-ci-fd` branch into master.
- Plans go in `FreegleDocker/plans/`, never in subdirectory repos.
- When switching branches, rebuild dev containers.
- When making test changes, don't forget to update the orb.
- **Browser Testing**: See `BROWSER-TESTING.md`.

## Session Log

See [`.claude-session.md`](.claude-session.md) — gitignored local file, not committed to git. Ralph reads and writes that file so session log updates never cause PRs to go BEHIND.
