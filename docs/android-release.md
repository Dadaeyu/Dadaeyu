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
