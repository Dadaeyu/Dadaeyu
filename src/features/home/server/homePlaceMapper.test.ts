import assert from "node:assert/strict";
import test from "node:test";
import {
  mapHomePlace,
  normalizePublicWebUrl,
  type PlaceBarrierfreeRow,
  type PlaceDetailRow,
  type PlaceRow
} from "./homePlaceMapper.ts";

const place: PlaceRow = {
  contentid: "130551",
  title: "대전시립미술관",
  addr1: "대전광역시 서구 둔산대로 155",
  firstimage: "http://tong.visitkorea.or.kr/example.jpg",
  mapx: "127.385",
  mapy: "36.366",
  modifiedtime: "20260701090000",
  contenttypeid: 14
};

const detail: PlaceDetailRow = {
  contentid: "130551",
  homepage: '<a href="https://www.daejeon.go.kr/dma/index.do">홈페이지</a>',
  tel: "042-000-0000",
  overview: "대전의 전시 문화를 만나는 공간입니다.<br>기획전을 운영합니다.",
  usetime: "10:00~18:00",
  restdate: "매주 월요일",
  usefee: "무료",
  parking: "주차장 이용 가능",
  infocenter: "042-270-7370",
  reservationurl: "https://www.daejeon.go.kr/dma/reserve.do",
  eventstartdate: "20260801",
  eventenddate: "20260831",
  modifiedtime: "20260702100000"
};

const barrierfree: PlaceBarrierfreeRow = {
  contentid: "130551",
  parking: "장애인 주차장 있음_무장애 편의시설",
  route: "출입구까지 완만한 경사로가 설치되어 있음",
  publictransport: "606번 버스 예술의전당 정류장 하차",
  wheelchair: "휠체어 대여 가능",
  exit: "주 출입구는 턱이 없음",
  elevator: "엘리베이터 있음",
  restroom: "장애인 화장실 있음",
  handicapetc: null,
  braileblock: "주 출입구 앞 점자블록 설치_시각장애인 편의시설",
  helpdog: null,
  guidehuman: null,
  audioguide: null,
  bigprint: null,
  brailepromotion: null,
  guidesystem: null,
  blindhandicapetc: null,
  signguide: null,
  videoguide: null,
  hearingroom: null,
  hearinghandicapetc: null,
  stroller: null,
  lactationroom: null,
  babysparechair: null,
  infantsfamilyetc: null
};

test("정식 장소·상세·무장애 테이블을 홈 장소 계약으로 변환한다", () => {
  const mapped = mapHomePlace(place, detail, barrierfree);

  assert.equal(mapped.id, "130551");
  assert.equal(mapped.category, "문화시설");
  assert.equal(mapped.phone, "042-270-7370");
  assert.equal(mapped.sourceUpdatedAt, "20260702100000");
  assert.equal(mapped.imageUrl, "https://tong.visitkorea.or.kr/example.jpg");
  assert.equal(mapped.overview, "대전의 전시 문화를 만나는 공간입니다. 기획전을 운영합니다.");
  assert.equal(mapped.officialUrl, "https://www.daejeon.go.kr/dma/index.do");
  assert.equal(mapped.reservationUrl, "https://www.daejeon.go.kr/dma/reserve.do");
  assert.equal(mapped.eventStartDate, "20260801");
  assert.equal(mapped.eventEndDate, "20260831");
});

test("접근로와 대중교통을 실제 정식 테이블 의미대로 표시한다", () => {
  const mapped = mapHomePlace(place, detail, barrierfree);
  const evidenceByKey = new Map(mapped.accessibility.map((item) => [item.key, item]));

  assert.equal(evidenceByKey.get("parking")?.value, "장애인 주차장 있음");
  assert.equal(evidenceByKey.get("route")?.label, "접근로");
  assert.equal(evidenceByKey.get("route")?.value, "출입구까지 완만한 경사로가 설치되어 있음");
  assert.equal(evidenceByKey.get("public_transport")?.label, "대중교통");
  assert.equal(evidenceByKey.get("public_transport")?.value, "606번 버스 예술의전당 정류장 하차");
  assert.equal(evidenceByKey.get("braile_block")?.value, "주 출입구 앞 점자블록 설치");
});

test("무장애 원문 뒤의 공공데이터 편의시설 표시는 사용자 화면에 노출하지 않는다", () => {
  const mapped = mapHomePlace(place, detail, {
    ...barrierfree,
    restroom: "장애인 화장실 있음_장애인 편의시설",
    helpdog: "동반 가능_시각장애인 편의시설",
    audioguide: "한국어 음성 안내 제공",
    handicapetc: "편의시설 안내 문구 자체는 유지"
  });
  const evidenceByKey = new Map(mapped.accessibility.map((item) => [item.key, item]));

  assert.equal(evidenceByKey.get("restroom")?.value, "장애인 화장실 있음");
  assert.equal(evidenceByKey.get("help_dog")?.value, "동반 가능");
  assert.equal(evidenceByKey.get("audio_guide")?.value, "한국어 음성 안내 제공");
  assert.equal(evidenceByKey.get("handicap_etc")?.value, "편의시설 안내 문구 자체는 유지");
});

test("외부 웹 링크만 허용하고 내부 주소와 실행형 URL은 버린다", () => {
  assert.equal(normalizePublicWebUrl("javascript:alert(1)"), null);
  assert.equal(normalizePublicWebUrl("http://localhost:3000/admin"), null);
  assert.equal(normalizePublicWebUrl("http://127.0.0.1/private"), null);
  assert.equal(normalizePublicWebUrl("http://169.254.169.254/latest/meta-data"), null);
  assert.equal(normalizePublicWebUrl("http://[fc00::1]/private"), null);
  assert.equal(normalizePublicWebUrl("http://[fe80::1]/private"), null);
  assert.equal(normalizePublicWebUrl("http://[::ffff:127.0.0.1]/private"), null);
  assert.equal(
    normalizePublicWebUrl("https://example.com/path?a=1&amp;b=2"),
    "https://example.com/path?a=1&b=2"
  );
});

test("유효한 링크가 없고 무장애 행이 없어도 안전한 빈 값으로 만든다", () => {
  const mapped = mapHomePlace(
    { ...place, firstimage: null, modifiedtime: null },
    {
      ...detail,
      homepage: "공식 홈페이지 없음",
      reservationurl: null,
      infocenter: null,
      modifiedtime: null
    },
    undefined
  );

  assert.equal(mapped.imageUrl, null);
  assert.equal(
    mapHomePlace({ ...place, mapx: null, mapy: null }, detail, undefined).latitude,
    null
  );
  assert.equal(
    mapHomePlace({ ...place, mapx: null, mapy: null }, detail, undefined).longitude,
    null
  );
  assert.equal(mapped.phone, "042-000-0000");
  assert.equal(mapped.officialUrl, null);
  assert.equal(mapped.reservationUrl, null);
  assert.equal(mapped.sourceUpdatedAt, null);
  assert.deepEqual(mapped.accessibility, []);
});
