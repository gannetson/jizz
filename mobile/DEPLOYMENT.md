# Deployment Guide: iOS App Store & Google Play Store

This guide will walk you through deploying your React Native app to both app stores.

## Prerequisites

### For iOS (App Store)
- **Apple Developer Account** ($99/year) - [Sign up here](https://developer.apple.com/programs/)
- **Mac with Xcode** installed (latest version recommended)
- **CocoaPods** installed (`sudo gem install cocoapods`)
- **App Store Connect** access

### For Android (Play Store)
- **Google Play Developer Account** ($25 one-time fee) - [Sign up here](https://play.google.com/console/signup)
- **Android Studio** installed
- **Java Development Kit (JDK)** 17 or higher
- **Keystore file** for signing your app

---

## Part 1: Prepare Your App for Production

### 1.1 Update App Configuration

#### iOS Configuration (`mobile/ios/YourApp/Info.plist`)
- Update `CFBundleDisplayName` (app name shown on home screen)
- Update `CFBundleShortVersionString` (version number, e.g., "1.0.0")
- Update `CFBundleVersion` (build number, e.g., "1")
- Add app icons and launch screens
- Configure app permissions (camera, location, etc. if needed)

#### Android Configuration (`mobile/android/app/build.gradle`)
```gradle
android {
    defaultConfig {
        applicationId "com.yourcompany.jizz"  // Change to your package name
        versionCode 1                         // Increment for each release
        versionName "1.0.0"                   // User-facing version
        minSdkVersion 21
        targetSdkVersion 34
    }
}
```

### 1.2 Update App Icons and Splash Screens

#### iOS Icons
- Place icons in `mobile/ios/YourApp/Images.xcassets/AppIcon.appiconset/`
- Required sizes: 1024x1024 (App Store), 180x180, 120x120, 87x87, 80x80, 76x76, 60x60, 58x58, 40x40, 29x29, 20x20

#### Android Icons
- Place icons in `mobile/android/app/src/main/res/mipmap-*/ic_launcher.png`
- Required sizes: 192x192 (mdpi), 144x144 (hdpi), 96x96 (xhdpi), 72x72 (xxhdpi), 48x48 (xxxhdpi)

### 1.3 Environment Configuration

Update your API endpoints in `mobile/src/config/api.ts`:
```typescript
export const API_BASE_URL = __DEV__ 
  ? 'http://localhost:8000'  // Development
  : 'https://your-production-api.com';  // Production
```

### 1.4 Test Your App Thoroughly
- Test on real devices (both iOS and Android)
- Test all features and flows
- Test on different screen sizes
- Test with slow network connections
- Test offline functionality (if applicable)

---

## Part 2: Deploy to iOS App Store

### 2.1 Configure Xcode Project

1. **Open the project in Xcode:**
   ```bash
   cd mobile/ios
   open YourApp.xcworkspace  # Use .xcworkspace, not .xcodeproj
   ```

2. **Set up Signing & Capabilities:**
   - Select your project in the navigator
   - Go to "Signing & Capabilities" tab
   - Select your Team (Apple Developer account)
   - Xcode will automatically create provisioning profiles

3. **Update Bundle Identifier:**
   - Change from `com.yourcompany.YourApp` to your unique identifier
   - Format: `com.yourcompany.jizz` (must be unique)

4. **Update Version and Build:**
   - Version: `1.0.0` (user-facing)
   - Build: `1` (increment for each submission)

### 2.2 Create App Store Listing

1. **Go to App Store Connect:**
   - Visit [appstoreconnect.apple.com](https://appstoreconnect.apple.com)
   - Sign in with your Apple Developer account

2. **Create New App:**
   - Click "+" button
   - Fill in:
     - Platform: iOS
     - Name: "Jizz" (or your app name)
     - Primary Language
     - Bundle ID: (select the one you created)
     - SKU: (unique identifier, e.g., "jizz-001")
     - User Access: Full Access

### 2.3 Build Archive

1. **Select "Any iOS Device" or your connected device** (not simulator)

2. **Product > Archive:**
   - Wait for build to complete
   - Archive will appear in Organizer window

3. **Distribute App:**
   - Click "Distribute App"
   - Choose "App Store Connect"
   - Choose "Upload"
   - Select your distribution certificate
   - Click "Upload"

### 2.4 Submit for Review

1. **In App Store Connect:**
   - Go to your app
   - Click "+ Version or Platform"
   - Fill in:
     - Screenshots (required for all device sizes)
     - Description
     - Keywords
     - Support URL
     - Marketing URL (optional)
     - Privacy Policy URL (required)
     - Category
     - Age Rating
     - Pricing

2. **Add Build:**
   - Wait for processing (can take 10-30 minutes)
   - Select your uploaded build

3. **Submit for Review:**
   - Answer export compliance questions
   - Add contact information
   - Click "Submit for Review"

### 2.5 App Store Assets Needed

- **Screenshots:**
  - iPhone 6.7" (1290 x 2796 pixels) - Required
  - iPhone 6.5" (1242 x 2688 pixels) - Required
  - iPhone 5.5" (1242 x 2208 pixels) - Optional
  - iPad Pro 12.9" (2048 x 2732 pixels) - If supporting iPad

- **App Icon:** 1024 x 1024 pixels (no transparency, no rounded corners)

- **Description:** Up to 4000 characters

- **Keywords:** Up to 100 characters (comma-separated)

- **Privacy Policy URL:** Required

---

## Part 3: Deploy to Google Play Store

### 3.1 Generate Signing Keystore

**IMPORTANT:** Keep this keystore file safe! You'll need it for all future updates.

```bash
cd mobile/android/app
keytool -genkeypair -v -storetype PKCS12 -keystore jizz-release-key.keystore -alias jizz-key-alias -keyalg RSA -keysize 2048 -validity 10000
```

You'll be prompted for:
- Password (remember this!)
- Your name, organization, city, state, country code

**Store the keystore securely:**
- Don't commit it to git
- Back it up in a secure location
- You'll need it for every app update

### 3.2 Configure Gradle for Signing

1. **Create `mobile/android/keystore.properties`:**
   ```properties
   storePassword=your-keystore-password
   keyPassword=your-key-password
   keyAlias=jizz-key-alias
   storeFile=jizz-release-key.keystore
   ```

2. **Add to `.gitignore`:**
   ```
   mobile/android/keystore.properties
   mobile/android/app/jizz-release-key.keystore
   ```

3. **Update `mobile/android/app/build.gradle`:**
   ```gradle
   // Add at the top
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
               signingConfig signingConfigs.release
               // ... rest of config
           }
       }
   }
   ```

### 3.3 Build Release APK/AAB

**Option A: Build APK (for testing)**
```bash
cd mobile/android
./gradlew assembleRelease
```
Output: `mobile/android/app/build/outputs/apk/release/app-release.apk`

**Option B: Build AAB (for Play Store - RECOMMENDED)**
```bash
cd mobile/android
./gradlew bundleRelease
```
Output: `mobile/android/app/build/outputs/bundle/release/app-release.aab`

### 3.4 Create Play Store Listing

1. **Go to Google Play Console:**
   - Visit [play.google.com/console](https://play.google.com/console)
   - Sign in with your Google account

2. **Create New App:**
   - Click "Create app"
   - Fill in:
     - App name: "Jizz"
     - Default language
     - App or game: App
     - Free or paid: Free/Paid
     - Declarations (check all that apply)

### 3.5 Set Up Store Listing

1. **Main store listing:**
   - App name (50 characters)
   - Short description (80 characters)
   - Full description (4000 characters)
   - App icon (512 x 512 pixels)
   - Feature graphic (1024 x 500 pixels)
   - Screenshots:
     - Phone: At least 2, up to 8 (16:9 or 9:16)
     - Tablet: At least 1 (optional)
   - Category
   - Contact details
   - Privacy Policy URL (required)

2. **Content rating:**
   - Complete questionnaire
   - Get rating certificate

3. **Pricing & distribution:**
   - Select countries
   - Set price (if paid)

### 3.6 Upload and Publish

1. **Create Release:**
   - Go to "Production" > "Create new release"
   - Upload your `.aab` file
   - Add release notes
   - Review and roll out

2. **Complete Store Listing:**
   - Ensure all required fields are filled
   - Upload all required assets

3. **Submit for Review:**
   - Click "Submit for review"
   - Review typically takes 1-3 days

### 3.7 Play Store Assets Needed

- **App Icon:** 512 x 512 pixels (PNG, 32-bit)
- **Feature Graphic:** 1024 x 500 pixels (JPG or PNG)
- **Screenshots:**
  - Phone: 16:9 or 9:16 aspect ratio
  - Minimum 2, maximum 8
  - At least 320px on the short side, max 3840px on the long side
- **Short Description:** 80 characters max
- **Full Description:** 4000 characters max
- **Privacy Policy URL:** Required

---

## Part 4: Post-Deployment

### 4.1 Monitor Your App

- **App Store Connect:** Monitor downloads, ratings, reviews
- **Google Play Console:** Monitor installs, crashes, ANRs (App Not Responding)
- **Analytics:** Set up Firebase Analytics or similar

### 4.2 Update Your App

For future updates:

**iOS:**
1. Increment build number in Xcode
2. Create new archive
3. Upload to App Store Connect
4. Submit new version

**Android:**
1. Increment `versionCode` in `build.gradle`
2. Update `versionName`
3. Build new AAB
4. Upload to Play Console
5. Create new release

### 4.3 Version Numbering

Follow semantic versioning: `MAJOR.MINOR.PATCH`

- **MAJOR:** Breaking changes
- **MINOR:** New features (backward compatible)
- **PATCH:** Bug fixes

Example: `1.0.0` → `1.0.1` (bug fix) → `1.1.0` (new feature) → `2.0.0` (breaking change)

---

## Troubleshooting

### iOS Issues

**"No signing certificate found"**
- Ensure you're logged into Xcode with your Apple ID
- Go to Xcode > Settings > Accounts
- Add your Apple Developer account

**"Bundle identifier already exists"**
- Change your bundle identifier to something unique
- Format: `com.yourcompany.appname`

**Archive fails**
- Clean build folder: Product > Clean Build Folder
- Delete derived data
- Try again

### Android Issues

**"Keystore file not found"**
- Ensure `keystore.properties` path is correct
- Use relative path from `android/` directory

**"Gradle build failed"**
- Check Java version: `java -version` (should be 17+)
- Update `gradle/wrapper/gradle-wrapper.properties` if needed
- Clean: `./gradlew clean`

**"App not installing on device"**
- Check if device allows installation from unknown sources (for APK)
- Ensure minSdkVersion is compatible with device

---

## Quick Reference Commands

### iOS
```bash
# Install pods
cd mobile/ios && pod install && cd ../..

# Run on iOS
cd mobile && npm run ios

# Build for device
# Use Xcode: Product > Archive
```

### Android
```bash
# Build release APK
cd mobile/android && ./gradlew assembleRelease

# Build release AAB (for Play Store)
cd mobile/android && ./gradlew bundleRelease

# Run on Android
cd mobile && npm run android
```

---

## Additional Resources

- [React Native Deployment Docs](https://reactnative.dev/docs/signed-apk-android)
- [Apple App Store Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)
- [Google Play Policy](https://play.google.com/about/developer-content-policy/)
- [App Store Connect Help](https://help.apple.com/app-store-connect/)
- [Play Console Help](https://support.google.com/googleplay/android-developer)

---

## Checklist Before Submission

### iOS
- [ ] App tested on real device
- [ ] All features working
- [ ] App icons and launch screens added
- [ ] Bundle identifier is unique
- [ ] Version and build numbers set
- [ ] App Store listing complete
- [ ] Screenshots uploaded
- [ ] Privacy policy URL added
- [ ] App signed with distribution certificate
- [ ] Archive uploaded successfully

### Android
- [ ] App tested on real device
- [ ] All features working
- [ ] App icons added
- [ ] Keystore generated and secured
- [ ] Version code and name set
- [ ] Release AAB built
- [ ] Play Store listing complete
- [ ] Screenshots uploaded
- [ ] Privacy policy URL added
- [ ] Content rating completed
- [ ] AAB uploaded successfully

---

Good luck with your deployment! 🚀

