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
git check-ignore android-sdk/cmdline-tools.zip
git check-ignore jdk/jdk-17.zip
git status --short
```

`git status --short` should show only intentional source changes. It must not show private signing files, generated Android build outputs, or local SDK/JDK downloads.
