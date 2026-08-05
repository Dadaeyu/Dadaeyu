# AI 코스 추천 설계

작성일: 2026-07-07

## 1. 만들려는 것

추천 코스 화면에서 사용자가 선택한 필터(접근성, 인원수, 테마, 위치, 일정)를 바탕으로,
`tb_place` / `tb_place_detail` / `tb_place_barrierfree` 데이터에서 조건에 맞는 장소 몇 곳을
AI가 골라 **일정과 동선을 고려한 여행 코스**로 추천한다.

결과는 기존 코스 구조(`MyCourse` / `tb_course` / `tb_course_detail`)에 그대로 매핑되어,
화면 표시 · 지도 미리보기 · "내 코스에 추가" 저장까지 이어진다.

## 2. 핵심 원칙 — AI에게 전부 시키지 않는다

가장 흔한 실수는 모든 장소를 LLM에 넣고 "골라줘"라고 하는 것이다.
느리고 비싸며, 특히 거리 계산·정확한 필터링을 LLM은 신뢰할 수 없다.

역할을 나눈다 (retrieve-then-rank, 미니 RAG).

| 단계                       | 담당                    | 이유                                                         |
| -------------------------- | ----------------------- | ------------------------------------------------------------ |
| ① 후보 좁히기 (필터 → SQL) | DB (결정적)             | 접근성/테마/위치 필터링은 SQL이 빠르고 정확                  |
| ② 조합 선택 + 이유         | AI (판단)               | "이 조합이 하루 코스로 좋은가", 시간 배분, 설명은 LLM이 잘함 |
| ③ 동선 정렬                | 결정적 코드 (haversine) | LLM은 좌표거리·TSP를 못 푼다                                 |
| ④ 코스 조립·저장           | 기존 코드 재사용        | `MyCourse` / `tb_course_detail`에 그대로 매핑                |

DB가 30개쯤으로 후보를 줄이고 → AI는 그 후보 중에서만 고르고 이유·시간을 붙이고 →
좌표로 순서를 잡는다.

## 3. 전체 파이프라인

새 API 라우트 `src/app/api/course/recommend/route.ts` (POST).
기존 `src/app/api/chat/route.ts` 패턴(서버 전용, DeepSeek JSON 모드, 타임아웃·fallback)을 그대로 따른다.

```text
Filters
→ ① SQL 후보 조회 (tb_place + detail + barrierfree)
→ ② DeepSeek 선택 (JSON 계약: place_id + 이유 + 방문시간)
→ ③ 좌표 기반 동선 정렬 (haversine)
→ ④ 코스 JSON 조립
→ 프론트 렌더 + 지도 미리보기 + 저장
```

### ① 필터 → SQL 후보 조회 (설계의 핵심)

FK 임베딩에 의존하지 않고(FK가 없을 수 있음), 동기화 코드처럼 **place_id로 3테이블을 각각
조회한 뒤 JS에서 병합**하는 방식이 안전하다.

```ts
// 1) tb_place: 위치 필터 (mapx=경도/lng, mapy=위도/lat — Tour API 규약)
let q = supabase
  .from("tb_place")
  .select("place_id, contentid, title, addr1, mapx, mapy, contenttypeid, firstimage")
  .or("delete_yn.is.null,delete_yn.eq.N");
if (filters.gu) q = q.ilike("addr1", `%${filters.gu}%`);
if (filters.dong) q = q.ilike("addr1", `%${filters.dong}%`);

// 2) 얻은 place_id 로 tb_place_detail / tb_place_barrierfree 를 .in() 조회 후
//    place_id 기준 Map 으로 병합한다.
```

#### 필터별 매핑 규칙

- **접근성** → BF 컬럼은 Y/N이 아니라 **설명 문자열**이므로, §4.1의 뷰
  `v_place_bf_flags`(`has_walk` / `has_visual` / `has_hearing` / `has_infant`)를 JOIN해 필터한다.
  원천 `tb_place_barrierfree`는 변형하지 않는다(§4.0).
  - 필터값 → 플래그 매핑: 보행/고령자 → `has_walk`, 시각 → `has_visual`, 청각 → `has_hearing`,
    영유아/임산부 → `has_infant` (유형별 소속 컬럼은 §4.1 표 참고)
