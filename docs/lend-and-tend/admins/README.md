---
last_reviewed: 2026-10-07
owner: Lend & Tend team
---

# Running Lend & Tend: a guide for the team

Lend & Tend is run by a small team rather than by volunteer moderators per community, so
the admin area is simpler than Freegle's ModTools. It lives inside the main site at
`/admin` and is only visible to accounts with the **Admin** or **Support** system role.

This guide is organised around what you actually do:

1. **[Getting started](getting-started.md)** - who can get in, signing in, and reading
   the dashboard.
2. **[Moderating listings](moderating-listings.md)** - the pending and approved garden
   lists, why listings normally go live without you, and the review queue of held chat
   messages.
3. **[Managing members](managing-members.md)** - the members list, a member's detail
   page, setting payment status, concessions, flagged members and chats with the team.
4. **[Running the service](running-the-service.md)** - agreements, the settings page,
   the switches that change how the site behaves, payments, email, and where to go for
   the technical side.

## First principles

- **Assume good faith.** Most people are here because they love gardens. Reach for
  editing and a friendly message before rejecting or removing anything.
- **Privacy is the product.** Members trust us with their home address and phone number.
  Those are kept off the public listing by design; never paste them into a chat or an
  email on a member's behalf.
- **Safeguarding comes first.** Any report involving harm, fraud, theft or property
  damage is taken seriously and, where appropriate, referred to the authorities. Tenders
  declare on joining that they are not on any offender's register; treat a report that
  contradicts that as urgent.
- **Money is handled by Stripe, not by us.** We never see card details. Concessions are
  honour-based. If someone has clearly claimed one in bad faith, revoke it and talk to
  them rather than arguing in public.
- **The site is a Freegle layer.** Most of what is under the bonnet is documented in the
  [Freegle docs](https://github.com/Freegle/Iznik/tree/master/docs); the parts specific to
  Lend & Tend are in this repository's `CLAUDE.md` and `deploy/` folder.
