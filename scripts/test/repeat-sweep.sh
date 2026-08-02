#!/bin/bash
# Runs the endpoint sweep repeatedly.
#
# One clean sweep proves nothing crashed that time. Repeating it is what
# catches the intermittent kind — a database race, a handler that only fails
# on a second call, a state left behind by the previous run.
#
# The sweep is a shell script rather than a node suite, so it gets its own
# loop instead of going through repeat.js.
#
#   bash scripts/test/repeat-sweep.sh 30
RUNS=${1:-30}
GREEN=0
RED=0
FAILED_DETAIL=""

for i in $(seq 1 "$RUNS"); do
  OUT=$(bash "$(dirname "$0")/../audit/endpoint-sweep.sh" 2>&1)
  LINE=$(echo "$OUT" | grep "ENDPOINT SWEEP:")
  ERRORS=$(echo "$LINE" | sed -E 's/.*\/ ([0-9]+) server errors.*/\1/')

  if [ "$ERRORS" = "0" ]; then
    GREEN=$((GREEN+1))
    echo "sweep $i  OK   $LINE"
  else
    RED=$((RED+1))
    echo "sweep $i  FAIL $LINE"
    FAILED_DETAIL="$FAILED_DETAIL
--- run $i ---
$(echo "$OUT" | sed -n '/SERVER ERRORS:/,$p')"
  fi
done

echo ""
echo "=============================================================="
echo "endpoint sweep: $GREEN/$RUNS runs with zero server errors"
[ -n "$FAILED_DETAIL" ] && echo "$FAILED_DETAIL"
echo "=============================================================="
