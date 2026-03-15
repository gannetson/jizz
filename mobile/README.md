# Birdr Mobile

React Native (Expo) app for Birdr, with the same structure as the web app in `/app`: home page, top bar with left drawer (main menu) and right user menu.

**Expo SDK 53** (React 19, React Native 0.79). Use **Node 22+** for install and builds.

## Setup

Requires **Node 22+**.

```bash
cd mobile
npm install
```

## Run

- **Development:** `npm start` then press `i` for iOS or `a` for Android in the terminal, or scan the QR code with Expo Go.
- **Android:** `npm run android` (generates native project if needed). **Requires Node 18+ on PATH** (Gradle uses it for autolinking). If your default `node` is older, run `nvm use 22` first, or use `./scripts/run-android.sh`.
- **iOS:** `npm run ios` (requires Mac and Xcode).

### iOS device (iPad / iPhone)

To run on a **physical device** (e.g. connected iPad):

1. **Start Metro first** (in one terminal):
   ```bash
   cd mobile && nvm use 22 && npm start
   ```
2. **iPad and Mac on the same Wi‑Fi** so the app can load the JS bundle from Metro.
3. In another terminal, build and run on the device:
   ```bash
   cd mobile && nvm use 22 && npx expo run:ios --device "iPad van Loek"
   ```
   Use your device name (e.g. from Xcode → Window → Devices) or leave off `"iPad van Loek"` to pick from a list.
4. **Trust the developer** on the device: Settings → General → VPN & Device Management → tap your developer profile → Trust.

**“No bundle URL present”:** The app loads JavaScript from Metro on your Mac. Ensure Metro is running (`npm start`) and the device is on the same network; the app uses your Mac’s IP (embedded at build time) to connect to `http://<mac-ip>:8081`.

## Generate native projects (Android + iOS)

To get full `android/` and `ios/` folders (use **Node 22+**):

```bash
nvm use 22
npx expo prebuild
```

This also copies the app icon from `assets/icon.png` into the native projects (iOS AppIcon and Android adaptive icon). If you change the icon, run `npx expo prebuild` again so both platforms use it.

Then build a **debug APK for your phone**:

Use **Node 22+** in the same terminal (Gradle runs `node` for autolinking; older Node causes build failures). If the build fails with "Process 'command 'node'' finished with non-zero exit value 1", the Gradle daemon was started with an older Node—run `./gradlew --stop` in `android/` then retry, or use `./run-with-node22.sh` (see Android UI tests below).

```bash
nvm use 22   # must be run in this shell before the next command
npm run build:android:debug
```

The debug APK is written to:

**`android/app/build/outputs/apk/debug/app-debug.apk`**

Copy it to your Android device (e.g. via USB, cloud, or email) and open it to install. You may need to allow “Install from unknown sources” for the app or file manager you use.

**“Unable to load script”:** The debug APK is built with the JS bundle **included**, so it runs without a dev server. If you see that error, reinstall the APK from the path above (after running `npm run build:android:debug` again). If you prefer to load from Metro instead, connect the phone via USB, run `adb reverse tcp:8081 tcp:8081`, start Metro with `npm start`, then open the app.

## Android UI tests (Espresso)

Automated UI tests for the Country challenge flow (tap → assert screen/modal changes). Run them with an **emulator or device** connected and **Node 22+** (Gradle runs Node for the React Native build). If you see "Process 'command 'node'' finished with non-zero exit value 1", the Gradle daemon was started with an older Node—use one of:

```bash
cd mobile/android

# Option A: Stop daemon, then run (daemon restarts with current Node)
./gradlew --stop
./gradlew connectedDebugAndroidTest

# Option B: Wrapper (uses Node 22 and avoids daemon PATH issues)
./run-with-node22.sh connectedDebugAndroidTest
```

Or from repo root:

```bash
cd mobile && (cd android && ./run-with-node22.sh connectedDebugAndroidTest)
```

Tests live in `mobile/android/app/src/androidTest/kotlin/pro/birdr/app/CountryChallengeFlowTest.kt`. They launch the app, go to Country challenge from Home, open/close country and language modals, and (in a second test) fill the form, tap “Start challenge”, and assert that the next state (level intro or play screen) appears. **Test 2 calls the real “Start challenge” API**; use a running backend (e.g. staging) or a test build variant with a test API URL if you need a controlled environment.

- **CI:** Add a job that starts an Android emulator (e.g. `system-images;android-34;google_apis;x86_64`), runs `./gradlew connectedDebugAndroidTest`, and fails the build if any test fails.
- **Firebase Test Lab:** Build the debug APK and test APK, then run `gcloud firebase test android run` with the APKs to run the same tests on multiple devices/API levels.

## Android release / AAB (testing & Play Store)

Use **Node 22+** in the same terminal as for debug.

### Testing: release APK or AAB (signed with debug keystore)

Right now release is signed with the **debug keystore**, so you can build without creating a release key:

- **Release APK** (single file, good for sideload / testing):
  ```bash
  npm run build:android:release
  ```
  Output: `android/app/build/outputs/apk/release/app-release.apk`

- **Release AAB** (Android App Bundle, required for Play Store upload, smaller downloads):
  ```bash
  npm run build:android:aab
  ```
  Output: `android/app/build/outputs/bundle/release/app-release.aab`

You can upload the AAB to Play Console (Internal testing track or Production). For **internal testing** you can also use the release APK and share it directly.

### Production: sign with your own keystore

For **production** you must sign release builds with your own keystore:

1. **Create a keystore** (once):
   ```bash
   keytool -genkeypair -v -storetype PKCS12 -keystore android/app/my-release-key.keystore -alias my-key-alias -keyalg RSA -keysize 2048 -validity 10000
   ```
   Store the keystore file and passwords safely (e.g. in a secrets manager). **Do not commit the keystore to git.**

