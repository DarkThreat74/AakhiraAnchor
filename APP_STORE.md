# App Store Submission Guide — Waqt

This guide covers everything needed to submit Waqt to the Apple App Store.
The code-level fixes are already done in this repo. The remaining steps
require macOS, Xcode, and an Apple Developer account.

---

## Prerequisites

- [ ] Apple Developer Program membership ($99/year) — https://developer.apple.com/programs/
- [ ] macOS machine with Xcode 15+ installed
- [ ] CocoaPods installed (`sudo gem install cocoapods`)
- [ ] Production site deployed at `https://waqt.app`
- [ ] Your Apple Developer Team ID (find at developer.apple.com > Account > Membership)

---

## What's Already Done (Code-Level)

These files are in this repo and ready to use:

| File | Purpose |
|------|---------|
| `ios-assets/PrivacyInfo.xcprivacy` | Apple-required privacy manifest |
| `ios-assets/Waqt.entitlements` | Entitlements template (Associated Domains, APNs) |
| `ios-assets/Info.plist.additions.plist` | Info.plist keys to merge (Face ID, ATS, orientations) |
| `ios-assets/metadata/app-description.txt` | App Store description (≤4000 chars) |
| `ios-assets/metadata/review-notes.txt` | Review notes with demo account + native feature list |
| `ios-assets/metadata/privacy-nutrition-label.txt` | Privacy nutrition label data |
| `public/.well-known/apple-app-site-association` | Universal Links config (needs Team ID) |
| `public/.well-known/assetlinks.json` | Android App Links config (needs SHA256 fingerprint) |
| `scripts/setup-ios.sh` | Automated iOS project setup script |
| `capacitor.config.ts` | Capacitor config (appId, splash, status bar) |
| `src/lib/native-bridge.ts` | Native feature bridge (biometric, push, haptics, share) |
| `src/components/biometric-gate.tsx` | Face ID / Touch ID gate |
| `src/components/deep-link-handler.tsx` | Universal Links handler |
| `src/components/native-shell-enhancements.tsx` | Native shell CSS/viewport overrides |
| `public/offline.html` | Offline fallback page |

---

## Step-by-Step Submission Process

### Step 1: Replace Placeholders

Before building, replace these placeholders with real values:

1. **`public/.well-known/apple-app-site-association`**
   - Replace `TEAMID` with your actual Apple Developer Team ID
   - This file must be served at `https://waqt.app/.well-known/apple-app-site-association`

2. **`public/.well-known/assetlinks.json`**
   - Replace `YOUR:SHA256:FINGERPRINT` with your Android signing key's SHA256 fingerprint
   - This file must be served at `https://waqt.app/.well-known/assetlinks.json`

3. **`capacitor.config.ts`**
   - Verify `server.url` is `https://waqt.app` (or your production domain)
   - Verify `appId` is `com.waqt.app` (or your chosen bundle ID)

### Step 2: Create Demo Account

Create a test account on the production site for Apple reviewers:

1. Sign up at `https://waqt.app/signup` with:
   - Email: `demo@waqt.app`
   - Password: `WaqtReview2026!`
2. Complete onboarding (set location, pick prayer settings)
3. Add sample data:
   - A few prayer check-ins
   - 2-3 calendar events
   - 2-3 goals with sub-goals
4. Verify the account works by logging out and back in

### Step 3: Build the iOS Project

On macOS:

```bash
cd /path/to/MyWaqt
bash scripts/setup-ios.sh
```

This script will:
- Build web assets (`pnpm run build`)
- Run `npx cap sync ios`
- Run `npx cap add ios`
- Copy `PrivacyInfo.xcprivacy` and `Waqt.entitlements` into the iOS project

### Step 4: Configure Xcode

1. Open `ios/App/App.xcworkspace` in Xcode
2. Select the `App` target
3. **Signing & Capabilities**:
   - Set your Development Team
   - Set Bundle Identifier to `com.waqt.app`
   - Add capability: **Associated Domains**
     - Add `applinks:waqt.app`
   - Add capability: **Push Notifications**
   - Set the entitlements file to `Waqt.entitlements`
4. **Info tab**:
   - Merge keys from `ios-assets/Info.plist.additions.plist`:
     - `NSFaceIDUsageDescription`
     - `NSAppTransportSecurity`
     - `UISupportedInterfaceOrientations` (portrait only)
     - `ITSAppUsesNonExemptEncryption` = `false`
5. **Build Phases > Copy Bundle Resources**:
   - Verify `PrivacyInfo.xcprivacy` is listed
   - If not, add it via File > Add Files to "App"

### Step 5: Test on Real Device

**Do not submit without testing on a real device.**

1. Connect an iPhone (iPhone SE or older device recommended for compatibility testing)
2. Build and run from Xcode
3. Test these native features:
   - [ ] Face ID prompt on launch
   - [ ] Face ID re-prompt on background return
   - [ ] Push notification permission request
   - [ ] Haptic feedback on prayer check-in
   - [ ] Share sheet when sharing a goal
   - [ ] Deep link (open `https://waqt.app/prayer` in Safari — should open app)
   - [ ] Offline mode (airplane mode — should show offline.html)
   - [ ] No white flash on launch (splash screen)
   - [ ] Status bar is dark themed
   - [ ] No horizontal scroll on any screen
   - [ ] No pinch-zoom (native shell only)
   - [ ] Safe area insets correct (notch, home indicator)
