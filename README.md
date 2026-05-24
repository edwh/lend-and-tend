# Lend & Tend

**Connect gardeners with growing space.** Lend & Tend is a platform for garden sharing — people with gardens they can't manage ("Lenders") connect with people who want to garden but lack space ("Tenders"). Both post listings on a map, message securely on-platform, sign a Garden Sharing Agreement that captures access times and restrictions, and only then is the Lender's full address shared.

Built as a Nuxt 3 layer on [Freegle](https://github.com/freegle), the online reuse network. The same Freegle Go API and Laravel batch services power both platforms. The codebase reuses Freegle's stores, composables, and components; L&T-specific code lives in the `iznik-nuxt3/lat/` layer.

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                  Lend & Tend Stack                      │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Frontend Layer           API Layer        Workers     │
│  ──────────────           ─────────        ───────     │
│                                                         │
│  iznik-nuxt3/lat/    <─→  iznik-server-go  ←─ iznik-batch
│  (Nuxt 3, port 4002)      (Go, port 4001)     (Laravel scheduler)
│   ├─ pages/                                    ├─ migrations/
│   ├─ components/                              ├─ commands/
│   ├─ stores/                                  └─ jobs/
│   └─ layouts/
│
│          ↓ (all use)
│
│       MySQL/Percona (port 3306)
│       ├─ users (auth, profiles, location blur)
│       ├─ messages (garden listings)
│       ├─ chat_* (messaging and blocking)
│       ├─ promises (garden sharing agreements)
│       └─ notifications
│
└─────────────────────────────────────────────────────────┘
```

The three services share a single MySQL database. Freegle concepts (message, chat, promise/agreement, notification) are reused; only the Nuxt frontend is L&T-specific.

## Quick Start

### Installation

```bash
git clone https://github.com/edwh/lend-and-tend.git
cd lend-and-tend
cp .env.lat.example .env
docker compose -f docker-compose.lat.yml up
```

Docker will build and start all services. Initial startup takes 2–3 minutes as migrations run and services boot.

### Access

| Service | URL | Credentials |
|---------|-----|-------------|
| Site | http://localhost:4002 | See `.env` for `TEST_USER_EMAIL` / `TEST_USER_PASSWORD` |
| API | http://localhost:4001/apiv2 | Used by frontend (no login needed) |
| Email catcher | http://localhost:4025 | View sent emails (dev only) |

## Project Layout

```
iznik-nuxt3/
├─ lat/                          # Lend & Tend Nuxt 3 layer (all UI code)
│  ├─ pages/                     # Routes: create listing, map, profile, etc.
│  ├─ components/                # UI components: MapPane, ChatFooter, etc.
│  ├─ stores/                    # L&T-specific state (extends Freegle stores)
│  ├─ composables/               # Helper functions
│  ├─ layouts/                   # Page layouts
│  └─ nuxt.config.ts             # Nuxt config (sets extends: ../)
│
├─ (all other files)             # Upstream Freegle (never modify outside lat/)
│  ├─ stores/                    # Auth, chat, messages, notifications, etc.
│  ├─ composables/               # useMe, useChat, useMap, etc.
│  ├─ components/                # UI toolkit
│  └─ pages/                     # Chats, profile, find, give, etc.
│
iznik-server-go/                 # Go API (Freegle v2)
│  └─ (no L&T changes)
│
iznik-batch/                     # Laravel batch processing
│  ├─ database/migrations/       # Schema source of truth
│  ├─ app/Console/Commands/Lat/  # L&T-specific scheduled jobs
│  └─ routes/console.php         # Job registration
```

**Key rule:** `iznik-nuxt3/` is upstream Freegle and must not be modified (except in `lat/` and `modtools/` layers). All L&T code goes in `iznik-nuxt3/lat/`.

## Testing

### Run All L&T Tests

```bash
cd iznik-nuxt3
LAT_BASE_URL=http://localhost:4002 npx playwright test tests/e2e/lat/ --config=playwright.lat.config.js
```

### Key Test Files

Run a representative subset to verify basic functionality:

```bash
cd iznik-nuxt3
LAT_BASE_URL=http://localhost:4002 npx playwright test \
  tests/e2e/lat/test-lat-listing-roundtrip.spec.js \
  tests/e2e/lat/test-lat-chat.spec.js \
  tests/e2e/lat/test-lat-map.spec.js \
  --config=playwright.lat.config.js
```

- **Listing roundtrip**: Create a listing, edit it, delete it
- **Chat**: Login, open chat, send/receive messages (slow—relies on 60s batch polling)
- **Map**: Browse listings on the map, filter by world group

See `iznik-nuxt3/tests/e2e/lat/` for full test suite. Tests automatically start the dev server.

## The Layer Pattern

L&T extends Freegle via Nuxt's `extends` config in `nuxt.config.ts`. This means:

- Every Freegle store, composable, component, and page is **already available** in L&T.
- **Only add a file in `lat/` if you override an upstream file or add purely new L&T code.**
- Before writing anything, check upstream first:
  - **Stores**: `iznik-nuxt3/stores/` (auth, chat, message, group, user, tryst/promise, notification)
  - **Composables**: `iznik-nuxt3/composables/` (useMe, useChat, useMap, useNavbar, etc.)
  - **Components**: `iznik-nuxt3/components/` (all UI building blocks)
  - **Pages**: `iznik-nuxt3/pages/` (chats, profile, settings, find, give)

### Import Pitfall: `~/components/X` Bypasses Layer Overrides

Nuxt's template auto-import (`<MyComponent />`) **does** resolve `lat/components/X.vue` over upstream—that's the layer system working. But **dynamic imports bypass it**:

```javascript
// WRONG: always pulls upstream, even if lat/components/ProfileModal.vue exists
import('~/components/ProfileModal')

// RIGHT: dynamic import uses relative path to get lat override
import('./ProfileModal.vue')

// RIGHT: remove dynamic import, use bare tag — Nuxt auto-imports from lat
<ProfileModal />
```

Audit check: `grep -rn "import('~/components" lat/` and cross-check filenames against `ls lat/components/`. Any match is a bug.

## Freegle Concept → L&T Concept Mapping

| L&T Concept | Freegle Concept | API |
|---|---|---|
| Garden listing | Message (Offer or Wanted) | `POST/GET/PATCH /apiv2/message` |
| Post garden | Create message | `POST /apiv2/message` with `world_groupid` |
| Find gardens | List messages | `GET /apiv2/messages` filtered by `world_groupid` |
| Authentication | Session/User | `/apiv2/session`, `/apiv2/user`, `useAuthStore` |
| In-app messaging | Chat | `/apiv2/chat`, `stores/chat.js` |
| User location | User lat/lng | `users.lat`, `users.lng` |
| User profile | User object | `PATCH /apiv2/user` |
| Blocking | Chat roster | `chat_roster` table |
| Garden agreement | Promise/Tryst | `promises` table, `stores/tryst.js` |
| Notifications | User notifications | `users_notifications`, `stores/notification.js` |

The Go API and batch layer are **unchanged Freegle**. The only database addition is a world-spanning group used to filter L&T listings.

## Deployment

Lend & Tend deploys to [Fly.io](https://fly.io) as four linked services. See [DEPLOY-FLY.md](DEPLOY-FLY.md) for credentials and runbooks.

- **lat-mysql**: Percona database (private network only)
- **lat-api**: Go API (`:8192`)
- **lat-frontend**: Nuxt SSR (`:3000`)
- **lat-batch**: Laravel scheduler + email worker

Database migrations run automatically on the first `lat-batch` boot when `RUN_MIGRATIONS=true`.

## Known Gaps / Ship Blockers

See [plans/active/lat-adversarial-review.md](plans/active/lat-adversarial-review.md) for current blockers and to-do items. High-level:

- Email sending is stubbed (mails go to Mailpit in dev, but production sender is not configured)
- Agreement confirmation flow not yet implemented (signatures stored but no PDF/confirmation email)
- No automated test coverage for batch commands (jobs run manually only)
- Location blur logic for production addresses pending backend changes

## Backend Rules

**Do not modify:**
- `iznik-server-go/` or `iznik-batch/` (except the one L&T migration)
- Add new Go endpoints or servers (reuse Freegle's)
- Add tables or columns without explicit approval
- Create new API concepts (all available in Freegle's schema)

**At present, almost all L&T-specific changes are in the frontend layer.** That balance will shift slightly once the L&T-specific Laravel batch commands (activity alerts, check-in reminders, agreement-confirmation emails) ship — those live under `iznik-batch/app/Console/Commands/Lat/` and `iznik-batch/app/Mail/Lat/`. Even so, the vast majority of platform behaviour — auth, chat, message moderation, batch infrastructure, the database schema, the Go API — is inherited unchanged from Freegle.

## Credits

- **[Freegle](https://github.com/freegle/iznik)** — the entire underlying platform. L&T inherits Freegle's Nuxt 3 frontend, Go API, Laravel batch processor, database schema and operational tooling unchanged. Auth, chat, message moderation, the `messages_promises` table that powers Garden Sharing Agreements, the PAF address lookup endpoints — all Freegle. Lend & Tend is technically a small layer of UI overrides, a handful of L&T-specific Laravel commands, and one schema migration, sitting on top of a very substantial existing codebase. Sincere thanks to the Freegle community.
- **Edward Hibbert ([@edwh](https://github.com/edwh))** — concept and author of the L&T layer.

## License

GNU General Public License v2 — inherited from Freegle. See `iznik-nuxt3/LICENSE` for full terms.

## Further Reading

- [CLAUDE.md](CLAUDE.md) — development rules, container reference, batch commands
- [DEPLOY-FLY.md](DEPLOY-FLY.md) — production deployment
- [plans/active/lat-adversarial-review.md](plans/active/lat-adversarial-review.md) — current blockers
- [iznik-nuxt3/lat/nuxt.config.ts](iznik-nuxt3/lat/nuxt.config.ts) — layer configuration
