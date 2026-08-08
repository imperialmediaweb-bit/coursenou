#!/bin/bash
# API keys entered in the admin panel must actually reach the code that uses
# them — and must never come back out of the API once stored.
set -u
B="${BASE_URL:-http://localhost:4020}/api"
REPO="$(cd "$(dirname "$0")/../.." && pwd)"
PASS=0; FAIL=0; FAILED=""
ck() { if [ "$2" = "$3" ]; then PASS=$((PASS+1)); echo "PASS $1"; else FAIL=$((FAIL+1)); FAILED="$FAILED
  - $1 (got=$2 want=$3)"; echo "FAIL $1 (got=$2 want=$3)"; fi }

if [ -z "${DATABASE_URL:-}" ]; then
  echo "DATABASE_URL must be set."
  exit 1
fi

S=$(date +%s%N)
ADMIN="cred$S@test.local"
USER_EMAIL="plain$S@test.local"

mk() { curl -s -X POST $B/auth/register -H 'Content-Type: application/json' \
  -d "{\"name\":\"T\",\"email\":\"$1\",\"password\":\"password123\"}" \
  | python3 -c "import sys,json;print(json.load(sys.stdin)['accessToken'])"; }

T=$(mk "$ADMIN"); UT=$(mk "$USER_EMAIL")
node -e "
const {PrismaClient}=require('$REPO/backend/node_modules/@prisma/client');const p=new PrismaClient();
p.user.update({where:{email:'$ADMIN'},data:{role:'admin'}}).then(()=>p.\$disconnect());" >/dev/null
T=$(curl -s -X POST $B/auth/login -H 'Content-Type: application/json' \
    -d "{\"email\":\"$ADMIN\",\"password\":\"password123\"}" \
    | python3 -c "import sys,json;print(json.load(sys.stdin)['accessToken'])")
A="Authorization: Bearer $T"

# ---- only an administrator may see or change these -------------------------
ck "a signed-out request cannot list credentials" "$(curl -s -o /dev/null -w '%{http_code}' $B/admin/secrets)" "401"
ck "an ordinary account cannot list credentials" "$(curl -s -o /dev/null -w '%{http_code}' $B/admin/secrets -H "Authorization: Bearer $UT")" "403"
ck "an ordinary account cannot set one" "$(curl -s -o /dev/null -w '%{http_code}' -X PUT $B/admin/secrets -H "Authorization: Bearer $UT" -H 'Content-Type: application/json' -d '{"name":"STRIPE_SECRET_KEY","value":"sk_live_stolen"}')" "403"

# ---- the catalogue loads ----------------------------------------------------
R=$(curl -s $B/admin/secrets -H "$A")
ck "the catalogue lists the setting groups" "$(echo "$R" | python3 -c "import sys,json;print(len(json.load(sys.stdin)['groups'])>=6)")" "True"
ck "Stripe is among them" "$(echo "$R" | python3 -c "
import sys,json
print(any(s['name']=='STRIPE_SECRET_KEY' for s in json.load(sys.stdin)['settings']))")" "True"

# ---- saving a credential ----------------------------------------------------
SECRET="sk_test_abcdefghijklmnop1234567890"
curl -s -o /dev/null -X PUT $B/admin/secrets -H "$A" -H 'Content-Type: application/json' \
  -d "{\"name\":\"STRIPE_SECRET_KEY\",\"value\":\"$SECRET\"}"

R=$(curl -s $B/admin/secrets -H "$A")
ck "it is reported as configured" "$(echo "$R" | python3 -c "
import sys,json
s=[x for x in json.load(sys.stdin)['settings'] if x['name']=='STRIPE_SECRET_KEY'][0]
print(s['configured'])")" "True"
ck "it is attributed to the panel" "$(echo "$R" | python3 -c "
import sys,json
s=[x for x in json.load(sys.stdin)['settings'] if x['name']=='STRIPE_SECRET_KEY'][0]
print(s['source'])")" "panel"
ck "the value never comes back out" "$(echo "$R" | grep -c "$SECRET")" "0"
ck "only a masked preview is shown" "$(echo "$R" | python3 -c "
import sys,json
s=[x for x in json.load(sys.stdin)['settings'] if x['name']=='STRIPE_SECRET_KEY'][0]
print('yes' if '•' in s['preview'] and s['preview'].endswith('7890') else s['preview'])")" "yes"

# ---- stored encrypted, not in the clear ------------------------------------
ck "the database holds it encrypted" "$(node -e "
const {PrismaClient}=require('$REPO/backend/node_modules/@prisma/client');const p=new PrismaClient();
p.appSetting.findUnique({where:{key:'secret:STRIPE_SECRET_KEY'}}).then(r=>{
  const v = r ? r.value : '';
  console.log(v.includes('$SECRET') ? 'PLAINTEXT' : (v.startsWith('v1.') ? 'encrypted' : 'unknown'));
  return p.\$disconnect();
});")" "encrypted"

# ---- it actually reaches the code that uses it -----------------------------
# Stripe answered "is not configured" before; with a key present it gets far
# enough to be rejected by Stripe instead.
sleep 1
OUT=$(curl -s -X POST $B/stripe/create-checkout -H "Authorization: Bearer $UT" -H 'Content-Type: application/json' -d '{"plan":"monthly"}')
ck "the saved key reaches the payment code" "$(echo "$OUT" | grep -c 'is not configured')" "0"

# ---- the credential check runs ---------------------------------------------
CHECK=$(curl -s -X POST $B/admin/secrets/stripe/test -H "$A")
ck "the credential check returns a verdict" "$(echo "$CHECK" | python3 -c "
import sys,json
d=json.load(sys.stdin)['data']
print('ok' if isinstance(d,list) and len(d)>0 and 'message' in d[0] else 'bad')")" "ok"

# ---- clearing ---------------------------------------------------------------
curl -s -o /dev/null -X PUT $B/admin/secrets -H "$A" -H 'Content-Type: application/json' \
  -d '{"name":"STRIPE_SECRET_KEY","value":""}'
R=$(curl -s $B/admin/secrets -H "$A")
ck "clearing removes it" "$(echo "$R" | python3 -c "
import sys,json
s=[x for x in json.load(sys.stdin)['settings'] if x['name']=='STRIPE_SECRET_KEY'][0]
print(s['configured'])")" "False"
ck "the row is gone from the database" "$(node -e "
const {PrismaClient}=require('$REPO/backend/node_modules/@prisma/client');const p=new PrismaClient();
p.appSetting.findUnique({where:{key:'secret:STRIPE_SECRET_KEY'}}).then(r=>{
  console.log(r ? 'still there' : 'gone'); return p.\$disconnect();});")" "gone"

# ---- unknown names are refused ---------------------------------------------
ck "an unknown setting name is refused" "$(curl -s -o /dev/null -w '%{http_code}' -X PUT $B/admin/secrets -H "$A" -H 'Content-Type: application/json' -d '{"name":"DATABASE_URL","value":"postgres://evil"}')" "400"
ck "JWT_SECRET cannot be overwritten from the panel" "$(curl -s -o /dev/null -w '%{http_code}' -X PUT $B/admin/secrets -H "$A" -H 'Content-Type: application/json' -d '{"name":"JWT_SECRET","value":"x"}')" "400"

echo ""
echo "==== CREDENTIALS: $PASS PASS / $FAIL FAIL ===="
[ -n "$FAILED" ] && echo "FAILED:$FAILED"
exit $FAIL
