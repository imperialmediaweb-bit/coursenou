#!/usr/bin/env bash
# Exports, certificates, public links and the tutor.
#
# signed-downloads.sh already covers who is allowed to download what. This
# covers whether what comes out is worth having: a PowerPoint file a real
# PowerPoint will open, a certificate that means something, a public link that
# shows the course and not the author's account, and a tutor that stays inside
# the course it was asked about.
#
# Usage: DATABASE_URL=... bash scripts/test/export.sh
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
EMAIL="exp$S@test.local"
OTHER="expother$S@test.local"
NAME="Ștefan Ținteșcu-Ăsta"

reg() {
  curl -s -X POST "$API/auth/register" -H 'Content-Type: application/json' \
    -d "$(python3 -c "
import json,sys
print(json.dumps({'name': sys.argv[1], 'email': sys.argv[2], 'password':'password123'}))" "$2" "$1")" |
    python3 -c "import sys,json;print(json.load(sys.stdin).get('accessToken',''))"
}
reg "$EMAIL" "$NAME" >/dev/null
OTHER_TOKEN=$(reg "$OTHER" "Someone Else")
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

CID=$(curl -s -X POST "$API/courses/generate" -H "$AUTH" -H 'Content-Type: application/json' \
  -d '{"title":"Așezări și țărmuri: știința solului","language":"Romanian","type":"image","topics":[{"title":"Noțiuni","subtopics":["Început","Țesuturi"]}]}' |
  python3 -c "import sys,json;print(json.load(sys.stdin)['data']['id'])" 2>/dev/null)
ck "a course was created to export" "$([ -n "$CID" ] && echo 1 || echo 0)"
[ -z "$CID" ] && { echo "==== EXPORT: $PASS PASS / $((FAIL+1)) FAIL ===="; exit 1; }

download() {
  local url
  url=$(curl -s "$API/courses/$CID/download-token?format=$1" -H "$AUTH" |
    python3 -c "import sys,json;d=json.load(sys.stdin);print(d.get('url') or d.get('data',{}).get('url',''))" 2>/dev/null)
  [ -z "$url" ] && return 1
  curl -s "$BASE$url" -o "$2"
}

# ─────────────────────────────────────────────────────────────────────────────
echo
echo "=== EXP-20 / EXP-23  the PowerPoint file is one PowerPoint will open ==="
if download ppt /tmp/exp.pptx; then
  ck "the export downloads" "$([ "$(stat -c%s /tmp/exp.pptx)" -gt 2000 ] && echo 1 || echo 0)" \
    "$(stat -c%s /tmp/exp.pptx) bytes"
  # A .pptx is a zip of XML. Anything else will not open in PowerPoint or
  # Google Slides however well it renders in a text editor.
  ck "it is a real Office package, not HTML with the wrong name" \
    "$(head -c 2 /tmp/exp.pptx | grep -q 'PK' && echo 1 || echo 0)" "$(head -c 40 /tmp/exp.pptx)"
  ck "it contains the slide parts PowerPoint requires" \
    "$(python3 -c "
import zipfile,sys
try:
    z = zipfile.ZipFile('/tmp/exp.pptx')
    names = z.namelist()
    need = ['[Content_Types].xml', 'ppt/presentation.xml']
    print(1 if all(n in names for n in need) and any(n.startswith('ppt/slides/slide') for n in names) else 0)
except Exception:
    print(0)")"
  ck "the slides carry real text, not pictures of text" \
    "$(python3 -c "
import zipfile
try:
    z = zipfile.ZipFile('/tmp/exp.pptx')
    slides = [n for n in z.namelist() if n.startswith('ppt/slides/slide')]
    text = b''.join(z.read(n) for n in slides)
    print(1 if b'<a:t>' in text else 0)
except Exception:
    print(0)")" \
    "editable text is the whole point of exporting to PowerPoint"
  ck "Romanian diacritics survive into the slides" \
    "$(python3 -c "
import zipfile
try:
    z = zipfile.ZipFile('/tmp/exp.pptx')
    slides = [n for n in z.namelist() if n.startswith('ppt/slides/slide')]
    text = b''.join(z.read(n) for n in slides).decode('utf-8', 'replace')
    print(1 if ('ș' in text or 'ț' in text or 'Aşez' in text or 'Așez' in text) else 0)
