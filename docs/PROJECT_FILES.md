# 프로젝트 파일 정리

대전 무장애 여행 가이드 서비스 **다대유**. Next.js App Router 기반 프로젝트입니다.

---

## 전체 구조

```
Dadaeyu/
├── src/
│   ├── app/                          # 라우팅 레이어 (URL 경로 정의)
│   │   ├── layout.tsx                # 루트 레이아웃 (폰트·메타데이터·RootShell)
│   │   ├── page.tsx                  # / (홈)
│   │   ├── globals.css               # 전역 스타일 + Tailwind v4 @theme 토큰
│   │   ├── not-found.tsx             # 404
│   │   ├── map/page.tsx              # /map
│   │   ├── course/                   # /course, /course/[id]
│   │   ├── community/                # /community, /community/[id]
│   │   ├── mypage/page.tsx           # /mypage
│   │   ├── admin/                    # /admin, /admin/[section]
│   │   └── api/chat/route.ts         # 챗봇 RAG API (Supabase pgvector)
│   ├── components/
│   │   ├── layout/                   # 앱 공통 크롬
│   │   │   ├── Header.tsx            # 로고 + DesktopNav + 접근성 토글
│   │   │   └── Navigation.tsx        # DesktopNav / MobileNav
│   │   ├── screens/                  # 페이지 단위 UI
│   │   │   ├── Home.tsx
│   │   │   ├── MapScreen.tsx
│   │   │   ├── Course.tsx
│   │   │   ├── Community.tsx
│   │   │   ├── MyPage.tsx
│   │   │   ├── Admin.tsx
│   │   │   └── NotFound.tsx
│   │   ├── ui/                       # 원자 UI 프리미티브 (shadcn 패턴)
│   │   │   ├── Button.tsx            # pill 버튼, cva variants
│   │   │   ├── Card.tsx              # 카드 레이아웃, asChild 지원
│   │   │   ├── Badge.tsx             # 상태·카테고리 배지, tone/shape variants
│   │   │   ├── Tabs.tsx              # segmented / pill 탭
│   │   │   ├── SectionHeading.tsx    # 섹션 제목 + 전체보기 링크
│   │   │   ├── Carousel.tsx          # Embla 기반 슬라이더
│   │   │   └── utils.ts              # cn() (clsx + tailwind-merge)
│   │   ├── RootShell.tsx             # CourseProvider + Header + main + MobileNav
│   │   ├── AccessibilitySettings.tsx # 접근성 설정 팝오버
│   │   ├── Chatbot.tsx               # 플로팅 챗봇 UI
│   │   ├── MapCanvas.tsx             # SVG 지도 캔버스
│   │   ├── PlaceDetailPanel.tsx      # 장소 상세 슬라이드인 패널
│   │   └── PlaceFilters.tsx          # 장소 필터 필드 (FilterFields)
│   ├── context/
│   │   └── CourseContext.tsx         # 내 코스 전역 상태 (CourseProvider)
│   ├── data/
│   │   └── placesData.ts             # 장소 정적 데이터 (임시)
│   └── utils/
│       ├── id.ts                     # genId() — 순수 카운터 ID 생성 (Date.now() 대체)
│       └── supabase/
│           ├── client.ts             # 브라우저용 Supabase 클라이언트
│           └── server.ts             # 서버용 Supabase 클라이언트
├── docs/
│   ├── project_files.md              # 이 파일
│   └── chatbot-rag-progress.md       # 챗봇 RAG 구현 진행 현황
├── public/
│   └── .gitkeep
├── DESIGN.md                         # Mintlify 디자인 시스템 스펙
├── AGENTS.md                         # Claude 코드 작성 규칙
├── CLAUDE.md                         # @AGENTS.md 포함
├── next.config.ts
├── tsconfig.json
├── eslint.config.mjs
└── package.json
```

---

## `src/app/` — 라우팅 레이어

> **역할 분리 원칙**: `app/` 파일들은 URL 경로 등록과 서버 전용 설정만 담당합니다.
> 실제 UI 코드는 `components/screens/`에 있으며, `app/page.tsx`는 해당 Screen 컴포넌트를 단순 re-export합니다.

### `layout.tsx`

- Inter (UI) + Geist Mono (코드) 폰트를 `next/font/google`으로 로드, CSS 변수 `--font-inter` / `--font-geist-mono`로 주입
- `RootShell`로 children 감싸기
- `metadata` export (`<title>다대유</title>`)

### `globals.css`

Tailwind CSS v4. `@theme` 블록에 디자인 토큰 정의:

