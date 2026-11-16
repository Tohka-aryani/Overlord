#!/usr/bin/env python3
"""Loop POST /api/ingest/classify-backfill until remainingEstimate == 0."""
from __future__ import annotations

import json
import os
import sys
import time
import urllib.error
import urllib.request

BASE = os.environ.get("OVERLORD_BASE", "http://127.0.0.1:3000")
SECRET = os.environ.get("CRON_SECRET", "")
LOG = os.environ.get("CLASSIFY_DRAIN_LOG", "/tmp/classify-drain.out")


def log(*parts: object) -> None:
    line = " ".join(str(p) for p in parts)
    print(line, flush=True)
    try:
        with open(LOG, "a", encoding="utf-8") as fh:
            fh.write(line + "\n")
    except OSError:
        pass


if not SECRET:
    log("CRON_SECRET missing")
    sys.exit(1)

url = f"{BASE}/api/ingest/classify-backfill"
fail = 0

while True:
    req = urllib.request.Request(
        url,
        method="POST",
        headers={"Authorization": f"Bearer {SECRET}"},
    )
    try:
        with urllib.request.urlopen(req, timeout=300) as res:
            body = res.read().decode()
    except Exception as exc:  # noqa: BLE001
        log(time.strftime("%H:%M:%S"), "ERR", exc)
        fail += 1
        if fail >= 8:
            log("soft-reset after network failures; continuing")
            fail = 0
        time.sleep(3)
        continue

    try:
        data = json.loads(body)
    except json.JSONDecodeError as exc:
        log(time.strftime("%H:%M:%S"), "BAD_JSON", exc, body[:200])
        fail += 1
        time.sleep(2)
        continue

    counts = data.get("counts") or {}
    rem = counts.get("remainingEstimate", -1)
    classified = counts.get("classified", 0)
    log(
        time.strftime("%H:%M:%S"),
        data.get("status"),
        "classified",
        classified,
        "remaining",
        rem,
    )
    if data.get("status") != "success":
        fail += 1
    elif classified == 0 and rem not in (0, -1):
        fail += 1
        time.sleep(2)
    else:
        fail = 0

    if fail >= 8:
        log("soft-reset after consecutive failures; continuing")
        fail = 0
        time.sleep(5)

    if rem == 0:
        log("DONE remaining=0")
        sys.exit(0)

    time.sleep(0.5)
