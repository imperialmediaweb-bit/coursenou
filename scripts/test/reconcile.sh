#!/bin/bash
# PAY-03: a payment succeeds but its webhook never arrives.
#
# The customer has been charged and is looking at a free account. Returning to
# the billing page must ask the provider directly and put things right — while
# never being able to grant or extend a plan that was not actually paid for.
set -u
B="${BASE_URL:-http://localhost:4020}/api"

# The steps that stand in for a webhook write straight to the database.
if [ -z "${DATABASE_URL:-}" ]; then
  echo "DATABASE_URL must be set — this suite simulates a webhook by writing to the database."
  exit 1
fi
REPO="$(cd "$(dirname "$0")/../.." && pwd)"
PASS=0; FAIL=0; FAILED=""
ck() { if [ "$2" = "$3" ]; then PASS=$((PASS+1)); echo "PASS $1"; else FAIL=$((FAIL+1)); FAILED="$FAILED
  - $1 (got=$2 want=$3)"; echo "FAIL $1 (got=$2 want=$3)"; fi }

S=$(date +%s%N)
EMAIL="recon$S@test.local"
T=$(curl -s -X POST $B/auth/register -H 'Content-Type: application/json' \
     -d "{\"name\":\"Recon\",\"email\":\"$EMAIL\",\"password\":\"password123\"}" \
     | python3 -c "import sys,json;print(json.load(sys.stdin)['accessToken'])")
A="Authorization: Bearer $T"

plan_of() { curl -s $B/auth/me -H "$A" | python3 -c "import sys,json;print(json.load(sys.stdin)['user']['plan'])"; }
expiry_of() { curl -s $B/auth/me -H "$A" | python3 -c "import sys,json;print(json.load(sys.stdin)['user'].get('planExpiresAt') or 'none')"; }
invoices_count() { curl -s $B/billing/invoices -H "$A" | python3 -c "
import sys, json
d = json.load(sys.stdin)
print(len(d if isinstance(d, list) else (d.get('data') or [])))"; }

# ---- with no payment anywhere, nothing may be granted ----------------------
ck "starts on the free plan" "$(plan_of)" "free"
R=$(curl -s -X POST $B/billing/reconcile -H "$A")
ACTIVATED=$(echo "$R" | python3 -c "import sys,json;print(json.load(sys.stdin)['data']['activated'])")
ck "reconciling without a payment activates nothing" "$ACTIVATED" "False"
ck "the account is still free afterwards" "$(plan_of)" "free"

# ---- with a paid plan already in place, it must not extend it --------------
# Stand in for a webhook that did arrive.
node -e "
const {PrismaClient}=require('$REPO/backend/node_modules/@prisma/client');const p=new PrismaClient();
p.user.update({where:{email:'$EMAIL'},data:{plan:'monthly',planExpiresAt:new Date(Date.now()+30*86400000)}}).then(()=>p.\$disconnect());
" >/dev/null

BEFORE_EXPIRY=$(expiry_of)
BEFORE_INVOICES=$(invoices_count)

for i in 1 2 3; do curl -s -X POST $B/billing/reconcile -H "$A" > /dev/null; done

ck "repeated reconciling leaves the expiry untouched" "$(expiry_of)" "$BEFORE_EXPIRY"
ck "repeated reconciling creates no invoices" "$(invoices_count)" "$BEFORE_INVOICES"
ck "the plan is unchanged" "$(plan_of)" "monthly"

R=$(curl -s -X POST $B/billing/reconcile -H "$A")
REASON=$(echo "$R" | python3 -c "import sys,json;print(json.load(sys.stdin)['data']['reason'])")
ck "it reports the subscription as already active" "$REASON" "Subscription is already active"

# ---- an expired plan is eligible again, but still needs a real payment -----
node -e "
const {PrismaClient}=require('$REPO/backend/node_modules/@prisma/client');const p=new PrismaClient();
p.user.update({where:{email:'$EMAIL'},data:{plan:'monthly',planExpiresAt:new Date(Date.now()-86400000)}}).then(()=>p.\$disconnect());
" >/dev/null

R=$(curl -s -X POST $B/billing/reconcile -H "$A")
ACTIVATED=$(echo "$R" | python3 -c "import sys,json;print(json.load(sys.stdin)['data']['activated'])")
ck "an expired plan is not renewed without a payment" "$ACTIVATED" "False"

# ---- it must require a session --------------------------------------------
ck "reconciling requires signing in" "$(curl -s -o /dev/null -w '%{http_code}' -X POST $B/billing/reconcile)" "401"

echo ""
echo "==== RECONCILE: $PASS PASS / $FAIL FAIL ===="
[ -n "$FAILED" ] && echo "FAILED:$FAILED"
exit $FAIL
