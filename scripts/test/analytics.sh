#!/usr/bin/env bash
# An analytics snippet saved in the admin panel has to reach the page *and* be
# allowed to run.
#
# The interesting failure is the second half. A Content-Security-Policy denies
# third-party scripts by default, so a pasted snippet appears in the page
# source, is refused by the browser, and reports nothing — with the only
# evidence in a console the operator never opens. Checking that the header
# names the vendor's host is the difference between "we shipped analytics" and
# "analytics works".
#
# Usage: DATABASE_URL=... bash scripts/test/analytics.sh
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
ADMIN="analytics$S@test.local"
PLAIN="plain$S@test.local"

mk() {
  curl -s -X POST "$API/auth/register" -H 'Content-Type: application/json' \
    -d "{\"name\":\"T\",\"email\":\"$1\",\"password\":\"password123\"}" |
    python3 -c "import sys,json;print(json.load(sys.stdin).get('accessToken',''))"
}

mk "$ADMIN" >/dev/null
USER_TOKEN=$(mk "$PLAIN")
node -e "
const {PrismaClient}=require('$REPO/backend/node_modules/@prisma/client');const p=new PrismaClient();
p.user.update({where:{email:'$ADMIN'},data:{role:'admin'}}).then(()=>p.\$disconnect());" >/dev/null
TOKEN=$(curl -s -X POST "$API/auth/login" -H 'Content-Type: application/json' \
  -d "{\"email\":\"$ADMIN\",\"password\":\"password123\"}" |
  python3 -c "import sys,json;print(json.load(sys.stdin)['accessToken'])")
AUTH="Authorization: Bearer $TOKEN"

restore() {
  curl -s -o /dev/null -X PUT "$API/admin/site" -H "$AUTH" -H 'Content-Type: application/json' \
    -d '{"analyticsSnippet":"","indexable":true}'
}
trap restore EXIT

# ---- who may change how the whole site presents itself ----------------------
ck "a signed-out request cannot read the site settings" \
  "$([ "$(curl -s -o /dev/null -w '%{http_code}' "$API/admin/site")" = "401" ] && echo 1 || echo 0)"
ck "an ordinary account cannot change them" \
  "$([ "$(curl -s -o /dev/null -w '%{http_code}' -X PUT "$API/admin/site" \
    -H "Authorization: Bearer $USER_TOKEN" -H 'Content-Type: application/json' \
    -d '{"analyticsSnippet":"<script src=\"https://evil.example/x.js\"></script>"}')" = "403" ] && echo 1 || echo 0)" \
  "the snippet runs on every page, so this is script injection if it is not admin-only"

# ---- a snippet saved in the panel reaches the page --------------------------
SNIPPET='<script defer data-domain="example.com" src="https://plausible.io/js/script.js"></script>'
curl -s -o /dev/null -X PUT "$API/admin/site" -H "$AUTH" -H 'Content-Type: application/json' \
  -d "{\"analyticsSnippet\":$(python3 -c "import json,sys;print(json.dumps(sys.argv[1]))" "$SNIPPET")}"

# The settings cache is a minute long; the panel's own read forces a refresh,
# and the shell picks it up on the next request.
sleep 2
PAGE=$(curl -s "$BASE/")
ck "the snippet is in the page" \
  "$(echo "$PAGE" | grep -qF 'plausible.io/js/script.js' && echo 1 || echo 0)"
ck "it is inside the head, before the app loads" \
  "$(python3 -c "
import sys
page = sys.stdin.read()
head = page.split('</head>')[0]
print(1 if 'plausible.io' in head else 0)" <<<"$PAGE")" \
  "a snippet after the bundle misses visitors who leave during the load"

# ---- and is allowed to run --------------------------------------------------
# Restarting is not required: the policy is rebuilt from the saved snippet on a
# timer, but the panel's write refreshes it immediately.
CSP=$(curl -s -D - -o /dev/null "$BASE/" | grep -i '^content-security-policy:')
ck "the security policy is still present" \
  "$([ -n "$CSP" ] && echo 1 || echo 0)"
ck "the policy allows the vendor named in the snippet" \
  "$(echo "$CSP" | grep -qF 'https://plausible.io' && echo 1 || echo 0)" \
  "without this the browser blocks the script and says so only in the console"
ck "the policy is not opened to everything" \
  "$(echo "$CSP" | grep -oE "script-src[^;]*" | grep -qE "https:( |;|$)" && echo 0 || echo 1)" \
  "allowing any https host would defeat the policy"

# ---- clearing it removes both ----------------------------------------------
curl -s -o /dev/null -X PUT "$API/admin/site" -H "$AUTH" -H 'Content-Type: application/json' \
  -d '{"analyticsSnippet":""}'
sleep 2
ck "clearing the snippet removes it from the page" \
  "$(curl -s "$BASE/" | grep -qF 'plausible.io' && echo 0 || echo 1)"
ck "and closes the policy again" \
  "$(curl -s -D - -o /dev/null "$BASE/" | grep -i '^content-security-policy:' | grep -qF 'plausible.io' && echo 0 || echo 1)"

# ---- what must be refused ---------------------------------------------------
ck "a whole HTML document is refused as a snippet" \
  "$([ "$(curl -s -o /dev/null -w '%{http_code}' -X PUT "$API/admin/site" -H "$AUTH" \
    -H 'Content-Type: application/json' \
    -d '{"analyticsSnippet":"</head><body>oops"}')" = "400" ] && echo 1 || echo 0)" \
  "it would close the document early for every visitor"
ck "a site URL with a path is refused" \
  "$([ "$(curl -s -o /dev/null -w '%{http_code}' -X PUT "$API/admin/site" -H "$AUTH" \
    -H 'Content-Type: application/json' -d '{"siteUrl":"https://example.com/app"}')" = "400" ] && echo 1 || echo 0)"
ck "an empty site name is refused" \
  "$([ "$(curl -s -o /dev/null -w '%{http_code}' -X PUT "$API/admin/site" -H "$AUTH" \
    -H 'Content-Type: application/json' -d '{"siteName":""}')" = "400" ] && echo 1 || echo 0)"

# ---- turning indexing off actually hides the site ---------------------------
curl -s -o /dev/null -X PUT "$API/admin/site" -H "$AUTH" -H 'Content-Type: application/json' \
  -d '{"indexable":false}'
sleep 1
ck "with indexing off, robots.txt refuses everything" \
  "$(curl -s "$BASE/robots.txt" | grep -qE '^Disallow: /$' && echo 1 || echo 0)"
ck "with indexing off, the sitemap is withdrawn" \
  "$([ "$(curl -s -o /dev/null -w '%{http_code}' "$BASE/sitemap.xml")" = "404" ] && echo 1 || echo 0)"
ck "with indexing off, public pages say noindex" \
  "$(curl -s "$BASE/pricing" | grep -qi 'noindex' && echo 1 || echo 0)"

curl -s -o /dev/null -X PUT "$API/admin/site" -H "$AUTH" -H 'Content-Type: application/json' \
  -d '{"indexable":true}'
sleep 1
ck "turning it back on restores the sitemap" \
  "$([ "$(curl -s -o /dev/null -w '%{http_code}' "$BASE/sitemap.xml")" = "200" ] && echo 1 || echo 0)"

echo
echo "==== ANALYTICS & SITE SETTINGS: $PASS PASS / $FAIL FAIL ===="
[ "$FAIL" -eq 0 ]
