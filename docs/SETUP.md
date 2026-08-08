# Setup

Everything below is done from the **admin panel** at `/admin`, not from your
hosting dashboard. Sign in with an administrator account and scroll to **API
keys and credentials**.

Each group has a **Test these credentials** button that asks the provider
directly. Use it after every step — it is faster to find a wrong key here than
when a customer's payment fails.

Credentials are stored encrypted and are never shown again once saved. You see
only enough to recognise which key is in place.

---

## What is actually required

The application runs with nothing configured. Each of these switches a feature
on:

| Without it | What happens |
|---|---|
| No AI key | Courses generate from a template instead of real content |
| No SMTP | No email at all — including password resets |
| No payment provider | Nobody can subscribe |
| No image key | Lessons use a neutral placeholder image |

Start with an AI key and SMTP. Payments can wait until you have something to
sell.

---

## 1. An AI provider

You need at least one. The platform tries your chosen provider first and falls
back to the others, so having two is worth it.

**OpenAI** — the default, best overall quality.
1. Go to [platform.openai.com](https://platform.openai.com) → API keys → Create
2. Add billing; a key without credit fails on first use
3. Paste it into **OpenAI API key**

**Google Gemini** — fastest and cheapest.
1. [aistudio.google.com](https://aistudio.google.com) → Get API key
2. Paste into **Google Gemini API key**

**Anthropic Claude** — strongest long-form writing.
1. [console.anthropic.com](https://console.anthropic.com) → API keys
2. Paste into **Anthropic Claude API key**

Then pick which one runs, in the **AI Provider** section above. Providers
without a key cannot be selected.

> **Set a spending limit** in each provider's dashboard before going live. Course
> generation costs money per course, and a spending cap is the only thing that
> stands between you and a surprise bill.

---

## 2. Email

Without this, a customer who forgets their password cannot get back in.

Any SMTP provider works. For Gmail you must use an **app password**, not your
account password:

1. Enable two-factor authentication on the Google account
2. [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords)
   → generate one
3. Fill in:
   - **SMTP host** — `smtp.gmail.com`
   - **Port** — `587`
   - **Username** — the full address
   - **Password** — the app password
   - **From address** — what recipients see
   - **Contact form goes to** — where messages from the contact page land

Press **Test these credentials**. A green result means the server accepted the
login.

> Gmail is fine for the first few hundred users. Past that, use a service built
> for it — Resend, Postmark, SendGrid — or your messages start landing in spam.

---

## 3. Stripe

The main way to take card payments.

**Create the prices first.** The panel needs their IDs, and they do not exist
until you make them.

1. [dashboard.stripe.com](https://dashboard.stripe.com) → Products → Add product
2. Name it (for example "Coursbit Monthly"), set the price, choose
   **Recurring → Monthly**, save
3. Copy the price ID — it starts with `price_`
4. Repeat for the yearly price

**Then the keys.**

5. Developers → API keys → copy the **Secret key** (`sk_live_…`)
6. Paste it into **Secret key**, and the two price IDs into their fields

**Then the webhook.** Without it, a customer pays and never gets access.

7. Developers → Webhooks → Add endpoint
8. URL: `https://yourdomain.com/api/stripe/webhook`
9. Select these events:
   - `checkout.session.completed`
   - `invoice.paid`
   - `invoice.payment_failed`
   - `customer.subscription.deleted`
10. Save, then copy the **Signing secret** (`whsec_…`) into **Webhook signing
    secret**

Press **Test these credentials**. It tells you what is still missing.

### Try it before going live

Use the test keys (`sk_test_…`) and card `4242 4242 4242 4242`, any future
expiry, any CVC. Subscribe from the billing page and watch the account switch to
the paid plan. Then swap in the live keys.

> If a webhook is ever lost — a deployment restarting, a delivery failure — the
> customer is not stranded. Returning to the billing page asks Stripe directly
> and activates the subscription. There is also an **Already paid? Check payment
> status** link for anyone still on free.

---

## 4. PayPal

1. [developer.paypal.com](https://developer.paypal.com) → Apps & Credentials
2. Create an app → copy the **Client ID** and **Secret** (the secret is shown
   once)
3. Create two subscription plans, copy their IDs (they start with `P-`)
4. Add a webhook for `https://yourdomain.com/api/paypal/webhook`, subscribing to
   `BILLING.SUBSCRIPTION.ACTIVATED`, `BILLING.SUBSCRIPTION.CANCELLED` and
   `PAYMENT.SALE.COMPLETED`
5. **Copy the webhook ID** into **Webhook ID**
6. Set **Mode** to `live` when you are ready; leave it empty for sandbox

> The webhook ID is not optional. Without it every PayPal notification is
> rejected — deliberately, because it is the only thing proving a notification
> really came from PayPal rather than from someone who guessed the URL.

---

## 5. Razorpay and Paystack (optional)

Only worth setting up if you sell into India or Nigeria.

Both charge in local currency, and **the prices are not derived from the dollar
price** — set them yourself:

- Razorpay: **Monthly price in rupees**, **Yearly price in rupees**
- Paystack: **Monthly price in naira**, **Yearly price in naira**

Webhook URLs are `/api/razorpay/webhook` and `/api/paystack/webhook`.

---

## 6. Lesson images

Both have free tiers. Pixabay is tried first.

- **Pixabay** — [pixabay.com/api/docs](https://pixabay.com/api/docs)
- **Unsplash** — [unsplash.com/developers](https://unsplash.com/developers)

Without either, lessons still generate; they just carry a neutral placeholder.

---

## Settings that stay in the environment

A few things cannot be edited from the panel, by design — they are needed
before the database is reachable, or changing them from a web page would be a
security problem:

| Variable | Why |
|---|---|
| `DATABASE_URL` | Needed to read any other setting |
| `JWT_SECRET`, `JWT_REFRESH_SECRET` | Editing these from a browser would let anyone with panel access forge sessions. Derived automatically if unset |
| `FRONTEND_URL` | Used in email links and payment redirects |
| `SECRET_ENCRYPTION_KEY` | Encrypts the stored credentials. Derived automatically if unset |
| `PORT`, `NODE_ENV` | Set by the host |

See `backend/.env.example` for the full list.

---

## Making yourself an administrator

The first account has to be promoted directly in the database, since there is
no administrator yet to do it:

```sql
UPDATE "User" SET role = 'admin' WHERE email = 'you@example.com';
```

Railway → your Postgres service → Data → Query. After that, `/admin` is
reachable and every other administrator can be made from there.
