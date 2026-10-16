type AccessibilityEntry = {
  key: string;
  label: string;
  text: string;
  searchText: string;
};

type AccessibilityEvidenceRow = {
  metadata?: {
    accessibility?: Record<string, unknown>;
  } | null;
};

export type AccessibilityNeedStatus = "confirmed" | "unknown" | "restricted";

export type AccessibilityNeedEvidence = {
  need: string;
  label: string;
  status: AccessibilityNeedStatus;
  evidence: string | null;
};

const MOBILITY_NEEDS = new Set([
  "wheelchair",
  "mobility_access",
  "step_free",
  "elderly",
  "short_distance"
]);

const FIELD_LABELS: Record<string, string> = {
  parking: "주차",
  route: "대중교통",
  publictransport: "접근로",
  wheelchair: "휠체어",
  exit: "출구정보",
  elevator: "엘리베이터",
  restroom: "화장실",
  stroller: "유모차",
  lactationroom: "수유실",
  braileblock: "점자블록",
  helpdog: "안내견",
  guidehuman: "안내인력",
  audioguide: "오디오가이드",
  bigprint: "큰활자",
  brailepromotion: "점자안내물",
  guidesystem: "유도안내시스템",
  signguide: "수어안내",
  videoguide: "동영상자막",
  hearingroom: "청각장애객실",
  babysparechair: "아기의자"
};

const MOBILITY_ROUTE_FIELD_KEYS = new Set(["route", "publictransport", "exit", "elevator"]);
const VISUAL_FIELD_KEYS = new Set([
  "braileblock",
  "helpdog",
  "guidehuman",
  "audioguide",
  "bigprint",
  "brailepromotion",
  "guidesystem",
  "blindhandicapetc"
]);
const HEARING_FIELD_KEYS = new Set([
  "signguide",
  "videoguide",
  "hearingroom",
  "hearinghandicapetc"
]);
const INFANT_FIELD_KEYS = new Set([
  "stroller",
  "lactationroom",
  "babysparechair",
  "infantsfamilyetc"
]);

export function filterRowsByAccessibilityEvidence<T extends AccessibilityEvidenceRow>(
  rows: readonly T[],
  needs: readonly string[]
) {
  const effectiveNeeds = needs.filter((need) => need !== "easy_explanation");
  if (!effectiveNeeds.length) return [...rows];

  return rows.filter((row) => effectiveNeeds.every((need) => rowSupportsNeed(row, need)));
}

export function evaluateAccessibilityNeeds(
  row: AccessibilityEvidenceRow,
  needs: readonly string[]
): AccessibilityNeedEvidence[] {
  return Array.from(new Set(needs.filter((need) => need !== "easy_explanation"))).map((need) => {
    const restricted = getRestrictedEvidence(row, need);
    if (restricted) {
      return {
        need,
        label: getAccessibilityNeedLabel(need),
        status: "restricted",
        evidence: restricted
      };
    }

    const unknown = getUnknownEvidence(row, need);
    if (unknown) {
      return {
        need,
        label: getAccessibilityNeedLabel(need),
        status: "unknown",
        evidence: unknown
      };
    }

    const evidence = getPositiveEvidence(row, need);
    if (evidence) {
      return { need, label: getAccessibilityNeedLabel(need), status: "confirmed", evidence };
    }

    return {
      need,
      label: getAccessibilityNeedLabel(need),
      status: "unknown",
      evidence: null
    };
  });
}

function rowSupportsNeed(row: AccessibilityEvidenceRow, need: string) {
  const entries = getAccessibilityEntries(row);

  if (MOBILITY_NEEDS.has(need)) {
    return hasMobilityRouteEvidence(entries);
  }

  if (need === "stroller") {
    return hasPositive(entries, ["stroller", "유모차"]) && hasMobilityRouteEvidence(entries);
  }

  if (need === "accessible_toilet") {
    return hasPositiveEntryMatchingAll(entries, [
      ["restroom", "toilet", "화장실"],
      ["장애인", "교통약자", "휠체어", "무장애", "접근 가능", "accessible"]
    ]);
  }

  if (need === "accessible_parking") {
    return hasPositiveEntryMatchingAll(entries, [
      ["parking", "주차"],
      ["장애인", "전용", "교통약자", "휠체어", "무장애", "accessible"]
    ]);
  }

  if (need === "public_transport") {
    return hasPositive(entries, [
      "publictransport",
      "public_transport",
      "bus",
      "station",
      "대중교통",
      "버스",
      "정류장",
      "저상버스"
    ]);
  }

  if (need === "visual_impairment") {
    return hasPositive(entries, [
      "braille",
      "tactile",
      "audio",
      "guide",
      "점자",
      "촉지",
      "음성",
      "보조견",
      "안내요원",
      "유도"
    ]);
  }

  if (need === "hearing_impairment") {
    return hasPositive(entries, ["sign", "caption", "hearing", "수어", "자막", "청각"]);
  }

  return true;
}

