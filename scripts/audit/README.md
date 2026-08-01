# Audit scripts

Static checks for the bug classes that reached real users. Each one exists
because something shipped broken and nothing caught it.

Run them all:

```bash
npm run audit
```

Individually:

```bash
node scripts/audit/api-contract.js     # frontend calls vs. backend routes
node scripts/audit/route-params.js     # ':param' names vs. req.params reads
node scripts/audit/unreachable-ui.js   # handlers and state never wired to a control
bash scripts/audit/endpoint-sweep.sh   # every endpoint hit live, flag any 5xx
```

## What each one catches

**`api-contract.js`** — two failures at once.

*A route the frontend calls that the backend never registered.* The certificate
page requested `GET /certificates/:id`, which did not exist, so opening a
certificate always showed "Certificate not found". The Settings page called
`/auth/profile`, `/auth/password` and `/auth/account` while the handlers live
under `/users/*` — the whole screen was inert.

*A response read as the wrong shape.* Most handlers answer `{ success, data }`.
Assigning `res.data` stores the envelope, so the array a component then filters
or maps is an object and the page throws. This is what crashed Bookmarks.

**`route-params.js`** — a route declaring `:token` while its handler reads
`req.params.shareToken`. The lookup runs with `undefined` and the endpoint
answers 500. Every share link was broken this way.

**`unreachable-ui.js`** — state and a save handler that exist, with a working
API behind them, but no control ever rendered. The AI provider setting sat like
this: fully implemented, impossible to use.

**`endpoint-sweep.sh`** — calls every endpoint with a real session and fails on
any 5xx. A provider with no API key answering `503 ... is not configured` is
accepted; a bare 500 is not. Needs the app running locally with a database.

## A caveat worth keeping

These are static checks and they only see what they were taught to look for.
The admin panel being unreachable — every `/admin` URL redirecting to the
dashboard because the route guard read `user.role` before the profile had
loaded — is invisible to all four. Only opening the pages in a browser and
asserting the URL you ended on catches that.

Treat these as a floor, not a ceiling.
