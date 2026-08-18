#!/bin/bash
# Calls every registered API endpoint with a real session and flags any 5xx.
#
# A 4xx is fine here — missing body, wrong role, not found. A 5xx means the
# handler crashed, which is what reaches a user as a broken panel. A provider
# with no API key answering 503 and naming itself is a clear refusal rather
# than a crash, so it is accepted.
#
# Requires the app running locally against a database.
set -u
B="${BASE_URL:-http://localhost:4020}/api"
REPO="$(cd "$(dirname "$0")/../.." && pwd)"
PASS=0; FAIL=0; FAILED=""

EMAIL="sweep$(date +%s%N)@test.local"
T=$(curl -s -X POST $B/auth/register -H 'Content-Type: application/json' \
     -d "{\"name\":\"Sweep\",\"email\":\"$EMAIL\",\"password\":\"password123\"}" \
     | python3 -c "import sys,json;print(json.load(sys.stdin)['accessToken'])")

# Promote through Prisma rather than psql, which a CI runner does not have.
node -e "
const { PrismaClient } = require('$REPO/backend/node_modules/@prisma/client');
const p = new PrismaClient();
p.user.update({ where: { email: '$EMAIL' }, data: { role: 'admin', plan: 'monthly',
  planExpiresAt: new Date(Date.now() + 31536000000) } })
 .then(() => p.\$disconnect());
" || exit 1

T=$(curl -s -X POST $B/auth/login -H 'Content-Type: application/json' \
     -d "{\"email\":\"$EMAIL\",\"password\":\"password123\"}" \
     | python3 -c "import sys,json;print(json.load(sys.stdin)['accessToken'])")
A="Authorization: Bearer $T"

# Real ids so path params resolve to something.
#
# Each of these feeds the next, so a failure here has to stop the run. Carrying
# an empty value forward built a malformed request body, and the sweep then
# reported a JSON parse error from the server as though it were the finding —
# when the actual cause was a rate limit on the very first call.
need() {
  if [ -z "$2" ]; then
    echo "Could not set up: $1 came back empty. The server said:"
    echo "  $3" | head -3
    exit 1
  fi
}

TD=$(curl -s -X POST $B/courses/generate-topics -H 'Content-Type: application/json' -H "$A" \
      -d '{"title":"Sweep Course","numTopics":1,"language":"English"}' \
      | python3 -c "import sys,json;print(json.dumps(json.load(sys.stdin)['data']))" 2>/dev/null)
need "topic generation" "$TD" "$(curl -s -o /dev/null -w 'HTTP %{http_code}' -X POST $B/courses/generate-topics -H 'Content-Type: application/json' -H "$A" -d '{"title":"Sweep Course","numTopics":1,"language":"English"}')"
CID=$(curl -s -X POST $B/courses/generate -H 'Content-Type: application/json' -H "$A" \
      -d "{\"title\":\"Sweep Course\",\"topics\":$TD,\"language\":\"English\",\"type\":\"image\"}" \
      | python3 -c "import sys,json;d=json.load(sys.stdin)['data'];print(d.get('id') or d.get('_id'))" 2>/dev/null)
need "course generation" "$CID" "no course id came back"
SHARE=$(curl -s $B/courses/$CID -H "$A" | python3 -c "import sys,json;print(json.load(sys.stdin)['data']['shareToken'])")
ME=$(curl -s $B/auth/me -H "$A" | python3 -c "import sys,json;print(json.load(sys.stdin)['user']['id'])")
curl -s -X POST $B/courses/$CID/complete -H "$A" >/dev/null
CERT=$(curl -s $B/certificates -H "$A" | python3 -c "import sys,json;d=json.load(sys.stdin)['data'];print(d[0]['id'] if d else '')")