function getPositiveEvidence(row: AccessibilityEvidenceRow, need: string) {
  const entries = getAccessibilityEntries(row);

  if (MOBILITY_NEEDS.has(need)) {
    return getPositiveMobilityEvidence(entries, need);
  }

  if (need === "stroller") {
    const stroller = findPositive(
      entries.filter((entry) => INFANT_FIELD_KEYS.has(entry.key)),
      ["stroller", "유모차"]
    );
    const route = getPositiveMobilityEvidence(entries, "stroller");
    return stroller && route ? `${stroller} / ${route}` : null;
  }

  if (need === "accessible_toilet") {
    return findPositiveEntryMatchingAll(
      entries.filter((entry) => entry.key === "restroom"),
      [
        ["restroom", "toilet", "화장실"],
        ["장애인", "교통약자", "휠체어", "무장애", "접근 가능", "accessible"]
      ]
    );
  }

  if (need === "accessible_parking") {
    return findPositiveEntryMatchingAll(
      entries.filter((entry) => entry.key === "parking"),
      [
        ["parking", "주차"],
        ["장애인", "전용", "교통약자", "휠체어", "무장애", "accessible"]
      ]
    );
  }

  if (need === "public_transport") {
    return findPositive(
      entries.filter((entry) => entry.key === "route"),
      [
        "publictransport",
        "public_transport",
        "bus",
        "station",
        "대중교통",
        "버스",
        "정류장",
        "저상버스"
      ]
    );
  }

  if (need === "visual_impairment") {
    return findPositive(
      entries.filter((entry) => VISUAL_FIELD_KEYS.has(entry.key)),
      ["braille", "tactile", "audio", "guide", "점자", "촉지", "음성", "보조견", "안내요원", "유도"]
    );
  }

  if (need === "hearing_impairment") {
    return findPositive(
      entries.filter((entry) => HEARING_FIELD_KEYS.has(entry.key)),
      ["sign", "caption", "hearing", "수어", "자막", "청각"]
    );
  }

  return null;
}

function getPositiveMobilityEvidence(entries: AccessibilityEntry[], need: string) {
  const routeEntries = entries.filter((entry) => MOBILITY_ROUTE_FIELD_KEYS.has(entry.key));

  if (need === "short_distance") {
    return findPositive(routeEntries, ["가까움", "가까운", "짧은 동선", "이동거리 짧", "근거리"]);
  }

  return findPositive(routeEntries, [
    "휠체어 접근 가능",
    "휠체어 접근이 가능",
    "휠체어 이동 가능",
    "경사로 있음",
    "단차 없는",
    "단차 없음",
    "턱이 없어",
    "턱이 없음",
    "턱 없음",
    "계단 없이",
    "무단차",
    "엘리베이터 있음"
  ]);
}

function getUnknownEvidence(row: AccessibilityEvidenceRow, need: string) {
  const entries = getRelevantEntries(getAccessibilityEntries(row), need);
  const entry = entries.find((entry) => isUnknownAccessibilityText(entry.searchText));

  return entry ? formatEvidence(entry) : null;
}

function getRestrictedEvidence(row: AccessibilityEvidenceRow, need: string) {
  const entries = getAccessibilityEntries(row);
  const terms =
    need === "accessible_toilet"
      ? ["restroom", "toilet", "화장실"]
      : need === "accessible_parking"
        ? ["parking", "주차"]
        : need === "public_transport"
          ? ["publictransport", "public_transport", "대중교통", "버스", "정류장"]
          : need === "visual_impairment"
            ? ["braille", "tactile", "audio", "점자", "촉지", "음성", "보조견", "안내요원"]
            : need === "hearing_impairment"
              ? ["sign", "caption", "hearing", "수어", "자막", "청각"]
              : need === "stroller"
                ? ["stroller", "유모차"]
                : ["route", "exit", "entrance", "elevator", "접근로", "출입", "입구", "엘리베이터"];

  const relevantEntries = getRelevantEntries(entries, need);
  const entry = relevantEntries.find((entry) => {
    return (
      isNegativeAccessibilityText(
        entry.searchText,
        MOBILITY_NEEDS.has(need) || need === "stroller"
      ) && terms.some((term) => entry.searchText.includes(term.toLocaleLowerCase("ko-KR")))
    );
  });

  return entry ? formatEvidence(entry) : null;
}

