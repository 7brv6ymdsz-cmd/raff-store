#!/usr/bin/env bash
# Packs brand/rawaj-brand-kit.zip (the download on /brand/) from brand/assets, brand/motion, brand/sounds and the colour sheet.
# Usage: bash tools/brand/build_kit.sh [output.zip]
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
OUT="${1:-$ROOT/brand/rawaj-brand-kit.zip}"
case "$OUT" in /*) ;; *) OUT="$PWD/$OUT" ;; esac
TMP="$(mktemp -d)"; trap 'rm -rf "$TMP"' EXIT
mkdir -p "$TMP/rawaj-brand"
cp -r "$ROOT/brand/assets" "$ROOT/brand/motion" "$ROOT/brand/sounds" "$TMP/rawaj-brand/"
cp "$ROOT/tools/brand/colours-ar.txt" "$TMP/rawaj-brand/الألوان.txt"
rm -f "$OUT"
(cd "$TMP" && find rawaj-brand -type f | LC_ALL=C sort | zip -q -X -D "$OUT" -@)
unzip -l "$OUT" | tail -1
