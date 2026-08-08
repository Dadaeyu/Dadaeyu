export const HOME_NEED_OPTIONS = [
  {
    id: "step_free",
    label: "계단 피하기",
    description: "경사로와 엘리베이터 정보 우선",
    storageValue: "계단 피하기"
  },
  {
    id: "short_distance",
    label: "긴 이동 피하기",
    description: "현재 위치에서 가까운 순서 우선",
    storageValue: "긴 이동 피하기"
  },
  {
    id: "visual_guidance",
    label: "시각 안내",
    description: "점자와 음성 안내 정보 우선",
    storageValue: "시각 안내"
  },
  {
    id: "hearing_guidance",
    label: "청각 안내",
    description: "수어와 자막 안내 정보 우선",
    storageValue: "청각 안내"
  },
  {
    id: "easy_explanation",
    label: "쉬운 설명",
    description: "핵심 정보만 짧게 표시",
    storageValue: "쉬운 설명"
  }
] as const;

export type HomeNeedId = (typeof HOME_NEED_OPTIONS)[number]["id"];

export type HomeAccessibilityKey =
  | "parking"
  | "route"
  | "public_transport"
  | "ticket_office"
  | "promotion"
  | "wheelchair"
  | "exit"
  | "elevator"
  | "restroom"
  | "auditorium"
  | "room_info"
  | "handicap_etc"
  | "braile_block"
  | "help_dog"
  | "guide_human"
  | "audio_guide"
  | "big_print"
  | "braile_promotion"
  | "guide_system"
  | "blind_handicap_etc"
  | "sign_guide"
  | "video_guide"
  | "hearing_room"
  | "hearing_handicap_etc"
  | "stroller"
  | "lactation_room"
  | "baby_spare_chair"
  | "infants_family_etc";

export interface HomeAccessibilityEvidence {
  key: HomeAccessibilityKey;
  label: string;
  value: string;
}

export type HomeEvidenceStatus = "available" | "unavailable" | "unknown";

export type HomeAccessibilityGroupId = "mobility" | "visual" | "hearing" | "family";

export interface HomeAccessibilityGroup {
  id: HomeAccessibilityGroupId;
  label: string;
  description: string;
  evidence: HomeAccessibilityEvidence[];
}

export interface HomeNeedEvidenceCheck {
  id: string;
  label: string;
  status: HomeEvidenceStatus;
  evidence: HomeAccessibilityEvidence[];
}

export interface HomePlace {
  id: string;
  title: string;
  category: string | null;
  address: string | null;
  imageUrl: string | null;
  latitude: number | null;
  longitude: number | null;
  sourceUpdatedAt: string | null;
  overview: string | null;
  hours: string | null;
  restDate: string | null;
  fee: string | null;
  phone: string | null;
  parking: string | null;
  officialUrl: string | null;
  reservationUrl: string | null;
  accessibility: HomeAccessibilityEvidence[];
}

export interface RankedHomePlace extends HomePlace {
  distanceMeters: number | null;
  matchedNeedIds: HomeNeedId[];
}

export interface HomeEssentialFacility {
  key: "restroom" | "elevator" | "parking";
  label: string;
  placeId: string;
  placeTitle: string;
  detail: string;
  distanceMeters: number | null;
}

export interface HomeDataResponse {
  places: RankedHomePlace[];
  facilities: HomeEssentialFacility[];
  source: string;
}

export interface HomeLocation {
  lat: number;
  lng: number;
}

const LEGACY_NEED_MAP: Record<string, HomeNeedId[]> = {
  보행: ["step_free"],
  시각: ["visual_guidance"],
  청각: ["hearing_guidance"],
  wheelchair: ["step_free"],
  mobility_access: ["step_free"],
  visual_impairment: ["visual_guidance"],
  hearing_impairment: ["hearing_guidance"]
};

