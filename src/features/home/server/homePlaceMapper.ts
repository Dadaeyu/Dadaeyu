import {
  type HomeAccessibilityEvidence,
  type HomeAccessibilityKey,
  type HomePlace
} from "../homeData.ts";

export type PlaceRow = {
  contentid: string | number;
  title: string;
  addr1: string | null;
  firstimage: string | null;
  mapx: number | string | null;
  mapy: number | string | null;
  modifiedtime: string | null;
  contenttypeid: number | string | null;
};

export type PlaceDetailRow = {
  contentid: string | number;
  homepage: string | null;
  tel: string | null;
  overview: string | null;
  usetime: string | null;
  restdate: string | null;
  usefee: string | null;
  parking: string | null;
  infocenter: string | null;
  reservationurl: string | null;
  modifiedtime: string | null;
};

export type PlaceBarrierfreeRow = {
  contentid: string | number;
  parking: string | null;
  route: string | null;
  publictransport: string | null;
  wheelchair: string | null;
  exit: string | null;
  elevator: string | null;
  restroom: string | null;
  handicapetc: string | null;
  braileblock: string | null;
  helpdog: string | null;
  guidehuman: string | null;
  audioguide: string | null;
  bigprint: string | null;
  brailepromotion: string | null;
  guidesystem: string | null;
  blindhandicapetc: string | null;
  signguide: string | null;
  videoguide: string | null;
  hearingroom: string | null;
  hearinghandicapetc: string | null;
  stroller: string | null;
  lactationroom: string | null;
  babysparechair: string | null;
  infantsfamilyetc: string | null;
};

const CONTENT_TYPE_LABELS: Record<number, string> = {
  12: "관광지",
  14: "문화시설",
  15: "축제·행사",
  25: "여행코스",
  28: "레포츠",
  32: "숙박",
  38: "쇼핑",
  39: "음식점"
};

const ACCESSIBILITY_FIELDS: Array<{
  key: HomeAccessibilityKey;
  label: string;
  field: keyof PlaceBarrierfreeRow;
}> = [
  { key: "parking", label: "장애인 주차", field: "parking" },
  { key: "route", label: "접근로", field: "route" },
  { key: "public_transport", label: "대중교통", field: "publictransport" },
  { key: "wheelchair", label: "휠체어", field: "wheelchair" },
  { key: "exit", label: "출입구", field: "exit" },
  { key: "elevator", label: "엘리베이터", field: "elevator" },
  { key: "restroom", label: "장애인 화장실", field: "restroom" },
  { key: "handicap_etc", label: "기타 이동 지원", field: "handicapetc" },
  { key: "braile_block", label: "점자블록", field: "braileblock" },
  { key: "help_dog", label: "보조견", field: "helpdog" },
  { key: "guide_human", label: "안내 인력", field: "guidehuman" },
  { key: "audio_guide", label: "음성 안내", field: "audioguide" },
  { key: "big_print", label: "큰 글자 안내", field: "bigprint" },
  { key: "braile_promotion", label: "점자 안내물", field: "brailepromotion" },
  { key: "guide_system", label: "유도 안내 시스템", field: "guidesystem" },
  { key: "blind_handicap_etc", label: "기타 시각 안내", field: "blindhandicapetc" },
  { key: "sign_guide", label: "수어 안내", field: "signguide" },
  { key: "video_guide", label: "자막·영상 안내", field: "videoguide" },
  { key: "hearing_room", label: "청각 지원 객실", field: "hearingroom" },
  { key: "hearing_handicap_etc", label: "기타 청각 안내", field: "hearinghandicapetc" },
  { key: "stroller", label: "유모차", field: "stroller" },
  { key: "lactation_room", label: "수유실", field: "lactationroom" },
  { key: "baby_spare_chair", label: "아기의자", field: "babysparechair" },
  { key: "infants_family_etc", label: "기타 영유아 편의", field: "infantsfamilyetc" }
];

