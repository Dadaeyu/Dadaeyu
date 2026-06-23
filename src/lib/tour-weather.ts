export type TourWeatherStatus =
  | "not_requested"
  | "not_configured"
  | "ready"
  | "empty"
  | "unavailable";

export type TourWeatherItem = {
  cityAreaId: string | null;
  cityName: string | null;
  doName: string | null;
  kmaTci: string | null;
  tciGrade: string | null;
  tm: string | null;
  totalCityName: string | null;
};

export type TourWeatherDebug = {
  items: TourWeatherItem[];
  request?: {
    cityAreaId?: string | null;
    currentDate: string;
    day: string;
    endpoint: string;
  };
  source: string;
  status: TourWeatherStatus;
  statusMessage: string;
};

export type TourWeatherResult = {
  status: TourWeatherStatus;
  items: TourWeatherItem[];
  message: string;
  source: string;
  debug: TourWeatherDebug;
};

export type TourWeatherInput = {
  location?: string | null;
  weatherSensitive?: boolean;
};

export const KMA_TOUR_WEATHER_URL =
  "https://apis.data.go.kr/1360000/TourStnInfoService1/getCityTourClmIdx1";
export const KMA_TOUR_WEATHER_SOURCE = "기상청 관광코스별 관광지 상세 날씨 조회서비스";

export async function fetchTourWeather({
  location = "대전",
  weatherSensitive = true
}: TourWeatherInput = {}): Promise<TourWeatherResult> {
  if (!weatherSensitive) {
    return createTourWeatherResult({
      message: "날씨 조건 없는 질문",
      status: "not_requested"
    });
  }

  const config = getTourWeatherConfig();
  if (!config.enabled) {
    return createTourWeatherResult({
      message: "기상청 관광 날씨 조회 비활성화",
      status: "not_configured"
    });
  }

  if (!config.apiKey) {
    return createTourWeatherResult({
      message: "기상청 관광 날씨 API 키 미설정",
      status: "not_configured"
    });
  }

  const currentDate = getKstDateHour();
  const request = {
    cityAreaId: config.cityAreaId || null,
    currentDate,
    day: "1",
    endpoint: KMA_TOUR_WEATHER_URL
  };
  const params = new URLSearchParams({
    CURRENT_DATE: currentDate,
    DAY: request.day,
    dataType: "JSON",
    numOfRows: "300",
    pageNo: "1"
  });

  if (config.cityAreaId) {
    params.set("CITY_AREA_ID", config.cityAreaId);
  }

  const url = `${KMA_TOUR_WEATHER_URL}?${params.toString()}&ServiceKey=${encodePublicDataServiceKey(
    config.apiKey
  )}`;

  try {
    const response = await fetch(url, {
      headers: { Accept: "application/json" },
      next: { revalidate: 1800 }
    });

    if (!response.ok) {
      return createTourWeatherResult({
        message: getTourWeatherHttpFailureMessage(response.status),
        request,
        status: "unavailable"
      });
    }

    const data = (await response.json()) as unknown;
    const apiError = getPublicDataApiError(data);
    if (apiError) {
      return createTourWeatherResult({
        message: apiError,
        request,
        status: "unavailable"
      });
    }

    const items = extractPublicDataItems(data)
      .map(normalizeWeatherItem)
      .filter(hasWeatherItemContent);
    const selectedItems = selectWeatherItems(items, location, Boolean(config.cityAreaId));

    if (!selectedItems.length) {
      return createTourWeatherResult({
        message: "대전 관광기후지수 데이터 없음",
        request,
        status: "empty"
      });
    }

    return createTourWeatherResult({
      items: selectedItems,
      message: `대전 관광기후지수 ${selectedItems.length}건 사용`,
      request,
      status: "ready"
    });
  } catch {
    return createTourWeatherResult({
      message: "기상청 관광 날씨 API 연결 실패",
      request,
      status: "unavailable"
    });
  }
}

export function formatWeatherItem(item: TourWeatherItem) {
  const area =
    item.totalCityName ||
    [item.doName, item.cityName].filter(Boolean).join(" ") ||
    item.cityName ||
    "대전";
  const details = [
    item.tciGrade ? `등급 ${item.tciGrade}` : null,
    item.kmaTci ? `지수 ${item.kmaTci}` : null,
    item.tm ? `시각 ${formatWeatherTime(item.tm)}` : null
  ].filter(Boolean);

  return `${area}${details.length ? ` · ${details.join(" · ")}` : ""}`;
}