function getRelevantEntries(entries: AccessibilityEntry[], need: string) {
  if (MOBILITY_NEEDS.has(need))
    return entries.filter((entry) => MOBILITY_ROUTE_FIELD_KEYS.has(entry.key));
  if (need === "stroller") {
    return entries.filter(
      (entry) => INFANT_FIELD_KEYS.has(entry.key) || MOBILITY_ROUTE_FIELD_KEYS.has(entry.key)
    );
  }
  if (need === "accessible_toilet") return entries.filter((entry) => entry.key === "restroom");
  if (need === "accessible_parking") return entries.filter((entry) => entry.key === "parking");
  if (need === "public_transport") return entries.filter((entry) => entry.key === "route");
  if (need === "visual_impairment")
    return entries.filter((entry) => VISUAL_FIELD_KEYS.has(entry.key));
  if (need === "hearing_impairment")
    return entries.filter((entry) => HEARING_FIELD_KEYS.has(entry.key));

  return entries;
}

function getAccessibilityEntries(row: AccessibilityEvidenceRow): AccessibilityEntry[] {
  const accessibility = row.metadata?.accessibility;
  if (!accessibility || typeof accessibility !== "object") return [];

  return Object.entries(accessibility)
    .map(([key, value]) => {
      const text = typeof value === "string" ? value.trim() : "";
      if (!text) return null;
      const label = FIELD_LABELS[key] ?? key;
      return {
        key,
        label,
        text,
        searchText: `${key} ${text}`.toLocaleLowerCase("ko-KR")
      };
    })
    .filter((entry): entry is AccessibilityEntry => entry != null);
}

function formatEvidence(entry: AccessibilityEntry) {
  return `${entry.label}: ${entry.text}`;
}

function hasMobilityRouteEvidence(entries: AccessibilityEntry[]) {
  return hasPositive(
    entries.filter((entry) => MOBILITY_ROUTE_FIELD_KEYS.has(entry.key)),
    [
      "route",
      "exit",
      "entrance",
      "elevator",
      "wheelchair",
      "접근로",
      "출입",
      "입구",
      "엘리베이터",
      "휠체어",
      "단차 없음",
      "턱 없음",
      "무단차"
    ]
  );
}

function hasPositive(entries: AccessibilityEntry[], patterns: string[]) {
  return findPositive(entries, patterns) !== null;
}

function findPositive(entries: AccessibilityEntry[], patterns: string[]) {
  const entry = entries.find((entry) => {
    if (isNegativeAccessibilityText(entry.searchText, MOBILITY_ROUTE_FIELD_KEYS.has(entry.key))) {
      return false;
    }
    return patterns.some((pattern) =>
      entry.searchText.includes(pattern.toLocaleLowerCase("ko-KR"))
    );
  });

  return entry ? formatEvidence(entry) : null;
}

function hasPositiveEntryMatchingAll(entries: AccessibilityEntry[], patternGroups: string[][]) {
  return findPositiveEntryMatchingAll(entries, patternGroups) !== null;
}

function findPositiveEntryMatchingAll(entries: AccessibilityEntry[], patternGroups: string[][]) {
  const entry = entries.find((entry) => {
    if (isNegativeAccessibilityText(entry.searchText, MOBILITY_ROUTE_FIELD_KEYS.has(entry.key))) {
      return false;
    }

    return patternGroups.every((patterns) =>
      patterns.some((pattern) => entry.searchText.includes(pattern.toLocaleLowerCase("ko-KR")))
    );
  });

  return entry ? formatEvidence(entry) : null;
}

function isUnknownAccessibilityText(value: string) {
  return /정보\s*없음|정보없음|문의|확인\s*필요|사전\s*확인/u.test(value);
}

function isNegativeAccessibilityText(value: string, includeMobilityObstacleTerms = false) {
  const withoutPositiveStepFreePhrases = value
    .replace(/정보\s*없음/gu, "")
    .replace(/계단\s*없이/gu, "")
    .replace(/(?:계단|턱|단차)(?:이나|와|과|,)?\s*(?:이\s*)?없(?:음|이|어요|습니다|다)?/gu, "");

  const baseNegative = /없음|불가|미설치|없다|어려움|곤란/u.test(withoutPositiveStepFreePhrases);
  const mobilityObstacle = /협소|계단|급경사/u.test(withoutPositiveStepFreePhrases);

  return baseNegative || (includeMobilityObstacleTerms && mobilityObstacle);
}

export function getAccessibilityNeedLabel(need: string) {
  const labels: Record<string, string> = {
    wheelchair: "휠체어 이동",
    mobility_access: "보행 약자 이동",
    step_free: "계단 없는 이동",
    elderly: "고령자 이동",
    short_distance: "짧은 동선",
    stroller: "유모차 이동",
    accessible_toilet: "장애인 화장실",
    accessible_parking: "장애인 주차",
    public_transport: "대중교통",
    visual_impairment: "시각장애 편의",
    hearing_impairment: "청각장애 편의"
  };

  return labels[need] ?? need;
}
