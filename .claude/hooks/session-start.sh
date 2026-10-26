#!/bin/bash
# Brings up everything the test suites need, so a session starts ready to run
# them rather than ready to start setting them up.
#
# Every container restart otherwise costs the same twenty minutes: install,
# find where PostgreSQL lives, create the role, push the schema, build both
# halves, discover that `npm start` and `node backend/dist/index.js` want
# different working directories. None of that is interesting and all of it is
# the same every time.
#
# Idempotent by construction: every step checks before it acts, so running this
# on a resumed session is a no-op that finishes in seconds.
set -euo pipefail

# Local machines have their own database and their own idea of where it lives.
if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

REPO="${CLAUDE_PROJECT_DIR:-$(cd "$(dirname "$0")/../.." && pwd)}"
PGPORT=5433
PGDATA=/var/lib/postgresql/16/main
PGCONF=/etc/postgresql/16/main/postgresql.conf
DB_URL="postgresql://coursbit:coursbit@127.0.0.1:$PGPORT/coursbit"

echo "→ dependencies"
cd "$REPO"
# `install` rather than `ci`: the container image is cached after this hook
# finishes, so a warm node_modules is worth more than a reproducible one here.
#
# --include=dev is not optional. This hook used to export NODE_ENV=production
# into the session, so on the *next* session npm saw it and skipped
# devDependencies — which meant no @types, a tsc that could not compile, and a
# build that died. The export is gone (below), but a stray NODE_ENV from
# anywhere else would do the same, so the flag stays.
NODE_ENV=development npm install --include=dev --silent >/dev/null 2>&1 ||
  NODE_ENV=development npm install --include=dev

echo "→ postgres"
if [ -d "$PGDATA" ] && [ -f "$PGCONF" ]; then
  if ! pg_isready -h 127.0.0.1 -p "$PGPORT" >/dev/null 2>&1; then
    runuser -u postgres -- /usr/lib/postgresql/16/bin/pg_ctl \
      -D "$PGDATA" \
      -o "-c config_file=$PGCONF -p $PGPORT -k /tmp -c listen_addresses=127.0.0.1" \
      -l /tmp/pg.log start >/dev/null 2>&1 || true

    for _ in $(seq 1 20); do
      pg_isready -h 127.0.0.1 -p "$PGPORT" >/dev/null 2>&1 && break
      sleep 1
    done
  fi

  if pg_isready -h 127.0.0.1 -p "$PGPORT" >/dev/null 2>&1; then
    runuser -u postgres -- psql -h /tmp -p "$PGPORT" -tAc \
      "SELECT 1 FROM pg_roles WHERE rolname='coursbit'" | grep -q 1 ||
      runuser -u postgres -- psql -h /tmp -p "$PGPORT" -q -c \
        "CREATE ROLE coursbit LOGIN PASSWORD 'coursbit' SUPERUSER;"

    runuser -u postgres -- psql -h /tmp -p "$PGPORT" -tAc \
      "SELECT 1 FROM pg_database WHERE datname='coursbit'" | grep -q 1 ||
      runuser -u postgres -- createdb -h /tmp -p "$PGPORT" -O coursbit coursbit
  else
    echo "  postgres did not start; see /tmp/pg.log" >&2
  fi
else
  echo "  no local postgres in this image — set DATABASE_URL yourself" >&2
fi

echo "→ schema and build"
export DATABASE_URL="$DB_URL"
cd "$REPO/backend"
npx prisma generate >/dev/null 2>&1 || npx prisma generate
npx prisma db push --accept-data-loss >/dev/null 2>&1 || true
cd "$REPO"
npm run build >/dev/null 2>&1 || npm run build

# Read by every suite. Written here so a session does not have to rediscover
# them, and so `node backend/dist/index.js` is never run from the wrong
# directory — which fails with a confusing "cannot find module" naming a path
# with `backend/backend` in it.
{
  echo "export DATABASE_URL=\"$DB_URL\""
  echo 'export BASE_URL="http://localhost:4020"'
  echo 'export PORT=4020'
  # NODE_ENV is deliberately not exported. Every script that needs production
  # behaviour sets it on the server it starts (all.sh, ai-budget.sh do), and
  # leaving it set session-wide makes the next npm install skip devDependencies.
  # Found rather than hardcoded. The image moves Chromium between versions and
  # renames the folder with it (chromium-1194/chrome-linux → 1243/chrome-linux64),
  # and a stale path does not fail loudly: the browser suites simply never run,
  # and the tally comes back 304 instead of 392 with nothing marked as failed.
  CHROME=$(find /opt/pw-browsers -maxdepth 3 -type f -name chrome -path '*chromium-*' 2>/dev/null | sort -V | tail -1)
  [ -n "$CHROME" ] && echo "export CHROMIUM_PATH=\"$CHROME\""
} >> "${CLAUDE_ENV_FILE:-/dev/null}"

cat <<'READY'

Ready. The whole suite, against its own server:

  bash scripts/test/all.sh

One suite at a time needs a server running first:

  npm start &
  bash scripts/test/seo.sh
READY
