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
| AI Cost | What generation costs — per course, per user, per month |
| AI Provider | Which model writes the courses |
| API keys | Every credential, with a live check per provider |
| Site & Analytics | Site name, search-engine description, indexing, analytics snippet |

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
watching before promoting an unlimited plan.

Every call to a model is logged with its token counts and priced at the point
of writing, so the figure survives a later price change. **AI Cost** in the
admin panel shows the result: cost per course, cost this month, a breakdown by
model and by operation, and the ten accounts spending the most. Compare the
cost per course to the monthly price and you know what "unlimited" can safely
mean, rather than guessing.

The rate table lives in `backend/src/services/usageService.ts`. Providers change
prices; check it against a real invoice and correct it, or override a single
figure with `AI_PRICE_<MODEL>_IN` / `_OUT` (dollars per million tokens, model
name upper-cased with non-alphanumerics as underscores — for example
`AI_PRICE_GPT_4O_IN=2.5`).

### The spending ceiling

Set `AI_MONTHLY_BUDGET_USD` to a number of dollars. Once the calendar month's
recorded spend reaches it, generation returns 503 with a message asking the
customer to try again later, and the panel shows the bar in red. Spend resets
on the first of the month.

Left unset there is no ceiling, and the admin panel says so — worth changing
before taking real customers. One loop in someone else's script otherwise runs
up a provider bill that arrives weeks later with no warning.

Set a hard limit in each provider's console as well. Two independent ceilings
is the right number when one of them is your own code.

## Analytics

**Site & Analytics** in the admin panel takes whatever snippet your analytics
vendor gives you — Plausible, Google Analytics, PostHog, Fathom, Umami are all
a script tag — and injects it into every page before the app loads, so a visitor
who leaves during the load is still counted.

Nothing else is needed. The site's Content-Security-Policy normally blocks
third-party scripts, which is why pasting a snippet into a hardened site usually
appears to do nothing; the hosts your snippet names are added to the policy
automatically and nothing else is.

There is no built-in analytics, deliberately. Every vendor here is a script tag,
and shipping one integration would mean picking a vendor on your behalf and
letting the other four go stale.

## Search engines

The same panel controls how the site presents itself:

| | |
|---|---|
| Site name | Appears in titles, structured data and link previews |
| Site URL | Needed for canonical links and the sitemap, which cannot be relative. Falls back to the domain the request arrived on |
| Description | The sentence shown under the title in a search result |
| Allow indexing | Off withdraws the sitemap, makes robots.txt refuse everything and marks every page `noindex` |

`/robots.txt` and `/sitemap.xml` are generated from the database on request, so
a post published this morning is in the sitemap this morning. Nothing to
regenerate, nothing to commit.

Each URL gets its own title, description, canonical link and preview card,
written server-side before the page is sent — a crawler or a chat unfurl reads
that first response and never runs the JavaScript, so a title set by React
would be invisible to both.

Signed-in pages, the admin area and shared course links are all marked
`noindex`. A share link is public to whoever holds it but was handed out by its
author rather than published, so it gets a proper preview card and stays out of
search results. There is no public catalogue of generated courses; adding one
would mean deciding that customers' courses are public, which is a decision for
you and not for the code.

**After deploying to a real domain**, fill in the Site URL, then submit
`https://yourdomain.com/sitemap.xml` to Google Search Console and Bing Webmaster
Tools. Nothing gets indexed until a search engine is told the site exists.

## Rebranding

Renaming the product touches:

- **Site & Analytics** in the admin panel — the name in titles and previews
- `frontend/index.html` — the fallback title, used before settings load
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
