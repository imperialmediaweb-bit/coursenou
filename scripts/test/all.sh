#!/usr/bin/env bash
# Runs every suite against one server, in order, and prints a single tally.
#
# This exists because running the suites back to back by hand does not work.
# Each one registers a handful of accounts, and production allows fifteen
# registrations an hour from one address — so somewhere around the fourth suite
# everything starts failing with 429 and the output reads like a catastrophic
# regression rather than a rate limit. That is a confusing hour to spend.
#
# So the server is started here with the ceilings lifted, which is what a CI
# runner needs and what production must never have. Nothing else is changed:
# the same built bundle, the same database, the same code paths.
#
# Usage: DATABASE_URL=... bash scripts/test/all.sh
set -uo pipefail

REPO="$(cd "$(dirname "$0")/../.." && pwd)"
PORT="${SUITE_PORT:-4040}"
BASE="http://localhost:$PORT"

if [ -z "${DATABASE_URL:-}" ]; then
  echo "DATABASE_URL must be set."
  exit 1
fi

if [ ! -f "$REPO/frontend/dist/index.html" ] || [ ! -f "$REPO/backend/dist/index.js" ]; then
  echo "Nothing built. Run: npm run build"
  exit 1
fi

echo "Starting a server on $PORT with the rate limits lifted..."
PORT="$PORT" NODE_ENV=production \
  RATE_LIMIT_GLOBAL_MAX=100000 \
  RATE_LIMIT_AUTH_MAX=100000 \
  RATE_LIMIT_REGISTER_MAX=100000 \
  RATE_LIMIT_AI_MAX=100000 \
  node "$REPO/backend/dist/index.js" >/tmp/suite-server.log 2>&1 &
SERVER_PID=$!
trap 'kill $SERVER_PID 2>/dev/null' EXIT

for _ in $(seq 1 40); do
  curl -sf "$BASE/api/health" >/dev/null && break
  sleep 1
done
if ! curl -sf "$BASE/api/health" >/dev/null; then
  echo "The server did not come up. See /tmp/suite-server.log"
  exit 1
fi

export BASE_URL="$BASE"
TOTAL_PASS=0
TOTAL_FAIL=0
FAILED_SUITES=""

run() {
  local name="$1"
  shift
  echo
  echo "── $name"
  local out
  out=$("$@" 2>&1)
  echo "$out" | grep -E '^(FAIL|fail |### )' | head -20

  # Every suite ends with a line of the form "==== NAME: N PASS / M FAIL ===="
  # or, for the sweeps, "N ok / M server errors".
  local summary
  summary=$(echo "$out" | grep -E '^====' | tail -1)
  echo "   ${summary:-no summary line — the suite did not finish}"

  local p f
  p=$(echo "$summary" | grep -oE '[0-9]+ (PASS|ok)' | grep -oE '^[0-9]+')
  f=$(echo "$summary" | grep -oE '[0-9]+ (FAIL|server errors|blocking)' | grep -oE '^[0-9]+')
  TOTAL_PASS=$((TOTAL_PASS + ${p:-0}))
  TOTAL_FAIL=$((TOTAL_FAIL + ${f:-0}))
  if [ "${f:-0}" != "0" ] || [ -z "$summary" ]; then
    FAILED_SUITES="$FAILED_SUITES $name"
  fi
}

# Static first: they need no server and fail fastest.
run "contract audit"     node "$REPO/scripts/audit/api-contract.js"
run "route params"       node "$REPO/scripts/audit/route-params.js"
run "unreachable UI"     node "$REPO/scripts/audit/unreachable-ui.js"

run "endpoint sweep"     bash "$REPO/scripts/audit/endpoint-sweep.sh"
run "security"           node "$REPO/scripts/test/security.js"
run "credentials"        bash "$REPO/scripts/test/credentials.sh"
run "signed downloads"   bash "$REPO/scripts/test/signed-downloads.sh"
run "reconcile"          bash "$REPO/scripts/test/reconcile.sh"
run "SEO"                bash "$REPO/scripts/test/seo.sh"
run "analytics"          bash "$REPO/scripts/test/analytics.sh"
run "user (browser)"     node "$REPO/scripts/test/user-deep.js"
run "admin (browser)"    node "$REPO/scripts/test/admin-flow.js"

# Last: it runs its own server on its own port, and wipes the usage log.
run "AI budget"          bash "$REPO/scripts/test/ai-budget.sh"

echo
echo "════════════════════════════════════════════"
echo "  $TOTAL_PASS passed, $TOTAL_FAIL failed"
[ -n "$FAILED_SUITES" ] && echo "  needs attention:$FAILED_SUITES"
echo "════════════════════════════════════════════"
[ "$TOTAL_FAIL" -eq 0 ] && [ -z "$FAILED_SUITES" ]