- **테마** → 가장 fuzzy한 부분. `contenttypeid` + `title`/`overview` 키워드로 매핑하는
  **룩업 테이블**을 코드로 관리한다(조정 쉽게).
  - contenttypeid 참고: 12 관광지 · 14 문화시설 · 15 축제공연행사 · 28 레포츠 · 38 쇼핑 · 39 음식점
  - 예: `먹거리 → [39]`, `빵지순례 → contenttypeid 39 + title ilike '%빵|베이커리|성심당%'`,
    `문화예술 → [14]`, `축제 → [15]`, `과학 → title/overview ilike '%과학|과학관%'`
- **위치** → 위 `addr1` ILIKE (`gu`, `dong`).
- **일정 (dateFrom~dateTo)** → 날짜 수로 **dayCount 산출**(코스를 며칠로 나눌지).
  `restdate`(휴무일)를 방문 요일과 대조하면 고도화 가능.
- **인원수** → 필터링보다 **AI 힌트**로 전달(예: 다수 인원이면 주차·넓은 공간 우선).
  `accomcount` 참고 가능.
- **minRating / 즐겨찾기** → 현재 `tb_place`에 rating 컬럼이 없다(별점은 `src/data/placesData.ts` mock).
  DB 연동 전까지는 이 필터를 무시하거나 후속 과제로 둔다. (리뷰 테이블 생기면 avg 조인)

후보는 `limit(30)` 정도. 너무 많으면 토큰·비용↑, 너무 적으면 선택지 부족.

### ② DeepSeek 선택 (JSON 모드)

후보를 압축 JSON으로 만들어 프롬프트에 넣고 구조화 출력을 강제한다
(`chat/route.ts`의 `response_format: { type: "json_object" }` 패턴).

```text
system: 너는 대전 무장애 여행 코스 플래너다. 주어진 후보 장소 중에서만 고른다.
        하루 3~4곳, 접근성 조건을 최우선. 없는 장소는 지어내지 마라.
user:   { filters: {...}, dayCount: 2, candidates: [
          { place_id, title, addr, lat, lng, type, spendtime, bf: {wheelchair:true,...} }, ...
        ]}
```

출력 JSON 계약:

```json
{
  "title": "휠체어로 즐기는 대전 하루",
  "summary": "경사로·엘리베이터가 완비된 실내 위주 코스",
  "days": [
    {
      "day": 1,
      "places": [{ "place_id": 4079, "arrive": "10:00", "reason": "휠체어 경사로 완비, 실내 관람" }]
    }
  ]
}
```

포인트:

- **place_id만 반환**하게 한다. 장소명·주소는 서버가 DB 값으로 다시 채운다(환각 방지).
- `spendtime`(소요시간, `tb_place_detail`에 있음)으로 방문 시간을 배분하게 한다.

### ③ 동선 정렬 (결정적)

LLM이 뽑은 각 Day의 장소를 **좌표 기반 nearest-neighbor로 재정렬**하고 시간을 다시 계산한다.

```text
mapx(lng) / mapy(lat) → haversine 최근접 이웃으로 순서 결정 → 방문 시각 재배분
```

- MVP는 haversine면 충분하다.
- 실제 이동시간이 필요하면 이미 있는 `KAKAO_REST_API_KEY`로 **카카오모빌리티 길찾기 API**를 붙인다.

### ④ 코스 조립

AI 결과를 기존 타입에 그대로 매핑한다.

- 화면 표시 → `MyCourse` / `CourseDay` / `CoursePlace` (`src/context/CourseContext.tsx`), place_id 채워서
- 저장 → `Course.tsx`의 기존 `tb_course` + `tb_course_detail(day, place_id, starttime)` insert 로직 재사용

## 4. 데이터 전처리 (사전 정규화)

`tb_place_barrierfree`와 `tb_place_detail`의 값은 원본이 **자연어 텍스트**라, 조회 시점에 그대로
쓰면 부정확하다. 이건 임베딩 문제가 아니라 **정규화/파싱 문제**다.

