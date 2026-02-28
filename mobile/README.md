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

## Generate native projects (Android + iOS)

To get full `android/` and `ios/` folders (use **Node 18+**):

```bash
nvm use 18   # or nvm use 20
npx expo prebuild
```

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

## Structure

- **Top bar:** Left = open main (left) drawer; center = title; right = open user menu.
- **Left drawer:** Home, New game, High scores, Country challenge, Updates, Help, Privacy, About Birdr + footer (data/media credits, contact).
- **Right user menu (modal):** Account, Login, Register, My Games, Profile, Review media, Logout.

Screens beyond Home are placeholders; wire them to your API and logic as in the web app.

## Assets

Add `icon.png`, `splash-icon.png`, and `adaptive-icon.png` under `assets/` (or replace after `expo prebuild`). See `assets/README.md`.
