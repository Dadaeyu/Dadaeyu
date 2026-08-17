# Android TWA Release Notes

## Signing Boundary

Android signing files are private local material and must stay outside this repository.

Use this directory for the upload key and password file:

```text
/Users/ijehyeog/Desktop/workspace/project/dadaeyu/private/android-signing/
```

Expected private files for later release tasks:

- `dadaeyu-upload.jks` - upload keystore for `kr.dadaeyu.app`
- `credentials.env` - local password variables used only by release commands

The checked-in Bubblewrap manifest uses the relative path
`../../private/android-signing/dadaeyu-upload.jks`, which resolves from
`Dadaeyou/android-twa/` in the normal checkout. An isolated Git worktree at a
different directory must pass the absolute private key path to the Bubblewrap
build command; it must not rewrite the tracked manifest with a user-specific
absolute path.

Back up the upload/update key and password offline outside Git. Losing the upload key or password can block future app updates, or require a Play upload key reset only when the app and account are eligible for that reset path. Backup copies must stay outside the repository and outside any Git-tracked directory.

Do not create real signing secrets in the repository. Do not commit keystores, password files, `local.properties`, Android SDK/JDK downloads, Gradle build directories, APKs, AABs, or APKS archives.

## Artifact Boundary

The `android-twa/` directory is the only repository location intended for the generated Trusted Web Activity Android project. Build outputs remain generated artifacts and are ignored:

- `android-twa/.gradle/`
- `android-twa/build/`
- `android-twa/app/build/`
- `android-twa/*.apk`
- `android-twa/*.aab`
- `android-twa/*.apks`

The signed direct-install APK and Play upload AAB are expected to be regenerated locally from the checked-in Android project and private signing directory. They are not source files.

## Current Release Artifacts

The locally generated `1.0.0` release is stored outside Git:

- Installable APK: `/Users/ijehyeog/Desktop/workspace/project/dadaeyu/private/android-release/dadaeyu-1.0.0-release.apk`
- Play upload AAB: `/Users/ijehyeog/Desktop/workspace/project/dadaeyu/private/android-release/dadaeyu-1.0.0-release.aab`
- Checksum file: `/Users/ijehyeog/Desktop/workspace/project/dadaeyu/private/android-release/checksums.sha256`

Current SHA-256 checksums:

```text
b0b8f81e433544db7e56fec6997e2ff11804e0915c7d73f7a6c9531f6307fe24  dadaeyu-1.0.0-release.apk
0978fad5840b2558e1a4b5d41980451dc15b084dac1f83a29db99909b0805a4c  dadaeyu-1.0.0-release.aab
```

Both artifacts are signed by the upload certificate whose SHA-256 fingerprint is:

```text
8A:E2:7B:BB:05:05:25:AB:A6:60:85:75:9F:E4:08:D1:C4:E1:E7:7A:7B:9C:DE:B1:46:0E:73:9E:E1:0C:0B:0C
```

The APK contains package `kr.dadaeyu.app`, `versionCode 1`, `versionName 1.0.0`, `compileSdk 36`, and `targetSdk 36`. Its only app-requested runtime capabilities are fine/coarse location for location delegation; notification permission is not included.

## Install The APK

With a USB-debugging-enabled Android device connected:

```sh
/Users/ijehyeog/Library/Android/sdk/platform-tools/adb install -r /Users/ijehyeog/Desktop/workspace/project/dadaeyu/private/android-release/dadaeyu-1.0.0-release.apk
```

Alternatively, transfer the APK to the phone, open it, and temporarily allow that file app to install unknown apps. The AAB cannot be installed directly; upload it to Play Console for internal testing or production distribution.

No authorized Android device was connected during this build, so automatic installation was not performed.

## Production Web Prerequisite

On 2026-08-17, the production home returned `200`, but the following paths returned `404`:

- `/manifest.webmanifest`
- `/sw.js`
- `/offline.html`
- `/privacy`
- `/account-deletion`
- `/.well-known/assetlinks.json`

The APK is installable now, but Chrome cannot verify the TWA association until the current web app and `assetlinks.json` are deployed. Before that deployment the app can open as a Custom Tab with browser UI instead of a verified full-screen TWA. Play submission should wait until these routes return the intended files over HTTPS.

## Verification Contract

Before release work continues, verify the boundary with Git rather than source-only checks:

```sh
git check-ignore android-twa/dadaeyu-upload.jks
git check-ignore android-twa/local.properties
git check-ignore android-twa/app/build/outputs/apk/release/app-release.apk
git check-ignore android-twa/app-release-bundle.aab
git check-ignore android-twa/commandlinetools-mac-11076708_latest.zip
git check-ignore android-twa/jdk-17_macos-aarch64_bin.tar.gz
git check-ignore android-twa/openjdk-17.0.10_macos-aarch64_bin.tar.gz
git check-ignore android-sdk/cmdline-tools.zip
git check-ignore commandlinetools-mac-11076708_latest.zip
git check-ignore android-commandlinetools-mac.zip
git check-ignore jdk/jdk-17.zip
git check-ignore jdk-17_macos-aarch64_bin.tar.gz
git check-ignore openjdk-17.0.10_macos-aarch64_bin.tar.gz
git check-ignore private/android-signing/anything.txt
git status --short
```

`git status --short` should show only intentional source changes. It must not show private signing files, generated Android build outputs, or local SDK/JDK downloads.
