# 프로젝트 파일 정리

대전 무장애 여행 가이드 서비스 **다대유**. Next.js App Router 기반 프로젝트입니다.

---

## 전체 구조 요약

```
Dadaeyu/
├── src/
│   ├── app/                      # 라우팅 레이어 (URL 경로 정의)
│   │   ├── layout.tsx            # 루트 레이아웃
│   │   ├── page.tsx              # / (홈)
│   │   ├── globals.css           # 전역 스타일
│   │   ├── not-found.tsx         # 404 페이지
│   │   ├── map/page.tsx          # /map (지도)
│   │   ├── course/               # /course, /course/[id]
│   │   ├── community/            # /community, /community/[id]
│   │   ├── mypage/page.tsx       # /mypage
│   │   └── admin/                # /admin, /admin/[section]
│   ├── components/               # 공유 컴포넌트
│   │   ├── screens/              # 페이지 단위 UI (실제 화면 구현)
│   │   │   ├── Home.tsx
│   │   │   ├── MapScreen.tsx
│   │   │   ├── Course.tsx
│   │   │   ├── Community.tsx
│   │   │   ├── MyPage.tsx
│   │   │   ├── Admin.tsx
│   │   │   └── NotFound.tsx
│   │   ├── ui/                   # 재사용 가능한 원자 컴포넌트
│   │   │   ├── button.tsx
│   │   │   ├── carousel.tsx
│   │   │   └── utils.ts
│   │   ├── RootShell.tsx         # 앱 전체 레이아웃 셸
│   │   ├── Navigation.tsx        # 상단/하단 내비게이션
│   │   ├── AccessibilitySettings.tsx
│   │   ├── Chatbot.tsx
│   │   ├── Logo.tsx
│   │   ├── MapCanvas.tsx
│   │   ├── PlaceDetailPanel.tsx
│   │   └── PlaceFilters.tsx
│   ├── context/                  # 공유 데이터 전역 상태 관리
│   │   └── CourseContext.tsx
│   └── data/
│       └── placesData.ts         # 장소 정적 데이터 (임시)
├── public/                       # 정적 파일
├── package.json
├── next.config.ts
├── tsconfig.json
└── eslint.config.mjs
```

---

## `src/app/` — 라우팅 레이어

> **역할 분리 원칙**: `app/` 파일들은 URL 경로 등록과 서버 전용 설정(메타데이터, 레이아웃)만 담당합니다. 실제 UI 코드는 `components/screens/`에 있으며, `app/page.tsx`는 해당 Screen 컴포넌트를 단순 re-export하는 형태입니다.

### `layout.tsx`

앱 전체 루트 레이아웃. 모든 페이지에 공통 적용됩니다.

- `<html lang="ko">`, `<body>` 정의
- `RootShell`로 children을 감싸 공통 헤더·내비게이션·CourseProvider 주입
- `metadata` export로 `<title>다대유</title>`, `<meta description>` 설정
- Geist 폰트 제거, globals.css import

### `not-found.tsx`

App Router의 404 처리 파일. `notFound()`를 호출하거나 잘못된 경로 접근 시 이 컴포넌트가 렌더링됩니다.

### `globals.css`

앱 전역 CSS. Tailwind CSS base/components/utilities를 import하고 커스텀 CSS 변수(브랜드 색상 등)를 정의합니다.

---

## `src/components/` — 공유 컴포넌트

### `src/components/screens/` — 페이지 단위 UI

> `app/` 파일이 "어디로 가냐(라우팅)"를 담당한다면, 이 폴더는 "뭘 보여주냐(UI)"를 담당합니다.
>
> **이 분리를 유지하는 이유:**
>
> - `app/page.tsx`는 서버 컴포넌트로 유지하면서 필요한 부분만 `"use client"`로 위임할 수 있음
> - Screen 컴포넌트는 순수 React 컴포넌트라 Next.js 런타임 없이 단독 테스트 가능
> - 동일 UI를 Modal, Drawer, 다른 경로에서 재사용할 때 `app/` 파일 복사 없이 import 하나로 해결

### `src/components/ui/` — 원자 UI 컴포넌트

#### `utils.ts`

UI 컴포넌트에서 공통으로 사용하는 유틸리티 함수 (예: `cn()` className 병합).

### `RootShell.tsx`

`"use client"` 컴포넌트. 앱 전체의 시각적 셸을 구성합니다.

- sticky 헤더 (Logo + DesktopNav + 접근성 설정 버튼)
- 메인 콘텐츠 영역 (`max-w-7xl` 컨테이너)
- 모바일 하단 내비게이션
- `CourseProvider`로 children을 감싸 코스 컨텍스트 공급

---

## `src/context/ - 전역 데이터 상태 관리

여러 페이지에서 공유해야 하는 데이터의 전역 상태를 관리하는 React Context

---

## 루트 설정 파일

### `package.json`

| 항목       | 내용    |
| ---------- | ------- |
| 프로젝트명 | Dadaeyu |
| Next.js    | 16.x    |
| React      | 19.x    |
| TypeScript | ^5      |

스크립트: `dev` · `build` · `start` · `lint`

### `next.config.ts`

Next.js 설정. 현재 빈 설정 객체. 이미지 도메인, 리다이렉트, 환경변수 노출 등 필요 시 추가합니다.

### `tsconfig.json`

- `strict: true` — 엄격 타입 검사
- `moduleResolution: bundler` — Next.js 번들러 환경 최적화
- `paths: { "@/*": ["./src/*"] }` — `@/` 경로 alias

### `eslint.config.mjs`

Flat Config(ESLint 9+). `eslint-config-next/core-web-vitals` + TypeScript 규칙 적용.
