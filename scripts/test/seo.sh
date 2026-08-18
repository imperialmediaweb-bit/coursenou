#!/usr/bin/env bash
# What a crawler, a link preview and an analytics vendor actually receive.
#
# None of this is visible in the running app — the React code sets nothing and
# a browser test would pass either way. It lives entirely in the first response,
# which is the one thing only a crawler reads, so it needs checking with curl
# and never with a browser.
#
# Usage: BASE_URL=http://localhost:4020 bash scripts/test/seo.sh
set -uo pipefail

BASE="${BASE_URL:-http://localhost:4020}"
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

has() { echo "$1" | grep -qiF "$2" && echo 1 || echo 0; }
lacks() { echo "$1" | grep -qiF "$2" && echo 0 || echo 1; }

# ---------------- robots.txt ----------------
ROBOTS=$(curl -s "$BASE/robots.txt")
ck "robots.txt is served" "$(has "$ROBOTS" 'User-agent: *')"
ck "the admin area is kept out of the index" "$(has "$ROBOTS" 'Disallow: /admin')"
ck "signed-in pages are kept out of the index" "$(has "$ROBOTS" 'Disallow: /dashboard')"
ck "shared course links are kept out of the index" "$(has "$ROBOTS" 'Disallow: /share/')"
ck "robots.txt points at the sitemap" "$(has "$ROBOTS" 'Sitemap: http')"

# ---------------- sitemap.xml ----------------
MAP=$(curl -s "$BASE/sitemap.xml")
ck "sitemap.xml is served" "$(has "$MAP" '<urlset')"
ck "the sitemap uses absolute URLs" \
  "$(echo "$MAP" | grep -qE '<loc>https?://' && echo 1 || echo 0)" \
  "a relative <loc> is ignored by every crawler"
ck "the landing page is listed" "$(echo "$MAP" | grep -qE '<loc>https?://[^<]+/</loc>' && echo 1 || echo 0)"
ck "the pricing page is listed" "$(has "$MAP" '/pricing')"
ck "private pages are not listed" "$(lacks "$MAP" '/dashboard')"

# ---------------- per-page metadata ----------------
# The whole point: a single-page app serves one HTML file, so without this
# every URL shares one title and one description.
HOME=$(curl -s "$BASE/")
PRICING=$(curl -s "$BASE/pricing")
CONTACT=$(curl -s "$BASE/contact")

home_title=$(echo "$HOME" | grep -oE '<title>[^<]*' | head -1)
pricing_title=$(echo "$PRICING" | grep -oE '<title>[^<]*' | head -1)
contact_title=$(echo "$CONTACT" | grep -oE '<title>[^<]*' | head -1)

ck "the landing page has a title" "$([ -n "$home_title" ] && echo 1 || echo 0)"
ck "pricing has its own title" \
  "$([ -n "$pricing_title" ] && [ "$pricing_title" != "$home_title" ] && echo 1 || echo 0)" \
  "got '$pricing_title' vs '$home_title'"
ck "contact has its own title" \
  "$([ -n "$contact_title" ] && [ "$contact_title" != "$pricing_title" ] && echo 1 || echo 0)" \
  "got '$contact_title'"

home_desc=$(echo "$HOME" | grep -oE '<meta name="description" content="[^"]*' | head -1)
pricing_desc=$(echo "$PRICING" | grep -oE '<meta name="description" content="[^"]*' | head -1)
ck "pricing has its own description" \
  "$([ -n "$pricing_desc" ] && [ "$pricing_desc" != "$home_desc" ] && echo 1 || echo 0)"
ck "there is exactly one description tag" \
  "$([ "$(echo "$HOME" | grep -c '<meta name="description"')" = "1" ] && echo 1 || echo 0)" \
  "a second one left behind by the template would contradict the first"

ck "the canonical link is absolute" \
  "$(echo "$HOME" | grep -qE '<link rel="canonical" href="https?://' && echo 1 || echo 0)"
ck "link previews get a title" "$(has "$HOME" 'property="og:title"')"
ck "link previews get an image" "$(has "$HOME" 'property="og:image"')"
ck "the card type is set for Twitter and Slack" "$(has "$HOME" 'twitter:card')"
ck "the landing page carries structured data" "$(has "$HOME" 'application/ld+json')"

# ---------------- what must stay out of search ----------------
DASH=$(curl -s "$BASE/dashboard")
ck "signed-in pages ask not to be indexed" "$(has "$DASH" 'noindex')"
ck "public pages ask to be indexed" "$(has "$PRICING" 'content="index, follow')"
ck "an unknown URL is not indexed" "$(has "$(curl -s "$BASE/no-such-page-here")" 'noindex')"

# ---------------- the app still works ----------------
# Rewriting the head is worthless if it breaks the page it is rewriting.
ck "the app's root element survives the rewrite" "$(has "$HOME" 'id="root"')"
ck "the module bundle is still linked" \
  "$(echo "$HOME" | grep -qE '<script type="module"[^>]*src="/assets/' && echo 1 || echo 0)"
ck "the head is still closed" "$(has "$HOME" '</head>')"

echo
echo "==== SEO: $PASS PASS / $FAIL FAIL ===="
[ "$FAIL" -eq 0 ]