hit() { # method path [body]
  local m=$1 p=$2 body=${3:-}
  local code
  if [ -n "$body" ]; then
    code=$(curl -s -o /tmp/sweep_out -w '%{http_code}' -X "$m" "$B$p" -H "$A" -H 'Content-Type: application/json' -d "$body")
  else
    code=$(curl -s -o /tmp/sweep_out -w '%{http_code}' -X "$m" "$B$p" -H "$A")
  fi
  if [ "$code" = "503" ] && grep -q "is not configured" /tmp/sweep_out; then
    PASS=$((PASS+1)); echo "ok    $m $p -> $code (not configured — clear message)"
  elif [ "$code" -ge 500 ]; then
    FAIL=$((FAIL+1)); FAILED="$FAILED
  - $m $p -> $code  $(head -c 120 /tmp/sweep_out)"
    echo "FAIL  $m $p -> $code"
  else
    PASS=$((PASS+1)); echo "ok    $m $p -> $code"
  fi
}

echo "--- public ---"
hit GET /health; hit GET /version
hit GET /blogs; hit GET /content/terms; hit GET /content/privacy
hit GET /content/refund; hit GET /content/cancellation
hit GET "/courses/share/$SHARE"
hit GET "/og/course/$CID"

echo "--- auth + user ---"
hit GET /auth/me
hit PUT /users/profile '{"name":"Sweep Renamed","email":"'"$EMAIL"'"}'
hit GET /users/profile
hit PUT /users/password '{"currentPassword":"password123","newPassword":"password123"}'

echo "--- courses ---"
hit GET /courses
hit GET "/courses/$CID"
hit GET "/courses/$CID/export/pdf"
hit GET "/courses/$CID/export/ppt"
hit POST "/courses/$CID/generate-audio"
hit POST "/duplicate/$CID"

echo "--- learning features ---"
hit POST "/quiz/generate/$CID"
hit GET "/quiz/$CID"
hit POST "/quiz/$CID/submit" '{"answers":[0,0,0,0,0]}'
hit POST "/flashcards/generate/$CID"
hit GET "/flashcards/$CID"
hit PUT "/flashcards/$CID/0" '{"correct":true,"difficulty":"easy"}'
hit GET "/notes/$CID"
hit PUT "/notes/$CID" '{"content":"sweep note"}'
hit GET "/progress/$CID"
hit PUT "/progress/$CID" '{"completedSubtopics":["0-0"],"lastTopicIndex":0,"lastSubtopicIndex":0}'
hit POST "/ratings/$CID" '{"rating":5,"feedback":"good"}'
hit GET "/ratings/$CID"
hit POST /bookmarks '{"courseId":"'"$CID"'","topicIndex":0,"subtopicIndex":0,"subtopicTitle":"x","note":"n"}'
hit GET /bookmarks
hit POST "/summary/$CID"
hit POST "/chat/$CID" '{"message":"what is this course about?"}'
hit GET /templates
hit GET /gamification/stats
hit POST /gamification/xp '{"action":"lesson_completed"}'

echo "--- notifications ---"
hit GET /notifications
hit GET /notifications/unread-count
hit PUT /notifications/read-all

echo "--- certificates ---"
hit GET /certificates
[ -n "$CERT" ] && hit GET "/certificates/$CERT"
[ -n "$CERT" ] && hit GET "/certificates/$CERT/download"

echo "--- billing ---"
hit GET /billing/subscription
hit GET /billing/invoices
hit POST /stripe/create-checkout '{"plan":"monthly"}'
hit POST /paypal/create-subscription '{"plan":"monthly"}'
hit POST /razorpay/create-order '{"plan":"monthly"}'
hit POST /paystack/initialize '{"plan":"monthly"}'

echo "--- admin ---"
hit GET /admin/stats
hit GET /admin/users
hit GET "/admin/users/$ME"
hit GET /admin/courses
hit GET /admin/blogs
hit GET /admin/messages
hit GET /admin/content/terms
hit GET /admin/invoices
hit GET /admin/settings
hit PUT /admin/settings '{"aiProvider":"openai"}'
hit POST /admin/blogs "{\"title\":\"Sweep post $(date +%s)\",\"content\":\"body\",\"published\":false}"
hit GET /export/admin/csv
hit GET /export/bulk

echo ""
echo "==== ENDPOINT SWEEP: $PASS ok / $FAIL server errors ===="
[ -n "$FAILED" ] && echo "SERVER ERRORS:$FAILED"
exit $FAIL
