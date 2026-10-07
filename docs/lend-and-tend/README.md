---
last_reviewed: 2026-10-07
owner: Lend & Tend team
---

# Lend & Tend documentation

Welcome. This is the help and guidance for Lend & Tend: how the garden-sharing site works
for the people who use it, and for the small team who look after it.

Pick the section that fits you:

| Section | Who it's for |
|---------|--------------|
| **[Using Lend & Tend](members/README.md)** | You have a garden to share, or you want a garden to tend. |
| **[Running Lend & Tend](admins/README.md)** | You are on the team that approves listings, looks after members and keeps the site healthy. |
| **[Screenshot automation](screenshots/README.md)** | You maintain these pages and need to refresh the pictures. |

Both guides are plain how-to pages with pictures taken from the real site.

## How this relates to the Freegle docs

Lend & Tend is built as a layer on top of Freegle's software (the `iznik-nuxt3/lat/`
folder in this repository). The developer, operations and getting-started material in the
upstream Freegle documentation applies here too, so we do not repeat it. Read the
[Freegle docs](https://github.com/Freegle/Iznik/tree/master/docs) for how the software
is built, tested and deployed, and the repository's `CLAUDE.md` for what is specific to the
Lend & Tend layer and its deployment.

If you help write these pages, follow the same conventions as the Freegle docs
(their [maintaining-docs](https://github.com/Freegle/Iznik/blob/master/docs/maintaining-docs.md)
page): update a page in the same change as the feature it describes, keep the front matter
`last_reviewed` date current, and never paste in a hand-made screenshot. Pictures come from
the generator described in [screenshots/README.md](screenshots/README.md).

## A few Lend & Tend words

- **Lend & Tend** - a garden-sharing site. People with garden space they cannot manage
  share it with people who want somewhere to grow.
- **Lender** - someone offering a garden, or part of one, to share.
- **Tender** - someone looking for a garden to tend.
- **Patch-match** - a lender and a tender finding each other and agreeing to share.
- **Listing** - a garden a lender has posted, or a "looking to tend" post from a tender.
  Both appear on the map and in the list.
- **Chat** or **Messages** - the private conversation between two members, where they
  get to know each other and arrange things.
- **Garden Sharing Agreement** - the simple written agreement the two members fill in
  and both accept: what will be grown, when the tender will visit, a few ground rules
  and a review date.
- **Check-in** - a quick "how is it going?" that either member can post into the chat,
  with reminders at two weeks, one month, three months and six months.
- **Joining fee** - the one-off £12 payment that unlocks messaging. Browsing is free.
- **Concession** - a free membership for anyone receiving Universal Credit or Pension
  Credit, or in financial difficulty, claimed on the Join page.
- **Sign-in link** (magic link) - Lend & Tend has no passwords. To sign in you ask for a
  link, we email it to you, and you click it.
- **World group** - behind the scenes, every Lend & Tend listing lives in one Freegle
  "group" that covers the whole world. Members never see it; the team does, in the admin
  pages, as the "World Group ID".