2. **Configure release signing** in `android/app/build.gradle`:
   - Add a `release` block under `signingConfigs` that points to your keystore and use env vars or `gradle.properties` (not committed) for passwords.
   - In `buildTypes.release`, set `signingConfig signingConfigs.release`.

   Example using `gradle.properties` (add `android/app/my-release-key.keystore` to `.gitignore` and keep passwords out of version control):

   ```groovy
   signingConfigs {
       release {
           storeFile file('my-release-key.keystore')
           storePassword System.getenv("KEYSTORE_PASSWORD") ?: findProperty('MYAPP_RELEASE_STORE_PASSWORD')
           keyAlias System.getenv("KEY_ALIAS") ?: findProperty('MYAPP_RELEASE_KEY_ALIAS')
           keyPassword System.getenv("KEY_PASSWORD") ?: findProperty('MYAPP_RELEASE_KEY_PASSWORD')
       }
   }
   ```

   Then run the same commands:
   - `npm run build:android:release` → APK for testing or direct distribution.
   - `npm run build:android:aab` → AAB for Play Store.

### EAS Build: use keystore from `android/app/`

Release builds via EAS are configured to use the **local** keystore at `android/app/upload-keystore.jks` (see `android/app/keystore.properties` for alias and passwords). `eas.json` has `credentialsSource: "local"` for Android, and `credentials.json` in the project root points to that keystore.

- **`npm run build:android`** and **`npm run build:android:push`** use **`eas build --platform android --profile production --local`** so the build runs on your machine and can read `credentials.json` and `android/app/upload-keystore.jks`. Then **`npm run push:android`** submits the latest build to the Play Store.

- **EAS cloud builds:** `credentials.json` and `*.jks` are in `.gitignore`, so they are not uploaded. Either use the local scripts above, or upload the keystore once with **`eas credentials --platform android`** (choose “Use existing keystore”, upload `android/app/upload-keystore.jks`, use passwords from `keystore.properties`). After that you can use **`npm run build:android:cloud`** for cloud builds with remote credentials.

### Google Play: 16 KB page size support

Google Play requires apps targeting Android 15+ to support 16 KB memory page sizes. This project uses **Expo SDK 53** with **React Native 0.79** and **NDK 28**, so native libs are built with 16 KB alignment. **`useLegacyPackaging false`** in `android/app/build.gradle` keeps that alignment in the AAB.

### Useful commands

- **SHA-1 (e.g. for Google Sign-In / Firebase):** `npm run print-sha1` (use the SHA-1 from the release variant when you use a release keystore).

## Google Sign-In (DEVELOPER_ERROR on Android)

If you see **DEVELOPER_ERROR** when signing in with Google on Android:

1. **Package name in Google Console must be** `pro.birdr.app` (not `pro.birdr.mobile`).
2. Add the **SHA-1** of the keystore that signs your build to the Android OAuth client:
   ```bash
   npm run print-sha1
   ```
   Copy the SHA-1 for the variant you use (e.g. `debug`), then in [Google Cloud Console](https://console.cloud.google.com/) → APIs & Services → Credentials → your **Android** OAuth client, add that fingerprint.
3. Rebuild the app after changing credentials.

Full steps: see **`GOOGLE_CONSOLE_SETUP.md`**.

## Opening game links in the app (QR code / share link)

When someone scans the lobby QR code or taps a shared game link (`https://birdr.pro/join/<game_token>`), the link should open in the Birdr app instead of the browser.

**What’s already in place**

- **App:** Custom scheme `birdr://` and (on Android) an App Link intent for `https://birdr.pro/join/`. `DeepLinkHandler` loads the game and navigates to Lobby.
- **Server:** `GET /join/<token>/` redirects to `birdr://join/<token>`, so opening the HTTPS link in a browser sends the user into the app. The same backend serves `.well-known/apple-app-site-association` (iOS) and `.well-known/assetlinks.json` (Android) for verified App Links.

**To get “Open in app” without a disambiguation dialog**

1. **iOS (Universal Links)**  
   In `jizz/urls.py`, in `apple_app_site_association`, replace `TEAM_ID` with your Apple Team ID (e.g. `ABC123XYZ`). The bundle ID must stay `pro.birdr.app` (it matches `app.json`).

2. **Android (App Links)**  
   In `jizz/urls.py`, in `android_asset_links`, replace `SHA256_FINGERPRINT_PLACEHOLDER` with the SHA-256 fingerprint of the certificate that signs your app (colon-separated). Get it with:
   ```bash
   keytool -list -v -keystore your.keystore -alias youralias
   ```
   Use the same signing key you use for Play Store builds. The `package_name` is already `pro.birdr.app`.

After deploying the updated `.well-known` files, install the app and tap `https://birdr.pro/join/<token>` (e.g. from Notes or Messages). If verification succeeds, the link should open directly in the app. If not, the server redirect still sends `birdr://join/<token>`, so the system may show “Open in Birdr?” once.

## Structure

- **Top bar:** Left = open main (left) drawer; center = title; right = open user menu.
- **Left drawer:** Home, New game, High scores, Country challenge, Updates, Help, Privacy, About Birdr + footer (data/media credits, contact).
- **Right user menu (modal):** Account, Login, Register, My Games, Profile, Review media, Logout.

Screens beyond Home are placeholders; wire them to your API and logic as in the web app.

## Assets

Add `icon.png`, `splash-icon.png`, and `adaptive-icon.png` under `assets/` (or replace after `expo prebuild`). See `assets/README.md`.
