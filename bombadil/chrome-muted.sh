#!/bin/sh
# Launches Chrome with audio muted, so YouTube videos played during
# Bombadil runs stay silent. Bombadil picks this up via the CHROME env var.
# Set REAL_CHROME to override the browser binary.
set -eu

if [ -z "${REAL_CHROME:-}" ]; then
  for candidate in \
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
    "/Applications/Chromium.app/Contents/MacOS/Chromium" \
    "$(command -v google-chrome-stable 2>/dev/null || true)" \
    "$(command -v google-chrome 2>/dev/null || true)" \
    "$(command -v chromium 2>/dev/null || true)" \
    "$(command -v chrome 2>/dev/null || true)"; do
    if [ -n "$candidate" ] && [ -x "$candidate" ]; then
      REAL_CHROME="$candidate"
      break
    fi
  done
fi

if [ -z "${REAL_CHROME:-}" ]; then
  echo "chrome-muted.sh: no Chrome/Chromium found; set REAL_CHROME" >&2
  exit 1
fi

exec "$REAL_CHROME" --mute-audio "$@"
