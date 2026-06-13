# 다유 챗봇 RAG 개발 진행 정리

작성일: 2026-06-09

## 1. 우리가 만들고 있는 것

다유 챗봇은 대전 무장애 여행 정보를 답변하는 챗봇이다.

목표는 사용자가 다음처럼 자연어로 질문했을 때,

```text
나 휠체어 탄 장애인인데 대전에서 어디 가면 좋을까?
```

챗봇이 아무 근거 없이 일반적인 답을 만드는 것이 아니라, Supabase DB에 저장된 대전 무장애 관광 데이터를 검색한 뒤 그 근거만 사용해서 답변하게 만드는 것이다.

현재 목표 구조는 다음과 같다.

```text
사용자 질문
→ DeepSeek 질문분류 JSON
→ JS 서버가 DB 검색 조건 구성
→ Supabase DB에서 관련 chunks 조회
→ 조회된 DB 근거만 DeepSeek에 전달
→ 최종 답변 생성
```

앞으로 벡터 검색까지 붙으면 구조는 이렇게 확장된다.

```text
사용자 질문
→ DeepSeek 질문분류 JSON
→ 질문 embedding 생성
→ Supabase pgvector 유사도 검색 + 조건 필터
→ DB 근거만 DeepSeek에 전달
→ 최종 답변 생성
```

## 2. 왜 이 구조로 가는가

TourAPI 같은 외부 공공 API를 사용자가 질문할 때마다 실시간 호출하는 구조는 좋지 않다.

이유는 다음과 같다.

- 응답 속도가 느려진다.
- 외부 API 장애나 호출 제한에 챗봇이 바로 영향을 받는다.
- 같은 데이터를 반복 호출하게 되어 비효율적이다.
- 챗봇 답변 품질을 안정적으로 테스트하기 어렵다.

그래서 관광/접근성 데이터는 미리 Supabase DB에 적재해둔다. 사용자가 질문할 때는 이미 쌓아둔 DB 안에서만 검색한다.

즉 역할을 분리한다.

```text
TourAPI: 데이터 수집/갱신용
Supabase: 챗봇 지식 저장소
DeepSeek: 질문분류와 최종 답변 생성
Embedding 모델: 의미 기반 검색용 벡터 생성
```

## 3. DB 구조 이해

현재 Supabase에는 `chatbot` schema를 사용한다.

현재 확인된 테이블은 두 개다.

```text
chatbot.documents
chatbot.chunks
```

각 역할은 다음과 같다.

```text
documents
→ 장소 또는 원천 데이터 단위
→ 예: 대전어린이회관, 호텔 인터시티

chunks
→ 챗봇 검색용 문장 조각
→ 예: "대전어린이회관은 휠체어 무료대여, 장애인 화장실, 엘리베이터가 있다..."
```

현재 `chunks` 테이블에는 다음 컬럼이 있다.

```text
id
document_id
chunk_index
content
metadata
created_at
```

아직 없는 컬럼:

```text
embedding
```

그래서 현재는 진짜 벡터 검색이 아니라 Supabase의 100개 테스트 데이터를 가져온 뒤 JS에서 조건별 점수를 매겨 상위 근거를 고르는 방식으로 동작한다.

## 4. 지금까지 진행한 것

### 4.1 챗봇 UI

챗봇 UI는 메인 화면에서 열리는 방식으로 연결되어 있다.

수정된 파일:

```text
src/components/Chatbot.tsx
```

현재 챗봇 답변에는 `질문분류 JSON`이 눈에 보이게 표시된다.

예시:

```json
{
  "in_scope": true,
  "scope_reason": "대전 무장애 여행지 추천 질문",
  "intent": "recommend_place",
  "accessibility_needs": ["wheelchair"],
  "weather_sensitive": false,
  "place_name": null,
  "location": "대전",
  "keywords": ["휠체어", "문화시설", "추천", "대전"]
}
```

이 JSON은 챗봇이 질문을 어떻게 이해했는지 확인하기 위한 디버그 정보다.

### 4.2 DeepSeek API 연결

수정된 파일:

```text
src/app/api/chat/route.ts
```

현재 DeepSeek는 두 가지 역할을 한다.

```text
1. 질문분류 JSON 생성
2. DB 근거를 바탕으로 최종 답변 생성
```

웹사이트 취지와 맞지 않는 질문은 DB 검색과 최종 답변 생성을 건너뛰고 범위 안내를 한다.

