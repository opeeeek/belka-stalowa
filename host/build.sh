#!/usr/bin/env bash
# Buduje BelkaStal.exe (Windows x64, WebView2) z bieżącego dist/BelkaStal.html.
set -euo pipefail
cd "$(dirname "$0")/.."
node build.mjs
cp dist/BelkaStal.html host/app.html
cd host
go mod tidy
GOOS=windows GOARCH=amd64 CGO_ENABLED=0 go build -trimpath -ldflags "-H windowsgui -s -w" -o ../dist/BelkaStal.exe .
rm -f app.html
echo "dist/BelkaStal.exe gotowy"
