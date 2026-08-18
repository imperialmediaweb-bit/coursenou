#!/usr/bin/env bash
# Proves the monthly AI spending ceiling actually refuses work.
#
# A limit that is recorded but never enforced is worse than no limit, because
# it reads like protection. This starts the server with a $1 ceiling, records
# $4 of spend, and requires generation to come back 503 — then clears the log
# and requires it to work again, so the check cannot pass by the endpoint
# simply being broken.
#
# Usage: DATABASE_URL=... bash scripts/test/ai-budget.sh
set -uo pipefail

REPO="$(cd "$(dirname "$0")/../.." && pwd)"
PORT="${BUDGET_TEST_PORT:-4031}"
BASE="http://localhost:$PORT/api"
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

usage_rows() {
  node -e "
    const { PrismaClient } = require('$REPO/backend/node_modules/@prisma/client');
    const p = new PrismaClient();
    (async () => {
      await p.aiUsage.deleteMany({});
      if (process.argv[1] === 'spend') {
        await p.aiUsage.create({ data: {
          provider: 'openai', model: 'gpt-4o', operation: 'lesson',
          inputTokens: 400000, outputTokens: 100000, costUsd: 4,
        }});
      }
      await p.\$disconnect();
    })();
  " "$1"
}

# --- the arithmetic that turns tokens into dollars ---
# Everything downstream is an aggregate of this one function, so if it is wrong
# every figure in the admin panel is wrong in the same direction.
PRICING=$(node -e "
  const { priceOf } = require('$REPO/backend/dist/services/usageService');
  const near = (a, b) => Math.abs(a - b) < 1e-9;
  const cases = [
    ['gpt-4o list price', priceOf('gpt-4o', 1e6, 1e6), 12.5],
    ['gpt-4o-mini list price', priceOf('gpt-4o-mini', 1e6, 1e6), 0.75],
    ['gemini flash list price', priceOf('gemini-1.5-flash', 1e6, 1e6), 0.375],
    ['a realistic course-sized call', priceOf('gpt-4o', 12000, 30000), 0.33],
    ['an unknown model is not guessed at', priceOf('some-future-model', 1e6, 1e6), 0],
  ];
  for (const [name, got, want] of cases) {
    console.log((near(got, want) ? 'PASS' : 'FAIL') + '|' + name + '|' + got + ' vs ' + want);
  }
")
while IFS='|' read -r verdict name detail; do
  ck "$name" "$([ "$verdict" = "PASS" ] && echo 1 || echo 0)" "$detail"
done <<<"$PRICING"

echo "Starting the server with a \$1 monthly ceiling..."
AI_MONTHLY_BUDGET_USD=1 PORT="$PORT" NODE_ENV=production \
  node "$REPO/backend/dist/index.js" >/tmp/ai-budget-server.log 2>&1 &
SERVER_PID=$!
trap 'kill $SERVER_PID 2>/dev/null' EXIT

for _ in $(seq 1 30); do
  curl -sf "http://localhost:$PORT/api/health" >/dev/null && break
  sleep 1
done
curl -sf "http://localhost:$PORT/api/health" >/dev/null
ck "the server starts with a budget configured" "$([ $? -eq 0 ] && echo 1 || echo 0)"

EMAIL="budget$(date +%s)@test.local"
TOKEN=$(curl -s -X POST "$BASE/auth/register" -H 'Content-Type: application/json' \
  -d "{\"name\":\"Budget\",\"email\":\"$EMAIL\",\"password\":\"password123\"}" |
  node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{try{console.log(JSON.parse(d).accessToken||'')}catch{console.log('')}})")
ck "an account can be created" "$([ -n "$TOKEN" ] && echo 1 || echo 0)"

# --- under the ceiling ---
usage_rows clear
UNDER=$(curl -s -o /dev/null -w '%{http_code}' -X POST "$BASE/courses/generate-topics" \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"title":"Photography","language":"english","numTopics":3}')
ck "generation is allowed while under the ceiling" \
  "$([ "$UNDER" = "200" ] && echo 1 || echo 0)" "got $UNDER"

# --- over the ceiling ---
usage_rows spend
OVER=$(curl -s -o /dev/null -w '%{http_code}' -X POST "$BASE/courses/generate-topics" \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"title":"Photography","language":"english","numTopics":3}')
ck "generation is refused once the ceiling is reached" \
  "$([ "$OVER" = "503" ] && echo 1 || echo 0)" "got $OVER"

BODY=$(curl -s -X POST "$BASE/courses/generate" \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"title":"Photography","language":"english","type":"image","topics":[{"title":"Light","subtopics":["Exposure"]}]}')
ck "full course generation is refused too" \
  "$(echo "$BODY" | grep -qi 'temporarily paused' && echo 1 || echo 0)" "got: $BODY"

ck "the refusal does not leak the amount spent" \
  "$(echo "$BODY" | grep -qi 'budget\|\$' && echo 0 || echo 1)"

# --- back under, after the log is cleared ---
usage_rows clear
AGAIN=$(curl -s -o /dev/null -w '%{http_code}' -X POST "$BASE/courses/generate-topics" \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"title":"Photography","language":"english","numTopics":3}')
ck "generation resumes when spend falls back under the ceiling" \
  "$([ "$AGAIN" = "200" ] && echo 1 || echo 0)" "got $AGAIN"

echo
echo "==== AI BUDGET: $PASS PASS / $FAIL FAIL ===="
[ "$FAIL" -eq 0 ]