### 4.3 Supabase 연결

현재 `.env.local`은 다음 구조를 사용한다.

```env
SUPABASE_SCHEMA=chatbot
SUPABASE_DOCUMENTS_TABLE=documents
SUPABASE_CHAT_TABLE=chunks
```

Supabase Dashboard에서 `chatbot` schema를 Data API에 노출했고, 권한 쿼리도 실행했다.

확인 결과:

```text
chatbot.documents 접근 가능
chatbot.chunks 접근 가능
```

### 4.4 TourAPI 데이터 수집

한국관광공사 무장애 여행 정보 API를 사용했다.

서비스:

```text
KorWithService2
```

사용한 주요 API:

```text
areaBasedSyncList2
→ 대전 무장애 관광 목록 수집

detailWithTour2
→ 각 콘텐츠의 무장애 접근성 상세정보 수집
```

추가한 스크립트:

```text
scripts/chatbot/import-tourapi-barrier-free.mjs
```

추가한 명령:

```bash
npm run chatbot:tourapi:preview
npm run chatbot:tourapi:import
```

### 4.5 100개 테스트 데이터 적재 완료

TourAPI에서 대전 무장애 여행 데이터 100개를 수집했다.

#### 4.5.1 100개 데이터의 실제 원본

100개 데이터의 실제 원본은 사용자가 전달한 `.docx` 매뉴얼 파일이 아니다.

사용자가 전달한 문서는 한국관광공사 TourAPI를 어떻게 신청하고 호출하는지 설명하는 활용 매뉴얼이다. 실제 장소 데이터는 아래 공공 API 응답에서 가져왔다.

```text
제공기관: 한국관광공사
API 서비스: TourAPI KorWithService2
데이터 성격: 무장애 여행/관광 콘텐츠
수집 지역: 대전
지역 코드: areaCode=3
수집 개수: 100개
수집 목적: 챗봇 RAG 테스트용 초기 데이터
```

사용한 API endpoint는 두 개다.

```text
1. areaBasedSyncList2
   → 대전 지역 무장애 관광 콘텐츠 목록을 가져오는 API

2. detailWithTour2
   → 각 콘텐츠의 장애인/시각장애/청각장애/영유아가족 편의정보를 가져오는 API
```

실제 호출 구조는 다음과 같다. 서비스키는 `.env.local`에서만 사용하고, 문서나 Git에는 남기지 않는다.

```text
GET https://apis.data.go.kr/B551011/KorWithService2/areaBasedSyncList2
  ?areaCode=3
  &arrange=C
  &numOfRows=50
  &pageNo=1...
  &showflag=1
  &_type=json
  &serviceKey=비공개

GET https://apis.data.go.kr/B551011/KorWithService2/detailWithTour2
  ?contentId=각_콘텐츠_ID
  &numOfRows=10
  &pageNo=1
  &_type=json
  &serviceKey=비공개
```

정리하면, 목록 API로 대전 콘텐츠 100개를 가져오고, 각 콘텐츠마다 상세 API를 한 번씩 더 호출해서 무장애 접근성 정보를 붙였다.

```text
areaBasedSyncList2 1차 목록 수집
→ contentid 100개 확보
→ detailWithTour2를 contentid별로 호출
→ 접근성 필드 정리
→ chatbot.documents / chatbot.chunks에 저장
```

DB에 저장한 원본 식별자는 다음 형식이다.

```text
tourapi:KorWithService2:{contentid}
```

예를 들어 `대전어린이회관`은 다음처럼 저장된다.

```text
title: 대전어린이회관
source: tourapi:KorWithService2:1125312
provider: 한국관광공사 TourAPI
service: KorWithService2
operation: areaBasedSyncList2/detailWithTour2
```

저장한 주요 필드는 다음과 같다.

```text
기본 장소 정보:
title, category, address, tel, zipcode, mapx, mapy, firstimage, createdtime, modifiedtime

원본 추적 정보:
provider, service, operation, contentid, contenttypeid, source

무장애 접근성 정보:
장애인 주차, 대중교통, 접근로, 매표소, 휠체어, 출입통로, 엘리베이터, 장애인 화장실,
관람석, 객실, 점자블록, 보조견 동반, 안내요원, 오디오 가이드, 큰 활자 홍보물,
수화 안내, 자막 비디오, 유모차, 수유실, 유아용 보조의자 등
```

