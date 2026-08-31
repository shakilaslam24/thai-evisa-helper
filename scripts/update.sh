#!/usr/bin/env bash
# One-command update: back up, fetch the new version, restart, verify.
# Usage:  npm run update
set -euo pipefail

cd "$(dirname "$0")/.."
echo "── 1/5  Backing up before anything changes"
npm run --silent backup

echo "── 2/5  Fetching the latest version"
BEFORE=$(git rev-parse --short HEAD)
git pull --ff-only
AFTER=$(git rev-parse --short HEAD)

if [ "$BEFORE" = "$AFTER" ]; then
  echo "        Already up to date ($BEFORE)."
else
  echo "        Updated $BEFORE → $AFTER"
fi

echo "── 3/5  Installing dependencies"
npm install --omit=dev --no-audit --no-fund

echo "── 4/5  Applying any new settings and lists"
npm run --silent seed

echo "── 5/5  Restarting"
# Under systemd the service owns the process; otherwise start it by hand.
if command -v systemctl >/dev/null 2>&1 && systemctl list-unit-files 2>/dev/null | grep -q '^dreamfly.service'; then
  sudo systemctl restart dreamfly
  sleep 2
  systemctl is-active --quiet dreamfly && echo "        Service is running." || {
    echo "        Service did NOT start. Check:  sudo journalctl -u dreamfly -n 50"; exit 1; }
else
  echo "        No systemd service found — start it yourself with:  npm start"
fi

echo
npm run --silent doctor
