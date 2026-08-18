# Browser test suites

These drive the real application in a real browser. They exist because static
checks and API tests both reported green while whole screens were broken.

They need the app running against a database:

```bash
# terminal 1
DATABASE_URL=... npm run build && npm start

# terminal 2
DATABASE_URL=... node scripts/test/user-flow.js
DATABASE_URL=... node scripts/test/admin-flow.js
```

`BASE_URL` defaults to `http://localhost:4020`. Set `CHROMIUM_PATH` if you have
a browser installed somewhere Playwright will not find on its own.

## What they cover

**`user-flow.js`** — sign up, generate a course, read a lesson, answer and
submit a quiz, flashcards, complete the course, open the certificate through
the notification and download it, then every remaining page, and finally
Settings: a profile change, and a password change proven by signing in again
with the new password.

**`admin-flow.js`** — sign in as an administrator, then every admin screen, the
platform AI provider control, the AI cost panel checked against rows whose cost
is known to the cent, and a blog post created through the editor and confirmed
in the list.

**`seo.sh`** — what a crawler, a link preview and a social card receive. All of
it lives in the first response, which is the one thing only a crawler reads, so
it is checked with `curl` and never with a browser: a browser test would pass
whether or not any of these tags existed.

**`analytics.sh`** — a snippet saved in the admin panel reaches the page *and*
is allowed to run. The second half is the interesting one: the site's
Content-Security-Policy blocks third-party scripts by default, so a snippet can
be perfectly present in the source and still be refused, with the only evidence
in a console nobody opens. This suite caught exactly that — the policy trailed
the saved setting by a minute.

**`ai-budget.sh`** — the monthly AI spending ceiling. Prices a handful of calls
by hand and compares, then starts the server with a $1 limit and requires
generation to be refused with a 503 once the limit is passed and to work again
once it is not. A limit that is recorded but never enforced is worse than no
limit, because it reads like protection.

## The two rules that make them worth running

**Any API response of 400 or worse fails the run**, whether or not a specific
assertion covers it. Most of what these suites have caught was found this way
rather than by an assertion written in advance.

**Every page load asserts the URL it ended on.** A route guard that silently
redirects renders a perfectly healthy dashboard. Checking only for error text
reports success while nothing you asked for loaded — which is exactly how the
admin panel stayed unreachable through an earlier round of testing that
reported twenty passes.