### 4.0 대원칙 — 원천 불변(immutable), 파생 분리

이 3테이블은 **공공데이터포털 API로 수집한 원천 데이터**다. 제공처 약관상 원천 데이터를 변형하면
콘텐츠 분쟁 시 변형 책임이 개발사에 있고, 제공처의 사용여부 확인(대조) 과정에서도 편집된 정보는
이슈가 된다. 따라서 **정규화 결과를 원천에 쓰지 않고, 우리 소유의 별도 파생 레이어에 둔다.**

| 구분                                                    | 성격                       | 정책                                                               |
| ------------------------------------------------------- | -------------------------- | ------------------------------------------------------------------ |
| `tb_place` / `tb_place_detail` / `tb_place_barrierfree` | **원천 = API 응답의 거울** | 동기화로만 채우고 **값을 UPDATE로 변형하지 않음** (읽기 전용 취급) |
| 파생 뷰/테이블 (신규)                                   | **우리가 계산한 것**       | 검색·스케줄 로직 전용, 자유롭게 생성/재생성                        |

세 가지 규칙:

1. **원천 3테이블은 API 값 그대로 보존** — 컬럼 추가·값 UPDATE로 손대지 않는다.
2. **파생 데이터는 내부 로직(필터·동선) 전용** — 사용자 화면에 노출하지 않는다.
3. **화면 표시는 항상 원문** — 무장애 정보·영업시간을 보여줄 땐 원천 텍스트를 그대로 출력한다.
   → "변형된 정보를 제공"하는 상황 자체가 생기지 않는다.

이는 데이터 엔지니어링의 raw layer / derived layer 분리 관행과도 일치한다.

### 4.1 barrierfree — 장애 유형별 유무 플래그 (SQL 뷰)

BF 24개 컬럼은 전부 설명 문자열이다.
예: `blindhandicapetc = '시각장애인실 운영 (열람석 24석, 문의 042-270-7492~3)'`

검색용으로는 **장애 유형별 boolean 플래그**로 접는다. 컬럼을 유형별로 묶는다.

| 유형          | 소속 컬럼                                                                                                              |
| ------------- | ---------------------------------------------------------------------------------------------------------------------- |
| 보행/지체     | `wheelchair`, `elevator`, `route`, `exit`, `restroom`, `handicapetc`                                                   |
| 시각          | `braileblock`, `helpdog`, `guidehuman`, `audioguide`, `bigprint`, `brailepromotion`, `guidesystem`, `blindhandicapetc` |
| 청각          | `signguide`, `videoguide`, `hearingroom`, `hearinghandicapetc`                                                         |
| 영유아/임산부 | `stroller`, `lactationroom`, `babysparechair`, `infantsfamilyetc`                                                      |
| 공통 이동     | `parking`, `publictransport`                                                                                           |

원천 테이블에 컬럼을 추가하지 않고(§4.0), **원천을 읽어 계산하는 뷰**를 만든다. 원천은 물리적으로
전혀 건드리지 않는다.

```sql
CREATE VIEW v_place_bf_flags AS
SELECT place_id,
  (wheelchair <> '' AND wheelchair NOT LIKE '%없음%' AND ...) AS has_walk,
  (braileblock <> '' OR audioguide <> '' OR ...)             AS has_visual,
  (signguide <> '' OR videoguide <> '' OR ...)               AS has_hearing,
  (stroller <> '' OR lactationroom <> '' OR ...)             AS has_infant
FROM tb_place_barrierfree;
```

→ `... JOIN v_place_bf_flags USING (place_id) WHERE has_visual = true` 로 정확·빠르게 거른다.