const EVIDENCE_KEYS_BY_NEED: Record<HomeNeedId, HomeAccessibilityKey[]> = {
  step_free: ["route", "wheelchair", "exit", "elevator"],
  short_distance: [],
  visual_guidance: ["braile_block", "help_dog", "guide_human", "audio_guide", "big_print"],
  hearing_guidance: ["sign_guide", "video_guide"],
  easy_explanation: []
};

const ACCESSIBILITY_GROUPS: Array<{
  id: HomeAccessibilityGroupId;
  label: string;
  description: string;
  keys: HomeAccessibilityKey[];
}> = [
  {
    id: "mobility",
    label: "이동과 시설",
    description: "접근로, 출입구, 엘리베이터, 화장실처럼 이동에 필요한 정보",
    keys: [
      "parking",
      "route",
      "public_transport",
      "ticket_office",
      "promotion",
      "wheelchair",
      "exit",
      "elevator",
      "restroom",
      "auditorium",
      "room_info",
      "handicap_etc"
    ]
  },
  {
    id: "visual",
    label: "시각 안내",
    description: "점자, 음성, 안내 인력처럼 시각 정보 이용을 돕는 지원",
    keys: [
      "braile_block",
      "help_dog",
      "guide_human",
      "audio_guide",
      "big_print",
      "braile_promotion",
      "guide_system",
      "blind_handicap_etc"
    ]
  },
  {
    id: "hearing",
    label: "청각 안내",
    description: "수어, 자막, 청각 지원 객실처럼 청각 정보 이용을 돕는 지원",
    keys: ["sign_guide", "video_guide", "hearing_room", "hearing_handicap_etc"]
  },
  {
    id: "family",
    label: "영유아 동반",
    description: "유모차, 수유실, 아기의자처럼 영유아 동반에 필요한 정보",
    keys: ["stroller", "lactation_room", "baby_spare_chair", "infants_family_etc"]
  }
];

const NEED_EVIDENCE_CHECKS: Partial<
  Record<HomeNeedId, Array<{ id: string; label: string; keys: HomeAccessibilityKey[] }>>
> = {
  step_free: [
    {
      id: "step-free-entry",
      label: "출입구·접근로",
      keys: ["route", "exit", "wheelchair"]
    },
    {
      id: "step-free-elevator",
      label: "엘리베이터",
      keys: ["elevator"]
    }
  ],
  visual_guidance: [
    {
      id: "visual-wayfinding",
      label: "점자·유도 안내",
      keys: ["braile_block", "braile_promotion", "guide_system", "big_print"]
    },
    {
      id: "visual-assisted-guide",
      label: "음성·인력 안내",
      keys: ["audio_guide", "guide_human"]
    }
  ],
  hearing_guidance: [
    {
      id: "hearing-guide",
      label: "수어·자막 안내",
      keys: ["sign_guide", "video_guide"]
    }
  ]
};

export function resolveHomeNeedIds(values: readonly string[] | null | undefined): HomeNeedId[] {
  if (!values?.length) return [];

  const ids = new Set<HomeNeedId>();
  for (const value of values) {
    const option = HOME_NEED_OPTIONS.find(
      (item) => item.storageValue === value || item.id === value
    );
    if (option) {
      ids.add(option.id);
      continue;
    }
    for (const legacyId of LEGACY_NEED_MAP[value] ?? []) ids.add(legacyId);
  }
  return [...ids];
}

export function homeNeedIdsToStorageValues(ids: readonly HomeNeedId[]): string[] {
  return ids.flatMap((id) => {
    const value = HOME_NEED_OPTIONS.find((option) => option.id === id)?.storageValue;
    return value ? [value] : [];
  });
}

export function homeNeedIdsToChatNeeds(ids: readonly HomeNeedId[]): string[] {
  const values = new Set<string>();
  for (const id of ids) {
    if (id === "step_free") values.add("mobility_access");
    if (id === "short_distance") values.add("short_distance");
    if (id === "visual_guidance") values.add("visual_impairment");
    if (id === "hearing_guidance") values.add("hearing_impairment");
    if (id === "easy_explanation") values.add("easy_explanation");
  }
  return [...values];
}

