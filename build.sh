#!/bin/zsh
# Builds MeetCoder.app next to this script.
set -e
cd "$(dirname "$0")"
swift build -c release 2>&1 | tail -40
APP="MeetCoder.app"
mkdir -p "$APP/Contents/MacOS"
cp .build/release/MeetCoder "$APP/Contents/MacOS/MeetCoder"
cat > "$APP/Contents/Info.plist" <<'EOF'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>CFBundleName</key><string>MeetCoder</string>
  <key>CFBundleDisplayName</key><string>MeetCoder</string>
  <key>CFBundleIdentifier</key><string>local.meetcoder.app</string>
  <key>CFBundleExecutable</key><string>MeetCoder</string>
  <key>CFBundlePackageType</key><string>APPL</string>
  <key>CFBundleShortVersionString</key><string>1.0</string>
  <key>CFBundleVersion</key><string>1</string>
  <key>CFBundleDevelopmentRegion</key><string>hu</string>
  <key>LSMinimumSystemVersion</key><string>14.0</string>
  <key>NSHighResolutionCapable</key><true/>
  <key>NSAppTransportSecurity</key><dict><key>NSAllowsLocalNetworking</key><true/></dict>
</dict>
</plist>
EOF
# A stable signing identity keeps the screen-recording permission across rebuilds; falls back to ad-hoc.
ID=$(security find-identity -v -p codesigning 2>/dev/null | awk -F'"' '/Apple Development|Developer ID/ {print $2; exit}')
codesign --force --sign "${ID:--}" "$APP" 2>&1
echo "Built $APP (signed: ${ID:-ad-hoc})"