- 부정어 판정 로직이 **뷰 정의(SQL) 안에만** 존재 → 저장 데이터 변형 없음.
- 성능이 문제면 **materialized view**로 만들고 동기화 직후 `REFRESH`. 이것도 원천은 불변.
- **⚠️ 함정 — "값 있음 ≠ 이용 가능"**: 일부 값은 `'장애인화장실 없음'`, `'미설치'`처럼 **부정
  표현**이 들어있다. 단순 `!= ''` 가 아니라 부정 키워드를 걸러야 한다.

  ```text
  있음 판정 = TRIM(col) != ''
             AND col NOT LIKE '%없음%'
             AND col NOT LIKE '%불가%'
             AND col NOT LIKE '%미설치%'
  ```

  부정 키워드 리스트는 실제 데이터를 한 번 훑어 패턴을 뽑아 확정한다.

### 4.2 detail — 영업시간 · 휴무 정규화 (별도 파생 테이블)

시간 필드는 자유 서식이라 SQL로는 **"조회"만 되고 "판단"은 안 된다.**
예: `opentimefood = '- 11:00~21:00- 준비시간 14:30~17:00- 마지막 주문 20:00※ 주말에는 준비시간 없이 영업'`

- SQL로 가능한 것: `ILIKE '%11:00%'` 같은 **문자열 매칭**뿐.
- SQL로 **불가능**한 것: `"토요일 15시에 영업 중?"`, `"브레이크타임 피해서 배치"` 같은 **시간 추론**.
- 그런데 일정·동선을 제대로 짜려면 이 값을 참고해야 한다(오픈 전 방문·브레이크타임 배치 방지).

시간 파싱은 뷰로 못 하니(LLM/regex 필요), **원천 `tb_place_detail`은 그대로 두고** 결과를 우리 소유의
**신규 파생 테이블**에 저장한다(§4.0).

```text
tb_place_hours (우리 테이블):
  place_id (FK → tb_place)
  open_from / open_to
  break_from / break_to
  last_order
  closed_days
  source_col, source_text   -- 어느 원천 컬럼/원문에서 왔는지 (추적성·재생성용)
  parse_method              -- 'regex' | 'llm'
  parsed_at
```

- `source_text`를 같이 저장해 **언제든 원문과 대조·재생성** 가능(제공처 검증 대응).
- 파싱 오류 위험이 있는 값이므로 **내부 스케줄 힌트로만** 쓰고, **표시는 원문(`tb_place_detail`)**.

**파싱 방법** — 세 가지 중 단계적으로.

| 방법                         | 설명                                                 | 평가                                                        |
| ---------------------------- | ---------------------------------------------------- | ----------------------------------------------------------- |
| A. 정규식 파서               | `11:00~21:00` 패턴을 regex 추출                      | 깔끔한 80%엔 OK, `※`·계절별·요일별 엣지에 취약              |
| B. LLM 정규화 (적재 시 배치) | 지저분한 텍스트를 DeepSeek으로 구조화 JSON 변환·저장 | 비용은 장소당 1회로 한정, 지저분한 텍스트에 강함 → **권장** |
| C. 하이브리드                | regex 처리, 실패분만 LLM                             | 비용 최소 + 정확도                                          |

- **핵심**: 파싱은 **매 요청이 아니라 동기화 때 1회**. 조회 시점엔 `tb_place_hours`의 구조화 컬럼을
  SQL로 정확히 쓴다.
- contenttypeid별로 원천 시간 컬럼이 흩어져 있으므로(`usetime`, `usetimeculture`, `opentimefood`,
  `usetimeleports`…) 이 단계에서 **하나의 표준 스키마(`tb_place_hours`)로 통합**한다.

**MVP 범위 조정** — 시간 정규화는 무겁다. 실용적 순서:

- **1차(MVP)**: 파생 테이블도 만들지 않음. `spendtime`(소요시간)으로 슬롯만 배분하고, 원본 `usetime` /
  `opentimefood` 텍스트를 **LLM 프롬프트에 그대로 넘겨** 대략 피하게 한다(완벽하진 않아도 초안엔 충분).
- **`restdate`(휴무일)는 우선순위 높음**: `"매주 월요일"`처럼 패턴이 단순해 regex로도 잘 뽑히고,
  필터의 **일정(날짜)**과 직접 연결된다(월요일 선택 시 월요일 휴무 장소 제외 → 체감 효과 큼).