export function rankHomePlaces(
  places: readonly HomePlace[],
  needIds: readonly HomeNeedId[],
  location: HomeLocation | null,
  query = ""
): RankedHomePlace[] {
  const normalizedQuery = normalizeSearchText(query);

  return places
    .filter((place) => !normalizedQuery || placeMatchesQuery(place, normalizedQuery))
    .map((place) => {
      const availableEvidence = place.accessibility.filter(
        (item) => getHomeEvidenceStatus(item) === "available"
      );
      const evidenceKeys = new Set(availableEvidence.map((item) => item.key));
      const matchedNeedIds = needIds.filter((needId) => {
        if (needId === "short_distance") return false;
        if (needId === "easy_explanation") return false;
        return EVIDENCE_KEYS_BY_NEED[needId].some((key) => evidenceKeys.has(key));
      });
      const distanceMeters =
        location && hasCoordinates(place) ? distanceBetween(location, place) : null;
      const matchedEvidenceCount = availableEvidence.filter((item) =>
        needIds.some((needId) => EVIDENCE_KEYS_BY_NEED[needId].includes(item.key))
      ).length;
      const completeness = [
        place.imageUrl,
        place.address,
        place.hours,
        place.phone,
        place.overview
      ].filter(Boolean).length;

      return {
        place,
        distanceMeters,
        matchedNeedIds,
        matchedEvidenceCount,
        availableEvidenceCount: availableEvidence.length,
        completeness
      };
    })
    .sort((a, b) => {
      if (needIds.includes("short_distance")) {
        const distanceOrder = compareKnownDistances(a.distanceMeters, b.distanceMeters);
        if (distanceOrder !== 0) return distanceOrder;
      }
      if (b.matchedNeedIds.length !== a.matchedNeedIds.length) {
        return b.matchedNeedIds.length - a.matchedNeedIds.length;
      }
      if (b.matchedEvidenceCount !== a.matchedEvidenceCount) {
        return b.matchedEvidenceCount - a.matchedEvidenceCount;
      }
      if (b.availableEvidenceCount !== a.availableEvidenceCount) {
        return b.availableEvidenceCount - a.availableEvidenceCount;
      }
      if (b.completeness !== a.completeness) return b.completeness - a.completeness;
      return a.place.title.localeCompare(b.place.title, "ko");
    })
    .map(({ place, distanceMeters, matchedNeedIds }) => ({
      ...place,
      distanceMeters,
      matchedNeedIds
    }));
}

export function rotateDailyFeaturedPlace(
  places: readonly RankedHomePlace[],
  date: Date
): RankedHomePlace[] {
  if (places.length < 2) return [...places];

  const topPool = places.slice(0, 8).filter((place) => Boolean(place.imageUrl));
  if (topPool.length < 2) return [...places];

  const dayNumber = Math.floor(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()) / 86_400_000
  );
  const featured = topPool[Math.abs(dayNumber) % topPool.length];
  return [featured, ...places.filter((place) => place.id !== featured.id)];
}

