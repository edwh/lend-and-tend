# Lend & Tend — Nuxt Layer

## What this is

A Nuxt 3 layer that displays the Freegle platform as a garden-sharing site (Lend & Tend).
It sits alongside the existing Freegle Nuxt code in this fork.

The backend — `iznik-server-go` (Go API) and `iznik-batch` (Laravel) — runs **completely unchanged**.
This layer only changes what the user sees.

## Architecture

```
lend-and-tend/
  iznik-server-go/   ← Freegle Go API, UNCHANGED. Do not add code here.
  iznik-batch/       ← Freegle Laravel, UNCHANGED except one migration (world group).
  iznik-nuxt3/
    lat/             ← THIS LAYER. All L&T work lives here.
```

## The only backend addition

One Laravel migration creates a world-spanning Freegle group (`nameshort = lendandtend-world`).
This lets the frontend filter L&T garden listings from regular Freegle listings using the
existing `groupid` parameter. Nothing else changes in the database.

## Mapping L&T concepts to Freegle

| L&T concept | Freegle equivalent |
|---|---|
| Garden listing | `messages` table, type=Offer (lender) or Wanted (tender) |
| Post a garden | `POST /apiv2/message` with the L&T world groupid |
| Find gardens on map | `GET /apiv2/messages` filtered by world groupid |
| Map with blurred location | Existing Freegle location blurring in Go API |
| User login / register | Existing Freegle auth (`/apiv2/session`, `/apiv2/user`) |
| User location | `users.lat` / `users.lng` (existing Freegle columns) |
| User profile | Existing Freegle profile API |
| Messaging | Existing Freegle chat (`/apiv2/chat`) |
| Admin / roles | `users.systemrole` (existing Freegle column) |
| Block a user | `chat_roster` (existing Freegle table) |
| Word filtering | `concern_keywords` / existing Freegle chat review |
| Agreements | `promises` (existing Freegle table) |
| Notifications | `users_notifications` (existing Freegle table) |

## Rules

- **Never add Go endpoints or new API concepts without explicit user approval.**
- **Never add database columns or tables without explicit user approval.**
- All features are implemented here in the Nuxt layer by calling existing Freegle API endpoints.
- When a feature seems to need a new backend endpoint, stop and ask first.