function getTourWeatherConfig() {
  return {
    apiKey: (
      process.env.KMA_TOUR_WEATHER_SERVICE_KEY ||
      process.env.TOUR_WEATHER_SERVICE_KEY ||
      process.env.TOUR_API_SERVICE_KEY ||
      ""
    ).trim(),
    cityAreaId: (process.env.KMA_TOUR_WEATHER_CITY_AREA_ID || "").trim(),
    enabled: process.env.KMA_TOUR_WEATHER_ENABLED !== "false"
  };
}

function createTourWeatherResult({
  items = [],
  message,
  request,
  status
}: {
  items?: TourWeatherItem[];
  message: string;
  request?: TourWeatherDebug["request"];
  status: TourWeatherStatus;
}): TourWeatherResult {
  return {
    status,
    items,
    message,
    source: KMA_TOUR_WEATHER_SOURCE,
    debug: {
      items,
      request,
      source: KMA_TOUR_WEATHER_SOURCE,
      status,
      statusMessage: message
    }
  };
}

function getKstDateHour() {
  const kst = new Date(Date.now() + 9 * 60 * 60 * 1000);
  const year = kst.getUTCFullYear();
  const month = String(kst.getUTCMonth() + 1).padStart(2, "0");
  const day = String(kst.getUTCDate()).padStart(2, "0");
  const hour = String(kst.getUTCHours()).padStart(2, "0");
  return `${year}${month}${day}${hour}`;
}

function getTourWeatherHttpFailureMessage(status: number) {
  if (status === 401 || status === 403) {
    return `기상청 관광 날씨 API 권한 확인 필요(${status})`;
  }

  return `기상청 관광 날씨 API 호출 실패(${status})`;
}

function encodePublicDataServiceKey(serviceKey: string) {
  return serviceKey.includes("%") ? serviceKey : encodeURIComponent(serviceKey);
}

function getPublicDataApiError(value: unknown) {
  const root = asRecord(value);
  const response = asRecord(root?.response);
  const header = asRecord(response?.header);
  const resultCode = readTextField(header, ["resultCode"]);

  if (!resultCode || resultCode === "00" || resultCode === "0000") return null;

  const resultMsg = readTextField(header, ["resultMsg", "resultMessage"]) || "오류 메시지 없음";
  return `기상청 관광 날씨 API 오류: ${resultMsg}`;
}

function extractPublicDataItems(value: unknown) {
  const root = asRecord(value);
  const response = asRecord(root?.response);
  const body = asRecord(response?.body);
  const items = asRecord(body?.items);
  const rawItem = items?.item;

  if (Array.isArray(rawItem)) return rawItem;
  if (rawItem) return [rawItem];
  return [];
}

function normalizeWeatherItem(value: unknown): TourWeatherItem {
  const record = asRecord(value);

  return {
    cityAreaId: readTextField(record, ["cityAreaId", "CITY_AREA_ID"]),
    cityName: readTextField(record, ["cityName", "CITY_NAME"]),
    doName: readTextField(record, ["doName", "DO_NAME"]),
    kmaTci: readTextField(record, ["kmaTci", "KMA_TCI"]),
    tciGrade: readTextField(record, ["TCI_GRADE", "tciGrade", "tci_grade"]),
    tm: readTextField(record, ["tm", "TM"]),
    totalCityName: readTextField(record, ["totalCityName", "TOTAL_CITY_NAME"])
  };
}

function hasWeatherItemContent(item: TourWeatherItem) {
  return Boolean(
    item.cityName || item.totalCityName || item.doName || item.tciGrade || item.kmaTci
  );
}

function selectWeatherItems(
  items: TourWeatherItem[],
  location: string | null | undefined,
  useConfiguredCityAreaId: boolean
) {
  if (useConfiguredCityAreaId) return items.slice(0, 3);

  const targetLocation = normalizeForSearch(location || "대전");
  const targetTerms = Array.from(new Set(["대전", "대전광역시", targetLocation].filter(Boolean)));
  return items
    .filter((item) => {
      const text = normalizeForSearch(
        [item.totalCityName, item.doName, item.cityName, item.cityAreaId].filter(Boolean).join(" ")
      );
      return targetTerms.some((term) => text.includes(normalizeForSearch(term)));
    })
    .slice(0, 3);
}

function formatWeatherTime(value: string) {
  if (/^\d{10}$/.test(value)) {
    return `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)} ${value.slice(8, 10)}시`;
  }
  return value;
}

function normalizeForSearch(value: string) {
  return value.toLocaleLowerCase("ko-KR").replace(/\s+/g, " ").trim();
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function readTextField(record: Record<string, unknown> | null, keys: string[]) {
  if (!record) return null;

  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number" && Number.isFinite(value)) return String(value);
  }

  return null;
}
