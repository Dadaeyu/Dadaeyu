#!/usr/bin/env node

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

const DEFAULT_LIMIT = 500;
const DEFAULT_CSV_PATH = "outputs/chatbot-db-data-summary.csv";
const PUBLIC_TOILET_URL = "https://apis.data.go.kr/B554695/ToiletSVC/getToiletData01";
const CULTURE_TOUR_URL = "http://apis.data.go.kr/6300000/openapi2022/tourspot/gettourspot";
const ACCESSIBLE_PARKING_URL = "https://www.seogu.go.kr/seoguAPI/3660000/getDspsnParkLcSttus";

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
    const value = trimmed
      .slice(index + 1)
      .trim()
      .replace(/^['"]|['"]$/g, "");
    if (key && process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

function parseArgs(argv) {
  const args = {
    csvPath: DEFAULT_CSV_PATH,
    dryRun: true,
    limit: DEFAULT_LIMIT,
    parkingLimit: DEFAULT_LIMIT,
    publicToiletLimit: DEFAULT_LIMIT,
    cultureTourLimit: DEFAULT_LIMIT
  };

  for (const item of argv) {
    if (item === "--write") {
      args.dryRun = false;
    } else if (item === "--dry-run") {
      args.dryRun = true;
    } else if (item.startsWith("--limit=")) {
      args.limit = Number(item.split("=", 2)[1]);
      args.parkingLimit = args.limit;
      args.publicToiletLimit = args.limit;
      args.cultureTourLimit = args.limit;
    } else if (item.startsWith("--parking-limit=")) {
      args.parkingLimit = Number(item.split("=", 2)[1]);
    } else if (item.startsWith("--public-toilet-limit=")) {
      args.publicToiletLimit = Number(item.split("=", 2)[1]);
    } else if (item.startsWith("--culture-tour-limit=")) {
      args.cultureTourLimit = Number(item.split("=", 2)[1]);
    } else if (item.startsWith("--csv=")) {
      args.csvPath = item.split("=", 2)[1] || DEFAULT_CSV_PATH;
    }
  }

  for (const [key, value] of Object.entries({
    limit: args.limit,
    parkingLimit: args.parkingLimit,
    publicToiletLimit: args.publicToiletLimit,
    cultureTourLimit: args.cultureTourLimit
  })) {
    if (!Number.isInteger(value) || value < 1) {
      throw new Error(`--${key} must be a positive integer.`);
    }
  }

  return args;
}

function text(value) {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

function numberText(value) {
  const raw = text(value);
  if (!raw) return "0";
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? String(parsed) : raw;
}

function getEnv(names) {
  for (const name of names) {
    const value = process.env[name]?.trim();
    if (value) return value;
  }
  return "";
}

function normalizeSupabaseRestUrl(rawUrl) {
  if (!rawUrl) return "";

  try {
    const parsed = new URL(rawUrl);
    return rawUrl.includes("/rest/v1") ? rawUrl.replace(/\/$/, "") : `${parsed.origin}/rest/v1`;
  } catch {
    return "";
  }
}

function getSupabaseConfig() {
  const rawUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || "";
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

function encodeServiceKey(serviceKey) {
  return serviceKey.includes("%") ? serviceKey : encodeURIComponent(serviceKey);
}

function buildPublicDataUrl(baseUrl, serviceKey, params = {}) {
  const searchParams = new URLSearchParams(params);
  return `${baseUrl}?${searchParams.toString()}&serviceKey=${encodeServiceKey(serviceKey)}`;
}

async function fetchText(url) {
  const response = await fetch(url, {
    headers: {
      "User-Agent": "DadaeyuBot/1.0"
    }
  });
  const body = await response.text();

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${body.slice(0, 300)}`);
  }

  return body;
}

async function fetchJson(url) {
  const textBody = await fetchText(url);
  try {
    return JSON.parse(textBody);
  } catch {
    throw new Error(`Expected JSON but received: ${textBody.slice(0, 300)}`);
  }
}

function normalizePublicDataResultCode(code) {
  return text(code).toUpperCase();
}

function assertPublicDataOk(header, label) {
  const code = normalizePublicDataResultCode(header?.resultCode);
  if (!code || code === "00" || code === "0000" || code === "C00") return;

  throw new Error(`${label} failed: ${code} ${text(header?.resultMsg)}`);
}

function normalizeJsonItems(items) {
  if (!items) return [];
  if (Array.isArray(items)) return items;
  if (Array.isArray(items.item)) return items.item;
  if (items.item && typeof items.item === "object") return [items.item];
  if (typeof items === "object") return Object.values(items).filter((item) => item);
  return [];
}

function decodeXml(value) {
  return text(value)
    .replace(/<!\[CDATA\[(.*?)\]\]>/gs, "$1")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function getXmlTag(xml, tagName) {
  const pattern = new RegExp(`<${tagName}>([\\s\\S]*?)<\\/${tagName}>`, "i");
  const match = xml.match(pattern);
  return match ? decodeXml(match[1]) : "";
}

function parseXmlItems(xml, fieldNames) {
  return Array.from(xml.matchAll(/<item>([\s\S]*?)<\/item>/gi)).map((match) => {
    const block = match[1];
    return Object.fromEntries(fieldNames.map((field) => [field, getXmlTag(block, field)]));
  });
}

function makeSource(prefix, value) {
  return `${prefix}:${text(value).replace(/\s+/g, "_")}`;
}

function buildAccessibilityTags(content) {
  const normalized = content.toLocaleLowerCase("ko-KR");
  const tags = new Set();

  if (
    normalized.includes("장애인") ||
    normalized.includes("휠체어") ||
    normalized.includes("엘리베이터") ||
    normalized.includes("승강기") ||
    normalized.includes("경사로")
  ) {
    tags.add("wheelchair");
    tags.add("mobility_access");
  }
  if (normalized.includes("점자") || normalized.includes("시각장애")) {
    tags.add("visual_impairment");
  }
  if (
    normalized.includes("수유") ||
    normalized.includes("유모차") ||
    normalized.includes("어린이")
  ) {
    tags.add("stroller");
  }

  return Array.from(tags);
}

function buildPublicToiletRow(item) {
  const name = text(item.name) || "공중화장실";
  const address = [text(item.roadAddress), text(item.jibunAddress)].filter(Boolean).join(" / ");
  const disabledToiletText = [
    `남자 장애인용 대변기 ${numberText(item.menDisabledBowlNum)}개`,
    `남자 장애인용 소변기 ${numberText(item.menDisabledUrinalNum)}개`,
    `여성 장애인용 대변기 ${numberText(item.womenDisabledBowlNum)}개`
  ].join(", ");
  const childToiletText = [
    `남자 어린이용 대변기 ${numberText(item.menChildBowlNum)}개`,
    `남자 어린이용 소변기 ${numberText(item.menChildUrinalNum)}개`,
    `여성 어린이용 대변기 ${numberText(item.womenChildBowlNum)}개`
  ].join(", ");
  const lines = [
    `${name}은/는 대전교통공사에서 제공하는 대전도시철도 공중화장실 정보입니다.`,
    address ? `주소는 ${address}입니다.` : null,
    `장애인 화장실 정보는 ${disabledToiletText}입니다.`,
    `영유아/어린이 화장실 정보는 ${childToiletText}입니다.`,
    text(item.unisex) ? `남녀 공용 여부는 ${text(item.unisex)}입니다.` : null,
    text(item.type) ? `화장실 유형은 ${text(item.type)}입니다.` : null,
    text(item.managePhone) ? `관리기관 연락처는 ${text(item.managePhone)}입니다.` : null,
    "역사별 시설 현황은 바뀔 수 있으니 방문 직전 역무실이나 관리기관에 한 번 더 확인하는 것이 좋습니다."
  ].filter(Boolean);
  const tags = [
    "대전",
    "공중화장실",
    "장애인화장실",
    "도시철도",
    "지하철",
    "wheelchair",
    "mobility_access",
    ...(childToiletText.includes("0개") ? [] : ["stroller"])
  ];

  return {
    title: name,
    category: "공중화장실",
    content: lines.join(" "),
    metadata: {
      title: name,
      category: "공중화장실",
      source: makeSource("data.go.kr:15158504", name),
      source_type: "public_toilet",
      provider: "대전교통공사",
      public_data_pk: "15158504",
      service: "ToiletSVC/getToiletData01",
      tags,
      address,
      road_address: text(item.roadAddress),
      jibun_address: text(item.jibunAddress),
      latitude: text(item.latitude),
      longitude: text(item.longitude),
      tel: text(item.managePhone),
      manage_org: text(item.manageOrg),
      type: text(item.type),
      unisex: text(item.unisex),
      men_disabled_bowl_num: numberText(item.menDisabledBowlNum),
      men_disabled_urinal_num: numberText(item.menDisabledUrinalNum),
      women_disabled_bowl_num: numberText(item.womenDisabledBowlNum),
      men_child_bowl_num: numberText(item.menChildBowlNum),
      men_child_urinal_num: numberText(item.menChildUrinalNum),
      women_child_bowl_num: numberText(item.womenChildBowlNum),
      creation_date: text(item.creationDate),
      imported_at: new Date().toISOString()
    },
    source: makeSource("data.go.kr:15158504", name),
    tags,
    updated_at: new Date().toISOString()
  };
}

function buildAccessibleParkingRow(item) {
  const serial = text(item.sn) || `${text(item.adstrd)}-${text(item.lc)}`;
  const title = [text(item.adstrd), "장애인주차장", serial].filter(Boolean).join(" ");
  const content = [
    `${title}은/는 대전광역시 서구 장애인주차장 위치 정보입니다.`,
    text(item.lc) ? `위치는 ${text(item.lc)}입니다.` : null,
    text(item.adstrd) ? `행정동은 ${text(item.adstrd)}입니다.` : null,
    text(item.la) && text(item.lo)
      ? `좌표는 위도 ${text(item.la)}, 경도 ${text(item.lo)}입니다.`
      : null,
    "장애인 주차 가능 여부와 실제 주차면 사용 가능 여부는 현장 상황에 따라 달라질 수 있습니다."
  ].filter(Boolean);
  const tags = ["대전", "서구", "장애인주차장", "주차장", "wheelchair", "mobility_access"];

  return {
    title,
    category: "장애인주차장",
    content: content.join(" "),
    metadata: {
      title,
      category: "장애인주차장",
      source: makeSource("seogu.go.kr:dspsn_park_lc_sttus", serial),
      source_type: "accessible_parking",
      provider: "대전광역시 서구",
      public_data_pk: "15128308",
      service: "getDspsnParkLcSttus",
      tags,
      address: text(item.lc),
      latitude: text(item.la),
      longitude: text(item.lo),
      administrative_dong: text(item.adstrd),
      serial_number: text(item.sn),
      data_created_date: text(item.data_creat_de),
      imported_at: new Date().toISOString()
    },
    source: makeSource("seogu.go.kr:dspsn_park_lc_sttus", serial),
    tags,
    updated_at: new Date().toISOString()
  };
}

function buildCultureTourRow(item) {
  const title = text(item.tourspotNm) || "대전 문화관광지";
  const address = [text(item.tourspotAddr), text(item.tourspotDtlAddr)].filter(Boolean).join(" ");
  const rawContent = [text(item.tourspotSumm), text(item.pkgFclt), text(item.cnvenFcltGuid)].join(
    " "
  );
  const extraTags = buildAccessibilityTags(rawContent);
  const tags = Array.from(new Set(["대전", "문화관광", "관광지", ...extraTags]));
  const lines = [
    `${title}은/는 대전광역시 문화관광 관광지 정보입니다.`,
    text(item.tourspotSumm) ? `요약: ${text(item.tourspotSumm)}` : null,
    address ? `주소는 ${address}입니다.` : null,
    text(item.refadNo) ? `문의처는 ${text(item.refadNo)}입니다.` : null,
    text(item.mngTime) ? `운영 시간은 ${text(item.mngTime)}입니다.` : null,
    text(item.tourUtlzAmt) ? `이용 금액은 ${text(item.tourUtlzAmt)}입니다.` : null,
    text(item.pkgFclt) ? `주차 시설은 ${text(item.pkgFclt)}입니다.` : null,
    text(item.cnvenFcltGuid) ? `편의 시설 안내는 ${text(item.cnvenFcltGuid)}입니다.` : null,
    "운영 시간, 요금, 편의시설은 변경될 수 있으니 방문 전 공식 안내를 확인해야 합니다."
  ].filter(Boolean);

  return {
    title,
    category: "관광지",
    content: lines.join(" "),
    metadata: {
      title,
      category: "관광지",
      source: makeSource("data.go.kr:15000881", title),
      source_type: "culture_tour",
      provider: "대전광역시",
      public_data_pk: "15000881",
      service: "openapi2022/tourspot/gettourspot",
      tags,
      address,
      road_address: text(item.tourspotAddr),
      detail_address: text(item.tourspotDtlAddr),
      latitude: text(item.mapLat),
      longitude: text(item.mapLot),
      tel: text(item.refadNo),
      zipcode: text(item.tourspotZip),
      operating_time: text(item.mngTime),
      fee: text(item.tourUtlzAmt),
      parking_facility: text(item.pkgFclt),
      convenience_facility: text(item.cnvenFcltGuid),
      url: text(item.urlAddr),
      summary: text(item.tourspotSumm),
      imported_at: new Date().toISOString()
    },
    source: makeSource("data.go.kr:15000881", title),
    tags,
    updated_at: new Date().toISOString()
  };
}

async function fetchPublicToiletRows({ limit, serviceKey }) {
  if (!serviceKey) return [];
  const url = buildPublicDataUrl(PUBLIC_TOILET_URL, serviceKey, {
    pageNo: "1",
    numOfRows: String(limit)
  });
  const xml = await fetchText(url);
  assertPublicDataOk(
    {
      resultCode: getXmlTag(xml, "resultCode"),
      resultMsg: getXmlTag(xml, "resultMsg")
    },
    "Public toilet API"
  );

  const rows = parseXmlItems(xml, [
    "creationDate",
    "latitude",
    "longitude",
    "manageOrg",
    "managePhone",
    "menBowlNum",
    "menChildBowlNum",
    "menChildUrinalNum",
    "menDisabledBowlNum",
    "menDisabledUrinalNum",
    "menUrinalNum",
    "name",
    "roadAddress",
    "type",
    "unisex",
    "womenBowlNum",
    "womenChildBowlNum",
    "womenDisabledBowlNum",
    "jibunAddress"
  ]);

  return rows.slice(0, limit).map(buildPublicToiletRow);
}

async function fetchAccessibleParkingRows({ limit, url }) {
  if (!url) return [];

  const requestUrl = new URL(url);
  requestUrl.searchParams.set("pageNo", "1");
  requestUrl.searchParams.set("numOfRows", String(limit));

  const json = await fetchJson(requestUrl.toString());
  assertPublicDataOk(json?.response?.header, "Accessible parking API");

  const items = normalizeJsonItems(json?.response?.body?.items);
  return items.slice(0, limit).map(buildAccessibleParkingRow);
}

async function fetchCultureTourRows({ limit, serviceKey }) {
  if (!serviceKey) return [];
  const url = buildPublicDataUrl(CULTURE_TOUR_URL, serviceKey, {
    pageNo: "1",
    numOfRows: String(limit)
  });
  const json = await fetchJson(url);
  assertPublicDataOk(json?.header || json?.response?.header, "Culture tour API");

  const items = normalizeJsonItems(json?.body?.items || json?.response?.body?.items);
  return items.slice(0, limit).map(buildCultureTourRow);
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
    throw new Error(`Supabase request failed (${response.status}): ${errorText.slice(0, 500)}`);
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
        source_url: getSourceUrl(row),
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
        source_url: getSourceUrl(row),
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

function getSourceUrl(row) {
  if (row.metadata?.source_type === "public_toilet") {
    return "https://www.data.go.kr/data/15158504/openapi.do";
  }
  if (row.metadata?.source_type === "accessible_parking") {
    return "https://www.data.go.kr/data/15128308/openapi.do";
  }
  if (row.metadata?.source_type === "culture_tour") {
    return "https://www.data.go.kr/data/15000881/openapi.do";
  }
  return "";
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

async function fetchAllChunkRows() {
  const config = getSupabaseConfig();
  if (!config.url || !config.key || !config.schema || !config.chunksTable) return [];

  const params = new URLSearchParams({
    select: "id,document_id,chunk_index,content,metadata,created_at",
    limit: "5000",
    order: "created_at.asc"
  });
  const rows = await supabaseRequest(
    config,
    `/${encodeURIComponent(config.chunksTable)}?${params.toString()}`,
    { method: "GET" }
  );
  return Array.isArray(rows) ? rows : [];
}

function csvEscape(value) {
  const textValue =
    typeof value === "string"
      ? value
      : value === null || value === undefined
        ? ""
        : JSON.stringify(value);
  return `"${textValue.replace(/"/g, '""')}"`;
}

function rowToCsvRecord(row, index) {
  const metadata = row.metadata || {};
  return {
    row_no: index + 1,
    source_type: metadata.source_type || "",
    provider: metadata.provider || "",
    title: metadata.title || row.title || "",
    category: metadata.category || row.category || "",
    address: metadata.address || "",
    latitude: metadata.latitude || "",
    longitude: metadata.longitude || "",
    tel: metadata.tel || "",
    tags: Array.isArray(metadata.tags) ? metadata.tags.join("|") : "",
    source: metadata.source || row.source || "",
    document_id: row.document_id || "",
    chunk_id: row.id || "",
    content: row.content || "",
    imported_at: metadata.imported_at || "",
    updated_at: row.updated_at || row.created_at || ""
  };
}

function writeCsv(filePath, rows) {
  const fullPath = resolve(process.cwd(), filePath);
  mkdirSync(dirname(fullPath), { recursive: true });

  const headers = [
    "row_no",
    "source_type",
    "provider",
    "title",
    "category",
    "address",
    "latitude",
    "longitude",
    "tel",
    "tags",
    "source",
    "document_id",
    "chunk_id",
    "content",
    "imported_at",
    "updated_at"
  ];
  const lines = [
    headers.join(","),
    ...rows.map((row, index) => {
      const record = rowToCsvRecord(row, index);
      return headers.map((header) => csvEscape(record[header])).join(",");
    })
  ];

  writeFileSync(fullPath, `${lines.join("\n")}\n`, "utf8");
  return fullPath;
}

async function main() {
  loadEnv();
  const args = parseArgs(process.argv.slice(2));

  const publicToiletKey = getEnv(["DAEJEON_PUBLIC_TOILET_SERVICE_KEY", "PUBLIC_DATA_SERVICE_KEY"]);
  const cultureTourKey = getEnv(["DAEJEON_CULTURE_TOUR_SERVICE_KEY", "PUBLIC_DATA_SERVICE_KEY"]);
  const parkingUrl = getEnv(["DAEJEON_ACCESSIBLE_PARKING_API_URL"]) || ACCESSIBLE_PARKING_URL;

  const [publicToilets, accessibleParking, cultureTour] = await Promise.all([
    fetchPublicToiletRows({
      limit: args.publicToiletLimit,
      serviceKey: publicToiletKey
    }),
    fetchAccessibleParkingRows({
      limit: args.parkingLimit,
      url: parkingUrl
    }),
    fetchCultureTourRows({
      limit: args.cultureTourLimit,
      serviceKey: cultureTourKey
    })
  ]);

  const rows = [...publicToilets, ...accessibleParking, ...cultureTour];

  if (args.dryRun) {
    console.log(
      JSON.stringify(
        {
          mode: "dry-run",
          counts: {
            public_toilet: publicToilets.length,
            accessible_parking: accessibleParking.length,
            culture_tour: cultureTour.length,
            total: rows.length
          },
          preview: rows.slice(0, 5).map((row) => ({
            title: row.title,
            category: row.category,
            source: row.source
          })),
          message: "Use --write to upsert these rows into Supabase."
        },
        null,
        2
      )
    );
    return;
  }

  await upsertSupabase(rows);
  const allChunkRows = await fetchAllChunkRows();
  const csvPath = writeCsv(args.csvPath, allChunkRows);

  console.log(
    JSON.stringify(
      {
        mode: "write",
        counts: {
          public_toilet: publicToilets.length,
          accessible_parking: accessibleParking.length,
          culture_tour: cultureTour.length,
          upserted_total: rows.length,
          csv_rows: allChunkRows.length
        },
        csv_path: csvPath,
        message: "Daejeon OpenAPI rows were upserted and the DB summary CSV was written."
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
