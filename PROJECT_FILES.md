# 프로젝트 파일 정리

`create-next-app`으로 생성된 Next.js 16 + React 19 + TypeScript 보일러플레이트입니다.

---

## 루트 파일

### `package.json`
프로젝트 메타데이터와 의존성 정의 파일.

| 항목 | 내용 |
|------|------|
| 프로젝트명 | Dadaeyu |
| 버전 | 0.1.0 |
| Next.js | 16.2.7 |
| React | 19.2.4 |
| TypeScript | ^5 |

스크립트:
- `dev` — 개발 서버 실행 (`next dev`)
- `build` — 프로덕션 빌드 (`next build`)
- `start` — 프로덕션 서버 실행 (`next start`)
- `lint` — ESLint 실행

---

### `next.config.ts`
Next.js 설정 파일. 현재는 빈 설정 객체만 있으며, 이미지 도메인 허용, 리다이렉트, 환경변수 노출 등 필요 시 여기에 추가합니다.

```ts
const nextConfig: NextConfig = {
  /* config options here */
};
```

---

### `tsconfig.json`
TypeScript 컴파일러 설정 파일.

주요 옵션:
- `target: ES2017` — 출력 JS 버전
- `strict: true` — 엄격 타입 검사 활성화
- `moduleResolution: bundler` — Next.js/Vite 번들러 환경에 최적화된 모듈 해석
- `paths: { "@/*": ["./src/*"] }` — `@/` 경로 alias (예: `@/components/Button`)
- `incremental: true` — 빌드 캐시로 컴파일 속도 향상

---

### `eslint.config.mjs`
ESLint 설정 파일 (Flat Config 형식, ESLint 9+).

- `eslint-config-next/core-web-vitals` — Next.js 권장 규칙 + Core Web Vitals 관련 규칙
- `eslint-config-next/typescript` — TypeScript 전용 규칙
- `.next/`, `out/`, `build/` 폴더는 린트 대상에서 제외

---

### `.gitignore`
Git이 추적하지 않을 파일/폴더 목록.

주요 제외 항목:
- `node_modules/` — 패키지 디렉토리
- `.next/`, `out/`, `build/` — 빌드 산출물
- `.env*` — 환경변수 파일 (보안)
- `*.tsbuildinfo`, `next-env.d.ts` — TypeScript 자동 생성 파일
- `.DS_Store` — macOS 메타데이터
- `*.pem` — 인증서 파일

---

### `README.md`
`create-next-app`이 자동 생성한 기본 안내 문서. 개발 서버 실행 방법과 Vercel 배포 링크 포함. 프로젝트가 구체화되면 내용을 교체하는 것이 일반적입니다.

---

## `src/app/` 파일

### `layout.tsx`
앱 전체를 감싸는 루트 레이아웃. Next.js App Router에서 모든 페이지에 공통 적용됩니다.
import 없이도 Next.js 내부에서 빌드 타임에 직접 가져다 씁니다. 파일 이름이 곧 설정입니다.

- `<html>`, `<body>` 태그를 여기서 정의
- Geist Sans / Geist Mono 폰트를 CSS 변수로 주입
- `metadata` export로 기본 `<title>`, `<meta description>` 설정

---

### `page.tsx`
`/` 경로의 홈 페이지 컴포넌트. 현재는 기본 랜딩 UI(Next.js 로고, Deploy/Documentation 버튼)만 있는 초기 상태입니다. 실제 서비스 개발은 이 파일을 교체하는 것부터 시작합니다.

---

### `page.module.css`
`page.tsx` 전용 CSS Modules 스타일. 클래스명이 빌드 시 해시로 변환되어 전역 충돌을 방지합니다.

주요 스타일:
- `.page` — 전체 페이지 레이아웃 (flexbox, 배경색 CSS 변수 정의)
- `.main` — 콘텐츠 영역 (max-width: 800px, padding 설정)
- `.intro` — 제목/설명 영역
- `.ctas` — 버튼 그룹
- 다크모드 및 모바일(max-width: 600px) 반응형 포함

---

### `globals.css`
앱 전역 CSS. `layout.tsx`에서 import되어 모든 페이지에 적용됩니다.

- CSS 변수로 `--background`, `--foreground` 색상 정의
- `box-sizing: border-box`, `margin/padding: 0` 리셋
- 다크모드(`prefers-color-scheme: dark`) 자동 대응
- `body`에 `display: flex`로 전체 높이 레이아웃 구성

---

## `public/` 파일

정적 파일 폴더. `/` 경로로 직접 접근 가능합니다 (예: `/next.svg`).

| 파일 | 용도 |
|------|------|
| `next.svg` | Next.js 로고 (홈 페이지에서 사용) |
| `vercel.svg` | Vercel 로고 (홈 페이지 버튼에서 사용) |
| `globe.svg` | 지구본 아이콘 |
| `file.svg` | 파일 아이콘 |
| `window.svg` | 창 아이콘 |

`favicon.ico`는 `src/app/` 안에 위치하며, Next.js App Router가 자동으로 `<link rel="icon">`으로 연결합니다.

---

## 전체 구조 요약

```
Dadaeyu/
├── src/
│   └── app/
│       ├── layout.tsx        # 루트 레이아웃 (공통 HTML 구조, 폰트)
│       ├── page.tsx          # 홈 페이지 (/)
│       ├── page.module.css   # 홈 페이지 스타일
│       ├── globals.css       # 전역 스타일
│       └── favicon.ico       # 파비콘
├── public/                   # 정적 파일 (SVG 아이콘 등)
├── package.json              # 의존성 및 스크립트
├── next.config.ts            # Next.js 설정
├── tsconfig.json             # TypeScript 설정
├── eslint.config.mjs         # ESLint 설정
├── .gitignore                # Git 제외 목록
└── README.md                 # 기본 안내 문서
```
