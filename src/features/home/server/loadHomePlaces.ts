import "server-only";
import { unstable_cache } from "next/cache";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getServerSupabaseConfig } from "@/lib/supabase/config";
import {
  buildEssentialFacilities,
  rankHomePlaces,
  rotateDailyFeaturedPlace,
  type HomeAccessibilityEvidence,
  type HomeAccessibilityKey,
  type HomeDataResponse,
  type HomeLocation,
  type HomeNeedId,
  type HomePlace
} from "@/features/home/homeData";

type TourismPlaceRow = {
  contentid: number;
  title: string;
  addr1: string | null;
  firstimage: string | null;
  mapx: number | string | null;
  mapy: number | string | null;
  modifiedtime: string | null;
  contenttypeid: number | null;
  lclssystm2: string | null;
};

type TourismDetailRow = {
  content_id: number;
  overview: string | null;
  phone: string | null;
  use_time: string | null;
  rest_date: string | null;
  use_fee: string | null;
  parking: string | null;
};

type TourismAccessibilityRow = {
  content_id: number;
  parking: string | null;
  route: string | null;
  public_transport: string | null;
  ticket_office: string | null;
  promotion: string | null;
  wheelchair: string | null;
  exit_info: string | null;
  elevator: string | null;
  restroom: string | null;
  auditorium: string | null;
  room_info: string | null;
  handicap_etc: string | null;
  braile_block: string | null;
  help_dog: string | null;
  guide_human: string | null;
  audio_guide: string | null;
  big_print: string | null;
  braile_promotion: string | null;
  guide_system: string | null;
  blind_handicap_etc: string | null;
  sign_guide: string | null;
  video_guide: string | null;
  hearing_room: string | null;
  hearing_handicap_etc: string | null;
  stroller: string | null;
  lactation_room: string | null;
  baby_spare_chair: string | null;
  infants_family_etc: string | null;
};

const ACCESSIBILITY_FIELDS: Array<{
  key: HomeAccessibilityKey;
  label: string;
  field: keyof TourismAccessibilityRow;
}> = [
  { key: "parking", label: "장애인 주차", field: "parking" },
  { key: "route", label: "접근로", field: "route" },
  { key: "public_transport", label: "대중교통", field: "public_transport" },
  { key: "ticket_office", label: "매표소", field: "ticket_office" },
  { key: "promotion", label: "홍보·안내물", field: "promotion" },
  { key: "wheelchair", label: "휠체어", field: "wheelchair" },
  { key: "exit", label: "출입구", field: "exit_info" },
  { key: "elevator", label: "엘리베이터", field: "elevator" },
  { key: "restroom", label: "장애인 화장실", field: "restroom" },
  { key: "auditorium", label: "관람석", field: "auditorium" },
  { key: "room_info", label: "객실", field: "room_info" },
  { key: "handicap_etc", label: "기타 이동 지원", field: "handicap_etc" },
  { key: "braile_block", label: "점자블록", field: "braile_block" },
  { key: "help_dog", label: "보조견", field: "help_dog" },
  { key: "guide_human", label: "안내 인력", field: "guide_human" },
  { key: "audio_guide", label: "음성 안내", field: "audio_guide" },
  { key: "big_print", label: "큰 글자 안내", field: "big_print" },
  { key: "braile_promotion", label: "점자 안내물", field: "braile_promotion" },
  { key: "guide_system", label: "유도 안내 시스템", field: "guide_system" },
  {
    key: "blind_handicap_etc",
    label: "기타 시각 안내",
    field: "blind_handicap_etc"
  },
  { key: "sign_guide", label: "수어 안내", field: "sign_guide" },
  { key: "video_guide", label: "자막·영상 안내", field: "video_guide" },
  { key: "hearing_room", label: "청각 지원 객실", field: "hearing_room" },
  {
    key: "hearing_handicap_etc",
    label: "기타 청각 안내",
    field: "hearing_handicap_etc"
  },
  { key: "stroller", label: "유모차", field: "stroller" },
  { key: "lactation_room", label: "수유실", field: "lactation_room" },
  { key: "baby_spare_chair", label: "아기의자", field: "baby_spare_chair" },
  {
    key: "infants_family_etc",
    label: "기타 영유아 편의",
    field: "infants_family_etc"
  }
];

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

const PLACE_PAGE_SIZE = 500;
const RELATED_ROW_BATCH_SIZE = 150;
let homeDataClient: SupabaseClient | null = null;
const getCachedBaseHomePlaces = unstable_cache(
  async () => fetchNormalizedHomePlaces(),
  ["home-base-places-v1"],
  { revalidate: 300, tags: ["home-places"] }
);

export class HomeDataError extends Error {
  constructor(
    message: string,
    readonly code: "not_configured" | "unavailable"
  ) {
    super(message);
    this.name = "HomeDataError";
  }
}

export async function loadHomePlaces({
  needIds,
  location,
  query
}: {
  needIds: HomeNeedId[];
  location: HomeLocation | null;
  query: string;
}): Promise<HomeDataResponse> {
  const normalizedPlaces = await getCachedBaseHomePlaces();
  if (!normalizedPlaces.length) {
    return { places: [], facilities: [], source: "한국관광공사 관광·무장애 여행정보" };
  }

  const allRankedPlaces = rankHomePlaces(normalizedPlaces, needIds, location, query);
  const displayPlaces =
    !query && !needIds.length && !location
      ? rotateDailyFeaturedPlace(allRankedPlaces, new Date())
      : allRankedPlaces;
  const rankedPlaces = displayPlaces.slice(0, 16);
  return {
    places: rankedPlaces,
    facilities: buildEssentialFacilities(allRankedPlaces),
    source: "한국관광공사 관광·무장애 여행정보"
  };
}

