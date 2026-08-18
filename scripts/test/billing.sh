#!/usr/bin/env bash
# The bugs that cost money in both directions: someone pays and does not get
# access, or does not pay and does.
#
# There are no live provider keys here, so this drives the code the webhooks
# drive — paymentService — directly. That is the layer where the expensive
# mistakes live: a redelivered event that grants a second month, two deliveries
# racing each other, an expiry that lapses while the card is still being
# charged. A test that needed Stripe to be reachable would simply never run.
#
# Usage: DATABASE_URL=... bash scripts/test/billing.sh
set -uo pipefail

BASE="${BASE_URL:-http://localhost:4020}"
API="$BASE/api"
REPO="$(cd "$(dirname "$0")/../.." && pwd)"
PASS=0
FAIL=0

ck() {
  if [ "$2" = "1" ]; then
    echo "PASS  $1"
    PASS=$((PASS + 1))
  else
    echo "FAIL  $1 ${3:+— $3}"
    FAIL=$((FAIL + 1))
  fi
}

if [ -z "${DATABASE_URL:-}" ]; then
  echo "DATABASE_URL must be set."
  exit 1
fi

S=$(date +%s%N)
EMAIL="bill$S@test.local"
TOKEN=$(curl -s -X POST "$API/auth/register" -H 'Content-Type: application/json' \
  -d "{\"name\":\"Bill\",\"email\":\"$EMAIL\",\"password\":\"password123\"}" |
  python3 -c "import sys,json;print(json.load(sys.stdin).get('accessToken',''))")
[ -z "$TOKEN" ] && { echo "Could not create a test account (rate limited?)."; exit 1; }