주의할 점은 이 100개가 사람이 직접 추천한 최종 큐레이션 목록은 아니라는 것이다.

현재는 테스트를 위해 `areaCode=3` 조건으로 TourAPI가 반환한 대전 무장애 여행 콘텐츠 중 앞의 100개를 적재했다. 이후에는 카테고리, 실내/실외, 휠체어 접근성, 장애인 화장실, 유모차 가능 여부 같은 조건으로 데이터를 더 선별하거나 가중치를 줄 수 있다.

#### 4.5.2 현재 적재된 100개 원본 목록

아래 목록은 현재 Supabase `chatbot.documents`에 저장된 100개 문서의 `title`, `source`, `category`다. `source`의 마지막 숫자가 한국관광공사 TourAPI의 `contentid`다.

| 번호 | title | category | source |
|---:|---|---|---|
| 1 | 3.8민주의거기념관 | 관광지 | tourapi:KorWithService2:3455349 |
| 2 | 경동오징어국수 | 음식점 | tourapi:KorWithService2:2580294 |
| 3 | 계룡산 수통골 | 레포츠 | tourapi:KorWithService2:2407314 |
| 4 | 고치소사마 | 음식점 | tourapi:KorWithService2:2912798 |
| 5 | 국립대전숲체원 | 관광지 | tourapi:KorWithService2:2662681 |
| 6 | 국립대전현충원 보훈둘레길 | 관광지 | tourapi:KorWithService2:126003 |
| 7 | 굿모닝레지던스호텔휴 | 숙박 | tourapi:KorWithService2:1932079 |
| 8 | 그린베이커리 | 음식점 | tourapi:KorWithService2:2912871 |
| 9 | 금강로하스대청공원 | 관광지 | tourapi:KorWithService2:2407303 |
| 10 | 금강로하스산호빛공원 | 관광지 | tourapi:KorWithService2:2913032 |
| 11 | 길치문화공원 | 관광지 | tourapi:KorWithService2:1622646 |
| 12 | 꿀잼도시 대전홍보관 | 관광지 | tourapi:KorWithService2:3454325 |
| 13 | 노크노크 | 음식점 | tourapi:KorWithService2:3452550 |
| 14 | 대감댁 왕뼈 해장국 유성점 | 음식점 | tourapi:KorWithService2:2913352 |
| 15 | 대나무통밥맛정식 | 음식점 | tourapi:KorWithService2:2915019 |
| 16 | 대덕문예회관 | 문화시설 | tourapi:KorWithService2:1747497 |
| 17 | 대성콩국수 | 음식점 | tourapi:KorWithService2:2899585 |
| 18 | 대전 가수원도서관 | 문화시설 | tourapi:KorWithService2:130802 |
| 19 | 대전 별리달리돈까스 | 음식점 | tourapi:KorWithService2:3447047 |
| 20 | 대전 중구문화원 | 문화시설 | tourapi:KorWithService2:129973 |
| 21 | 대전 중앙시장 | 쇼핑 | tourapi:KorWithService2:1434477 |
| 22 | 대전교통문화연수원 | 관광지 | tourapi:KorWithService2:1089992 |
| 23 | 대전근로자종합복지회관 | 레포츠 | tourapi:KorWithService2:131149 |
| 24 | 대전대학교박물관 | 문화시설 | tourapi:KorWithService2:129836 |
| 25 | 대전무형유산전수교육관 | 문화시설 | tourapi:KorWithService2:2733533 |
| 26 | 대전별서 | 숙박 | tourapi:KorWithService2:3533130 |
| 27 | 대전서구문화원 | 문화시설 | tourapi:KorWithService2:130197 |
| 28 | 대전선사박물관 | 문화시설 | tourapi:KorWithService2:1066804 |
| 29 | 대전솔로몬로파크 | 관광지 | tourapi:KorWithService2:741957 |
| 30 | 대전시립박물관 | 문화시설 | tourapi:KorWithService2:1907589 |
| 31 | 대전어린이회관 | 문화시설 | tourapi:KorWithService2:1125312 |
| 32 | 대전엑스포시민광장 | 관광지 | tourapi:KorWithService2:2738037 |
| 33 | 대전역 동광장 | 관광지 | tourapi:KorWithService2:2775503 |
| 34 | 대전전통나래관 | 문화시설 | tourapi:KorWithService2:2605913 |
| 35 | 대전컨벤션센터(DCC) | 문화시설 | tourapi:KorWithService2:644085 |
| 36 | 대전트래블라운지 | 관광지 | tourapi:KorWithService2:2722927 |
| 37 | 대전한밭도서관 | 문화시설 | tourapi:KorWithService2:130760 |
| 38 | 대청댐 | 관광지 | tourapi:KorWithService2:127663 |
| 39 | 대청호자연생태관 | 문화시설 | tourapi:KorWithService2:736422 |
| 40 | 대흥동 문화예술의거리 | 관광지 | tourapi:KorWithService2:1909639 |
| 41 | 도마큰시장 | 쇼핑 | tourapi:KorWithService2:2758334 |
| 42 | 동화울수변공원 | 관광지 | tourapi:KorWithService2:2789662 |
| 43 | 두두당 | 음식점 | tourapi:KorWithService2:2899804 |
| 44 | 둔산전자타운 | 쇼핑 | tourapi:KorWithService2:1623725 |
| 45 | 라꼬레 | 음식점 | tourapi:KorWithService2:2912957 |
| 46 | 라빈고양이카페 | 음식점 | tourapi:KorWithService2:2735322 |
| 47 | 라운지티 대전 | 음식점 | tourapi:KorWithService2:3446097 |
| 48 | 롯데백화점 (대전점) | 쇼핑 | tourapi:KorWithService2:132661 |
| 49 | 롯데시티호텔 대전 | 숙박 | tourapi:KorWithService2:1933910 |
| 50 | 리원 | 음식점 | tourapi:KorWithService2:1925335 |
| 51 | 리코타코 | 음식점 | tourapi:KorWithService2:2913097 |
| 52 | 만나 | 음식점 | tourapi:KorWithService2:690413 |
| 53 | 무양도원 | 음식점 | tourapi:KorWithService2:2912079 |
| 54 | 문창전통시장 | 쇼핑 | tourapi:KorWithService2:2746186 |
| 55 | 발명교육센터 창의발명체험관 | 관광지 | tourapi:KorWithService2:1907645 |
| 56 | 보라매공원(대전) | 관광지 | tourapi:KorWithService2:2758666 |
| 57 | 보문산 행복 숲 둘레길 | 관광지 | tourapi:KorWithService2:127542 |
| 58 | 보물섬수산 | 음식점 | tourapi:KorWithService2:2914349 |
| 59 | 부사노바 | 숙박 | tourapi:KorWithService2:3533155 |
| 60 | 부추해물칼국수 | 음식점 | tourapi:KorWithService2:2581103 |
| 61 | 비빔가 | 음식점 | tourapi:KorWithService2:1923929 |
| 62 | 뿌리공원 | 관광지 | tourapi:KorWithService2:126838 |
| 63 | 상소오토캠핑장 | 레포츠 | tourapi:KorWithService2:2727458 |
| 64 | 석봉도서관 | 문화시설 | tourapi:KorWithService2:3443300 |
| 65 | 송강전통시장 | 쇼핑 | tourapi:KorWithService2:2746192 |
| 66 | 스카이로드 | 관광지 | tourapi:KorWithService2:1964622 |
| 67 | 신탄진장 (3, 8일) | 쇼핑 | tourapi:KorWithService2:1128720 |
| 68 | 아리랑옛날순대 | 음식점 | tourapi:KorWithService2:2913192 |
| 69 | 어반더쉐프 | 음식점 | tourapi:KorWithService2:3457340 |
| 70 | 어선재 | 음식점 | tourapi:KorWithService2:2913435 |
| 71 | 여진불교미술관 | 문화시설 | tourapi:KorWithService2:1066785 |
| 72 | 온천칼국수 | 음식점 | tourapi:KorWithService2:2734919 |
| 73 | 완도수산 | 음식점 | tourapi:KorWithService2:1924026 |
| 74 | 우암사적공원 | 관광지 | tourapi:KorWithService2:945477 |
| 75 | 유성 관광특구 | 관광지 | tourapi:KorWithService2:1958042 |
| 76 | 유성장(4, 9일) | 쇼핑 | tourapi:KorWithService2:132259 |
| 77 | 으능정이문화의거리 | 쇼핑 | tourapi:KorWithService2:132505 |
| 78 | 은구비공원 | 관광지 | tourapi:KorWithService2:2775510 |
| 79 | 을미기공원 | 관광지 | tourapi:KorWithService2:2913058 |
| 80 | 이응노 미술관 | 문화시설 | tourapi:KorWithService2:590097 |
| 81 | 인쇄거리 | 관광지 | tourapi:KorWithService2:1623668 |
| 82 | 장동산림욕장 | 관광지 | tourapi:KorWithService2:705678 |
| 83 | 정일품두손두부 | 음식점 | tourapi:KorWithService2:3444834 |
| 84 | 중리전통시장 | 쇼핑 | tourapi:KorWithService2:1128853 |
| 85 | 지질박물관 | 문화시설 | tourapi:KorWithService2:130550 |
| 86 | 진신 | 음식점 | tourapi:KorWithService2:2915644 |
| 87 | 천연기념물센터 | 문화시설 | tourapi:KorWithService2:1906578 |
| 88 | 추동인공생태습지 | 관광지 | tourapi:KorWithService2:1125505 |
| 89 | 충남대학교 정심화국제문화회관 | 문화시설 | tourapi:KorWithService2:1167117 |
| 90 | 케이인하우스 | 음식점 | tourapi:KorWithService2:2734912 |
| 91 | 태평전통시장 | 쇼핑 | tourapi:KorWithService2:1309877 |
| 92 | 펠리쓰 | 음식점 | tourapi:KorWithService2:2915610 |
| 93 | 피터커피 | 음식점 | tourapi:KorWithService2:3452654 |
| 94 | 한남대학교 성지관 | 문화시설 | tourapi:KorWithService2:129723 |
| 95 | 한민시장 | 쇼핑 | tourapi:KorWithService2:2761477 |
| 96 | 한밭교육박물관 | 문화시설 | tourapi:KorWithService2:130420 |
| 97 | 한밭종합운동장 | 레포츠 | tourapi:KorWithService2:1353752 |
| 98 | 호텔 인터시티 | 숙박 | tourapi:KorWithService2:143023 |
| 99 | 호텔ICC | 숙박 | tourapi:KorWithService2:2948479 |
| 100 | 호텔스카이파크 대전1호점 | 숙박 | tourapi:KorWithService2:2770452 |

