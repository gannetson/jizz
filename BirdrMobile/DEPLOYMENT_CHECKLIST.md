# Deployment Checklist

## Before You Start

Your app is ready for deployment! Here's what you need to do:

### Current Configuration
- **App Name:** BirdrMobile (consider changing to "Jizz")
- **Package ID (Android):** `com.birdrmobile`
- **Bundle ID (iOS):** Check in Xcode project settings
- **Version:** 1.0 (versionCode: 1)

### Things to Update Before Deployment

1. **App Name:** Change "BirdrMobile" to "Jizz" (or your preferred name)
   - iOS: Update in Xcode project settings and `Info.plist`
   - Android: Update in `strings.xml` and `AndroidManifest.xml`

2. **Package/Bundle ID:** Make it unique (e.g., `com.yourcompany.jizz`)
   - iOS: Update in Xcode project settings
   - Android: Update `applicationId` in `build.gradle`

3. **Android Signing:** Currently using debug keystore - **MUST FIX** for Play Store
   - Generate production keystore (see steps below)
   - Update `build.gradle` to use production keystore

4. **App Icons:** Add proper app icons for both platforms
   - iOS: 1024x1024 for App Store, plus all required sizes
   - Android: Multiple sizes (mdpi, hdpi, xhdpi, xxhdpi, xxxhdpi)

5. **API Endpoints:** Ensure production API URLs are configured
   - Check `src/config/api.ts`

---

## iOS App Store Deployment

### Step 1: Update App Configuration
- [ ] Open `BirdrMobile/ios/BirdrMobile.xcworkspace` in Xcode
- [ ] Update Bundle Identifier to something unique (e.g., `com.yourcompany.jizz`)
- [ ] Update Display Name to "Jizz" (or your app name)
- [ ] Set Version to `1.0.0`
- [ ] Set Build to `1`

### Step 2: Set Up Signing
- [ ] Go to Signing & Capabilities tab
- [ ] Select your Apple Developer Team
- [ ] Xcode will create provisioning profiles automatically

### Step 3: Add App Icons
- [ ] Add 1024x1024 icon to AppIcon asset catalog
- [ ] Add all required icon sizes (Xcode can generate these)

### Step 4: Build Archive
- [ ] Select "Any iOS Device" (not simulator)
- [ ] Product > Archive
- [ ] Wait for build to complete

### Step 5: Upload to App Store Connect
- [ ] Click "Distribute App"
- [ ] Choose "App Store Connect"
- [ ] Choose "Upload"
- [ ] Select distribution certificate
- [ ] Upload

