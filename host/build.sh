#!/usr/bin/env bash
# Buduje BelkaStal.exe (Windows x64, WebView2) z bieżącego dist/BelkaStal.html.
set -euo pipefail
cd "$(dirname "$0")/.."
node build.mjs
cp dist/BelkaStal.html host/app.html
cd host
# ikona programu: zasób Windows (dwuteownik) – odtwarzany, gdy jest narzędzie rsrc (go install github.com/akavel/rsrc@v0.10.2)
if command -v rsrc >/dev/null 2>&1; then rsrc -ico ikona.ico -arch amd64 -o rsrc_windows_amd64.syso; fi
go mod tidy
GOOS=windows GOARCH=amd64 CGO_ENABLED=0 go build -trimpath -ldflags "-H windowsgui -s -w" -o ../dist/BelkaStal.exe .
rm -f app.html
echo "dist/BelkaStal.exe gotowy"