| 토큰 그룹           | 값                                                                                                               |
| ------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `brand-*` (mint)    | #00d4a4 계열 50–900                                                                                              |
| `navy-*` (tag-blue) | #1e3a8a 계열                                                                                                     |
| `gold-*` (warn)     | #d97706 계열                                                                                                     |
| `red-*` (error)     | #d45656 베이스 오버라이드                                                                                        |
| `hero-sky-from/to`  | #87a8c8 / #f5e9d8                                                                                                |
| `hero-dark-from/to` | #1a3d4a / #2d5a4f                                                                                                |
| Named tokens        | `ink` `charcoal` `slate` `steel` `stone` `hairline` `surface` `mint` `mint-deep` `mint-soft` `annotate` `orange` |

### `api/chat/route.ts`

챗봇 POST 엔드포인트. Supabase pgvector로 장소 데이터를 RAG 검색 후 Claude API로 응답 생성.

---

## `src/components/` — 컴포넌트

### `layout/` — 앱 공통 크롬

#### `Header.tsx`

- 로고(마크 + 워드마크) JSX 인라인 포함 — 별도 Logo 컴포넌트 없음
- `DesktopNav` 임포트
- 접근성 설정 토글 버튼 + `AccessibilitySettings` 팝오버

#### `Navigation.tsx`

- `DesktopNav` — 데스크톱 상단 메뉴 (`md:flex`)
- `MobileNav` — 모바일 하단 탭바 (`md:hidden`)

### `screens/` — 페이지 단위 UI

`app/` 라우팅과 분리된 순수 React 컴포넌트.

| 파일            | 경로         | 주요 기능                                            |
| --------------- | ------------ | ---------------------------------------------------- |
| `Home.tsx`      | `/`          | 히어로·핫플레이스·코스·이벤트·팁 섹션, Carousel      |
| `MapScreen.tsx` | `/map`       | SVG 지도, 장소 목록 사이드바, 필터, PlaceDetailPanel |
| `Course.tsx`    | `/course`    | 공유 코스 목록, 내 코스 편집, 일정 플래너            |
| `Community.tsx` | `/community` | 게시판 목록/상세, 공지·이벤트·FAQ                    |
| `MyPage.tsx`    | `/mypage`    | 프로필, 내 코스·리뷰·신고 내역                       |
| `Admin.tsx`     | `/admin`     | 대시보드, 장소·유저·신고·이벤트 관리                 |
| `NotFound.tsx`  | `*`          | 404 화면                                             |

### `ui/` — 원자 프리미티브 (shadcn 패턴)

모두 `cva` + `cn` + `@radix-ui/react-slot` 구조. DESIGN.md 토큰만 사용.

#### `Button.tsx`

```
variant: default(black pill) | accent(mint) | onDark(white) | outline | ghost | link
size:    default | sm | lg | icon | iconSm
asChild: true → Slot으로 렌더 (Link 감싸기 등)
```

#### `Card.tsx`

```
variant: default | interactive(hover border) | feature(bg-surface) | flat
padding: none | sm | md | lg
asChild: true → Slot 지원
```

#### `Badge.tsx`

```
tone:  brand | tag | warn | error | orange | neutral | mintSoft | custom
shape: pill | tag
```

#### `Tabs.tsx`

```
variant: segmented(border-b 언더라인) | pill(배경 채움)
props:   items[]{key,label,count?}, value, onValueChange
```

#### `SectionHeading.tsx`

```
props: title, icon?, action?{href, label}
```

#### `Carousel.tsx`

Embla Carousel 래퍼. `Carousel` / `CarouselContent` / `CarouselItem` / `CarouselPrevious` / `CarouselNext` export.

---

## `src/context/`

### `CourseContext.tsx`

`CourseProvider` + `useCourseContext` hook. 내 코스 목록(생성·수정·삭제·장소 추가)을 앱 전체에 공급.

---

## `src/utils/`

### `id.ts`

```ts
export function genId(): number; // 모듈 레벨 카운터, React purity 준수 (Date.now() 금지)
```

### `supabase/client.ts` · `supabase/server.ts`

각각 브라우저/서버 환경용 Supabase 클라이언트 싱글턴.

---

## 루트 설정 파일

### `package.json`

| 항목         | 버전   |
| ------------ | ------ |
| Next.js      | 16.x   |
| React        | 19.x   |
| TypeScript   | ^5     |
| Tailwind CSS | v4     |
| Supabase JS  | latest |

### `tsconfig.json`

- `strict: true`
- `moduleResolution: bundler`
- `paths: { "@/*": ["./src/*"] }`

### `eslint.config.mjs`

Flat Config (ESLint 9+). `eslint-config-next/core-web-vitals` + TypeScript 규칙. React Compiler 훅 순수성 규칙(`react-hooks/purity`) 포함.

### `DESIGN.md`

Mintlify 디자인 시스템 스펙. 색상 팔레트, 타이포그래피, 간격 토큰, 컴포넌트 스타일 규칙 정의. **모든 UI 작업은 이 파일의 토큰을 따름** (AGENTS.md에 규칙 등록).
