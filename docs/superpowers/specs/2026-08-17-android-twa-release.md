# 다대유 Android TWA 출시 설계

## 목표

현재 Vercel에서 운영하는 다대유 Next.js 웹앱을 다시 작성하지 않고 Android Trusted Web Activity(TWA)로 감싸 휴대폰 직접 설치용 APK와 Google Play 업로드용 AAB를 만든다. Android 앱 식별자는 `com.dadaeyou.app`을 사용하되, 첫 Play Console 업로드 전까지는 변경할 수 있는 값으로 취급한다.

## 확정 범위

- 운영 웹 주소: `https://dadaeyu.vercel.app`
- Android application ID: `com.dadaeyou.app`
- 앱 표시 이름: `다대유`
- 패키징 방식: Bubblewrap 기반 TWA
- 초기 버전: `versionCode 1`, `versionName 1.0.0`
- Android 대상: `compileSdk 36`, `targetSdk 36`
- 산출물: 서명된 `app-release-signed.apk`, Play 업로드용 `app-release-bundle.aab`
- 웹앱, API, 로그인, 지도, 서비스 워커는 기존 Vercel 배포를 그대로 사용한다.

## 구조

Android 프로젝트는 웹앱과 경계를 분명히 하기 위해 저장소의 `android-twa/` 아래에 둔다. 이 디렉터리는 Android 셸, Gradle 설정, TWA 매니페스트, 런처·스플래시 자원만 소유한다. Next.js 앱은 PWA 매니페스트, 서비스 워커, 오프라인 화면과 `/.well-known/assetlinks.json`을 소유한다.

앱 실행 흐름은 다음과 같다.

1. Android 런처가 `com.dadaeyou.app`을 연다.
2. TWA가 `https://dadaeyu.vercel.app/`을 요청한다.
3. 브라우저가 운영 주소의 Digital Asset Links와 앱 서명을 검증한다.
4. 검증이 성공하면 브라우저 주소창 없이 전체 화면으로 웹앱을 표시한다.
5. 검증이 실패하면 Custom Tab으로 열리므로 출시 차단 오류로 취급한다.

## 서명과 비밀정보

- 업로드 키 저장소와 비밀번호는 Git에 커밋하지 않는다.
- `*.jks`, `*.keystore`, 로컬 서명 속성, Android 빌드 결과물을 `.gitignore`로 제외한다.
- Bubblewrap이 사용하는 업로드 키는 사용자의 로컬 비공개 경로에 생성한다.
- 키 파일과 비밀번호는 분실하면 업데이트 배포가 어려워지므로 별도 백업이 필요하다.
- 직접 설치한 APK 검증에는 로컬 업로드 키 SHA-256을 사용한다.
- Play 설치본 검증에는 Play Console의 앱 서명 키 SHA-256을 사용한다.
- `assetlinks.json`은 로컬 APK와 Play 설치본을 모두 지원할 수 있도록 두 fingerprint를 함께 받을 수 있는 구조로 둔다.

## 운영 배포 의존성

2026-08-17 확인 시 현재 운영 주소는 홈만 `200`이고 `/manifest.webmanifest`, `/sw.js`, `/privacy`, `/account-deletion`은 `404`다. 현재 `dev`가 `main`보다 크게 앞서 있으므로 Android 패키징 작업이 임의로 `dev` 전체를 운영에 배포하지 않는다.

릴리스 가능한 전체 화면 TWA가 되려면 운영 주소에서 아래 경로가 모두 직접 `200`으로 응답해야 한다.

- `/manifest.webmanifest`
- `/sw.js`
- `/offline.html`
- `/privacy`
- `/account-deletion`
- `/.well-known/assetlinks.json`

Android 프로젝트와 APK/AAB는 격리된 브랜치에서 먼저 생성한다. Vercel production 반영은 별도의 외부 운영 변경으로 남겨 두고, 배포 권한과 대상 브랜치를 확인한 뒤 수행한다.

## API 36 보정

Bubblewrap 1.24.1의 현재 생성 템플릿은 `compileSdkVersion 36`이지만 `targetSdkVersion 35`일 수 있다. 2026-08-31부터 Google Play 신규 앱과 업데이트는 API 36 이상을 요구하므로 생성 직후 `targetSdkVersion 36`을 명시하고 빌드 산출물에서도 다시 확인한다.

## 검증 기준

- 기존 웹 테스트가 변경 전후 모두 통과한다.
- Android 프로젝트에서 application ID가 `com.dadaeyou.app`이다.
- `compileSdk`와 `targetSdk`가 모두 36이다.
- 키와 비밀번호가 Git 추적 파일에 포함되지 않는다.
- `assetlinks.json`이 올바른 package name과 SHA-256 fingerprint 형식을 가진다.
- APK 서명을 `apksigner` 또는 `keytool`로 확인한다.
- AAB 서명을 `jarsigner`로 확인한다.
- APK와 AAB가 실제 파일로 생성되고 크기가 0보다 크다.
- 운영 경로가 모두 HTTPS `200`이고 `assetlinks.json`에 리디렉션이 없다.
- 실제 Android 기기에서 전체 화면 실행, 로그인/OAuth, 위치 권한, 카카오 지도·외부 길찾기, 뒤로가기, 오프라인 안내를 확인한다.

## 완료와 보류 경계

로컬 완료는 Android 프로젝트, 비공개 업로드 키, fingerprint, APK, AAB 생성과 정적 검증까지다. 다음 항목은 로컬 패키징만으로 완료할 수 없으므로 별도 단계다.

- Vercel production 배포
- Play Console 앱 생성과 첫 AAB 업로드
- Play App Signing fingerprint를 `assetlinks.json`에 추가
- 내부 또는 비공개 테스트 배포
- 실제 휴대폰 설치 검증

첫 Play Console 업로드 뒤에는 package name을 변경할 수 없으며, 변경하려면 새 앱으로 다시 등록해야 한다.

## 공식 근거

- [Bubblewrap CLI](https://github.com/GoogleChromeLabs/bubblewrap/blob/main/packages/cli/README.md)
- [Trusted Web Activity 빠른 시작](https://developer.chrome.com/docs/android/trusted-web-activity/quick-start)
- [Digital Asset Links와 서명키 구분](https://developer.chrome.com/docs/android/trusted-web-activity/android-for-web-devs/)
- [Android 16 SDK 설정](https://developer.android.com/about/versions/16/setup-sdk)
- [Google Play 대상 API 요구사항](https://developer.android.com/google/play/requirements/target-sdk)
