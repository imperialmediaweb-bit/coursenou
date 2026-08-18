# Coursbit

An AI course generator sold as a subscription. Someone signs up, types a
subject, and gets a complete course written for them — modules, lessons of
700–900 words with worked examples, an illustration per lesson, a quiz,
flashcards, and a certificate on completion. Courses export to PDF and
PowerPoint and can be shared by link.

Everything runs as **one service**: an Express process that serves the API and
the built React app. One service plus one Postgres database is the entire
production footprint.

---

## Documentation

| | |
|---|---|
| **[Setup](docs/SETUP.md)** | Getting AI, email and payments working — all from the admin panel |
| **[Operating](docs/OPERATING.md)** | Day to day: plans, costs, rebranding, what to do when something breaks |
| **[Architecture](docs/ARCHITECTURE.md)** | How the code is laid out, and why the awkward parts are the way they are |

## Quick start

Node 20+ and a PostgreSQL database.

```bash
npm install                # installs backend and frontend
cp backend/.env.example backend/.env
# set DATABASE_URL
npm run build
npm start                  # API and app on $PORT (default 3001)
```

It runs with nothing else configured — courses generate from a template until
you add an AI key, so you can click through the whole product before spending
anything.

API keys go in the **admin panel**, not the hosting dashboard. See
[Setup](docs/SETUP.md).

## What it does

**For the learner** — generate a course, read it, take notes, bookmark lessons,
ask an AI tutor about the material, review flashcards, sit a quiz, earn a
certificate, export to PDF or PowerPoint, share by link. 23 languages.

**For the operator** — revenue and user charts, user management, a blog editor,
contact messages, editable legal pages, invoices, which AI model runs, every API
key with a live check per provider, what AI generation costs per course and per
account with a monthly spending ceiling, and a field for whichever analytics
snippet you already use.

**Billing** — Stripe, PayPal, Razorpay and Paystack. Free, monthly and yearly,
with limits enforced on the server rather than only in the interface.

## Stack

React 18 · TypeScript · Vite · Tailwind · Framer Motion
Node 20 · Express · Prisma · PostgreSQL

## Tests

```bash
npm run audit                              # static checks, no server needed
node scripts/test/user-deep.js             # the learner side, in a real browser
node scripts/test/admin-flow.js            # the admin area, in a real browser
node scripts/test/security.js              # written from the attacker's side
bash scripts/test/ai-budget.sh             # cost arithmetic and the spending cap
bash scripts/test/seo.sh                   # what a crawler and a link preview receive
bash scripts/audit/endpoint-sweep.sh       # every endpoint, flags any 5xx
node scripts/test/repeat.js user-deep 100  # run a suite 100 times
```

The browser suites drive the product the way a person does and fail on **any**
API response of 400 or worse, whether or not an assertion covers it. They run on
every push. [More in the architecture notes](docs/ARCHITECTURE.md#tests).