4. Test on at least 2 screen sizes:
   - iPhone SE (small screen, 375pt)
   - iPhone 15 Pro Max (large screen, 430pt)

### Step 6: Create App Store Assets

1. **App Icon** (1024×1024 PNG):
   - No transparency / alpha channel
   - No rounded corners (Apple masks them)
   - Use the existing `public/icon-512.png` as a base, scale to 1024×1024

2. **Screenshots** (required sizes):
   - 6.7" iPhone (iPhone 15 Pro Max): 1290×2796
   - 6.9" iPhone (iPhone 16 Pro Max): 1320×2868
   - Take screenshots of:
     - Prayer dashboard (with prayer times visible)
     - Calendar day view (with prayer window band)
     - Goals tree view (with branched goals)
     - Settings page
   - The old 5.5" requirement was dropped — don't generate it

3. **App Preview Video** (optional but recommended):
   - 15-30 second video showing the app in use
   - Show: prayer check-in, goal creation, calendar navigation

### Step 7: Submit to App Store Connect

1. Go to https://appstoreconnect.apple.com
2. Create a new app:
   - Name: `Waqt`
   - Primary Language: English
   - Bundle ID: `com.waqt.app`
   - SKU: `waqt` (internal identifier)
   - Full Access: Yes
3. Fill in App Information:
   - Category: Lifestyle (primary), Productivity (secondary)
   - Content Rights: Does not contain third-party content
   - Age Rating: 4+ (no user-generated content, no violence, no gambling)
   - Distribution: All territories or select as needed
4. Fill in App Privacy (nutrition label):
   - Use `ios-assets/metadata/privacy-nutrition-label.txt` as reference
   - Declare all data types listed
   - Set tracking to "No"
5. Fill in Description and metadata:
   - Copy from `ios-assets/metadata/app-description.txt`
   - Keywords: `prayer,islam,muslim,salah,namaz,calendar,goals,accountability,qadaa,dhikr`
   - Support URL: `https://waqt.app/support` (must be a real page)
   - Privacy Policy URL: `https://waqt.app/privacy`
6. Upload screenshots
7. Fill in Review Notes:
   - Copy from `ios-assets/metadata/review-notes.txt`
   - Include demo account credentials
8. Archive and upload:
   - In Xcode: Product > Archive
   - Distribute App > App Store Connect
   - Submit for review

### Step 8: After Submission

- Review typically takes 24-48 hours
- If rejected, check the rejection reason in App Store Connect
- Common rejection reasons for Capacitor apps:
  - **4.2 Minimum Functionality**: Ensure native features are visible to reviewer
  - **ITMS-91061 Missing Privacy Manifest**: Verify PrivacyInfo.xcprivacy is in bundle
  - **5.1.2 Data Deletion**: Verify account deletion works (Settings > Delete Account)
  - **2.5.1 Deprecated APIs**: Keep Capacitor and plugins updated

---

## Guideline Compliance Checklist

| Guideline | Requirement | Status |
|-----------|-------------|--------|
| 1.1 Objectionable Content | No offensive content | ✅ Pass |
| 1.2 User-Generated Content | No UGC, no moderation needed | ✅ N/A |
| 2.1 App Completeness | No placeholders, all features work | ✅ Pass |
| 2.3 Accurate Metadata | Description matches functionality | ✅ Pass |
| 2.5.1 Public APIs | Uses public Capacitor APIs only | ✅ Pass |
| 2.5.6 Web Browsing | Uses WebKit via Capacitor | ✅ Pass |
| 3.1.1 IAP | No IAP — app is free | ✅ N/A |
| 3.2 Business Model | Clear monetization (free) | ✅ Pass |
| 4.1 Copycat | Original app | ✅ Pass |
| 4.2 Minimum Functionality | Biometric, push, haptics, share, deep links | ✅ Pass |
| 4.3 Spam | Single purpose app | ✅ Pass |
| 4.8 Sign in with Apple | No social login → not required | ✅ N/A |
| 5.1.1 Data Collection | Privacy manifest included | ✅ Pass |
| 5.1.2 Data Deletion | Account deletion implemented | ✅ Pass |
| 5.1.5 Location | Coarse location only, server-side | ✅ Pass |
| 5.2.3 Audio/Video | No self-hosted media (external links only) | ✅ Pass |

---

## Troubleshooting

### "ITMS-91061: Missing privacy manifest"
- Verify `PrivacyInfo.xcprivacy` is in the App target's Copy Bundle Resources
- Verify you're using Capacitor 6+ (this project uses 8.5.0)

### "Guideline 4.2 — Minimum Functionality"
- Ensure the reviewer can see biometric prompt on launch
- Ensure demo account has data so the app isn't empty
- Add detailed review notes explaining native features

### "Blank screen on launch"
- Verify `https://waqt.app` is live and serving the app
- Verify `capacitor.config.ts` `server.url` is correct
- Test offline fallback (airplane mode)

### "Universal Links not working"
- Verify `apple-app-site-association` is served with `Content-Type: application/json`
- Verify the file is at `https://waqt.app/.well-known/apple-app-site-association`
- Verify `TEAMID` is replaced with your real Team ID
- Verify Associated Domains entitlement includes `applinks:waqt.app`

### "Push notifications not received"
- Verify APNs key is configured in Apple Developer > Keys
- Verify `aps-environment` is set to `production` in entitlements
- Verify the server is sending to APNs production endpoint