수집한 데이터는 다음처럼 정제된다.

```text
대전어린이회관은 대전 지역의 문화시설 콘텐츠입니다.
주소는 대전광역시 유성구 월드컵대로 32 대전월드컵경기장입니다.
무장애 접근성 정보는 장애인 주차, 휠체어 무료대여, 엘리베이터, 장애인 화장실, 유모차, 수유실입니다.
현장 운영 상황과 편의시설 사용 가능 여부는 방문 전에 공식 안내처로 다시 확인해야 합니다.
```

DB 적재 결과:

```text
chatbot.documents: 100개
chatbot.chunks: 100개
```

### 4.6 현재 챗봇 DB 기반 답변 확인

테스트 질문:

```text
대전에서 휠체어로 갈만한 문화시설 추천해줘
```

확인된 응답 상태:

```text
Supabase: chatbot.chunks 100개 후보 중 5건 사용
모델: deepseek-v4-flash
```

즉 현재 챗봇은 DB 근거를 검색하고, 그 근거를 바탕으로 최종 답변을 생성한다.

검색 방식은 embedding 없이 다음 조건으로 점수를 매기는 JS 랭킹 검색이다.

```text
장소명 직접 매칭
카테고리 매칭: 문화시설, 관광지, 숙박, 음식점, 쇼핑, 레포츠
접근성 조건 매칭: 휠체어, 유모차, 고령자, 시각장애, 청각장애, 이동약자
접근성 상세 필드 매칭: 장애인 주차, 접근로, 엘리베이터, 장애인 화장실, 수유실 등
날씨 민감 질문이면 문화시설/쇼핑/숙박/음식점 같은 실내 성격 장소 우선
특정 장소를 물었는데 DB에 없으면 다른 장소를 억지로 추천하지 않음
```