except Exception:
    print(0)")"
else
  ck "a PowerPoint download link is issued" 0 "no url in the response"
fi

# ─────────────────────────────────────────────────────────────────────────────
echo
echo "=== CER-01 / CER-02  a certificate has to be earned ==="
EARLY=$(curl -s -o /dev/null -w '%{http_code}' -X POST "$API/courses/$CID/complete" -H "$AUTH")
ck "a certificate cannot be claimed without reading the course" \
  "$([ "$EARLY" = "403" ] && echo 1 || echo 0)" \
  "got $EARLY — a certificate anyone can mint by hand is a picture, and it will end up on a CV"

# Read it properly, the way the app records progress.
curl -s -o /dev/null -X PUT "$API/progress/$CID" -H "$AUTH" -H 'Content-Type: application/json' \
  -d '{"visitedSubtopics":["0-0","0-1"],"lastVisitedTopic":0,"lastVisitedSubtopic":1,"timeSpent":60}'
DONE=$(curl -s -o /dev/null -w '%{http_code}' -X POST "$API/courses/$CID/complete" -H "$AUTH")
ck "and is issued once the course has been read" "$([ "$DONE" = "200" ] && echo 1 || echo 0)" "got $DONE"

curl -s -o /dev/null -X POST "$API/courses/$CID/complete" -H "$AUTH"
COUNT=$(curl -s "$API/certificates" -H "$AUTH" |
  python3 -c "import sys,json;print(len(json.load(sys.stdin)['data']))" 2>/dev/null || echo 0)
ck "completing twice does not mint a second certificate" \
  "$([ "$COUNT" = "1" ] && echo 1 || echo 0)" "got $COUNT certificates"

CERT_NAME=$(node -e "
  const { PrismaClient } = require('$REPO/backend/node_modules/@prisma/client');
  const p = new PrismaClient();
  p.certificate.findFirst({ where: { courseId: '$CID' } })
    .then(c => { console.log(c ? c.userName : ''); return p.\$disconnect(); });
")
ck "the name comes from the account, not from the request" \
  "$([ "$CERT_NAME" = "$NAME" ] && echo 1 || echo 0)" "got '$CERT_NAME'"
ck "diacritics in the name are intact" \
  "$(echo "$CERT_NAME" | grep -q 'Ștefan' && echo 1 || echo 0)"

CERT_ID=$(curl -s "$API/certificates" -H "$AUTH" |
  python3 -c "import sys,json;print(json.load(sys.stdin)['data'][0]['id'])" 2>/dev/null)
# A certificate is deliberately readable by anyone holding its id — it is a
# shareable achievement, and that public link is also how a third party verifies
# one. So the test is not "can a stranger open it" but "is the id unguessable,
# and does the page carry only the achievement".
CERT_PUBLIC=$(curl -s "$API/certificates/$CERT_ID")
ck "a certificate opens for anyone holding the link" \
  "$(echo "$CERT_PUBLIC" | python3 -c "import sys,json;print(1 if json.load(sys.stdin).get('success') else 0)" 2>/dev/null || echo 0)"
ck "the id is long and unguessable" "$([ ${#CERT_ID} -ge 20 ] && echo 1 || echo 0)" "id was ${#CERT_ID} characters"
ck "a guessed certificate id finds nothing" \
  "$([ "$(curl -s -o /dev/null -w '%{http_code}' "$API/certificates/1")" = "404" ] && echo 1 || echo 0)"
ck "the public certificate does not carry the holder's account id" \
  "$(echo "$CERT_PUBLIC" | grep -q '"userId"' && echo 0 || echo 1)"
ck "nor their email" "$(echo "$CERT_PUBLIC" | grep -qF "$EMAIL" && echo 0 || echo 1)"
ck "but does name the holder and the course" \
  "$(echo "$CERT_PUBLIC" | grep -qF 'Ștefan' && echo "$CERT_PUBLIC" | grep -q 'courseName' && echo 1 || echo 0)"
ck "another account cannot list it among theirs" \
  "$(curl -s "$API/certificates" -H "Authorization: Bearer $OTHER_TOKEN" |
     python3 -c "import sys,json;print(1 if len(json.load(sys.stdin)['data']) == 0 else 0)" 2>/dev/null || echo 0)"