# ─────────────────────────────────────────────────────────────────────────────
echo "=== PLN-08  the discount on the pricing page is the discount charged ==="
MATH=$(node -e "
  const { PLAN_PRICES } = require('$REPO/backend/dist/utils/planLimits');
  const monthly = PLAN_PRICES.monthly.amount;
  const yearly = PLAN_PRICES.yearly.amount;
  const saving = Math.round((1 - yearly / 12 / monthly) * 100);
  console.log(saving + '|' + (yearly / 12).toFixed(2) + '|' + monthly);
")
SAVING=${MATH%%|*}
echo "      \$${MATH##*|}/month vs \$$(echo "$MATH" | cut -d'|' -f2)/month on yearly — a $SAVING% saving"
CLAIMED=$(grep -rhoE 'Save [0-9]+%' "$REPO/frontend/src" | grep -oE '[0-9]+' | sort -u)
ck "every 'Save N%' on the site matches the prices in the code" \
  "$([ "$CLAIMED" = "$SAVING" ] && echo 1 || echo 0)" "site says $CLAIMED%, prices give $SAVING%"

# ─────────────────────────────────────────────────────────────────────────────
echo
echo "=== PAY-04 / PAY-09  a redelivered webhook does not grant a second month ==="
RESULT=$(node -e "
  process.env.DATABASE_URL = process.env.DATABASE_URL;
  const { PrismaClient } = require('$REPO/backend/node_modules/@prisma/client');
  const { paymentService } = require('$REPO/backend/dist/services/paymentService');
  const p = new PrismaClient();

  const activation = (eventId) => ({
    userId: USER_ID, plan: 'monthly', provider: 'stripe',
    providerId: 'sub_test_$S', amount: 9.99, currency: 'usd', eventId,
  });
  let USER_ID;

  (async () => {
    const user = await p.user.findUnique({ where: { email: '$EMAIL' } });
    USER_ID = user.id;

    // One payment, delivered once.
    await paymentService.activateSubscription(activation('evt_$S'));
    const once = await p.user.findUnique({ where: { id: USER_ID } });

    // The same event again, as a provider retry.
    await paymentService.activateSubscription(activation('evt_$S'));
    const twice = await p.user.findUnique({ where: { id: USER_ID } });

    // And the case a check-then-write cannot survive: two deliveries at once.
    await Promise.all([
      paymentService.activateSubscription(activation('evt_race_$S')),
      paymentService.activateSubscription(activation('evt_race_$S')),
      paymentService.activateSubscription(activation('evt_race_$S')),
    ]);
    const raced = await p.user.findUnique({ where: { id: USER_ID } });
    const invoices = await p.invoice.count({ where: { userId: USER_ID } });

    console.log(JSON.stringify({
      afterOne: once.planExpiresAt,
      afterRetry: twice.planExpiresAt,
      afterRace: raced.planExpiresAt,
      plan: raced.plan,
      invoices,
    }));
    await p.\$disconnect();
  })().catch((e) => { console.log(JSON.stringify({ error: e.message })); });
")

# The service logs to stdout as it works ("Skipping duplicate stripe event …"),
# so the JSON is the last line, not the whole output.
RESULT=$(echo "$RESULT" | tail -1)
field() { echo "$RESULT" | python3 -c "import sys,json;print(json.load(sys.stdin).get('$1',''))" 2>/dev/null; }
ck "the first delivery activates the plan" "$([ "$(field plan)" = "monthly" ] && echo 1 || echo 0)" "$RESULT"
ck "a retry of the same event changes nothing" \
  "$([ "$(field afterOne)" = "$(field afterRetry)" ] && echo 1 || echo 0)" \
  "expiry moved from $(field afterOne) to $(field afterRetry)"
ck "three simultaneous deliveries of one event grant one month, not three" \
  "$(python3 -c "
import sys,json,datetime
d = json.loads('''$RESULT''')
a = datetime.datetime.fromisoformat(d['afterRetry'].replace('Z','+00:00'))
b = datetime.datetime.fromisoformat(d['afterRace'].replace('Z','+00:00'))
days = (b - a).days
print(1 if days <= 32 else 0)
" 2>/dev/null || echo 0)" \
  "a read-then-write guard loses this race; only a unique index wins it"
ck "one invoice per event, no duplicates" \
  "$([ "$(field invoices)" = "2" ] && echo 1 || echo 0)" "got $(field invoices) invoices for 2 distinct events"

# ─────────────────────────────────────────────────────────────────────────────
echo
echo "=== PLN-05  an expired subscription does not take the courses with it ==="
COURSE=$(curl -s -X POST "$API/courses/generate" -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"title":"Paid era course","language":"English","type":"image","topics":[{"title":"T","subtopics":["S"]}]}')
PAID_COURSE=$(echo "$COURSE" | python3 -c "import sys,json;print(json.load(sys.stdin)['data']['id'])" 2>/dev/null)

node -e "
  const { PrismaClient } = require('$REPO/backend/node_modules/@prisma/client');
  const p = new PrismaClient();
  p.user.update({ where: { email: '$EMAIL' }, data: {
    plan: 'monthly', planExpiresAt: new Date(Date.now() - 86400000),
  }}).then(() => p.\$disconnect());
" >/dev/null

FRESH=$(curl -s -X POST "$API/auth/login" -H 'Content-Type: application/json' \
  -d "{\"email\":\"$EMAIL\",\"password\":\"password123\"}")
PLAN_NOW=$(echo "$FRESH" | python3 -c "import sys,json;print(json.load(sys.stdin)['user']['plan'])" 2>/dev/null)
TOKEN=$(echo "$FRESH" | python3 -c "import sys,json;print(json.load(sys.stdin)['accessToken'])")

ck "an expired subscription drops the account to free" \
  "$([ "$PLAN_NOW" = "free" ] && echo 1 || echo 0)" "got '$PLAN_NOW'"
ck "a course made while paying is still readable afterwards" \
  "$([ "$(curl -s -o /dev/null -w '%{http_code}' "$API/courses/$PAID_COURSE" -H "Authorization: Bearer $TOKEN")" = "200" ] && echo 1 || echo 0)" \
  "deleting what someone paid to make reads as theft"
ck "but the paid features are gone" \
  "$([ "$(curl -s -o /dev/null -w '%{http_code}' -X POST "$API/courses/$PAID_COURSE/generate-audio" -H "Authorization: Bearer $TOKEN")" = "403" ] && echo 1 || echo 0)"

# ─────────────────────────────────────────────────────────────────────────────
echo
echo "=== PLN-01 / PLN-02 / PLN-03  every plan limit is refused by the server ==="
ck "PPT export is refused on the free plan" \
  "$([ "$(curl -s -o /dev/null -w '%{http_code}' "$API/courses/$PAID_COURSE/download-token?format=ppt" -H "Authorization: Bearer $TOKEN")" = "403" ] && echo 1 || echo 0)"
ck "audio is refused on the free plan" \
  "$([ "$(curl -s -o /dev/null -w '%{http_code}' -X POST "$API/courses/$PAID_COURSE/generate-audio" -H "Authorization: Bearer $TOKEN")" = "403" ] && echo 1 || echo 0)"
ck "a video course is refused on the free plan" \
  "$([ "$(curl -s -o /dev/null -w '%{http_code}' -X POST "$API/courses/generate" -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' -d '{"title":"V","language":"English","type":"video","topics":[{"title":"T","subtopics":["S"]}]}')" = "403" ] && echo 1 || echo 0)"
ck "more than 5 topics is refused on the free plan" \
  "$([ "$(curl -s -o /dev/null -w '%{http_code}' -X POST "$API/courses/generate-topics" -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' -d '{"title":"T","language":"English","numTopics":6}')" = "403" ] && echo 1 || echo 0)"
ck "PDF is still allowed on the free plan" \
  "$([ "$(curl -s -o /dev/null -w '%{http_code}' "$API/courses/$PAID_COURSE/download-token?format=pdf" -H "Authorization: Bearer $TOKEN")" = "200" ] && echo 1 || echo 0)"

# ─────────────────────────────────────────────────────────────────────────────
echo
echo "=== ACC-02  a password reset token is single-use and expires ==="
curl -s -o /dev/null -X POST "$API/auth/forgot-password" -H 'Content-Type: application/json' \
  -d "{\"email\":\"$EMAIL\"}"
RESET=$(node -e "
  const { PrismaClient } = require('$REPO/backend/node_modules/@prisma/client');
  const p = new PrismaClient();
  p.user.findUnique({ where: { email: '$EMAIL' } })
    .then(u => { console.log(JSON.stringify({ token: u.resetPasswordToken, expires: u.resetPasswordExpires })); return p.\$disconnect(); });
")
RTOKEN=$(echo "$RESET" | python3 -c "import sys,json;print(json.load(sys.stdin).get('token') or '')")
ck "a reset token is issued" "$([ -n "$RTOKEN" ] && echo 1 || echo 0)"
ck "and carries an expiry" \
  "$(echo "$RESET" | python3 -c "import sys,json;print(1 if json.load(sys.stdin).get('expires') else 0)")"

if [ -n "$RTOKEN" ]; then
  FIRST=$(curl -s -o /dev/null -w '%{http_code}' -X POST "$API/auth/reset-password/$RTOKEN" \
    -H 'Content-Type: application/json' -d '{"password":"newpassword123"}')
  SECOND=$(curl -s -o /dev/null -w '%{http_code}' -X POST "$API/auth/reset-password/$RTOKEN" \
    -H 'Content-Type: application/json' -d '{"password":"thirdpassword123"}')
  ck "the reset works once" "$([ "$FIRST" = "200" ] && echo 1 || echo 0)" "got $FIRST"
  ck "and cannot be replayed" "$([ "$SECOND" != "200" ] && echo 1 || echo 0)" "got $SECOND"
  ck "the new password is the one that works" \
    "$([ "$(curl -s -o /dev/null -w '%{http_code}' -X POST "$API/auth/login" -H 'Content-Type: application/json' -d "{\"email\":\"$EMAIL\",\"password\":\"newpassword123\"}")" = "200" ] && echo 1 || echo 0)"
  ck "and the old one no longer does" \
    "$([ "$(curl -s -o /dev/null -w '%{http_code}' -X POST "$API/auth/login" -H 'Content-Type: application/json' -d "{\"email\":\"$EMAIL\",\"password\":\"password123\"}")" != "200" ] && echo 1 || echo 0)"
fi

echo
echo "==== BILLING & PLANS: $PASS PASS / $FAIL FAIL ===="
[ "$FAIL" -eq 0 ]