## 5. 현재 진행 중인 것

기존 JS 랭킹 검색을 fallback으로 유지하면서, OpenAI embedding + Supabase pgvector 검색을 우선 사용하는 1차 전환은 완료했다.

이미 추가해둔 파일:

```text
scripts/chatbot/sql/setup-pgvector-openai-1536.sql
scripts/chatbot/embed-chunks-openai.mjs
```

각 파일의 목적은 다음과 같다.

```text
setup-pgvector-openai-1536.sql
→ Supabase에 pgvector extension 활성화
→ chatbot.chunks.embedding vector(1536) 컬럼 추가
→ match_chunks RPC 함수 생성
→ HNSW vector index 생성

embed-chunks-openai.mjs
→ chatbot.chunks 중 embedding이 비어 있는 row 조회
→ OpenAI text-embedding-3-small로 embedding 생성
→ chunks.embedding에 저장
```

중요한 점:

```text
OPENAI_API_KEY가 있어도 /api/chat은 먼저 pgvector 준비 상태를 확인한다.
chatbot.match_chunks RPC와 chunks.embedding 데이터가 준비되어 있을 때만 질문 embedding을 생성한다.
준비가 덜 되었거나 결과가 없으면 기존 JS 랭킹 검색으로 fallback한다.
embedding이 비어 있는 기존 chunks에 값을 채우는 순간 embedding API 비용이 발생한다.
```

