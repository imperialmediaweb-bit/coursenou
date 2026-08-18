#!/usr/bin/env bash
# Generation: the failure paths, the awkward inputs, and the 23 languages.
#
# What this cannot do is judge whether a generated course is any good. Factual
# accuracy, quiz answers that are actually correct, video links that are not
# invented — all of that needs live provider keys and a human who knows the
# subject, and no script substitutes for either. Those checks are listed at the
# end of this file as the ones a buyer still has to run.
#
# What it can do is everything that fails the same way with or without a key:
# what happens when no provider answers, what an empty or nonsense subject does,
# whether a language survives being written, stored, read back and exported.
# The last one is where the 23 languages usually break — not in the model, in
# the PDF font.
#
# Usage: DATABASE_URL=... bash scripts/test/generation.sh
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
EMAIL="gen$S@test.local"
curl -s -o /dev/null -X POST "$API/auth/register" -H 'Content-Type: application/json' \
  -d "{\"name\":\"Gen\",\"email\":\"$EMAIL\",\"password\":\"password123\"}"
node -e "
  const { PrismaClient } = require('$REPO/backend/node_modules/@prisma/client');
  const p = new PrismaClient();
  p.user.update({ where: { email: '$EMAIL' }, data: {
    plan: 'monthly', planExpiresAt: new Date(Date.now() + 31536000000),
  }}).then(() => p.\$disconnect());
" >/dev/null
TOKEN=$(curl -s -X POST "$API/auth/login" -H 'Content-Type: application/json' \
  -d "{\"email\":\"$EMAIL\",\"password\":\"password123\"}" |
  python3 -c "import sys,json;print(json.load(sys.stdin).get('accessToken',''))")
[ -z "$TOKEN" ] && { echo "Could not create a test account (rate limited?)."; exit 1; }
AUTH="Authorization: Bearer $TOKEN"

make_course() {
  # $1 title, $2 language
  curl -s -X POST "$API/courses/generate" -H "$AUTH" -H 'Content-Type: application/json' \
    -d "$(python3 -c "
import json,sys
print(json.dumps({'title': sys.argv[1], 'language': sys.argv[2], 'type':'image',
  'topics':[{'title': sys.argv[1], 'subtopics':['Introduction','Practice']}]}))" "$1" "$2")"
}

# ─────────────────────────────────────────────────────────────────────────────
echo "=== GEN-05 / GEN-06  awkward subjects are handled, not crashed on ==="
for subject in "Chemistry" "asdkjh qwe" "?" "        "; do
  CODE=$(curl -s -o /dev/null -w '%{http_code}' -X POST "$API/courses/generate-topics" -H "$AUTH" \
    -H 'Content-Type: application/json' \
    -d "$(python3 -c "
import json,sys
print(json.dumps({'title': sys.argv[1], 'language':'English', 'numTopics':3}))" "$subject")")
  ck "subject '$(echo "$subject" | cut -c1-14)' returns an answer, not a 500" \
    "$([ "$CODE" != "500" ] && echo 1 || echo 0)" "got $CODE"
done

EMPTY=$(curl -s -o /dev/null -w '%{http_code}' -X POST "$API/courses/generate-topics" -H "$AUTH" \
  -H 'Content-Type: application/json' -d '{"title":"","language":"English","numTopics":3}')
ck "an empty subject is refused rather than generated from nothing" \
  "$([ "$EMPTY" = "400" ] && echo 1 || echo 0)" "got $EMPTY"

# ─────────────────────────────────────────────────────────────────────────────
echo
echo "=== GEN-04  the largest allowed course finishes ==="
BIG=$(curl -s -o /dev/null -w '%{http_code}' -X POST "$API/courses/generate-topics" -H "$AUTH" \
  -H 'Content-Type: application/json' -d '{"title":"Organic chemistry","language":"English","numTopics":20}')
ck "20 topics — the paid maximum — is accepted" \
  "$([ "$BIG" = "200" ] && echo 1 || echo 0)" "got $BIG"

# ─────────────────────────────────────────────────────────────────────────────
echo
echo "=== GEN-08  two generations at once from one account ==="
(make_course "Concurrent A" "English" > /tmp/gen-a.json) &
PID_A=$!
(make_course "Concurrent B" "English" > /tmp/gen-b.json) &
PID_B=$!
wait $PID_A $PID_B
A_OK=$(python3 -c "import json;print(1 if json.load(open('/tmp/gen-a.json')).get('success') else 0)" 2>/dev/null || echo 0)
B_OK=$(python3 -c "import json;print(1 if json.load(open('/tmp/gen-b.json')).get('success') else 0)" 2>/dev/null || echo 0)
ck "both concurrent generations produce a course" \
  "$([ "$A_OK" = "1" ] && [ "$B_OK" = "1" ] && echo 1 || echo 0)" "A=$A_OK B=$B_OK"

