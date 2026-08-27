#!/usr/bin/env bash
#
# iOS Project Setup Script for Waqt
# Run this on macOS after installing Xcode and CocoaPods.
#
# Prerequisites:
#   1. macOS with Xcode 15+ installed
#   2. CocoaPods installed (sudo gem install cocoapods)
#   3. Apple Developer Program membership ($99/year)
#   4. Your Apple Developer Team ID (find it at developer.apple.com > Account > Membership)
#   5. The production site deployed at https://waqt.app
#
# Usage:
#   cd /path/to/MyWaqt
#   bash scripts/setup-ios.sh
#
set -euo pipefail

echo "=== Waqt iOS Project Setup ==="
echo ""

# Check prerequisites
if [[ "$(uname)" != "Darwin" ]]; then
  echo "ERROR: This script must be run on macOS."
  exit 1
fi

if ! command -v xcodebuild &> /dev/null; then
  echo "ERROR: Xcode is not installed. Install from the Mac App Store."
  exit 1
fi

if ! command -v pod &> /dev/null; then
  echo "ERROR: CocoaPods is not installed. Run: sudo gem install cocoapods"
  exit 1
fi

# Check if iOS project already exists
if [[ -d "ios" ]]; then
  echo "WARNING: ios/ directory already exists."
  read -p "Recreate? This will delete the existing iOS project. (y/N) " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Aborted."
    exit 0
  fi
  rm -rf ios
fi

# Step 1: Build the web assets
echo "→ Building web assets..."
pnpm run build
echo ""

# Step 2: Sync web assets to native projects
echo "→ Running cap sync..."
npx cap sync ios
echo ""

# Step 3: Add iOS platform
echo "→ Adding iOS platform..."
npx cap add ios
echo ""

# Step 4: Copy privacy manifest
echo "→ Copying PrivacyInfo.xcprivacy..."
cp ios-assets/PrivacyInfo.xcprivacy ios/App/App/PrivacyInfo.xcprivacy
echo "  Added PrivacyInfo.xcprivacy to ios/App/App/"
echo ""

# Step 5: Copy entitlements
echo "→ Copying entitlements..."
cp ios-assets/Waqt.entitlements ios/App/App/Waqt.entitlements
echo "  Added Waqt.entitlements to ios/App/App/"
echo ""

# Step 6: Merge Info.plist additions
echo "→ Merging Info.plist additions..."
echo "  Manual step required: open ios/App/App/Info.plist and add the keys"
echo "  from ios-assets/Info.plist.additions.plist"
echo "  Key additions needed:"
echo "    - NSFaceIDUsageDescription"
echo "    - NSAppTransportSecurity (allows arbitrary loads for remote URL)"
echo "    - UISupportedInterfaceOrientations (portrait only)"
echo "    - ITSAppUsesNonExemptEncryption = false"
echo ""

# Step 7: Sync again to ensure everything is in place
echo "→ Running cap sync again..."
npx cap sync ios
echo ""

echo "=== Setup Complete ==="
echo ""
echo "Next steps:"
echo "  1. Open ios/App/App.xcworkspace in Xcode"
echo "  2. Set your development team (Signing & Capabilities)"
echo "  3. Add Associated Domains capability: applinks:waqt.app"
echo "  4. Add Push Notifications capability"
echo "  5. Set the entitlements file to Waqt.entitlements"
echo "  6. Add PrivacyInfo.xcprivacy to the App target's bundle resources"
echo "  7. Replace TEAMID in public/.well-known/apple-app-site-association"
echo "     with your actual Apple Developer Team ID"
echo "  8. Replace YOUR:SHA256:FINGERPRINT in public/.well-known/assetlinks.json"
echo "     with your Android signing key fingerprint"
echo "  9. Test on a real device (not simulator)"
echo " 10. Take App Store screenshots (6.7\" iPhone: 1290x2796)"
echo " 11. Submit to App Store Connect"
echo ""
echo "See APP_STORE.md for the full submission guide."