- **2차**: `tb_place_hours`로 시간·휴무 전체 구조화 → 스케줄러가 결정적으로 검증(오픈 전/브레이크/휴무 배제).

## 5. 프론트 연결

`src/components/screens/Course.tsx` 추천 탭의 "추천받기" 버튼은 현재 mock `recommendedCourses`에
`showResults`만 켠다. 이를 다음으로 바꾼다.

1. `POST /api/course/recommend` 로 `filters` 전송 (로딩 상태 표시)
2. 응답 코스를 카드로 렌더 + KakaoMap에 마커/동선 미리보기(place_id의 mapx/mapy 사용)
3. "내 코스에 추가" → `addCourse` / DB insert

## 6. 데이터 계약 (요약)

요청:

```ts
// POST /api/course/recommend
type RecommendRequest = {
  filters: Filters; // src/components/PlaceFilters.tsx 의 Filters
  dayCount?: number; // 미지정 시 dateFrom~dateTo 로 서버가 산출
};
```

응답:

```ts
type RecommendResponse = {
  title: string;
  summary: string;
  days: {
    day: number;
    places: {
      place_id: number;
      name: string; // 서버가 DB 로 재구성
      addr: string; // 서버가 DB 로 재구성
      lat: number; // mapy
      lng: number; // mapx
      arrive: string; // "10:00"
      reason: string; // AI 선택 이유
    }[];
  }[];
  debug?: {
    candidateCount: number;
    model: string;
  };
};
```

## 7. 단계별 진행 순서

1. **BF 플래그 뷰** `v_place_bf_flags` 생성 (§4.1) — 원천 불변, 접근성 필터의 정확도 기반.
2. **후보 조회 API만** 먼저 (AI 없이 필터 → SQL → JSON). 매핑 검증이 가장 쉬움.
3. **DeepSeek 선택** 붙이기 (JSON 계약 확정).
4. **haversine 동선** + 시간 배분(1차는 spendtime 기반).
5. 프론트 연결 + 지도 미리보기.
6. (후속) `tb_place_hours` 영업시간·휴무 정규화(§4.2), rating 테이블, 카카오모빌리티 실이동시간.

## 8. 미리 짚어둘 gotcha

- **원천 3테이블은 공공데이터 API 수집분 → 변형 금지**(§4.0). 정규화는 뷰/별도 테이블로, 표시는 원문
- BF 컬럼은 **문자열**(Y/N 아님) → 뷰 `v_place_bf_flags`로 정규화(§4.1), "값 있음 ≠ 이용 가능" 부정어 주의
- **detail 시간 필드는 SQL로 판단 불가** → 별도 `tb_place_hours`로 정규화(§4.2). MVP는 원문을 LLM 힌트로만 사용
- **rating / 즐겨찾기 필터는 DB 근거 없음** → 지금은 제외
- 테마 매핑은 데이터 품질에 좌우됨 → 룩업 테이블을 코드로 관리해 조정 쉽게
- DeepSeek엔 **place_id만** 신뢰, 나머지 필드는 서버가 DB로 재구성 (환각 차단)
- API 라우트는 서버 전용 → `SUPABASE_SECRET_KEY` 사용, 20초 타임아웃 · JSON 파싱 실패
  fallback은 `chat/route.ts`를 그대로 참고
- mapx = 경도(lng), mapy = 위도(lat) — 뒤집지 말 것

## 9. 관련 파일

- 필터 정의: `src/components/PlaceFilters.tsx` (`Filters`, `DEFAULT_FILTERS`, `FilterFields`)
- 추천 탭 UI: `src/components/screens/Course.tsx` (추천받기 버튼 → `showResults`)
- 코스 타입/스토어: `src/context/CourseContext.tsx`
- 장소 동기화(컬럼 근거): `src/app/api/place/route.ts` (`PLACE_FIELD` / `BF_FIELDS` / `INTRO_FIELDS`)
- AI 연동 참고: `src/app/api/chat/route.ts` (DeepSeek 호출 · JSON 모드 · fallback)
- 지도: `src/components/KakaoMap.tsx` (추천 결과 미리보기용)