### Step 6: Create App Store Listing
- [ ] Go to [appstoreconnect.apple.com](https://appstoreconnect.apple.com)
- [ ] Create new app
- [ ] Fill in:
  - [ ] App name
  - [ ] Category
  - [ ] Screenshots (required!)
  - [ ] Description
  - [ ] Keywords
  - [ ] Privacy Policy URL (required!)
  - [ ] Support URL
- [ ] Wait for build to process (10-30 minutes)
- [ ] Select build
- [ ] Submit for review

### Step 7: Required Assets
- [ ] App Icon: 1024x1024 pixels
- [ ] Screenshots:
  - [ ] iPhone 6.7" (1290 x 2796) - Required
  - [ ] iPhone 6.5" (1242 x 2688) - Required
  - [ ] iPad (if supporting) - Optional
- [ ] Privacy Policy URL
- [ ] App description (up to 4000 characters)

---

## Android Play Store Deployment

### Step 1: Generate Production Keystore ⚠️ CRITICAL

**IMPORTANT:** Keep this keystore safe! You'll need it for all future updates.

```bash
cd BirdrMobile/android/app
keytool -genkeypair -v -storetype PKCS12 \
  -keystore jizz-release-key.keystore \
  -alias jizz-key-alias \
  -keyalg RSA -keysize 2048 -validity 10000
```

**Store the keystore securely:**
- [ ] Save keystore file in secure location
- [ ] Note down passwords (store securely)
- [ ] Add to `.gitignore` (never commit!)

### Step 2: Create keystore.properties

```bash
cd BirdrMobile/android
cat > keystore.properties << EOF
storePassword=YOUR_STORE_PASSWORD
keyPassword=YOUR_KEY_PASSWORD
keyAlias=jizz-key-alias
storeFile=jizz-release-key.keystore
EOF
```

- [ ] Add `keystore.properties` to `.gitignore`
- [ ] Add `jizz-release-key.keystore` to `.gitignore`

### Step 3: Update build.gradle

Update `BirdrMobile/android/app/build.gradle`:

```gradle
// Add at the top of android block
def keystorePropertiesFile = rootProject.file("keystore.properties")
def keystoreProperties = new Properties()
if (keystorePropertiesFile.exists()) {
    keystoreProperties.load(new FileInputStream(keystorePropertiesFile))
}

android {
    // ... existing config ...
    
    signingConfigs {
        release {
            if (keystorePropertiesFile.exists()) {
                keyAlias keystoreProperties['keyAlias']
                keyPassword keystoreProperties['keyPassword']
                storeFile file(keystoreProperties['storeFile'])
                storePassword keystoreProperties['storePassword']
            }
        }
    }
    
    buildTypes {
        release {
            signingConfig signingConfigs.release  // Change this line
            minifyEnabled enableProguardInReleaseBuilds
            proguardFiles getDefaultProguardFile("proguard-android.txt"), "proguard-rules.pro"
        }
    }
}
```

- [ ] Update `build.gradle` with signing config
- [ ] Update `applicationId` if needed
- [ ] Verify `versionCode` is `1`
- [ ] Verify `versionName` is `"1.0"`

### Step 4: Update App Configuration
- [ ] Update app name in `android/app/src/main/res/values/strings.xml`
- [ ] Update package name if needed
- [ ] Add app icons to `android/app/src/main/res/mipmap-*/`

### Step 5: Build Release AAB

```bash
cd BirdrMobile/android
./gradlew bundleRelease
```

- [ ] Build completes successfully
- [ ] AAB file created at: `app/build/outputs/bundle/release/app-release.aab`

### Step 6: Create Play Store Listing
- [ ] Go to [play.google.com/console](https://play.google.com/console)
- [ ] Create new app
- [ ] Fill in:
  - [ ] App name
  - [ ] Short description (80 chars)
  - [ ] Full description (4000 chars)
  - [ ] Category
  - [ ] Privacy Policy URL (required!)
  - [ ] Contact details

### Step 7: Upload AAB
- [ ] Go to Production > Create new release
- [ ] Upload `app-release.aab`
- [ ] Add release notes
- [ ] Review and roll out

### Step 8: Required Assets
- [ ] App Icon: 512x512 pixels
- [ ] Feature Graphic: 1024x500 pixels
- [ ] Screenshots: At least 2, up to 8
  - [ ] Phone screenshots (16:9 or 9:16)
  - [ ] Tablet screenshots (optional)
- [ ] Privacy Policy URL
- [ ] Content rating completed

### Step 9: Submit for Review
- [ ] Complete all required fields
- [ ] Upload all required assets
- [ ] Submit for review

---

## Testing Checklist

Before submitting, test on real devices:

- [ ] Test on iOS device (iPhone/iPad)
- [ ] Test on Android device
- [ ] Test all main features
- [ ] Test navigation
- [ ] Test API connections
- [ ] Test with slow network
- [ ] Test offline behavior (if applicable)
- [ ] Test on different screen sizes
- [ ] Check for crashes
- [ ] Verify app icons display correctly
- [ ] Verify app name displays correctly

---

## Post-Deployment

### Monitor Your App
- [ ] Set up App Store Connect notifications
- [ ] Set up Play Console notifications
- [ ] Monitor crash reports
- [ ] Monitor user reviews
- [ ] Track download numbers

### Future Updates
- [ ] Increment version numbers for each release
- [ ] Keep Android keystore safe for updates
- [ ] Test updates before submitting
- [ ] Update release notes

---

## Quick Reference

### Build Commands

**iOS:**
```bash
cd BirdrMobile/ios
open BirdrMobile.xcworkspace
# Then use Xcode: Product > Archive
```

**Android:**
```bash
cd BirdrMobile/android
./gradlew bundleRelease
# Output: app/build/outputs/bundle/release/app-release.aab
```

### Important Files

- **iOS Config:** `BirdrMobile/ios/BirdrMobile/Info.plist`
- **Android Config:** `BirdrMobile/android/app/build.gradle`
- **API Config:** `BirdrMobile/src/config/api.ts`
- **Keystore:** `BirdrMobile/android/app/jizz-release-key.keystore` (keep safe!)

### Support Links

- [Full Deployment Guide](../mobile/DEPLOYMENT.md)
- [React Native Android Signing](https://reactnative.dev/docs/signed-apk-android)
- [App Store Connect](https://appstoreconnect.apple.com)
- [Play Console](https://play.google.com/console)

---

## Common Issues

### iOS
- **"No signing certificate"** → Add Apple Developer account in Xcode Settings
- **"Bundle ID exists"** → Change to unique identifier
- **Archive fails** → Clean build folder, try again

### Android
- **"Keystore not found"** → Check path in `keystore.properties`
- **"Gradle build failed"** → Check Java version (needs 17+)
- **"App won't install"** → Check minSdkVersion compatibility

---

Good luck with your deployment! 🚀

