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

그래서 현재는 진짜 벡터 검색이 아니라 `content` 문자열에 대한 키워드 검색으로 동작한다.

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
Supabase: chatbot.chunks 5건 사용
모델: deepseek-v4-flash
```

즉 현재 챗봇은 DB 근거를 검색하고, 그 근거를 바탕으로 최종 답변을 생성한다.

단, 아직 검색 방식은 `ilike` 기반 키워드 검색이다.

## 5. 현재 진행 중인 것

현재 진행 중인 작업은 키워드 검색을 유지하면서, 나중에 결제가 준비됐을 때 벡터 검색으로 전환할 수 있는 준비만 해두는 것이다.

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
아직 SQL은 Supabase에 실행하지 않았다.
아직 OPENAI_API_KEY 또는 EMBEDDING_API_KEY가 없다.
아직 /api/chat은 vector RPC 검색으로 완전히 전환하지 않았다.
따라서 현재는 embedding API 비용이 발생하지 않는다.
```

따라서 현재 상태는 다음과 같다.

```text
DB 기반 챗봇: 동작함
키워드 검색: 동작함
벡터 검색: 준비 파일만 있음, 실제 실행 보류
```

## 6. 앞으로 진행해야 할 것

### 6.1 지금 당장 할 일

현재는 추가 결제 없이 키워드 검색 기반 DB 챗봇을 먼저 테스트한다.

테스트하면서 확인할 것은 다음이다.

```text
질문분류 JSON이 맞는가
DB 근거가 붙는가
답변이 사용자의 조건과 맞는가
데이터가 부족한 영역이 무엇인가
```

### 6.2 나중에 embedding 결제를 하기로 결정하면 할 일

Supabase SQL Editor에서 이 파일의 내용을 실행한다.

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

`.env.local`에 embedding API 키를 추가해야 한다.

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

SQL 실행과 키 추가 후 아래 명령을 실행한다.

```bash
node scripts/chatbot/embed-chunks-openai.mjs --dry-run --limit=100
node scripts/chatbot/embed-chunks-openai.mjs --write --limit=100
```

그러면 현재 `chatbot.chunks` 100개에 embedding이 저장된다.

주의: `--write`를 실행하는 순간 embedding API 비용이 발생한다. 결제와 비용 확인 전에는 실행하지 않는다.

### 6.5 챗봇 API를 vector 검색 우선으로 변경

`src/app/api/chat/route.ts`에서 검색 흐름을 다음처럼 바꾼다.

```text
1. embedding 키가 있으면 질문 embedding 생성
2. match_chunks RPC 호출
3. 결과가 있으면 vector 검색 결과 사용
4. 실패하거나 결과가 없으면 기존 키워드 검색으로 fallback
```

이렇게 하면 개발 중에도 안전하다.

```text
현재: 키워드 검색으로 동작
나중에 vector 준비 후: 벡터 검색 우선 사용
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
Supabase: chatbot.chunks 5건 사용
```

이 상태면 현재 DB 기반 RAG 1차 연결은 성공한 것이다.

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
```

지금 진행 중인 단계는 다음이다.

```text
pgvector 기반 벡터 검색을 나중에 붙일 수 있도록 준비
```

다음에 바로 해야 할 작업은 이것이다.

```text
현재 100개 DB 기반 키워드 검색 챗봇 품질 테스트
```

embedding 결제를 하기로 결정한 뒤 해야 할 작업은 이것이다.

```text
Supabase SQL Editor에서 scripts/chatbot/sql/setup-pgvector-openai-1536.sql 실행
.env.local에 OPENAI_API_KEY 추가
```

이 단계 전까지는 embedding API를 호출하지 않으므로 추가 embedding 비용은 발생하지 않는다.
