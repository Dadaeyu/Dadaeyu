#!/usr/bin/env node

import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const TOUR_API_BASE_URL =
  "https://apis.data.go.kr/B551011/KorWithService2";
const DEFAULT_AREA_CODE = "3";
const DEFAULT_MOBILE_OS = "ETC";
const DEFAULT_MOBILE_APP = "Dadaeyu";
const DEFAULT_ROWS_PER_PAGE = 50;
const DEFAULT_LIMIT = 20;

const CONTENT_TYPES = {
  "12": "관광지",
  "14": "문화시설",
  "15": "행사/공연/축제",
  "28": "레포츠",
  "32": "숙박",
  "38": "쇼핑",
  "39": "음식점"
};

const ACCESSIBILITY_FIELDS = [
  ["parking", "장애인 주차"],
  ["publictransport", "대중교통"],
  ["route", "접근로"],
  ["ticketoffice", "매표소"],
  ["promotion", "홍보물"],
  ["wheelchair", "휠체어"],
  ["exit", "출입통로"],
  ["elevator", "엘리베이터"],
  ["restroom", "장애인 화장실"],
  ["auditorium", "관람석"],
  ["room", "객실"],
  ["handicapetc", "지체장애 기타"],
  ["braileblock", "점자블록"],
  ["helpdog", "보조견 동반"],
  ["guidehuman", "안내요원"],
  ["audioguide", "오디오 가이드"],
  ["bigprint", "큰 활자 홍보물"],
  ["brailepromotion", "점자 홍보물"],
  ["guidesystem", "유도 안내 설비"],
  ["blindhandicapetc", "시각장애 기타"],
  ["signguide", "수화 안내"],
  ["videoguide", "자막 비디오"],
  ["hearingroom", "청각장애 객실"],
  ["hearinghandicapetc", "청각장애 기타"],
  ["stroller", "유모차"],
  ["lactationroom", "수유실"],
  ["babysparechair", "유아용 보조의자"],
  ["infantsfamilyetc", "영유아가족 기타"]
];

