# Android TWA Release Notes

## Signing Boundary

Android signing files are private local material and must stay outside this repository.

Use this directory for the upload key and password file:

```text
/Users/ijehyeog/Desktop/workspace/project/dadaeyu/private/android-signing/
```

Expected private files for later release tasks:

- `dadaeyu-upload.jks` - upload keystore for `com.dadaeyou.app`
- `credentials.env` - local password variables used only by release commands

The checked-in Bubblewrap manifest uses the relative path
`../../private/android-signing/dadaeyu-upload.jks`, which resolves from
`Dadaeyou/android-twa/` to the repository sibling directory
`dadaeyu/private/android-signing/dadaeyu-upload.jks` in the normal checkout.
The two `..` segments are intentional: one leaves `android-twa/`, and the other
leaves `Dadaeyou/`. An isolated Git worktree at a different directory must pass
the absolute private key path to the Bubblewrap build command; it must not
rewrite the tracked manifest with a user-specific absolute path.

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
- `android-twa/*.idsig`

The signed direct-install APK and Play upload AAB are expected to be regenerated locally from the checked-in Android project and private signing directory. They are not source files.
The local `private/android-release/` path is also ignored defensively if a
checkout is ever created directly above that directory.

## Current Release Artifacts

The locally generated `1.0.0` release is stored outside Git:

- Installable APK: `/Users/ijehyeog/Desktop/workspace/project/dadaeyu/private/android-release/dadaeyu-1.0.0-com.dadaeyou.app-release.apk`
- Play upload AAB: `/Users/ijehyeog/Desktop/workspace/project/dadaeyu/private/android-release/dadaeyu-1.0.0-com.dadaeyou.app-release.aab`
- Checksum file: `/Users/ijehyeog/Desktop/workspace/project/dadaeyu/private/android-release/checksums-com.dadaeyou.app.sha256`

Older `kr.dadaeyu.app` artifacts remain archived in the same private directory. Do not upload those older files to the Play Console for this application.

Current SHA-256 checksums:

```text
9b24055bca44bacdfbb0ddc162da42c182d3c8e763b921ba380e402dc9c8b86d  dadaeyu-1.0.0-com.dadaeyou.app-release.aab
d55e675c4da5b36b8cb2372b86d316d1ef7e9d6bf7c8eb10221ef3f45ab083dd  dadaeyu-1.0.0-com.dadaeyou.app-release.apk
```

Both artifacts are signed by the upload certificate whose SHA-256 fingerprint is:

```text
8A:E2:7B:BB:05:05:25:AB:A6:60:85:75:9F:E4:08:D1:C4:E1:E7:7A:7B:9C:DE:B1:46:0E:73:9E:E1:0C:0B:0C
```

The APK contains package `com.dadaeyou.app`, `versionCode 1`, `versionName 1.0.0`, `compileSdk 36`, and `targetSdk 36`. Its only app-requested runtime capabilities are fine/coarse location for location delegation; notification permission is not included.

## Install The APK

With a USB-debugging-enabled Android device connected:

```sh
/Users/ijehyeog/Library/Android/sdk/platform-tools/adb install -r /Users/ijehyeog/Desktop/workspace/project/dadaeyu/private/android-release/dadaeyu-1.0.0-com.dadaeyou.app-release.apk
```

Alternatively, transfer the APK to the phone, open it, and temporarily allow that file app to install unknown apps. The AAB cannot be installed directly; upload it to Play Console for internal testing or production distribution.

No authorized Android device was connected during this build, so automatic installation was not performed.

## Production Web Prerequisite

The package-ID change updates `public/.well-known/assetlinks.json` to
`com.dadaeyou.app`. Deploy this source change before testing the new APK and
confirm that `/`, `/manifest.webmanifest`, `/sw.js`, `/offline.html`,
`/privacy`, `/account-deletion`, and `/.well-known/assetlinks.json` return the
intended content over HTTPS without redirects.

The upload-key fingerprint currently authorizes the directly installed APK.
After the AAB is uploaded, also add the Play App Signing SHA-256 fingerprint to
the same `sha256_cert_fingerprints` array and deploy again. Until the relevant
fingerprint and package ID are live, the app can fall back to a Custom Tab with
browser UI instead of a verified full-screen TWA.

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
git check-ignore private/android-release/checksums.sha256
git status --short
```

`git status --short` should show only intentional source changes. It must not show private signing files, generated Android build outputs, or local SDK/JDK downloads.
