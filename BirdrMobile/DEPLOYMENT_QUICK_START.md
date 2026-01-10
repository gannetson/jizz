# Quick Start: Deploy to App Stores

Your React Native app is in the `BirdrMobile/` directory. This guide will help you deploy it.

## Current Project Structure

- **`BirdrMobile/`** - Your React Native app (has `ios/` and `android/` folders) ✅
- **`mobile/`** - Source code reference (no native folders)
- **`app/`** - Your original React web app

## Prerequisites Checklist

### For iOS App Store
- [ ] Apple Developer Account ($99/year) - [Sign up](https://developer.apple.com/programs/)
- [ ] Xcode installed (latest version)
- [ ] CocoaPods installed: `sudo gem install cocoapods`

### For Android Play Store
- [ ] Google Play Developer Account ($25 one-time) - [Sign up](https://play.google.com/console/signup)
- [ ] Android Studio installed
- [ ] JDK 17+ installed

## Quick Deployment Steps

### iOS App Store Deployment

1. **Open project in Xcode:**
   ```bash
   cd BirdrMobile/ios
   open BirdrMobile.xcworkspace
   ```

2. **Configure signing:**
   - Select project in navigator
   - Go to "Signing & Capabilities"
   - Select your Team (Apple Developer account)
   - Update Bundle Identifier if needed

3. **Update version:**
   - Version: `1.0.0`
   - Build: `1`

4. **Create archive:**
   - Select "Any iOS Device" (not simulator)
   - Product > Archive
   - Wait for build

5. **Distribute:**
   - Click "Distribute App"
   - Choose "App Store Connect"
   - Upload

6. **Submit in App Store Connect:**
   - Go to [appstoreconnect.apple.com](https://appstoreconnect.apple.com)
   - Create app listing
   - Add screenshots, description, etc.
   - Submit for review

### Android Play Store Deployment

1. **Generate keystore:**
   ```bash
   cd BirdrMobile/android/app
   keytool -genkeypair -v -storetype PKCS12 \
     -keystore jizz-release-key.keystore \
     -alias jizz-key-alias \
     -keyalg RSA -keysize 2048 -validity 10000
   ```

2. **Create keystore.properties:**
   ```bash
   cd BirdrMobile/android
   cat > keystore.properties << EOF
   storePassword=YOUR_STORE_PASSWORD
   keyPassword=YOUR_KEY_PASSWORD
   keyAlias=jizz-key-alias
   storeFile=jizz-release-key.keystore
   EOF
   ```

3. **Update build.gradle** (see full guide in `mobile/DEPLOYMENT.md`)

4. **Build release AAB:**
   ```bash
   cd BirdrMobile/android
   ./gradlew bundleRelease
   ```

5. **Upload to Play Console:**
   - Go to [play.google.com/console](https://play.google.com/console)
   - Create app
   - Upload AAB from: `BirdrMobile/android/app/build/outputs/bundle/release/app-release.aab`
   - Complete store listing
   - Submit for review

## Detailed Guide

For complete step-by-step instructions, see:
- **`mobile/DEPLOYMENT.md`** - Full deployment guide with all details

## Important Notes

1. **Keep your Android keystore safe!** You'll need it for all future updates.
2. **Test on real devices** before submitting
3. **App icons and screenshots** are required for both stores
4. **Privacy policy URL** is required for both stores
5. **Review times:** iOS (1-3 days), Android (1-3 days)

## Current App Configuration

Check these files before deploying:

- **iOS:** `BirdrMobile/ios/BirdrMobile/Info.plist`
- **Android:** `BirdrMobile/android/app/build.gradle`
- **App Name:** Currently "BirdrMobile" - update to "Jizz" or your preferred name
- **Package/Bundle ID:** Update to your unique identifier

## Need Help?

- See `mobile/DEPLOYMENT.md` for detailed instructions
- React Native docs: https://reactnative.dev/docs/signed-apk-android
- Apple docs: https://developer.apple.com/documentation/
- Google docs: https://developer.android.com/distribute

Good luck! 🚀