따라서 현재 상태는 다음과 같다.

```text
DB 기반 챗봇: 동작함
100개 후보 JS 랭킹 검색: 동작함
Supabase pgvector SQL: 실행 완료
100개 chunks embedding: 저장 완료
벡터 검색: /api/chat에서 pgvector 우선 사용 확인
fallback: vector 준비가 덜 되었거나 결과가 없으면 JS 랭킹 사용
```

## 6. 앞으로 진행해야 할 것

### 6.1 지금 당장 할 일

현재는 100개 테스트 데이터 기준으로 vector-first 검색 품질을 테스트한다.

테스트하면서 확인할 것은 다음이다.

```text
질문분류 JSON이 맞는가
답변 근거 카드에 pgvector 검색이 표시되는가
DB 근거가 붙는가
답변이 사용자의 조건과 맞는가
데이터가 부족한 영역이 무엇인가
```

### 6.2 Supabase pgvector SQL 확인

Supabase SQL Editor에서 이 파일의 내용을 실행했고, 2026-06-13 기준 성공 확인했다.

```text
scripts/chatbot/sql/setup-pgvector-openai-1536.sql
```

이 작업을 하면 `chatbot.chunks`에 다음 컬럼이 생긴다.

```text
embedding vector(1536)
```

그리고 다음 RPC 함수가 생긴다.

```text
chatbot.match_chunks(...)
```

이 함수가 실제 벡터 유사도 검색을 담당한다.

### 6.3 embedding API 키 추가

`.env.local`에 embedding API 키가 추가되어 있으면 OpenAI embedding을 사용할 수 있다.

현재 기본 계획은 OpenAI의 `text-embedding-3-small`을 쓰는 것이다.

필요한 값:

```env
OPENAI_API_KEY=
EMBEDDING_MODEL=text-embedding-3-small
EMBEDDING_DIMENSIONS=1536
```

DeepSeek는 계속 질문분류/최종답변에 사용한다.

OpenAI는 embedding 생성에만 사용한다.

### 6.4 기존 100개 chunks에 embedding 채우기

SQL 실행과 키 추가 후 아래 명령을 실행했고, 100개 chunk embedding 저장을 확인했다.

```bash
node scripts/chatbot/embed-chunks-openai.mjs --dry-run --limit=100
node scripts/chatbot/embed-chunks-openai.mjs --write --limit=100
```

현재 `chatbot.chunks` 100개에 embedding이 저장되어 있고, 다시 dry-run을 돌리면 비어 있는 embedding 개수는 0개다.

주의: 앞으로 데이터를 추가 적재한 뒤 `--write`를 다시 실행하면 새 chunk 수만큼 embedding API 비용이 발생한다.

### 6.5 챗봇 API vector-first 검색

`src/app/api/chat/route.ts`의 검색 흐름은 다음과 같다.

```text
1. embedding 키 확인
2. chunks.embedding 데이터와 match_chunks RPC 준비 상태 확인
3. 준비됐으면 질문 embedding 생성
4. match_chunks RPC 호출
5. 결과가 있으면 vector 검색 결과 사용
6. 준비가 덜 되었거나 결과가 없으면 기존 JS 랭킹 검색으로 fallback
```

이렇게 하면 개발 중에도 안전하다.

```text
현재: pgvector 준비 확인 후 벡터 검색 우선 시도
fallback: 준비 전에는 OpenAI embedding 비용 없이 기존 JS 랭킹 검색 사용
```