async function fetchNormalizedHomePlaces(): Promise<HomePlace[]> {
  const places = await fetchAllTourismPlaces();
  if (!places.length) return [];

  const contentIds = places.map((place) => place.contentid);
  const [detailRows, accessibilityRows] = await Promise.all([
    fetchTourismDetails(contentIds),
    fetchTourismAccessibility(contentIds)
  ]);

  const detailsById = new Map(detailRows.map((detail) => [detail.content_id, detail]));
  const accessibilityById = new Map(
    accessibilityRows.map((accessibility) => [accessibility.content_id, accessibility])
  );

  return places.map((place): HomePlace => {
    const detail = detailsById.get(place.contentid);
    const accessibilityRow = accessibilityById.get(place.contentid);
    return {
      id: String(place.contentid),
      title: cleanText(place.title) || "이름을 확인할 수 없는 장소",
      category:
        (place.contenttypeid ? CONTENT_TYPE_LABELS[place.contenttypeid] : null) ||
        cleanText(place.lclssystm2) ||
        null,
      address: cleanText(place.addr1),
      imageUrl: normalizeImageUrl(place.firstimage),
      latitude: toCoordinate(place.mapy),
      longitude: toCoordinate(place.mapx),
      sourceUpdatedAt: place.modifiedtime,
      overview: cleanText(detail?.overview),
      hours: cleanText(detail?.use_time),
      restDate: cleanText(detail?.rest_date),
      fee: cleanText(detail?.use_fee),
      phone: cleanText(detail?.phone),
      parking: cleanText(detail?.parking),
      accessibility: buildAccessibility(accessibilityRow)
    };
  });
}

async function fetchAllTourismPlaces(): Promise<TourismPlaceRow[]> {
  const supabase = getHomeDataClient();
  const rows: TourismPlaceRow[] = [];

  for (let from = 0; ; from += PLACE_PAGE_SIZE) {
    const { data, error } = await supabase
      .from("tb_tourism_places")
      .select("contentid,title,addr1,firstimage,mapx,mapy,modifiedtime,contenttypeid,lclssystm2")
      .not("title", "is", null)
      .order("modifiedtime", { ascending: false, nullsFirst: false })
      .range(from, from + PLACE_PAGE_SIZE - 1);

    if (error) throw new HomeDataError(error.message, "unavailable");
    const page = (data ?? []) as TourismPlaceRow[];
    rows.push(...page);
    if (page.length < PLACE_PAGE_SIZE) return rows;
  }
}

async function fetchTourismDetails(contentIds: number[]): Promise<TourismDetailRow[]> {
  const supabase = getHomeDataClient();
  const batches = chunkValues(contentIds, RELATED_ROW_BATCH_SIZE);
  const results = await Promise.all(
    batches.map(async (batch) => {
      const { data, error } = await supabase
        .from("tb_tourism_detail")
        .select("content_id,overview,phone,use_time,rest_date,use_fee,parking")
        .in("content_id", batch);
      if (error) throw new HomeDataError(error.message, "unavailable");
      return (data ?? []) as TourismDetailRow[];
    })
  );
  return results.flat();
}

async function fetchTourismAccessibility(contentIds: number[]): Promise<TourismAccessibilityRow[]> {
  const supabase = getHomeDataClient();
  const batches = chunkValues(contentIds, RELATED_ROW_BATCH_SIZE);
  const results = await Promise.all(
    batches.map(async (batch) => {
      const { data, error } = await supabase
        .from("tb_tourism_accessibility")
        .select(
          "content_id,parking,route,public_transport,ticket_office,promotion,wheelchair,exit_info,elevator,restroom,auditorium,room_info,handicap_etc,braile_block,help_dog,guide_human,audio_guide,big_print,braile_promotion,guide_system,blind_handicap_etc,sign_guide,video_guide,hearing_room,hearing_handicap_etc,stroller,lactation_room,baby_spare_chair,infants_family_etc"
        )
        .in("content_id", batch);
      if (error) throw new HomeDataError(error.message, "unavailable");
      return (data ?? []) as TourismAccessibilityRow[];
    })
  );
  return results.flat();
}

function getHomeDataClient(): SupabaseClient {
  if (homeDataClient) return homeDataClient;
  const config = getServerSupabaseConfig();
  if (!config.isConfigured) {
    throw new HomeDataError("Supabase server configuration is missing", "not_configured");
  }
  homeDataClient = createClient(config.url.replace(/\/rest\/v1\/?$/, ""), config.key, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
  return homeDataClient;
}

function chunkValues<T>(values: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let index = 0; index < values.length; index += size) {
    chunks.push(values.slice(index, index + size));
  }
  return chunks;
}

function buildAccessibility(row: TourismAccessibilityRow | undefined): HomeAccessibilityEvidence[] {
  if (!row) return [];
  return ACCESSIBILITY_FIELDS.flatMap(({ key, label, field }) => {
    const value = cleanText(row[field]);
    return value ? [{ key, label, value }] : [];
  });
}

function cleanText(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const cleaned = value
    .replace(/<br\s*\/?\s*>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/\s+/g, " ")
    .trim();
  return cleaned || null;
}

function normalizeImageUrl(value: unknown): string | null {
  const image = cleanText(value);
  if (!image) return null;
  try {
    const url = new URL(image);
    if (url.protocol === "http:" && url.hostname === "tong.visitkorea.or.kr") {
      url.protocol = "https:";
    }
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : null;
  } catch {
    return null;
  }
}

function toCoordinate(value: unknown): number | null {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}
