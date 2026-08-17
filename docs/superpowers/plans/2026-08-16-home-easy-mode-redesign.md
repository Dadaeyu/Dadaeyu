# Home Easy Mode Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 홈의 쉬운 화면을 ATM형 전용 UI로 분리하고, 기본 홈의 추천·탐색 섹션을 요청된 개수와 순서로 정리한다.

**Architecture:** 접근성 컨텍스트에 로컬 전용 `easyMode` 상태를 추가하고 `Home`에서 기본 화면과 `EasyHome`을 조건부 렌더링한다. 추천/발견 데이터와 상세 모달·챗봇은 기존 `HomeExperience`를 공유하며 카드 표시 정책은 기존 순수 함수 테스트로 잠근다.

**Tech Stack:** Next.js 16, React 19, TypeScript, Tailwind CSS 4, Node test runner

## Global Constraints

- 새 패키지를 추가하지 않는다.
- 기존 작업 중인 변경을 되돌리지 않는다.
- 홈 추천은 최대 4개, 후기 장소와 즐겨찾기 장소는 각각 최대 4개, 인기 코스는 최대 2개, 축제는 최대 3개다.
- 홈은 축제 섹션에서 끝난다.
- 쉬운 화면은 폰트 확대와 독립된 로컬 접근성 상태다.

---

### Task 1: 쉬운 화면 상태 계약

**Files:**

- Modify: `src/lib/accessibility.ts`
- Modify: `src/context/AccessibilityContext.tsx`
- Modify: `src/app/layout.tsx`
- Test: `src/lib/accessibility.test.ts`

**Interfaces:**

- Produces: `AccessibilityState.easyMode: boolean`, `toggleEasyMode(): void`

- [ ] 이전 저장 데이터에 `easyMode`가 없어도 `false`로 읽는 실패 테스트를 작성한다.
- [ ] 쉬운 화면이 폰트 배율과 독립적으로 저장·DOM 클래스에 적용되는 실패 테스트를 작성한다.
- [ ] 테스트가 예상 이유로 실패하는지 실행한다.
- [ ] 상태 타입, 기본값, 로드/적용, 컨텍스트 토글을 최소 구현한다.
- [ ] 해당 테스트와 전체 접근성 테스트를 통과시킨다.

### Task 2: 접근성 메뉴 진입점

**Files:**

- Modify: `src/components/AccessibilitySettings.tsx`

**Interfaces:**

- Consumes: `easyMode`, `toggleEasyMode`

- [ ] 다크모드 아래에 `쉬운 화면` 대형 행을 추가한다.
- [ ] 현재 상태와 켜기/끄기 동작을 `aria-pressed` 및 설명 문구로 노출한다.
- [ ] 키보드 포커스와 48px 이상 터치 영역을 확인한다.

### Task 3: ATM형 쉬운 홈

**Files:**

- Create: `src/features/home/EasyHome.tsx`
- Modify: `src/components/screens/Home.tsx`
- Modify: `src/features/home/HomeHero.tsx`
- Modify: `src/features/home/HomeRecommendations.tsx`
- Modify: `src/components/layout/Header.tsx`
- Modify: `src/components/layout/Navigation.tsx`
- Modify: `src/app/globals.css`

**Interfaces:**

- Consumes: `HomeExperience`, `onOpenChat`, `onExitEasyMode`
- Produces: `EasyHome` 전용 화면과 `easy-home-recommendations` 스크롤 대상

- [ ] 기본 홈 히어로의 작은 쉬운 화면 토글을 제거한다.
- [ ] 큰 지도/챗봇 버튼, 단계형 도움 선택, 추천 4곳, 종료 버튼을 가진 `EasyHome`을 구현한다.
- [ ] 도움 선택 뒤 두 번의 animation frame 후 추천 제목으로 스크롤하도록 구현한다.
- [ ] 쉬운 화면에서도 장소 상세 모달과 챗봇이 기존 방식으로 열린다는 것을 확인한다.

### Task 4: 모바일 카드와 발견 섹션 정리

**Files:**

- Modify: `src/features/home/HomeRecommendations.tsx`
- Modify: `src/features/home/HomeDiscovery.tsx`
- Modify: `src/components/screens/Home.tsx`
- Test: `src/features/home/homeDiscoveryData.test.ts`
- Test: `src/features/home/homeData.test.ts`

**Interfaces:**

- Consumes: 기존 추천 장소·후기 장소·즐겨찾기 장소·코스·축제 데이터

- [ ] 기본 홈 모바일 장소 카드 이미지를 폭 전체 4:3 비율로 바꾼다.
- [x] 발견 섹션을 후기 좋은 장소 → 즐겨찾기 많은 장소 → 인기 코스 → 축제로 분리하고 카드 이미지 비율을 모바일에 맞춘다.
- [ ] 공식 여행 채널 블록을 홈에서 제거한다.
- [ ] 추천/발견 데이터 제한 테스트를 실행한다.

### Task 5: 검증

**Files:**

- Verify only

- [ ] `npm test`를 실행한다.
- [ ] `npm run typecheck`와 `npm run lint`를 실행한다.
- [ ] 로컬 앱에서 기본/쉬운 화면을 390×844 및 1280×900으로 캡처한다.
- [ ] 필요한 도움 클릭 후 추천 영역 가시성, 카드 개수, 섹션 순서, 콘솔 오류를 확인한다.
- [ ] 기존 사용자 변경과 최종 diff를 검토한다.
