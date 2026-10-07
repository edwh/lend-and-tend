# Lend & Tend walkthrough: both sides of sharing a garden

A captioned video (about 3 minutes) following a lender and a tender through the
whole journey on the real app: joining with just an email, offering a garden
with a real photo, finding it on the map, getting in touch, responding, and
agreeing simple terms. Built with the `pr-walkthrough` framework: seeded app
states, read-only screenshots with tool-measured callouts, Remotion render.

Output: `out/lat-journey-walkthrough.mp4`.

## Regenerate

All commands assume the local L&T stack is up (`COMPOSE_PROJECT_NAME=lat
docker-compose -f docker-compose.lat.yml up -d`, app on :4002, Mailpit on
:4025, worker container `lat-batch-worker`).

```bash
cd iznik-nuxt3
# 1. Warm the dev server (first visit to each route compiles it; a cold server
#    makes the seeder's first click time out).
LAT_BASE_URL=http://localhost:4002 node walkthrough-out/warmup.cjs

# 2. Seed three clean journeys + an unpaid member + a sign-in email (~6 min).
#    Writes ids.json and the .auth-*.json storage states into this folder.
LAT_BASE_URL=http://localhost:4002 LAT_BATCH_CONTAINER=lat-batch-worker \
  node walkthrough-out/seed-journey.cjs
#    Re-seed one part only: LAT_SEED_ONLY=3 (or 1,2,3,mail,unpaid).

cd ../pr-walkthrough
# 3. Capture every shot read-only, measuring the callout boxes from the live DOM.
export $(node -e "const i=require('./prs/lat-journey/ids.json');console.log(Object.entries(i).filter(([k])=>k!=='PHOTO').map(([k,v])=>k+'='+v).join(' '))")
node src/capture.mjs --pr-dir prs/lat-journey --base-url http://localhost:4002

# 4. Render.
node src/render.mjs --pr-dir prs/lat-journey

# 5. Review: pull frames and check every caption + callout against the app.
ffmpeg -ss 42 -i prs/lat-journey/out/lat-journey-walkthrough.mp4 -frames:v 1 /tmp/f.png
```

The seeded data is test data on the local stack (fictional members), so
`masks.json` has no regions. The listing photo is a real CC0 photograph; see
`PHOTO-CREDIT.md`.

## What the seeding taught us (and fixed)

- A new garden is only visible to other members (map, and the chat's "Sign
  agreement" lookup) once `messages:update-spatial-index` has run. The L&T
  worker now schedules it every minute; the seeder also runs it directly.
- The cookie banner is fixed to the bottom of the viewport and used to cover
  the agreement form's "Send to tender" button. The app now reserves space for
  the banner; the seeder dismisses it after sign-up anyway.
- The chat's "Sign agreement" used to do nothing when the listing was not yet
  indexed. It now explains itself (see `lat/composables/latAgreementListing.js`).

The flows are pinned as regression tests in
`iznik-nuxt3/tests/e2e/lat/test-lat-walkthrough-golden.spec.js`.
`generated-tests/` holds the framework's auto-generated draft, which assumes
Freegle's password login and is kept only as the tool's output.