### 6.6 답변 품질 테스트

다음 질문들로 테스트한다.

```text
대전에서 휠체어로 갈만한 문화시설 추천해줘
유모차로 가기 좋은 대전 실내 장소 추천해줘
대전어린이회관 휠체어로 갈 수 있어?
장애인 화장실 있는 대전 관광지 알려줘
비 오는 날 휠체어로 갈만한 곳 추천해줘
```

확인할 것:

```text
질문분류 JSON이 맞는가
Supabase chunks를 사용했는가
DB 근거에 없는 내용을 지어내지 않는가
추천 장소가 질문 조건과 맞는가
```

### 6.6 나머지 데이터 확장

100개 테스트가 안정되면 TourAPI 데이터를 더 많이 수집한다.

예시:

```bash
node scripts/chatbot/import-tourapi-barrier-free.mjs --write --limit=500
node scripts/chatbot/import-tourapi-barrier-free.mjs --write --limit=1000
```

추가로 넣을 수 있는 데이터:

```text
대전 문화시설
관광지
숙박
음식점
쇼핑
축제/행사
장애인 화장실
주차장
실내 장소
테마별 추천 코스
```

다만 데이터를 추가할 때도 그냥 넣는 것이 아니라, `metadata`에 출처와 조건을 명확히 넣어야 한다.

예시:

```json
{
  "provider": "한국관광공사 TourAPI",
  "category": "문화시설",
  "tags": ["대전", "무장애여행", "wheelchair", "stroller"],
  "accessibility": {
    "wheelchair": "휠체어 무료대여",
    "elevator": "엘리베이터 있음",
    "restroom": "장애인 화장실 있음"
  }
}
```

## 7. 현재 테스트 가능한 상태

지금 바로 브라우저 챗봇에서 테스트 가능한 질문:

```text
대전에서 휠체어로 갈만한 문화시설 추천해줘
```

정상이라면 응답 카드에 다음과 비슷한 문구가 보여야 한다.

```text
pgvector 유사도 검색 결과 5건 참고
질문 embedding: text-embedding-3-small
```

이 상태면 현재 pgvector 기반 RAG 1차 연결은 성공한 것이다.

## 8. 남은 의사결정

결정해야 할 것은 크게 두 가지다.

### 8.1 embedding 모델

현재 기본안:

```text
OpenAI text-embedding-3-small
```

이유:

```text
1536차원으로 표준적이다.
Supabase pgvector 예제와 호환이 좋다.
비용이 비교적 낮다.
구현이 단순하다.
```

대안:

```text
Jina embeddings
```

장점은 한국어/다국어 검색에 강한 모델을 선택할 수 있다는 점이다. 단, 차원 수가 모델마다 달라서 DB vector 컬럼 차원을 다시 맞춰야 한다.

### 8.2 실시간 API 호출 범위

현재 원칙:

```text
관광/접근성 데이터는 미리 DB에 저장한다.
사용자 질문 때 TourAPI를 실시간 호출하지 않는다.
```

예외:

```text
날씨 정보
```

날씨는 계속 변하므로 실시간 API 또는 짧은 캐시가 필요하다.

## 9. 요약

현재까지는 다음 단계까지 완료됐다.

```text
챗봇 UI 연결
DeepSeek 질문분류/답변 연결
Supabase chatbot schema 연결
TourAPI 100개 데이터 수집
documents/chunks 100개 적재
DB 근거 기반 답변 확인
OpenAI text-embedding-3-small 설정
pgvector readiness check + vector-first 검색 흐름 구현
Supabase pgvector SQL 실행
100개 chunks embedding 저장
챗봇 응답 카드에서 pgvector 사용 확인
JS 랭킹 fallback 유지
```

지금 진행 중인 단계는 다음이다.

```text
100개 테스트 데이터 기준 질문 품질 점검
```

다음에 바로 해야 할 작업은 이것이다.

```text
대표 질문 10~20개로 답변 품질 테스트
부족한 장소/카테고리/접근성 필드 확인
필요하면 TourAPI 데이터를 추가 적재
추가 적재분에만 embedding 생성
```

주의: 추가 데이터에 embedding을 채우는 순간 OpenAI embedding API 비용이 발생한다. 모델은 저가 기본안인 `text-embedding-3-small`을 사용한다.
