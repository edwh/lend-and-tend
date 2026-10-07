---
last_reviewed: 2026-10-07
owner: Lend & Tend team
---

# Screenshot automation

The images in the member and admin guides are **generated from the running site by
Playwright**, not captured by hand. That is what keeps them current: when the UI changes,
you rerun the generator and the images change with it, in the same pull request.

The generator reuses the Lend & Tend end-to-end setup (`iznik-nuxt3/tests/e2e/lat`,
including its passwordless sign-in helpers), so there is no new tooling to install.

## Where things live

| Thing | Path |
|-------|------|
| The generator | [`iznik-nuxt3/tests/e2e/lat/docs-screenshots.mjs`](../../../iznik-nuxt3/tests/e2e/lat/docs-screenshots.mjs) |
| The manifest (what to shoot) | the `SHOTS` array inside that file |
| Generated images | `docs/lend-and-tend/members/assets/` and `docs/lend-and-tend/admins/assets/` |

Each entry in `SHOTS` maps one screenshot to one place in the docs: an audience, a name,
a URL path, and who is signed in (`none`, `lender`, `tender` or `admin`). To add or change
a screenshot, edit the manifest; do not paste an image in by hand.

## How it differs from Freegle's generator

Freegle's docs generator photographs seeded test data. The local Lend & Tend stack has no
seeded listings, chats or agreements, so this generator **walks the real journey** and
photographs it as it goes: it signs up a lender and a tender (reading their sign-in links
from Mailpit), posts a garden, starts a chat, proposes and accepts an agreement, and then
signs in as the demo admin for the admin pages. That is why the entries in `SHOTS` run in
order and some carry a `setup` or `after` step that changes the site's state.

It means the generator **writes to the stack it points at**. Only ever run it against a
local or test stack, never production.

## Running it

The script expects the local Lend & Tend stack to be up (`docker-compose -f
docker-compose.lat.yml`), with Mailpit catching mail and the demo admin seeded by the
migrations.

```bash
cd iznik-nuxt3
LAT_BASE_URL=http://localhost:4002 \
LAT_MAILPIT_URL=http://localhost:4025 \
node tests/e2e/lat/docs-screenshots.mjs
```

Environment variables:

| Variable | Default | Meaning |
|----------|---------|---------|
| `LAT_BASE_URL` | `http://localhost:4002` | The site to photograph. |
| `LAT_MAILPIT_URL` | `http://localhost:4025` | Where sign-in links are read from. |
| `DOCS_ADMIN_EMAIL` | `admin@test.com` | The admin account for the admin pages. |
| `LAT_BATCH_CONTAINER` | `lat-batch-worker` | Used to publish chat messages immediately instead of waiting for the once-a-minute schedule. Optional: without Docker access the run just waits. |
| `DOCS_OUT` | `docs/lend-and-tend` | Where to write the images (CI copies them out of a container). |
| `DOCS_SHOT` | all | Comma-separated names to write, for example `DOCS_SHOT=join,settings`. The journey still runs in full, because later shots depend on earlier state, but only the named images are rewritten. |
| `DOCS_AUDIENCE` | both | `members` or `admins`: run one audience's shots only. The admin pages need no member journey except for the member-detail page, so pair it with `DOCS_IDS`. |
| `DOCS_IDS` | none | JSON of ids the member journey would otherwise discover, for example `DOCS_IDS='{"LENDER_ID":154}'`, so `DOCS_AUDIENCE=admins` can regenerate the admin set in a couple of minutes. |

Images are written to `docs/lend-and-tend/<audience>/assets/<name>.png`. Review the diff
and commit the images alongside whatever UI change prompted them.

A full run takes several minutes, most of it waiting for sign-in emails: the batch worker
sends queued mail on a once-a-minute schedule.

Each shot is attempted up to three times before it is reported as failed: on a busy
machine the app's first render can swallow a click or arrive after a sign-in link. A shot
that fails leaves the previous image in place, so a failed run never writes a broken
picture - check the run's output for `FAILED` lines and re-run those shots.

The dev-only "Pretend to pay" box on the Join page is hidden in the pictures, as are the
Nuxt dev-tools controls: neither exists on the live site.

## How the images stay deterministic

Screenshots are only useful in version control if they do not churn on every run. The
generator pins the things that would otherwise vary:

- a **fixed laptop viewport** (1280x900, since Lend & Tend is desktop-first) and
  `reducedMotion: 'reduce'`,
- `animations: 'disabled'` and `caret: 'hide'` at capture time,
- a **fixed locale and timezone** (`en-GB`, `Europe/London`),
- **fixed names and text** for the lender, the tender, the garden and the chat, so the
  same words appear each time,
- a `MASK` list for elements that still vary. The sign-up email addresses are generated
  fresh on every run (an address can only be registered once), so wherever they appear
  they are masked.

Dates (when a listing was posted, when an agreement was accepted) do change between runs.
If that proves noisy, add their selectors to `MASK`.

## Keeping images fresh in CI

Not wired up yet. The Freegle repository's
[`docs/screenshots/regenerate-and-commit.sh`](https://github.com/Freegle/Iznik/blob/master/docs/screenshots/regenerate-and-commit.sh)
shows the shape: regenerate on a feature branch, keep only meaningful pixel changes, and
commit with `[skip ci]`. When Lend & Tend has a CI job that brings up its own stack, run
this generator inside it the same way.
