# Coursbit

An AI course generator sold as a subscription. A visitor signs up, types a
subject, and gets a structured course written by an AI model — topics, lessons,
images, a quiz, flashcards, and a certificate on completion. Courses export to
PDF and PowerPoint and can be shared by link.

Everything runs as **one service**: an Express API that also serves the built
React app. One Railway service plus one Postgres database is the whole
production footprint.

---

## Documentation

| Guide | What it covers |
|---|---|
| [docs/SETUP.md](docs/SETUP.md) | Deploying from scratch, every environment variable, what breaks without each |
| [docs/OPERATING.md](docs/OPERATING.md) | Running it day to day — admin panel, plans, payments, costs, rebranding |
| [docs/DEVELOPING.md](docs/DEVELOPING.md) | How the code is organised, where to change things, how to run the tests |

## Quick start (local)

Needs Node 20+ and a PostgreSQL database.

```bash
npm install                        # installs backend and frontend
cp backend/.env.example backend/.env
# set DATABASE_URL, and an AI key if you want real course content
npm run build
npm start                          # serves API and app on $PORT (default 3001)
```

Without an AI key the app still runs and generates template content, so you can
click through everything before spending anything.

## What's in the box

**For the learner** — sign up, generate a course, read it, take notes, bookmark
lessons, ask an AI tutor about the material, review flashcards, sit a quiz, earn
a certificate, export to PDF or PowerPoint, share a course by link.

**For the operator** — an admin panel with revenue and user charts, user
management, course listing, a blog editor, contact messages, editable legal
pages, invoices, and a switch for which AI model the platform uses.

**Billing** — Stripe, PayPal, Razorpay and Paystack. Free, monthly and yearly
plans, with limits enforced on the server.

## Stack

- **Frontend** — React 18, TypeScript, Vite, Tailwind, Framer Motion
- **Backend** — Node 20, Express, TypeScript, Prisma, PostgreSQL
- **AI** — OpenAI, Google Gemini or Anthropic Claude, chosen in the admin panel
- **Images** — Pixabay, Unsplash, optionally DALL·E

## Tests

```bash
npm run audit                              # static checks over the codebase
node scripts/test/user-flow.js             # the learner journey in a browser
node scripts/test/admin-flow.js            # the admin area in a browser
bash scripts/audit/endpoint-sweep.sh       # every API endpoint, flags any 5xx
node scripts/test/repeat.js user-deep 100  # run a suite 100 times
```

They also run automatically on every push. See
[docs/DEVELOPING.md](docs/DEVELOPING.md#tests).
