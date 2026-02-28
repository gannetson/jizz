# Birdr Mobile

React Native (Expo) app for Birdr, with the same structure as the web app in `/app`: home page, top bar with left drawer (main menu) and right user menu.

## Setup

Requires **Node 18+** (recommend 20 LTS).

```bash
cd mobile
npm install
```

## Run

- **Development:** `npm start` then press `i` for iOS or `a` for Android in the terminal, or scan the QR code with Expo Go.
- **Android:** `npm run android` (generates native project if needed).
- **iOS:** `npm run ios` (requires Mac and Xcode).

### iOS device (iPad / iPhone)

To run on a **physical device** (e.g. connected iPad):

1. **Start Metro first** (in one terminal):
   ```bash
   cd mobile && nvm use 20 && npm start
   ```
2. **iPad and Mac on the same Wi‑Fi** so the app can load the JS bundle from Metro.
3. In another terminal, build and run on the device:
   ```bash
   cd mobile && nvm use 20 && npx expo run:ios --device "iPad van Loek"
   ```
   Use your device name (e.g. from Xcode → Window → Devices) or leave off `"iPad van Loek"` to pick from a list.
4. **Trust the developer** on the device: Settings → General → VPN & Device Management → tap your developer profile → Trust.

**“No bundle URL present”:** The app loads JavaScript from Metro on your Mac. Ensure Metro is running (`npm start`) and the device is on the same network; the app uses your Mac’s IP (embedded at build time) to connect to `http://<mac-ip>:8081`.

## Generate native projects (Android + iOS)

To get full `android/` and `ios/` folders (use **Node 18+**):

```bash
nvm use 18   # or nvm use 20
npx expo prebuild
```

This also copies the app icon from `assets/icon.png` into the native projects (iOS AppIcon and Android adaptive icon). If you change the icon, run `npx expo prebuild` again so both platforms use it.

Then build a **debug APK for your phone**:

Use **Node 18+** in the same terminal (Gradle runs `node` for autolinking; older Node causes build failures):

```bash
nvm use 18   # or nvm use 20 — must be run in this shell before the next command
npm run build:android:debug
```

The debug APK is written to:

**`android/app/build/outputs/apk/debug/app-debug.apk`**

Copy it to your Android device (e.g. via USB, cloud, or email) and open it to install. You may need to allow “Install from unknown sources” for the app or file manager you use.

**“Unable to load script”:** The debug APK is built with the JS bundle **included**, so it runs without a dev server. If you see that error, reinstall the APK from the path above (after running `npm run build:android:debug` again). If you prefer to load from Metro instead, connect the phone via USB, run `adb reverse tcp:8081 tcp:8081`, start Metro with `npm start`, then open the app.

## Android release / AAB (testing & Play Store)

Use **Node 18+** in the same terminal as for debug.

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

### Useful commands

- **SHA-1 (e.g. for Google Sign-In / Firebase):** `npm run print-sha1` (use the SHA-1 from the release variant when you use a release keystore).

## Structure

- **Top bar:** Left = open main (left) drawer; center = title; right = open user menu.
- **Left drawer:** Home, New game, High scores, Country challenge, Updates, Help, Privacy, About Birdr + footer (data/media credits, contact).
- **Right user menu (modal):** Account, Login, Register, My Games, Profile, Review media, Logout.

Screens beyond Home are placeholders; wire them to your API and logic as in the web app.

## Assets

Add `icon.png`, `splash-icon.png`, and `adaptive-icon.png` under `assets/` (or replace after `expo prebuild`). See `assets/README.md`.
