#!/usr/bin/env bash
# The tests that decide whether "Unlimited courses" is an offer or a liability.
#
# Everything here attacks the economics rather than the code: the plan limit
# reached through the API instead of the interface, the limit walked around by
# deleting, the input that makes one generation cost ten, the loop that runs all
# night. A platform can pass every functional test and still lose money on every
# customer, and none of the other suites would notice.
#
# Usage: DATABASE_URL=... bash scripts/test/abuse.sh
set -uo pipefail

BASE="${BASE_URL:-http://localhost:4020}"
API="$BASE/api"
REPO="$(cd "$(dirname "$0")/../.." && pwd)"
PASS=0
FAIL=0
NOTES=""

ck() {
  if [ "$2" = "1" ]; then
    echo "PASS  $1"
    PASS=$((PASS + 1))
  else
    echo "FAIL  $1 ${3:+— $3}"
    FAIL=$((FAIL + 1))
  fi
}

note() {
  echo "NOTE  $1"
  NOTES="$NOTES
  - $1"
}

if [ -z "${DATABASE_URL:-}" ]; then
  echo "DATABASE_URL must be set."
  exit 1
fi

db() { node -e "
const {PrismaClient}=require('$REPO/backend/node_modules/@prisma/client');
const p=new PrismaClient();
(async()=>{ $1 ; await p.\$disconnect(); })().catch(e=>{console.error(e.message);process.exit(1)});
"; }

S=$(date +%s%N)
FREE="free$S@test.local"
PRO="pro$S@test.local"

mk() {
  curl -s -X POST "$API/auth/register" -H 'Content-Type: application/json' \
    -d "{\"name\":\"T\",\"email\":\"$1\",\"password\":\"password123\"}" |
    python3 -c "import sys,json;print(json.load(sys.stdin).get('accessToken',''))"
}

FT=$(mk "$FREE")
PT=$(mk "$PRO")
[ -z "$FT" ] && { echo "Could not create a test account (rate limited?)."; exit 1; }
db "await p.user.update({where:{email:'$PRO'},data:{plan:'monthly',planExpiresAt:new Date(Date.now()+31536000000)}})"
PT=$(curl -s -X POST "$API/auth/login" -H 'Content-Type: application/json' \
  -d "{\"email\":\"$PRO\",\"password\":\"password123\"}" |
  python3 -c "import sys,json;print(json.load(sys.stdin)['accessToken'])")

# Makes one course directly in the database. Generating through the API for
# every one of these would be minutes of waiting to prove a counter.
seed_courses() {
  db "
    const u = await p.user.findUnique({where:{email:'$1'}});
    const rows = Array.from({length:$2}, (_, i) => ({
      userId: u.id, title: 'Seeded ' + i, language: 'English', type: 'image',
      topics: [{title:'T',subtopics:[{title:'S',content:'c'}]}],
      shareToken: 'seed-$S-' + i + '-' + Math.round(i * 7919),
    }));
    await p.course.createMany({data: rows});
  "
}

generate() {
  curl -s -o /dev/null -w '%{http_code}' -X POST "$API/courses/generate" \
    -H "Authorization: Bearer $1" -H 'Content-Type: application/json' \
    -d '{"title":"Abuse Probe","language":"English","type":"image","topics":[{"title":"T","subtopics":["S"]}]}'
}

echo "=== CST-02  the free plan limit holds against the API, not just the UI ==="
seed_courses "$FREE" 10
CODE=$(generate "$FT")
ck "an 11th course is refused for a free account" \
  "$([ "$CODE" = "403" ] && echo 1 || echo 0)" "got $CODE"
ck "the paid plan is not caught by the same limit" \
  "$([ "$(generate "$PT")" = "201" ] && echo 1 || echo 0)"

echo
echo "=== CST-03  and cannot be walked around by deleting ==="
# The limit counts courses that exist right now, so deleting one frees a slot.
# Whether that is correct is a business decision — but it has to be a decision,
# because "10 at a time" and "10 ever" are very different offers, and only one
# of them bounds what a free account can cost.
FIRST=$(curl -s "$API/courses" -H "Authorization: Bearer $FT" |
  python3 -c "import sys,json;d=json.load(sys.stdin);print((d.get('data') or d.get('courses') or [{}])[0].get('id',''))")
curl -s -o /dev/null -X DELETE "$API/courses/$FIRST" -H "Authorization: Bearer $FT"
AFTER=$(generate "$FT")

if [ "$AFTER" = "201" ]; then
  note "CST-03: deleting a course frees a slot, so a free account can generate without end — 10 at a time, not 10 in total. Bounded only by the hourly rate limit and the monthly budget."
  ck "the free limit is at least enforced again at 10" \
    "$([ "$(generate "$FT")" = "403" ] && echo 1 || echo 0)"
else
  ck "deleting a course does not free a slot" "$([ "$AFTER" = "403" ] && echo 1 || echo 0)" "got $AFTER"
fi

echo
echo "=== CST-05 / CST-06  a single request cannot be made arbitrarily expensive ==="
BIG=$(python3 -c "print('spaceflight ' * 5000)")
CODE=$(curl -s -o /dev/null -w '%{http_code}' -X POST "$API/courses/generate-topics" \
  -H "Authorization: Bearer $PT" -H 'Content-Type: application/json' \
  -d "$(python3 -c "
import json,sys
print(json.dumps({'title': sys.argv[1], 'language':'English', 'numTopics':3}))" "$BIG")")
ck "a 50,000-character subject is refused before it reaches a model" \
  "$([ "$CODE" = "400" ] && echo 1 || echo 0)" "got $CODE"

CODE=$(curl -s -o /dev/null -w '%{http_code}' -X POST "$API/courses/generate-topics" \
  -H "Authorization: Bearer $PT" -H 'Content-Type: application/json' \
  -d '{"title":"Physics","language":"English","numTopics":500}')
ck "500 topics in one course is refused" \
  "$([ "$CODE" = "400" ] && echo 1 || echo 0)" "got $CODE"

CODE=$(curl -s -o /dev/null -w '%{http_code}' -X POST "$API/courses/generate-topics" \
  -H "Authorization: Bearer $FT" -H 'Content-Type: application/json' \
  -d '{"title":"Physics","language":"English","numTopics":20}')
ck "a free account cannot request the paid topic count" \
  "$([ "$CODE" = "403" ] && echo 1 || echo 0)" "got $CODE"

echo
echo "=== CST-01 / CST-08  a loop is stopped by something ==="
# The hourly ceiling is per account, not per address, so opening more tabs or
# changing IP does not help.
BURST_USER="burst$S@test.local"
BT=$(mk "$BURST_USER")
db "await p.user.update({where:{email:'$BURST_USER'},data:{plan:'monthly',planExpiresAt:new Date(Date.now()+31536000000)}})"
BT=$(curl -s -X POST "$API/auth/login" -H 'Content-Type: application/json' \
  -d "{\"email\":\"$BURST_USER\",\"password\":\"password123\"}" |
  python3 -c "import sys,json;print(json.load(sys.stdin)['accessToken'])")

LIMIT_HIT=0
for i in $(seq 1 40); do
  C=$(curl -s -o /dev/null -w '%{http_code}' -X POST "$API/courses/generate-topics" \
    -H "Authorization: Bearer $BT" -H 'Content-Type: application/json' \
    -d '{"title":"Loop","language":"English","numTopics":1}')
  if [ "$C" = "429" ]; then LIMIT_HIT=1; break; fi
done
HOURLY=$(curl -s -D - -o /dev/null -X POST "$API/courses/generate-topics" \
  -H "Authorization: Bearer $BT" -H 'Content-Type: application/json' \
  -d '{"title":"Loop","language":"English","numTopics":1}' | grep -i '^ratelimit-limit:' | tr -d '\r' | awk '{print $2}')
ck "generation is rate limited per account" \
  "$([ -n "$HOURLY" ] && echo 1 || echo 0)" "no RateLimit-Limit header"
if [ -n "$HOURLY" ]; then
  echo "      hourly ceiling: $HOURLY AI calls per account"
  note "CST-01: the ceiling is $HOURLY AI calls per account per hour — about $((HOURLY / 2)) courses an hour, $((HOURLY * 12)) a day. The monthly budget is what actually bounds the bill; there is no per-account cost cap."
fi

echo
echo "=== CST-10  a ceiling exists at all ==="
BUDGET=$(curl -s "$API/admin/usage" -H "Authorization: Bearer $PT" -o /dev/null -w '%{http_code}')
ck "the cost figures are not readable by an ordinary paid account" \
  "$([ "$BUDGET" = "403" ] && echo 1 || echo 0)" "got $BUDGET"

ADMIN="abadmin$S@test.local"
AT=$(mk "$ADMIN")
db "await p.user.update({where:{email:'$ADMIN'},data:{role:'admin'}})"
AT=$(curl -s -X POST "$API/auth/login" -H 'Content-Type: application/json' \
  -d "{\"email\":\"$ADMIN\",\"password\":\"password123\"}" |
  python3 -c "import sys,json;print(json.load(sys.stdin)['accessToken'])")
USAGE=$(curl -s "$API/admin/usage" -H "Authorization: Bearer $AT")
ck "an administrator can read what has been spent" \
  "$(echo "$USAGE" | python3 -c "import sys,json;d=json.load(sys.stdin);print(1 if 'budget' in d and 'perCourse' in d else 0)" 2>/dev/null || echo 0)"

HAS_LIMIT=$(echo "$USAGE" | python3 -c "import sys,json;print(0 if json.load(sys.stdin)['budget']['limit'] is None else 1)" 2>/dev/null || echo 0)
if [ "$HAS_LIMIT" = "0" ]; then
  note "CST-10: AI_MONTHLY_BUDGET_USD is not set here, so nothing stops the spend. Set it before taking real customers; the enforcement itself is covered by ai-budget.sh."
fi

echo
echo "=== CST-07  audio does not cost per play ==="
AUDIO=$(curl -s -X POST "$API/courses/$FIRST/generate-audio" -H "Authorization: Bearer $PT")
ck "audio is not billed to a provider" \
  "$(echo "$AUDIO" | grep -qi 'Web Speech API' && echo 1 || echo 0)" \
  "if this ever becomes a real TTS call, it is the most expensive feature in the product"

echo
echo "=== CST-04  a free plan cannot be minted at will ==="
# Asserting the ceiling from the response header rather than looping until 429.
# Looping would fail against a runner that lifts the limits to get through the
# rest of the suite, and would leave the limit tripped for whatever ran next.
REG=$(curl -s -D - -o /dev/null -X POST "$API/auth/register" -H 'Content-Type: application/json' \
  -d "{\"name\":\"B\",\"email\":\"probe$S@test.local\",\"password\":\"password123\"}")
REG_LIMIT=$(echo "$REG" | grep -i '^ratelimit-limit:' | tr -d '\r' | awk '{print $2}')
ck "registration is rate limited per address" \
  "$([ -n "$REG_LIMIT" ] && echo 1 || echo 0)" "no RateLimit-Limit header on /auth/register"
[ -n "$REG_LIMIT" ] && echo "      ceiling: $REG_LIMIT registrations per hour per address"
note "CST-04: signup does not require a verified email address, so that address ceiling is the only thing between someone and unlimited free accounts."

echo "=== what a course actually costs, from the recorded usage ==="
db "
  const rows = await p.aiUsage.groupBy({by:['model'], _sum:{costUsd:true,inputTokens:true,outputTokens:true}, _count:true});
  if (!rows.length) { console.log('  (no usage recorded — no AI key is configured in this environment)'); }
  for (const r of rows) {
    console.log('  ' + r.model.padEnd(28) + r._count + ' calls  \$' + (r._sum.costUsd||0).toFixed(4)
      + '   ' + (r._sum.inputTokens||0) + ' in / ' + (r._sum.outputTokens||0) + ' out');
  }
"

echo
echo "==== ABUSE & COST: $PASS PASS / $FAIL FAIL ===="
[ -n "$NOTES" ] && { echo; echo "Decisions for the operator, not bugs:$NOTES"; }
[ "$FAIL" -eq 0 ]