export function buildEssentialFacilities(
  places: readonly RankedHomePlace[]
): HomeEssentialFacility[] {
  const definitions = [
    { key: "restroom", label: "장애인 화장실" },
    { key: "elevator", label: "엘리베이터" },
    { key: "parking", label: "장애인 주차" }
  ] as const;
  const usedPlaceIds = new Set<string>();
  const facilities: HomeEssentialFacility[] = [];

  for (const { key, label } of definitions) {
    const candidates = places
      .map((item, index) => ({ item, index }))
      .filter(({ item }) =>
        item.accessibility.some(
          (evidence) => evidence.key === key && getHomeEvidenceStatus(evidence) === "available"
        )
      )
      .sort((a, b) => {
        const distanceOrder = compareKnownDistances(a.item.distanceMeters, b.item.distanceMeters);
        return distanceOrder || a.index - b.index;
      });
    const place =
      candidates.find(({ item }) => !usedPlaceIds.has(item.id))?.item ?? candidates[0]?.item;
    if (!place) continue;
    const evidence = place.accessibility.find(
      (item) => item.key === key && getHomeEvidenceStatus(item) === "available"
    );
    if (!evidence) continue;
    usedPlaceIds.add(place.id);
    facilities.push({
      key,
      label,
      placeId: place.id,
      placeTitle: place.title,
      detail: evidence.value,
      distanceMeters: place.distanceMeters
    });
  }

  return facilities;
}

export function getHomeEvidenceStatus(
  evidence: Pick<HomeAccessibilityEvidence, "key" | "value">
): HomeEvidenceStatus {
  const value = evidence.value.replace(/\s+/g, " ").trim();
  if (!value) return "unknown";

  const safeAbsence =
    /(단차|턱|높이\s*차이|계단)\s*(?:가|이)?\s*(?:0\s*(?:cm|㎝)?|없(?:음|습니다|다|어|으며|고))/u;
  if (safeAbsence.test(value)) return "available";

  const negative =
    /(미설치|미제공|운영하지|지원하지|이용\s*(?:이\s*)?불가|접근\s*(?:이\s*)?불가|진입\s*(?:이\s*)?불가|확인\s*(?:이\s*)?불가|이용하기\s*어려|접근하기\s*어려|없(?:음|습니다|다)|설치되어\s*있지|마련되어\s*있지)/u;
  if (negative.test(value)) return "unavailable";

  const positive =
    /(접근\s*가능|진입\s*가능|이용\s*가능|대여\s*가능|설치|구비|비치|보유|완비|마련|경사로|승강기|엘리베이터|장애인\s*(?:전용\s*)?(?:화장실|주차)|있(?:음|습니다|다))/u;
  if (positive.test(value)) return "available";

  return "unknown";
}

export function getAccessibilityGroups(
  evidence: readonly HomeAccessibilityEvidence[]
): HomeAccessibilityGroup[] {
  return ACCESSIBILITY_GROUPS.flatMap((group) => {
    const groupEvidence = evidence.filter((item) => group.keys.includes(item.key));
    return groupEvidence.length
      ? [
          {
            id: group.id,
            label: group.label,
            description: group.description,
            evidence: groupEvidence
          }
        ]
      : [];
  });
}

export function getNeedEvidenceChecks(
  place: Pick<HomePlace, "accessibility">,
  needIds: readonly HomeNeedId[]
): HomeNeedEvidenceCheck[] {
  const seen = new Set<string>();
  return needIds.flatMap((needId) =>
    (NEED_EVIDENCE_CHECKS[needId] ?? []).flatMap((check) => {
      if (seen.has(check.id)) return [];
      seen.add(check.id);
      const evidence = place.accessibility.filter((item) => check.keys.includes(item.key));
      const statuses = evidence.map(getHomeEvidenceStatus);
      const status: HomeEvidenceStatus = statuses.includes("available")
        ? "available"
        : statuses.length > 0 && statuses.every((item) => item === "unavailable")
          ? "unavailable"
          : "unknown";
      return [{ id: check.id, label: check.label, status, evidence }];
    })
  );
}

