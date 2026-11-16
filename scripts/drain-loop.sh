#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
set -a
# shellcheck disable=SC1091
source .env
set +a
: "${CRON_SECRET:?CRON_SECRET required}"
while true; do
  if python3 -u scripts/drain-classify.py; then
    echo "drain finished ok $(date -u +%H:%M:%S)"
    exit 0
  fi
  echo "drain retry $(date -u +%H:%M:%S)" >&2
  sleep 3
done
