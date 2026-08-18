# Architecture

One Express process serves the API **and** the built React app. Production is a
single service plus a Postgres database — nothing else to run, nothing to keep
in sync.

```
browser ──▶ Express ──┬──▶ /api/*        controllers → services → Prisma → Postgres
                      └──▶ everything else: the built React app
```

## Layout

```
backend/src/
  index.ts          startup, middleware order, route mounting
  routes/           one file per area; declares paths and which middleware runs
  controllers/      request handling, validation, HTTP status codes
  services/         the actual work — AI, email, payments, exports, settings
  middleware/       auth, rate limits, error handling
  utils/            small focused helpers with no dependencies on each other
  prisma/schema.prisma

frontend/src/
  pages/            one component per route
    public/         landing, pricing, blog, legal, shared course
    protected/      dashboard, course reader, quiz, settings, billing
    admin/          the operator's screens
  components/       reusable pieces, grouped by area
  services/api.ts   the single axios instance every request goes through
  store/            authentication state (Zustand)

scripts/
  test/             browser and API suites — see below
  audit/            static checks over the codebase
```

A rule worth keeping: **controllers do not talk to third parties directly.**
Anything that leaves the process — an AI provider, a payment gateway, SMTP —
lives in a service. That is what made it possible to change all four payment
providers' pricing in one place, and to swap the AI provider from a per-user
field to an operator setting without touching a single controller's logic.

## Things that are the way they are for a reason

**Webhook routes are mounted before `express.json()`.** Payment providers sign
the exact bytes they send. Parsing and re-serialising can reorder keys and make
a genuine notification fail verification, so those three routes receive the raw
buffer.

**The rate limiter is mounted on `/api`, not globally.** Mounted globally it
also counted the app's own JavaScript and images, so simply loading a page
consumed a tenth of the allowance.

**Access tokens live in memory; the refresh token is an httpOnly cookie.** A
script on the page cannot read the cookie. Nothing sensitive is ever returned
in a response body — `sanitizeUser()` is the single place that decides what a
user object may contain.

**Downloads are authorised by a short-lived signed token.** A download opens in
a new tab, and a new tab cannot send an `Authorization` header. The app asks for
a token over an authenticated call — where ownership and plan are checked — and
opens the URL it gets back.

**Credentials entered in the admin panel are copied into `process.env` at
startup and every minute after.** The alternative, threading a lookup through
every call site, would have created two subtly different paths — one for keys
from the environment and one for keys from the panel. This way there is one.

**The HTML head is rewritten per request, on the server.** A single-page app
serves one HTML file for every URL, so setting the title from React leaves every
crawler, link unfurler and social card reading the same generic title on every
page — they read the first response and never run the JavaScript. `htmlShell.ts`
rewrites the title, description, canonical link and preview tags before sending,
which costs one string replacement per request and makes the first response true.

**The analytics snippet is pasted, not integrated.** Plausible, Google
Analytics, PostHog, Fathom and Umami are all a script tag. Storing whichever one
the operator uses is a text field; supporting them individually would be five
integrations that go stale. The Content-Security-Policy is widened, from the
same setting, to exactly the hosts that snippet names — without that step the
browser blocks the script and reports it only to a console nobody opens, which
looks identical to the feature not working.

**`isLoading` starts true when a token is present.** The route guards must wait
for the profile before deciding. Starting at false meant every `/admin` URL
redirected to the dashboard, because the guard read a role that had not
arrived yet.

## Data model

Fourteen tables. `User` is the hub; almost everything else hangs off it with
`onDelete: Cascade`, so deleting an account genuinely removes its data.

`Course.topics` is a JSON column rather than two more tables. A course is always
read whole and never queried by lesson, so normalising it would buy nothing and
cost a join on every read.

`AppSetting` is a key/value table holding the AI provider choice, the encrypted
credentials, and the public site settings (name, description, analytics snippet).

`AiUsage` is one row per call to a model, with its token counts and the cost
computed at write time from the rate table. Pricing at write time rather than at
read time means a provider's later price change cannot silently rewrite what
last month appeared to cost.

## Tests

```bash
npm run audit                              # static checks, no server needed
node scripts/test/user-deep.js             # the learner side in a real browser
node scripts/test/admin-flow.js            # the admin area in a real browser
node scripts/test/security.js              # written from the attacker's side
bash scripts/test/credentials.sh           # the credentials panel
bash scripts/test/reconcile.sh             # a payment whose webhook was lost
bash scripts/test/signed-downloads.sh      # download authorisation
bash scripts/test/ai-budget.sh             # cost arithmetic and the spending cap
bash scripts/test/seo.sh                   # what a crawler and a link preview receive
bash scripts/test/analytics.sh             # the snippet reaches the page and may run
bash scripts/audit/endpoint-sweep.sh       # every endpoint, flags any 5xx
node scripts/test/repeat.js user-deep 100  # run a suite 100 times
```

The browser suites need `DATABASE_URL` and a running server. They also fail on
**any** API response of 400 or worse, whether or not a specific assertion covers
it — which is how several problems were found that no assertion was looking for.

Two habits are worth keeping if you extend them:

**Assert the URL you ended on**, not just the absence of an error text. A route
guard that silently redirects renders a perfectly healthy page; a test that only
looks for error messages will pass while nothing you asked for loaded.

**Verify by reading the data back**, not by the success message. A toast proves
a request was sent, not that anything was stored.

`scripts/audit/README.md` records which shipped bug each static check exists
because of — and states plainly what they cannot catch.