# ─────────────────────────────────────────────────────────────────────────────
echo
echo "=== GEN-09  when no provider answers, the operator is told ==="
# There are no provider keys in this environment, so every generation above
# already went down the fallback path. That is precisely the condition a wrong
# key produces in production, and the point is that it must not be silent.
FALLBACK=$(node -e "
  const { PrismaClient } = require('$REPO/backend/node_modules/@prisma/client');
  const p = new PrismaClient();
  p.aiUsage.count({ where: { provider: 'fallback' } })
    .then(n => { console.log(n); return p.\$disconnect(); });
")
if [ -n "${OPENAI_API_KEY:-}${GEMINI_API_KEY:-}${CLAUDE_API_KEY:-}" ]; then
  echo "      a provider key is configured — skipping the fallback check"
else
  ck "template content served without a provider is recorded" \
    "$([ "${FALLBACK:-0}" -gt 0 ] && echo 1 || echo 0)" \
    "$FALLBACK fallback calls logged — a silent fallback means a wrong key looks like a healthy platform"

  ADMIN="genadmin$S@test.local"
  curl -s -o /dev/null -X POST "$API/auth/register" -H 'Content-Type: application/json' \
    -d "{\"name\":\"A\",\"email\":\"$ADMIN\",\"password\":\"password123\"}"
  node -e "
    const { PrismaClient } = require('$REPO/backend/node_modules/@prisma/client');
    const p = new PrismaClient();
    p.user.update({ where: { email: '$ADMIN' }, data: { role: 'admin' } }).then(() => p.\$disconnect());
  " >/dev/null
  AT=$(curl -s -X POST "$API/auth/login" -H 'Content-Type: application/json' \
    -d "{\"email\":\"$ADMIN\",\"password\":\"password123\"}" |
    python3 -c "import sys,json;print(json.load(sys.stdin)['accessToken'])")
  ck "and surfaced in the admin panel" \
    "$(curl -s "$API/admin/usage" -H "Authorization: Bearer $AT" |
       python3 -c "import sys,json;print(1 if json.load(sys.stdin)['fallback']['callsThisMonth'] > 0 else 0)" 2>/dev/null || echo 0)"
fi

# ─────────────────────────────────────────────────────────────────────────────
echo
echo "=== GEN-40..47  a language survives being written, stored and read back ==="
# The model is not what breaks the 23 languages — storage, JSON, and the export
# font are. Each of these writes real script into a course and reads it back.
# Writes the new course id to /tmp/gen-last-id so the assertions can still be
# printed. Returning it on stdout instead meant every check in here was
# swallowed by the command substitution that read it — passes and failures
# alike, which is the worse half.
run_language() {
  local label="$1" language="$2" sample="$3"
  local made cid roundtrip
  : > /tmp/gen-last-id
  made=$(make_course "$sample" "$language")
  cid=$(echo "$made" | python3 -c "import sys,json;print(json.load(sys.stdin)['data']['id'])" 2>/dev/null)
  if [ -z "$cid" ]; then
    ck "$label: a course can be created" 0 "$(echo "$made" | head -c 140)"
    return
  fi
  echo "$cid" > /tmp/gen-last-id
  roundtrip=$(curl -s "$API/courses/$cid" -H "$AUTH" |
    python3 -c "import sys,json;print(json.load(sys.stdin)['data']['title'])" 2>/dev/null)
  ck "$label: the title comes back exactly as it went in" \
    "$([ "$roundtrip" = "$sample" ] && echo 1 || echo 0)" "got '$roundtrip'"
}

run_language "Romanian" "Romanian" "Așezarea știinţifică în școală: țări și ținuturi"
RO_ID=$(cat /tmp/gen-last-id)
run_language "Greek"    "Greek"    "Εισαγωγή στη φυσική"
run_language "Russian"  "Russian"  "Введение в физику"
run_language "Arabic"   "Arabic"   "مقدمة في الفيزياء"
run_language "Chinese"  "Chinese"  "物理学导论"
run_language "German"   "German"   "Rindfleischetikettierungsüberwachungsaufgabenübertragungsgesetz"

ck "a language outside the supported 23 is refused" \
  "$(echo "$(make_course "Test" "Klingon")" | grep -qi 'not supported' && echo 1 || echo 0)"

# ─────────────────────────────────────────────────────────────────────────────
echo
echo "=== GEN-40  and survives the PDF export, which is where fonts fail ==="
if [ -n "$RO_ID" ]; then
  DL=$(curl -s "$API/courses/$RO_ID/download-token?format=pdf" -H "$AUTH" |
    python3 -c "import sys,json;d=json.load(sys.stdin);print(d.get('url') or d.get('data',{}).get('url',''))" 2>/dev/null)
  if [ -n "$DL" ]; then
    curl -s "$BASE$DL" -o /tmp/gen-ro.pdf
    SIZE=$(stat -c%s /tmp/gen-ro.pdf 2>/dev/null || echo 0)
    ck "the export downloads" "$([ "$SIZE" -gt 1000 ] && echo 1 || echo 0)" "$SIZE bytes"
    ck "it is a real document, not an error page" \
      "$(head -c 4 /tmp/gen-ro.pdf | grep -qE '%PDF|<!DO|<htm' && echo 1 || echo 0)"
    # Rendered as HTML for the browser's print dialog, so the diacritics are
    # readable in the file itself and a missing font would be visible here.
    ck "Romanian diacritics survive into the export" \
      "$(grep -qE 'Așezarea|A&#537;ezarea|\\u0219' /tmp/gen-ro.pdf && echo 1 || echo 0)" \
      "if this fails the export has lost ș/ț, which is the classic 23-languages bug"
  else
    ck "a download link is issued for the export" 0 "no url in the response"
  fi
fi

echo
echo "==== GENERATION: $PASS PASS / $FAIL FAIL ===="
echo
cat <<'NOTE'
Still needs live provider keys and a human who knows the subject:
  - factual accuracy: pick a subject you know, count the wrong statements
  - quiz answers: check that the option marked correct actually is, 20 times
  - video links: models invent YouTube ids; every link needs fetching
  - citations: invented bibliography is the most common hallucination
  - per-language quality: a language that generates badly is better removed
    from the pricing page than sold
No script substitutes for those, and claiming otherwise would be worse than
leaving them out.
NOTE
[ "$FAIL" -eq 0 ]