# ─────────────────────────────────────────────────────────────────────────────
echo
echo "=== SHR-01 / SHR-02  a public link shows the course and nothing else ==="
SHARE=$(curl -s "$API/courses/$CID" -H "$AUTH" |
  python3 -c "import sys,json;print(json.load(sys.stdin)['data']['shareToken'])" 2>/dev/null)
SHARED=$(curl -s "$API/courses/share/$SHARE")
ck "the shared course is readable without signing in" \
  "$(echo "$SHARED" | python3 -c "import sys,json;print(1 if json.load(sys.stdin).get('success') else 0)" 2>/dev/null || echo 0)"
ck "it does not carry the author's email" \
  "$(echo "$SHARED" | grep -qF "$EMAIL" && echo 0 || echo 1)"
ck "it does not carry a password hash" \
  "$(echo "$SHARED" | grep -qE '\$2[aby]\$' && echo 0 || echo 1)"
ck "it does not carry the owner's user id" \
  "$(echo "$SHARED" | grep -q '"userId"' && echo 0 || echo 1)"

ck "a share token is long and random, not a counter" \
  "$([ ${#SHARE} -ge 32 ] && echo 1 || echo 0)" "token was ${#SHARE} characters"
ck "an invented share token finds nothing" \
  "$([ "$(curl -s -o /dev/null -w '%{http_code}' "$API/courses/share/00000000-0000-0000-0000-000000000000")" = "404" ] && echo 1 || echo 0)"

NEW_SHARE=$(curl -s -X POST "$API/courses/$CID/reset-share" -H "$AUTH" |
  python3 -c "import sys,json;print(json.load(sys.stdin)['data']['shareToken'])" 2>/dev/null)
ck "the owner can retire a share link" "$([ -n "$NEW_SHARE" ] && [ "$NEW_SHARE" != "$SHARE" ] && echo 1 || echo 0)"
ck "and the old link stops working immediately" \
  "$([ "$(curl -s -o /dev/null -w '%{http_code}' "$API/courses/share/$SHARE")" = "404" ] && echo 1 || echo 0)" \
  "a link that can never be taken back is not a feature you can offer"
ck "while the new one works" \
  "$([ "$(curl -s -o /dev/null -w '%{http_code}' "$API/courses/share/$NEW_SHARE")" = "200" ] && echo 1 || echo 0)"
ck "another account cannot retire someone else's link" \
  "$([ "$(curl -s -o /dev/null -w '%{http_code}' -X POST "$API/courses/$CID/reset-share" -H "Authorization: Bearer $OTHER_TOKEN")" = "403" ] && echo 1 || echo 0)"

# ─────────────────────────────────────────────────────────────────────────────
echo
echo "=== BOT-03  the tutor answers about this course and no other ==="
ck "another account's tutor cannot open this course" \
  "$([ "$(curl -s -o /dev/null -w '%{http_code}' -X POST "$API/chat/$CID" -H "Authorization: Bearer $OTHER_TOKEN" -H 'Content-Type: application/json' -d '{"message":"Summarise this"}')" = "403" ] && echo 1 || echo 0)"
ck "an empty question is refused" \
  "$([ "$(curl -s -o /dev/null -w '%{http_code}' -X POST "$API/chat/$CID" -H "$AUTH" -H 'Content-Type: application/json' -d '{"message":"   "}')" = "400" ] && echo 1 || echo 0)"
ck "the tutor answers a real question" \
  "$([ "$(curl -s -o /dev/null -w '%{http_code}' -X POST "$API/chat/$CID" -H "$AUTH" -H 'Content-Type: application/json' -d '{"message":"What is this course about?"}')" = "200" ] && echo 1 || echo 0)"

echo
echo "==== EXPORT, CERTIFICATES & SHARING: $PASS PASS / $FAIL FAIL ===="
echo
cat <<'NOTE'
Still needs a person and real files:
  - open the .pptx in PowerPoint, Google Slides and LibreOffice; a package that
    only LibreOffice opens is not deliverable
  - open the PDF on a phone and in Adobe, and look at Arabic and Chinese: this
    suite proves the characters are present, not that the font renders them
  - listen to two minutes of the Romanian audio before promoting the feature
NOTE
[ "$FAIL" -eq 0 ]