export function mapHomePlace(
  place: PlaceRow,
  detail: PlaceDetailRow | undefined,
  barrierfree: PlaceBarrierfreeRow | undefined
): HomePlace {
  const contentTypeId = Number(place.contenttypeid);
  const officialUrl = normalizePublicWebUrl(detail?.homepage);
  const reservationUrl = normalizePublicWebUrl(detail?.reservationurl);

  return {
    id: String(place.contentid),
    title: cleanText(place.title) || "이름을 확인할 수 없는 장소",
    category: Number.isFinite(contentTypeId) ? (CONTENT_TYPE_LABELS[contentTypeId] ?? null) : null,
    address: cleanText(place.addr1),
    imageUrl: normalizeImageUrl(place.firstimage),
    latitude: toCoordinate(place.mapy),
    longitude: toCoordinate(place.mapx),
    sourceUpdatedAt: pickLatestTimestamp(place.modifiedtime, detail?.modifiedtime),
    overview: cleanText(detail?.overview),
    hours: cleanText(detail?.usetime),
    restDate: cleanText(detail?.restdate),
    fee: cleanText(detail?.usefee),
    phone: cleanText(detail?.infocenter) ?? cleanText(detail?.tel),
    parking: cleanText(detail?.parking),
    officialUrl,
    reservationUrl: reservationUrl === officialUrl ? null : reservationUrl,
    accessibility: buildAccessibility(barrierfree)
  };
}

export function normalizePublicWebUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const decoded = decodeBasicEntities(value).trim();
  const candidate = decoded.match(/https?:\/\/[^\s"'<>]+/iu)?.[0];
  if (!candidate) return null;

  try {
    const url = new URL(candidate);
    if (!["http:", "https:"].includes(url.protocol)) return null;
    if (url.username || url.password || isPrivateHostname(url.hostname)) return null;
    return url.toString();
  } catch {
    return null;
  }
}

function buildAccessibility(row: PlaceBarrierfreeRow | undefined): HomeAccessibilityEvidence[] {
  if (!row) return [];
  return ACCESSIBILITY_FIELDS.flatMap(({ key, label, field }) => {
    const value = cleanText(row[field]);
    return value ? [{ key, label, value }] : [];
  });
}

function cleanText(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const cleaned = decodeBasicEntities(value)
    .replace(/<br\s*\/?\s*>/giu, " ")
    .replace(/<[^>]+>/gu, " ")
    .replace(/\s+/gu, " ")
    .trim();
  return cleaned || null;
}

function decodeBasicEntities(value: string) {
  return value
    .replace(/&nbsp;/giu, " ")
    .replace(/&amp;/giu, "&")
    .replace(/&quot;/giu, '"')
    .replace(/&#0*39;/giu, "'")
    .replace(/&lt;/giu, "<")
    .replace(/&gt;/giu, ">");
}

function normalizeImageUrl(value: unknown): string | null {
  const image = normalizePublicWebUrl(value);
  if (!image) return null;
  const url = new URL(image);
  if (url.protocol === "http:" && url.hostname === "tong.visitkorea.or.kr") {
    url.protocol = "https:";
  }
  return url.toString();
}

function pickLatestTimestamp(...values: unknown[]): string | null {
  const candidates = values.flatMap((value) => {
    if (typeof value !== "string") return [];
    const digits = value.replace(/\D/gu, "").slice(0, 14);
    return digits.length >= 8 ? [{ value, digits }] : [];
  });
  candidates.sort((a, b) => b.digits.localeCompare(a.digits));
  return candidates[0]?.value ?? null;
}

function toCoordinate(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function isPrivateHostname(hostname: string) {
  const normalized = hostname.toLocaleLowerCase("en-US").replace(/^\[|\]$/gu, "");
  if (normalized.includes(":")) return true;
  if (
    normalized === "localhost" ||
    normalized === "0.0.0.0" ||
    normalized === "::1" ||
    normalized.endsWith(".localhost") ||
    normalized.endsWith(".local")
  ) {
    return true;
  }
  if (
    /^127\./u.test(normalized) ||
    /^10\./u.test(normalized) ||
    /^169\.254\./u.test(normalized) ||
    /^192\.168\./u.test(normalized)
  ) {
    return true;
  }
  const private172 = normalized.match(/^172\.(\d{1,3})\./u);
  return private172 ? Number(private172[1]) >= 16 && Number(private172[1]) <= 31 : false;
}
