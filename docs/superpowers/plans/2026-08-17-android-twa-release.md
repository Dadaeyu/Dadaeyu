# Android TWA 출시 구현 계획

> **실행 방식:** 격리된 `codex/android-twa-release` worktree에서 순서대로 구현하고 각 단계의 검증을 통과한 뒤 다음 단계로 이동한다.

**목표:** `https://dadaeyu.vercel.app`을 여는 `kr.dadaeyu.app` TWA 프로젝트를 만들고, 비공개 업로드 키로 서명된 APK와 AAB를 생성한다.

**구조:** Next.js는 PWA와 Digital Asset Links를 담당하고 `android-twa/`는 Bubblewrap이 생성한 표준 Android 프로젝트를 담당한다. 서명 재료는 저장소 밖 `../private/android-signing/`에 보관하며 Git에는 구성과 검증 도구만 남긴다.

**도구:** Next.js 16, Node.js 테스트 러너, Bubblewrap CLI 1.24.1, Gradle/Android SDK 36, JDK 17, keytool/jarsigner.

---

## Task 1: 릴리스 계약 테스트 추가

**파일**

- 생성: `scripts/android/release-contract.mjs`
- 생성: `scripts/android/release-contract.test.mjs`
- 수정: `package.json`

**작업**

1. package name, host, version, SDK, fingerprint와 `assetlinks.json` 구조를 검사하는 실패 테스트를 먼저 작성한다.
2. `node --test scripts/android/release-contract.test.mjs`가 예상 이유로 실패하는지 확인한다.
3. 검증 유틸리티를 최소 구현한다.
4. `npm run test:android-release` 스크립트를 추가하고 테스트 통과를 확인한다.

## Task 2: 비밀정보와 산출물 경계 고정

**파일**

- 수정: `.gitignore`
- 생성: `android-twa/.gitignore`
- 생성: `docs/android-release.md`

**작업**

1. JKS/keystore, 로컬 속성, 빌드 디렉터리, APK/AAB, Android SDK/JDK 다운로드가 Git에 들어오지 않게 한다.
2. 저장소 밖 `/Users/ijehyeog/Desktop/workspace/project/dadaeyu/private/android-signing/`에 키와 비밀번호 파일을 둘 계약을 문서화한다.
3. `git check-ignore`와 `git status`로 비밀·산출물 제외를 확인한다.

## Task 3: Bubblewrap Android 프로젝트 생성

**파일**

- 생성: `android-twa/twa-manifest.json`
- 생성: `android-twa/app/**`
- 생성: `android-twa/gradle/**`
- 생성: `android-twa/build.gradle`, `android-twa/settings.gradle`, `android-twa/gradle.properties`, `android-twa/gradlew*`

**작업**

1. Bubblewrap CLI 1.24.1과 필요한 JDK 17/Android command-line tools를 준비한다.
2. 로컬에서 제공하는 현재 PWA 매니페스트를 입력으로 프로젝트를 생성한다.
3. 생성된 `twa-manifest.json`을 `dadaeyu.vercel.app`, `kr.dadaeyu.app`, `다대유`, `1.0.0`, `versionCode 1`로 고정한다.
4. Gradle의 `compileSdkVersion`과 `targetSdkVersion`을 36으로 보정한다.
5. 런처와 스플래시에 기존 PWA 아이콘을 사용한다.
6. 릴리스 계약 테스트로 package/host/SDK 값을 확인한다.

## Task 4: 업로드 키 생성과 Digital Asset Links 추가

**파일**

- 생성(비공개): `/Users/ijehyeog/Desktop/workspace/project/dadaeyu/private/android-signing/dadaeyu-upload.jks`
- 생성(비공개): `/Users/ijehyeog/Desktop/workspace/project/dadaeyu/private/android-signing/credentials.env`
- 생성: `public/.well-known/assetlinks.json`

**작업**

1. 강한 임의 비밀번호를 생성해 권한 `600`인 비공개 파일에 저장한다.
2. `keytool`로 `kr.dadaeyu.app` 업로드 키를 생성한다.
3. SHA-256 fingerprint를 추출한다.
4. package name과 로컬 APK fingerprint가 들어간 `assetlinks.json`을 작성한다.
5. JSON 파싱, fingerprint 형식, tracked secret 부재 테스트를 통과시킨다.

## Task 5: APK와 AAB 빌드

**파일**

- 생성(무시됨): `android-twa/app-release-signed.apk`
- 생성(무시됨): `android-twa/app-release-bundle.aab`

**작업**

1. 비공개 비밀번호를 환경 변수로만 주입해 Bubblewrap/Gradle release build를 실행한다.
2. API 36 SDK 또는 Gradle 호환 문제가 나오면 생성 프로젝트의 최소 설정만 보정한다.
3. APK/AAB가 생성되고 비어 있지 않은지 확인한다.
4. APK의 인증서 SHA-256이 `assetlinks.json`과 일치하는지 확인한다.
5. AAB 서명을 `jarsigner -verify`로 확인한다.

## Task 6: 전체 검증과 전달 준비

**파일**

- 수정: `docs/android-release.md`

**작업**

1. `npm test`, Android 릴리스 계약 테스트, lint, typecheck를 실행한다.
2. `git diff --check`와 `git status --short`로 결과를 검토한다.
3. 빌드 파일의 절대 경로, SHA-256 체크섬, 설치 방법을 문서화한다.
4. 현재 production의 필수 URL 상태를 다시 확인하고 404가 남아 있으면 APK가 Custom Tab으로 열릴 수 있음을 명시한다.
5. 실제 휴대폰이 USB 디버깅으로 연결되어 있고 `adb`가 있으면 설치한다. 그렇지 않으면 APK를 휴대폰으로 옮겨 설치할 수 있도록 전달한다.

## Task 7: 외부 운영 단계

이 단계는 로컬 빌드와 분리한다.

1. Vercel production이 어느 Git 브랜치를 추적하는지 확인한다.
2. 운영 반영 승인 뒤 최신 PWA·정책·assetlinks 경로를 배포한다.
3. 각 URL이 HTTPS `200`, 올바른 content type, 무리디렉션인지 확인한다.
4. Play Console에 앱을 만들고 첫 AAB 업로드 직전에 `kr.dadaeyu.app`을 마지막으로 확인한다.
5. Play App Signing의 SHA-256을 받아 `assetlinks.json`에 두 번째 fingerprint로 추가하고 재배포한다.
6. 내부 테스트에서 실제 Play 설치본의 전체 화면 TWA 검증을 완료한다.