function loadEnv(filePath = ".env.local") {
  const fullPath = resolve(process.cwd(), filePath);
  if (!existsSync(fullPath)) return;

  const contents = readFileSync(fullPath, "utf8");
  for (const line of contents.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const index = trimmed.indexOf("=");
    if (index === -1) continue;

    const key = trimmed.slice(0, index).trim();
    const value = trimmed.slice(index + 1).trim().replace(/^['"]|['"]$/g, "");
    if (key && process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

function parseArgs(argv) {
  const args = {
    areaCode: DEFAULT_AREA_CODE,
    dryRun: true,
    limit: DEFAULT_LIMIT,
    rowsPerPage: DEFAULT_ROWS_PER_PAGE
  };

  for (const item of argv) {
    if (item === "--write") {
      args.dryRun = false;
    } else if (item === "--dry-run") {
      args.dryRun = true;
    } else if (item.startsWith("--limit=")) {
      args.limit = Number(item.split("=", 2)[1]);
    } else if (item.startsWith("--rows=")) {
      args.rowsPerPage = Number(item.split("=", 2)[1]);
    } else if (item.startsWith("--area-code=")) {
      args.areaCode = item.split("=", 2)[1] || DEFAULT_AREA_CODE;
    }
  }

  if (!Number.isInteger(args.limit) || args.limit < 1) {
    throw new Error("--limit must be a positive integer.");
  }
  if (!Number.isInteger(args.rowsPerPage) || args.rowsPerPage < 1) {
    throw new Error("--rows must be a positive integer.");
  }

  return args;
}

function getRequiredEnv(names, label) {
  for (const name of names) {
    const value = process.env[name]?.trim();
    if (value) return value;
  }

  throw new Error(`${label} is missing. Set one of: ${names.join(", ")}`);
}

function normalizeSupabaseRestUrl(rawUrl) {
  if (!rawUrl) return "";

  try {
    const parsed = new URL(rawUrl);
    return rawUrl.includes("/rest/v1")
      ? rawUrl.replace(/\/$/, "")
      : `${parsed.origin}/rest/v1`;
  } catch {
    return "";
  }
}

function getSupabaseConfig() {
  const rawUrl =
    process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const key =
    process.env.SUPABASE_SECRET_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    "";
  const schema = process.env.SUPABASE_SCHEMA || "chatbot";
  const chunksTable = process.env.SUPABASE_CHAT_TABLE || "chunks";
  const documentsTable = process.env.SUPABASE_DOCUMENTS_TABLE || "documents";

  return {
    key: key.trim(),
    schema: schema.trim(),
    chunksTable: chunksTable.trim(),
    documentsTable: documentsTable.trim(),
    url: normalizeSupabaseRestUrl(rawUrl.trim())
  };
}

function buildTourApiUrl(operation, serviceKey, params) {
  const searchParams = new URLSearchParams({
    MobileOS: process.env.TOUR_API_MOBILE_OS || DEFAULT_MOBILE_OS,
    MobileApp: process.env.TOUR_API_MOBILE_APP || DEFAULT_MOBILE_APP,
    _type: "json",
    ...params
  });

  const encodedKey = serviceKey.includes("%")
    ? serviceKey
    : encodeURIComponent(serviceKey);

  return `${TOUR_API_BASE_URL}/${operation}?${searchParams.toString()}&serviceKey=${encodedKey}`;
}

async function tourApiRequest(operation, serviceKey, params) {
  const url = buildTourApiUrl(operation, serviceKey, params);
  const response = await fetch(url);
  const text = await response.text();

  if (!response.ok) {
    throw new Error(`${operation} HTTP ${response.status}: ${text.slice(0, 300)}`);
  }

  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(
      `${operation} did not return JSON. Check TOUR_API_SERVICE_KEY. ${text.slice(0, 300)}`
    );
  }

  const header = data?.response?.header;
  const resultCode = String(header?.resultCode || "");
  if (resultCode && resultCode !== "0000" && resultCode !== "00") {
    throw new Error(
      `${operation} failed: ${resultCode} ${header?.resultMsg || ""}`.trim()
    );
  }

  return data?.response?.body || {};
}

function normalizeItems(items) {
  const item = items?.item;
  if (!item) return [];
  return Array.isArray(item) ? item : [item];
}

async function fetchDaejeonList({ areaCode, limit, rowsPerPage, serviceKey }) {
  const results = [];
  let pageNo = 1;
  let totalCount = Infinity;

  while (results.length < limit && (pageNo - 1) * rowsPerPage < totalCount) {
    const body = await tourApiRequest("areaBasedSyncList2", serviceKey, {
      areaCode,
      arrange: "C",
      numOfRows: String(rowsPerPage),
      pageNo: String(pageNo),
      showflag: "1"
    });
    const items = normalizeItems(body.items);
    totalCount = Number(body.totalCount || items.length || 0);
    results.push(...items);
    pageNo += 1;
  }

  return results.slice(0, limit);
}

async function fetchBarrierFreeDetail(contentId, serviceKey) {
  const body = await tourApiRequest("detailWithTour2", serviceKey, {
    contentId: String(contentId),
    numOfRows: "10",
    pageNo: "1"
  });

  return normalizeItems(body.items)[0] || {};
}

function text(value) {
  return typeof value === "string" ? value.trim() : "";
}

function buildAccessibility(detail) {
  return Object.fromEntries(
    ACCESSIBILITY_FIELDS.map(([key]) => [key, text(detail[key])]).filter(
      ([, value]) => value
    )
  );
}

function buildTags(item, accessibility) {
  const tags = new Set(["대전", "무장애여행"]);
  const contentType = text(item.contenttypeid);
  if (CONTENT_TYPES[contentType]) tags.add(CONTENT_TYPES[contentType]);

  if (
    accessibility.parking ||
    accessibility.route ||
    accessibility.publictransport ||
    accessibility.wheelchair ||
    accessibility.exit ||
    accessibility.elevator ||
    accessibility.restroom ||
    accessibility.room ||
    accessibility.handicapetc
  ) {
    tags.add("wheelchair");
    tags.add("mobility_access");
  }
  if (
    accessibility.braileblock ||
    accessibility.helpdog ||
    accessibility.guidehuman ||
    accessibility.audioguide ||
    accessibility.bigprint ||
    accessibility.brailepromotion ||
    accessibility.guidesystem ||
    accessibility.blindhandicapetc
  ) {
    tags.add("visual_impairment");
  }
  if (
    accessibility.signguide ||
    accessibility.videoguide ||
    accessibility.hearingroom ||
    accessibility.hearinghandicapetc
  ) {
    tags.add("hearing_impairment");
  }
  if (
    accessibility.stroller ||
    accessibility.lactationroom ||
    accessibility.babysparechair ||
    accessibility.infantsfamilyetc
  ) {
    tags.add("stroller");
  }

  return Array.from(tags);
}

function buildContent(item, accessibility, tags) {
  const title = text(item.title) || "제목 없음";
  const category = CONTENT_TYPES[text(item.contenttypeid)] || "관광정보";
  const address = [text(item.addr1), text(item.addr2)].filter(Boolean).join(" ");
  const lines = [`${title}은/는 대전 지역의 ${category} 콘텐츠입니다.`];

  if (address) lines.push(`주소는 ${address}입니다.`);
  if (text(item.tel)) lines.push(`문의 전화는 ${text(item.tel)}입니다.`);

  const accessibilityLines = ACCESSIBILITY_FIELDS.map(([key, label]) => {
    const value = accessibility[key];
    return value ? `${label}: ${value}` : null;
  }).filter(Boolean);

  if (accessibilityLines.length) {
    lines.push(`무장애 접근성 정보는 ${accessibilityLines.join(", ")}입니다.`);
  } else {
    lines.push("무장애 접근성 상세정보는 제공되지 않았습니다.");
  }

  if (tags.includes("wheelchair") || tags.includes("mobility_access")) {
    lines.push("휠체어 또는 이동약자 관련 근거가 있는 장소로 분류했습니다.");
  }
  if (tags.includes("stroller")) {
    lines.push("유모차 또는 영유아 가족 관련 근거가 있는 장소로 분류했습니다.");
  }

  lines.push(
    "현장 운영 상황과 편의시설 사용 가능 여부는 방문 전에 공식 안내처로 다시 확인해야 합니다."
  );

  return lines.join(" ");
}

function buildKnowledgeRow(item, detail) {
  const accessibility = buildAccessibility(detail);
  const tags = buildTags(item, accessibility);
  const contentType = text(item.contenttypeid);
  const source = `tourapi:KorWithService2:${text(item.contentid)}`;

  return {
    title: text(item.title) || "제목 없음",
    category: CONTENT_TYPES[contentType] || "관광정보",
    content: buildContent(item, accessibility, tags),
    metadata: {
      title: text(item.title) || "제목 없음",
      category: CONTENT_TYPES[contentType] || "관광정보",
      source,
      tags,
      provider: "한국관광공사 TourAPI",
      service: "KorWithService2",
      operation: "areaBasedSyncList2/detailWithTour2",
      contentid: text(item.contentid),
      contenttypeid: contentType,
      address: [text(item.addr1), text(item.addr2)].filter(Boolean).join(" "),
      area_code: text(item.areacode),
      sigungu_code: text(item.sigungucode),
      mapx: text(item.mapx),
      mapy: text(item.mapy),
      tel: text(item.tel),
      zipcode: text(item.zipcode),
      firstimage: text(item.firstimage),
      firstimage2: text(item.firstimage2),
      copyright_type: text(item.cpyrhtDivCd),
      createdtime: text(item.createdtime),
      modifiedtime: text(item.modifiedtime),
      accessibility,
      imported_at: new Date().toISOString()
    },
    source,
    tags,
    updated_at: new Date().toISOString()
  };
}

function getSupabaseHeaders(config, extra = {}) {
  return {
    apikey: config.key,
    Authorization: `Bearer ${config.key}`,
    "Content-Type": "application/json",
    "Accept-Profile": config.schema,
    "Content-Profile": config.schema,
    ...extra
  };
}

async function supabaseRequest(config, path, options = {}) {
  const response = await fetch(`${config.url}${path}`, {
    ...options,
    headers: getSupabaseHeaders(config, options.headers)
  });

  if (!response.ok) {
    const errorText = await response.text();
    if (response.status === 406) {
      throw new Error(
        `${config.schema} schema is not exposed in Supabase Data API. Add it in Project Settings > API > Data API > Exposed schemas.`
      );
    }
    throw new Error(
      `Supabase request failed (${response.status}): ${errorText.slice(0, 500)}`
    );
  }

  if (response.status === 204) return null;
  const textBody = await response.text();
  return textBody ? JSON.parse(textBody) : null;
}

function encodeFilterValue(value) {
  return encodeURIComponent(value).replace(/\*/g, "%2A");
}

async function findDocument(config, source) {
  const rows = await supabaseRequest(
    config,
    `/${encodeURIComponent(config.documentsTable)}?select=id&source=eq.${encodeFilterValue(source)}&limit=1`,
    { method: "GET" }
  );
  return Array.isArray(rows) ? rows[0] || null : null;
}

async function createDocument(config, row) {
  const rows = await supabaseRequest(
    config,
    `/${encodeURIComponent(config.documentsTable)}?select=id`,
    {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({
        title: row.title,
        source: row.source,
        source_url: `https://apis.data.go.kr/B551011/KorWithService2/detailWithTour2?contentId=${row.metadata.contentid}`,
        category: row.category,
        metadata: row.metadata
      })
    }
  );
  return Array.isArray(rows) ? rows[0] : null;
}

async function updateDocument(config, id, row) {
  await supabaseRequest(
    config,
    `/${encodeURIComponent(config.documentsTable)}?id=eq.${encodeFilterValue(id)}`,
    {
      method: "PATCH",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({
        title: row.title,
        source_url: `https://apis.data.go.kr/B551011/KorWithService2/detailWithTour2?contentId=${row.metadata.contentid}`,
        category: row.category,
        metadata: row.metadata,
        updated_at: row.updated_at
      })
    }
  );
}

async function findChunk(config, documentId) {
  const rows = await supabaseRequest(
    config,
    `/${encodeURIComponent(config.chunksTable)}?select=id&document_id=eq.${encodeFilterValue(documentId)}&chunk_index=eq.0&limit=1`,
    { method: "GET" }
  );
  return Array.isArray(rows) ? rows[0] || null : null;
}

async function createChunk(config, documentId, row) {
  await supabaseRequest(config, `/${encodeURIComponent(config.chunksTable)}`, {
    method: "POST",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({
      document_id: documentId,
      chunk_index: 0,
      content: row.content,
      metadata: row.metadata
    })
  });
}

async function updateChunk(config, id, row) {
  await supabaseRequest(
    config,
    `/${encodeURIComponent(config.chunksTable)}?id=eq.${encodeFilterValue(id)}`,
    {
      method: "PATCH",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({
        content: row.content,
        metadata: row.metadata
      })
    }
  );
}

async function upsertSupabase(rows) {
  const config = getSupabaseConfig();
  if (
    !config.url ||
    !config.key ||
    !config.schema ||
    !config.documentsTable ||
    !config.chunksTable
  ) {
    throw new Error(
      "Supabase config is missing. Set SUPABASE_URL/NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_SCHEMA, SUPABASE_CHAT_TABLE."
    );
  }

  for (const row of rows) {
    const existingDocument = await findDocument(config, row.source);
    const document = existingDocument || (await createDocument(config, row));
    if (!document?.id) {
      throw new Error(`Could not create document for ${row.source}.`);
    }

    if (existingDocument) {
      await updateDocument(config, document.id, row);
    }

    const existingChunk = await findChunk(config, document.id);
    if (existingChunk?.id) {
      await updateChunk(config, existingChunk.id, row);
    } else {
      await createChunk(config, document.id, row);
    }
  }
}

async function main() {
  loadEnv();
  const args = parseArgs(process.argv.slice(2));
  const serviceKey = getRequiredEnv(
    ["TOUR_API_SERVICE_KEY", "TOURAPI_SERVICE_KEY", "KTO_SERVICE_KEY"],
    "TourAPI service key"
  );

  const list = await fetchDaejeonList({
    areaCode: args.areaCode,
    limit: args.limit,
    rowsPerPage: args.rowsPerPage,
    serviceKey
  });

  const rows = [];
  for (const item of list) {
    const contentId = text(item.contentid);
    if (!contentId) continue;
    const detail = await fetchBarrierFreeDetail(contentId, serviceKey);
    rows.push(buildKnowledgeRow(item, detail));
  }

  if (args.dryRun) {
    console.log(
      JSON.stringify(
        {
          mode: "dry-run",
          count: rows.length,
          message:
            "Use --write to upsert these rows into Supabase after confirming the preview.",
          preview: rows.slice(0, 3)
        },
        null,
        2
      )
    );
    return;
  }

  await upsertSupabase(rows);
  console.log(
    JSON.stringify(
      {
        mode: "write",
        count: rows.length,
        message: "TourAPI barrier-free rows were upserted into Supabase."
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