export function sortHomeEvidenceForNeeds(
  evidence: readonly HomeAccessibilityEvidence[],
  needIds: readonly HomeNeedId[]
): HomeAccessibilityEvidence[] {
  const priorityKeys = new Set<HomeAccessibilityKey>();
  for (const needId of needIds) {
    for (const key of EVIDENCE_KEYS_BY_NEED[needId]) priorityKeys.add(key);
  }
  const statusOrder: Record<HomeEvidenceStatus, number> = {
    available: 0,
    unknown: 1,
    unavailable: 2
  };
  return [...evidence].sort((a, b) => {
    const priorityOrder = Number(priorityKeys.has(b.key)) - Number(priorityKeys.has(a.key));
    if (priorityOrder !== 0) return priorityOrder;
    return statusOrder[getHomeEvidenceStatus(a)] - statusOrder[getHomeEvidenceStatus(b)];
  });
}

export function formatDistance(distanceMeters: number | null): string | null {
  if (distanceMeters === null || !Number.isFinite(distanceMeters)) return null;
  if (distanceMeters < 10) return "10m 이내";
  if (distanceMeters < 1000) return `${Math.round(distanceMeters / 10) * 10}m`;
  return `${(distanceMeters / 1000).toFixed(distanceMeters < 10_000 ? 1 : 0)}km`;
}

export function formatSourceDate(value: string | null): string | null {
  if (!value) return null;
  const digits = value.replace(/\D/g, "");
  if (digits.length < 8) return null;
  const year = digits.slice(0, 4);
  const month = digits.slice(4, 6);
  const day = digits.slice(6, 8);
  if (!Number(year) || !Number(month) || !Number(day)) return null;
  return `${year}.${month}.${day}`;
}

export function summarizeVisitInfo(
  place: Pick<HomePlace, "hours" | "restDate" | "phone">
): string | null {
  if (place.hours) {
    const plainHours = place.hours
      .replace(/\[[^\]]+\]/g, " ")
      .replace(/※.*$/u, " ")
      .replace(/\s+/g, " ")
      .trim();
    const timeRanges = [
      ...new Set(plainHours.match(/\d{1,2}:\d{2}\s*[~～-]\s*\d{1,2}:\d{2}/g) ?? [])
    ];

    if (timeRanges.length) {
      return `운영 ${timeRanges.slice(0, 2).join(" / ")}${timeRanges.length > 2 ? " 외" : ""}`;
    }

    if (/상시\s*(개방|운영)|연중\s*무휴/u.test(plainHours)) return "상시 운영";
    return shortenText(plainHours, 48);
  }

  if (place.restDate) return `휴무 ${shortenText(place.restDate, 42)}`;
  if (place.phone) return `문의 ${shortenText(place.phone, 42)}`;
  return null;
}

function shortenText(value: string, maxLength: number) {
  if (value.length <= maxLength) return value;
  return `${value.slice(0, maxLength).trim()}…`;
}

function normalizeSearchText(value: string) {
  return value.toLocaleLowerCase("ko").replace(/\s+/g, "");
}

function placeMatchesQuery(place: HomePlace, query: string) {
  return [
    place.title,
    place.category,
    place.address,
    place.overview,
    ...place.accessibility.flatMap((item) => [item.label, item.value])
  ]
    .filter((value): value is string => Boolean(value))
    .some((value) => normalizeSearchText(value).includes(query));
}

function hasCoordinates(place: HomePlace): place is HomePlace & {
  latitude: number;
  longitude: number;
} {
  return Number.isFinite(place.latitude) && Number.isFinite(place.longitude);
}

function compareKnownDistances(a: number | null, b: number | null) {
  if (a !== null && b !== null) return a - b;
  if (a !== null) return -1;
  if (b !== null) return 1;
  return 0;
}

function distanceBetween(from: HomeLocation, to: { latitude: number; longitude: number }): number {
  const earthRadius = 6_371_000;
  const toRadians = (degrees: number) => (degrees * Math.PI) / 180;
  const lat1 = toRadians(from.lat);
  const lat2 = toRadians(to.latitude);
  const deltaLat = toRadians(to.latitude - from.lat);
  const deltaLng = toRadians(to.longitude - from.lng);
  const a =
    Math.sin(deltaLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLng / 2) ** 2;
  return Math.round(earthRadius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}
