#!/bin/bash
# Checks that a course download is authorised by a signed token: the owner can
# get one and use it, a second account cannot, no token is refused, and a token
# for one format or course does not work for another.
B="${BASE_URL:-http://localhost:4020}/api"
PASS=0; FAIL=0
ck() { if [ "$2" = "$3" ]; then PASS=$((PASS+1)); echo "PASS $1"; else FAIL=$((FAIL+1)); echo "FAIL $1 (got=$2 want=$3)"; fi }

mk_user() {
  local email="$1"
  curl -s -X POST $B/auth/register -H 'Content-Type: application/json' \
    -d "{\"name\":\"U\",\"email\":\"$email\",\"password\":\"password123\"}" \
    | python3 -c "import sys,json;print(json.load(sys.stdin)['accessToken'])"
}

S=$(date +%s%N)
OWNER=$(mk_user "owner$S@t.local")
OTHER=$(mk_user "other$S@t.local")

node -e "
const {PrismaClient}=require('$(cd "$(dirname "$0")/../.." && pwd)/backend/node_modules/@prisma/client');const p=new PrismaClient();
p.user.update({where:{email:'owner$S@t.local'},data:{plan:'monthly',planExpiresAt:new Date(Date.now()+31536000000)}}).then(()=>p.\$disconnect());" >/dev/null

TD=$(curl -s -X POST $B/courses/generate-topics -H 'Content-Type: application/json' -H "Authorization: Bearer $OWNER" \
     -d '{"title":"Signed Link","numTopics":1,"language":"English"}' | python3 -c "import sys,json;print(json.dumps(json.load(sys.stdin)['data']))")
CID=$(curl -s -X POST $B/courses/generate -H 'Content-Type: application/json' -H "Authorization: Bearer $OWNER" \
     -d "{\"title\":\"Signed Link\",\"topics\":$TD,\"language\":\"English\",\"type\":\"image\"}" | python3 -c "import sys,json;print(json.load(sys.stdin)['data']['id'])")

# --- the owner gets a link and it works, exactly as the button does ---
PDF_URL=$(curl -s "$B/courses/$CID/download-token?format=pdf" -H "Authorization: Bearer $OWNER" | python3 -c "import sys,json;print(json.load(sys.stdin)['data']['url'])")
ck "owner is issued a PDF link" "$([ -n "$PDF_URL" ] && echo ok)" "ok"
ck "the PDF link works with no session" "$(curl -s -o /dev/null -w '%{http_code}' "${BASE_URL:-http://localhost:4020}$PDF_URL")" "200"

PPT_URL=$(curl -s "$B/courses/$CID/download-token?format=ppt" -H "Authorization: Bearer $OWNER" | python3 -c "import sys,json;print(json.load(sys.stdin)['data']['url'])")
ck "owner on a paid plan is issued a PPT link" "$([ -n "$PPT_URL" ] && echo ok)" "ok"
ck "the PPT link works with no session (the button used to 401)" "$(curl -s -o /dev/null -w '%{http_code}' "${BASE_URL:-http://localhost:4020}$PPT_URL")" "200"
ck "the PPT download is a real file" "$(curl -s "${BASE_URL:-http://localhost:4020}$PPT_URL" -o /tmp/dl.pptx -w '%{http_code}'; head -c2 /tmp/dl.pptx)" "200PK"

# --- everything else must be refused ---
ck "no token is refused" "$(curl -s -o /dev/null -w '%{http_code}' "$B/courses/$CID/export/pdf")" "403"
ck "a made-up token is refused" "$(curl -s -o /dev/null -w '%{http_code}' "$B/courses/$CID/export/pdf?t=9999999999.someone.forged")" "403"
ck "a PDF token does not open the PPT" "$(curl -s -o /dev/null -w '%{http_code}' "${BASE_URL:-http://localhost:4020}${PDF_URL/export\/pdf/export\/ppt}")" "403"
ck "another account cannot get a link" "$(curl -s -o /dev/null -w '%{http_code}' "$B/courses/$CID/download-token?format=pdf" -H "Authorization: Bearer $OTHER")" "403"

# --- the plan is still enforced when the link is issued ---
OTD=$(curl -s -X POST $B/courses/generate-topics -H 'Content-Type: application/json' -H "Authorization: Bearer $OTHER" \
      -d '{"title":"Free Course","numTopics":1,"language":"English"}' | python3 -c "import sys,json;print(json.dumps(json.load(sys.stdin)['data']))")
OCID=$(curl -s -X POST $B/courses/generate -H 'Content-Type: application/json' -H "Authorization: Bearer $OTHER" \
      -d "{\"title\":\"Free Course\",\"topics\":$OTD,\"language\":\"English\",\"type\":\"image\"}" | python3 -c "import sys,json;print(json.load(sys.stdin)['data']['id'])")
ck "a free account is refused a PPT link" "$(curl -s -o /dev/null -w '%{http_code}' "$B/courses/$OCID/download-token?format=ppt" -H "Authorization: Bearer $OTHER")" "403"
ck "a free account still gets a PDF link" "$(curl -s -o /dev/null -w '%{http_code}' "$B/courses/$OCID/download-token?format=pdf" -H "Authorization: Bearer $OTHER")" "200"

echo ""
echo "==== SIGNED DOWNLOADS: $PASS PASS / $FAIL FAIL ===="
exit $FAIL
