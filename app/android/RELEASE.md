# Building for Google Play Store

**Alle geüploade bundels moeten worden ondertekend.** Zonder geldige `keystore.properties` faalt de release-build; zie onder voor ondertekenen.

## 1. Build the web app and sync (if using Capacitor)

From the **app** directory (parent of android/):

```bash
npm run build
npx cap sync android
```

(Requires Node 18+. If you can't run this, ensure `android/app/src/main/assets/` has your latest web build and `capacitor.config.json`.)

## 2. Create a release keystore (one-time)

Create a keystore for signing release builds. **Keep this file and the passwords safe** — you need them for every future update.

From the **android** directory:

```bash
keytool -genkey -v -keystore release.keystore -alias birdr -keyalg RSA -keysize 2048 -validity 10000
```

Use a strong password and remember the alias (e.g. `birdr`). Add `release.keystore` to `.gitignore` or keep it outside the repo; never commit it.

## 3. Configure signing

Copy the example and edit with your keystore details:

```bash
cp keystore.properties.example keystore.properties
```

Edit **keystore.properties**. `storeFile` is relative to the **android/** directory:

```properties
storeFile=release.keystore
storePassword=YOUR_STORE_PASSWORD
keyAlias=birdr
keyPassword=YOUR_KEY_PASSWORD
```

If you keep the keystore elsewhere, use a path relative to `android/`, e.g. `storeFile=../keys/release.keystore`.

## 4. Bump version (for each release)

Edit **app/build.gradle**:

- **versionCode**: integer, must increase for every Play Store upload (e.g. 1, 2, 3…).
- **versionName**: user-visible string (e.g. `"1.0"`, `"1.1"`).

## 5. Build the release bundle (AAB)

Google Play expects an **Android App Bundle** (.aab), not an APK:

```bash
cd android
./gradlew clean
./gradlew bundleRelease
```

Output:

- **android/app/build/outputs/bundle/release/app-release.aab**

## 6. Upload to Play Console

1. Open [Google Play Console](https://play.google.com/console).
2. Select your app (or create one).
3. Go to **Release** → **Production** (or **Testing**).
4. **Create new release** → upload **app-release.aab**.
5. Complete the release form and send for review.

## Optional: build a signed APK

If you need a signed APK (e.g. for sideloading or other stores):

```bash
./gradlew assembleRelease
```

Output: **android/app/build/outputs/apk/release/app-release.apk**

## Troubleshooting

- **Signing config errors**: Ensure `keystore.properties` exists and paths/passwords are correct. `storeFile` is relative to the `android/` directory.
- **Version code already used**: Increase `versionCode` in `app/build.gradle` for each new upload.
- **Node/Cap sync**: If you can't run `npx cap sync`, copy the web build into `android/app/src/main/assets/public/` and ensure `capacitor.config.json` is in `android/app/src/main/assets/`.
