# Running it

## The admin panel

Everything an operator needs is at `/admin`.

| Screen | What it does |
|---|---|
| Dashboard | Users, revenue, courses; monthly charts |
| Users | Search, change someone's plan, delete an account and its data |
| Courses | Every course generated on the platform |
| Blogs | Write and publish posts |
| Messages | What people sent through the contact form |
| Content | Edit the terms, privacy, refund and cancellation pages |
| Invoices | Every payment recorded |
| AI Provider | Which model writes the courses |
| API keys | Every credential, with a live check per provider |

## Plans

| | Free | Monthly $9.99 | Yearly $79.99 |
|---|---|---|---|
| Courses | 10 | Unlimited | Unlimited |
| Topics per course | 5 | 20 | 20 |
| Languages | 23 | 23 | 23 |
| Quizzes, certificates, PDF | Yes | Yes | Yes |
| PowerPoint export | — | Yes | Yes |
| Audio | — | Yes | Yes |

Limits are enforced on the server, so they hold even against direct API calls.

To change prices: edit `PLAN_PRICES` in `backend/src/utils/planLimits.ts`, then
the three places customers see them — `components/landing/Pricing.tsx`,
`pages/public/Pricing.tsx` and `pages/public/Home.tsx`. The Stripe prices
themselves are created in Stripe and referenced by ID.

## What it costs to run

| | Roughly |
|---|---|
| Railway (one service + Postgres) | $5–20 a month |
| Domain | $10–15 a year |
| AI generation | Per course — depends on the model and length |
| Images | Free tiers cover early usage |
| Email | Free up to a few hundred a day |

**The AI cost is the one that matters**, and it is the one number worth
measuring before promoting an unlimited plan. Generate ten courses on a real
key, read the spend in the provider's dashboard, divide. Then compare that to
the monthly price and decide what "unlimited" can safely mean.

Set a hard spending limit in each provider's console. It is the only thing that
turns a runaway cost into a failed request instead of a bill.

## Rebranding

Renaming the product touches:

- `frontend/index.html` — title and meta description
- `frontend/src/components/landing/` — navbar, hero, footer
- `backend/src/services/emailService.ts` — sender name and templates
- `backend/src/services/courseDocument.ts` — the exported workbook
- `backend/src/controllers/certificateController.ts` — the certificate
- Environment: `SMTP_FROM_NAME`, `FRONTEND_URL`

Certificates come in five designs chosen automatically from the course subject,
so a chiropractic diploma does not look like a coding badge. They are in
`certificateController.ts` as a `THEMES` table.

## Backups

Railway takes automatic Postgres backups. **Restore one into a scratch database
once, before you need it.** A backup nobody has restored is a hope, not a
backup.

## When something breaks

**Generation returns template text instead of real content** — no AI key is
reachable. Check the panel; the credential check will say which one is refused.

**Nobody can subscribe** — run the credential check for that provider. It
reports exactly what is missing, including the webhook secret.

**Somebody paid but is still on free** — the webhook did not arrive. They can
press **Already paid? Check payment status** on the billing page, which asks the
provider directly. This is also recorded in the server log.

**A page is blank after a deploy** — a tab opened before the deploy asking for a
file that no longer exists. It reloads itself once automatically; a hard refresh
also fixes it.

**No email is arriving** — every skipped message is written to the server log
with the reason. Look there first; it usually says the credentials are missing.
