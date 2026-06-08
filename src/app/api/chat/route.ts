import { NextResponse } from "next/server";

type Confidence = "high" | "medium" | "low";

type ChatResponse = {
  message: string;
  card?: {
    title: string;
    rows: string[];
    source: string;
  };
  chips: string[];
  confidence: Confidence;
  sources: string[];
  debug?: {
    analysis: QueryAnalysis;
    searchTerms: string[];
  };
};

type DeepSeekChatResponse = {
  model?: string;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
};

type KnowledgeRow = {
  title?: string | null;
  category?: string | null;
  content?: string | null;
  metadata?: Record<string, unknown> | null;
  source?: string | null;
  tags?: string[] | null;
  updated_at?: string | null;
};

type QueryAnalysis = {
  in_scope: boolean;
  scope_reason: string;
  intent: "recommend_place" | "check_accessibility" | "ask_info";
  accessibility_needs: string[];
  weather_sensitive: boolean;
  place_name: string | null;
  location: string | null;
  keywords: string[];
};

type KnowledgeResult = {
  status: "not_configured" | "ready" | "empty" | "unavailable";
  rows: KnowledgeRow[];
  message: string;
};

const DEEPSEEK_CHAT_URL = "https://api.deepseek.com/chat/completions";
const DEFAULT_MODEL = "deepseek-v4-flash";
const SUPPORTED_MODELS = new Set(["deepseek-v4-flash", "deepseek-v4-pro"]);
const FALLBACK_CHIPS = [
  "한밭수목원 휠체어 가능해?",
  "성심당 휠체어로 갈 수 있어?",
  "대전역에서 접근성 좋은 코스 추천해줘"
];

const systemPrompt = [
  "너는 대전 무장애 여행 앱 '다유'의 챗봇이다.",
  "사용자에게 이동약자, 휠체어, 유모차, 고령자 관점의 여행 정보를 한국어로 짧고 실용적으로 답한다.",
  "Supabase 근거 데이터가 제공되면 그 내용을 우선 사용한다.",
  "근거 데이터에 없는 내용은 확정 정보처럼 단정하지 말고 방문 전 확인이 필요한 부분을 분명히 말한다.",
  "답변은 3~6문장으로 작성하고, 불확실한 시설 정보는 확인 권장으로 표현한다.",
  "마크다운, 굵게 표시, 번호 목록은 쓰지 말고 일반 문장으로만 답한다."
].join(" ");

const classifierPrompt = [
  "사용자의 대전 여행 질문을 검색용 JSON으로만 분류한다.",
  "반드시 유효한 JSON 객체 하나만 출력한다.",
  "다른 설명, 마크다운, 코드블록은 출력하지 않는다.",
  "대전 무장애 여행, 접근성, 이동약자 여행, 장소 추천, 여행 코스, 여행 중 날씨 고려와 관련 있으면 in_scope를 true로 둔다.",
  "인사, 챗봇 사용법, 다유 서비스 설명처럼 앱 대화 시작에 필요한 질문도 in_scope를 true로 둔다.",
  "코딩, 과제, 투자, 정치, 일반 잡담, 여행과 무관한 지식 질문은 in_scope를 false로 둔다.",
  "scope_reason은 범위 판단 이유를 한국어 짧은 문장으로 쓴다.",
  "intent는 recommend_place, check_accessibility, ask_info 중 하나다.",
  "accessibility_needs는 wheelchair, stroller, elderly, visual_impairment, hearing_impairment, mobility_access 중 필요한 값만 넣는다.",
  "날씨, 오늘, 비, 더위, 추위, 미세먼지처럼 현재 조건이 필요하면 weather_sensitive를 true로 둔다.",
  "대전 앱이므로 location이 없으면 대전으로 둔다.",
  "place_name은 특정 장소명이 있으면 문자열, 없으면 null이다.",
  "keywords는 DB 검색에 쓸 한국어 핵심어 3~8개다."
].join(" ");

function createErrorResponse(message: string): ChatResponse {
  return {
    message,
    chips: FALLBACK_CHIPS,
    confidence: "low",
    sources: []
  };
}

function createOutOfScopeResponse(analysis: QueryAnalysis): ChatResponse {
  return {
    message:
      "저는 대전 무장애 여행과 접근성 정보를 도와주는 챗봇이에요. 여행지 추천, 휠체어 이동 가능 여부, 유모차 동선, 장애인 화장실, 실내외 코스처럼 대전 여행과 관련된 질문으로 다시 물어봐 주세요.",
    card: {
      title: "질문 범위 안내",
      rows: [
        `질문분류: 범위 밖`,
        `판단이유: ${analysis.scope_reason}`,
        "처리: DB 검색과 답변 생성을 건너뜀"
      ],
      source: "DeepSeek 질문 분류"
    },
    chips: FALLBACK_CHIPS,
    confidence: "high",
    sources: ["DeepSeek 질문 분류"],
    debug: {
      analysis,
      searchTerms: buildSearchTerms(analysis)
    }
  };
}

function createNoKnowledgeResponse({
  analysis,
  knowledge,
  searchTerms
}: {
  analysis: QueryAnalysis;
  knowledge: KnowledgeResult;
  searchTerms: string[];
}): ChatResponse {
  return {
    message:
      "질문 분류는 완료했지만 아직 Supabase 근거 데이터가 준비되지 않아 최종 추천 답변은 생성하지 않았어요. chatbot schema를 Data API에 노출하고 chunks 데이터가 들어가면, 그 근거를 조회한 뒤 답변을 생성할게요.",
    card: {
      title: "DB 조회 대기",
      rows: [
        `질문분류: ${analysis.intent} · ${analysis.accessibility_needs.join(", ") || "일반"}`,
        `Supabase: ${knowledge.message}`,
        "처리: DB 근거 없음으로 최종 답변 생성 중단"
      ],
      source: "DeepSeek 질문 분류 · Supabase 조회"
    },
    chips: [
      "한밭수목원 휠체어 가능해?",
      "유모차로 갈만한 실내 장소",
      "거동이 불편한 부모님 코스"
    ],
    confidence: "low",
    sources: ["DeepSeek 질문 분류"],
    debug: {
      analysis,
      searchTerms
    }
  };
}

function createSuccessResponse({
  message,
  model,
  usage,
  knowledge,
  analysis,
  searchTerms
}: {
  message: string;
  model: string;
  usage?: DeepSeekChatResponse["usage"];
  knowledge: KnowledgeResult;
  analysis: QueryAnalysis;
  searchTerms: string[];
}): ChatResponse {
  const rows = [
    `모델: ${model}`,
    "비용 절약 모드: V4 Flash · 짧은 응답 · thinking off",
    `질문분류: ${analysis.intent} · ${analysis.accessibility_needs.join(", ") || "일반"}`,
    `Supabase: ${knowledge.message}`
  ];

  if (usage?.total_tokens) {
    rows.push(`사용 토큰: ${usage.total_tokens.toLocaleString("ko-KR")}개`);
  }

  return {
    message,
    card: {
      title: "챗봇 연결 상태",
      rows,
      source:
        knowledge.status === "ready" ? "DeepSeek API · Supabase" : "DeepSeek API"
    },
    chips: [
      "접근성 근거도 붙여줘",
      "대전 여행지 추천해줘",
      "Supabase 데이터도 연결해줘"
    ],
    confidence: "medium",
    sources: [
      `DeepSeek API (${model})`,
      ...knowledge.rows
        .map((row) => getRowText(row, "source"))
        .filter((source): source is string => Boolean(source))
    ],
    debug: {
      analysis,
      searchTerms
    }
  };
}

function getSupabaseConfig() {
  const rawUrl = (
    process.env.SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    ""
  ).trim();
  const key = (
    process.env.SUPABASE_SECRET_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    ""
  ).trim();
  const schema = (process.env.SUPABASE_SCHEMA || "chatbot").trim();
  const rawTable = (process.env.SUPABASE_CHAT_TABLE || "chunks").trim();
  const [schemaFromTable, tableFromTable] = rawTable.includes(".")
    ? rawTable.split(".", 2)
    : [];

  return {
    key,
    schema: schemaFromTable || schema,
    table: tableFromTable || rawTable,
    url: normalizeSupabaseRestUrl(rawUrl)
  };
}

function normalizeSupabaseRestUrl(rawUrl: string) {
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

function getDeepSeekModel() {
  const model = process.env.DEEPSEEK_MODEL?.trim() || DEFAULT_MODEL;
  return SUPPORTED_MODELS.has(model) ? model : DEFAULT_MODEL;
}

async function classifyQuestion({
  apiKey,
  message,
  model
}: {
  apiKey: string;
  message: string;
  model: string;
}): Promise<QueryAnalysis> {
  try {
    const response = await fetch(DEEPSEEK_CHAT_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: classifierPrompt },
          {
            role: "user",
            content: [
              "다음 질문을 JSON으로 분류해.",
              "예시 출력:",
              '{"in_scope":true,"scope_reason":"대전 무장애 여행지 추천 질문","intent":"recommend_place","accessibility_needs":["wheelchair"],"weather_sensitive":true,"place_name":null,"location":"대전","keywords":["휠체어","장애인","날씨","추천"]}',
              `질문: ${message}`
            ].join("\n")
          }
        ],
        response_format: { type: "json_object" },
        thinking: { type: "disabled" },
        max_tokens: 300,
        temperature: 0,
        stream: false
      })
    });

    if (!response.ok) {
      return fallbackAnalysis(message);
    }

    const data = (await response.json()) as DeepSeekChatResponse;
    const content = data.choices?.[0]?.message?.content;
    return normalizeAnalysis(content ? JSON.parse(content) : null, message);
  } catch {
    return fallbackAnalysis(message);
  }
}

function normalizeAnalysis(value: unknown, message: string): QueryAnalysis {
  const input = typeof value === "object" && value ? value : {};
  const record = input as Record<string, unknown>;
  const fallback = fallbackAnalysis(message);
  const intent =
    record.intent === "recommend_place" ||
    record.intent === "check_accessibility" ||
    record.intent === "ask_info"
      ? record.intent
      : fallback.intent;
  const allowedNeeds = new Set([
    "wheelchair",
    "stroller",
    "elderly",
    "visual_impairment",
    "hearing_impairment",
    "mobility_access"
  ]);
  const accessibilityNeeds = Array.isArray(record.accessibility_needs)
    ? record.accessibility_needs
        .filter((item): item is string => typeof item === "string")
        .filter((item) => allowedNeeds.has(item))
    : fallback.accessibility_needs;
  const keywords = Array.isArray(record.keywords)
    ? record.keywords
        .filter((item): item is string => typeof item === "string")
        .map((item) => item.trim())
        .filter(Boolean)
        .slice(0, 8)
    : fallback.keywords;

  return {
    in_scope:
      typeof record.in_scope === "boolean" ? record.in_scope : fallback.in_scope,
    scope_reason:
      typeof record.scope_reason === "string" && record.scope_reason.trim()
        ? record.scope_reason.trim()
        : fallback.scope_reason,
    intent,
    accessibility_needs: accessibilityNeeds,
    weather_sensitive:
      typeof record.weather_sensitive === "boolean"
        ? record.weather_sensitive
        : fallback.weather_sensitive,
    place_name:
      typeof record.place_name === "string" && record.place_name.trim()
        ? record.place_name.trim()
        : null,
    location:
      typeof record.location === "string" && record.location.trim()
        ? record.location.trim()
        : "대전",
    keywords
  };
}

function fallbackAnalysis(message: string): QueryAnalysis {
  const keywords = Array.from(
    new Set(
      message
        .split(/[\s,.;!?]+/)
        .map((word) => word.trim())
        .filter((word) => word.length >= 2)
        .slice(0, 8)
    )
  );

  return {
    in_scope: true,
    scope_reason: "분류 모델 실패 시 기본 대전 여행 상담으로 처리",
    intent:
      message.includes("어디") || message.includes("추천")
        ? "recommend_place"
        : message.includes("가능") || message.includes("갈 수")
          ? "check_accessibility"
          : "ask_info",
    accessibility_needs:
      message.includes("휠체어") || message.includes("장애인")
        ? ["wheelchair"]
        : [],
    weather_sensitive:
      message.includes("오늘") ||
      message.includes("날씨") ||
      message.includes("비"),
    place_name: null,
    location: "대전",
    keywords
  };
}

async function fetchKnowledge(analysis: QueryAnalysis): Promise<KnowledgeResult> {
  const config = getSupabaseConfig();

  if (!config.url || !config.key || !config.schema || !config.table) {
    return {
      status: "not_configured",
      rows: [],
      message: "환경변수 미설정"
    };
  }

  const searchTerms = buildSearchTerms(analysis);
  const params = new URLSearchParams({ select: "*", limit: "5" });

  if (searchTerms.length) {
    params.set(
      "or",
      `(${searchTerms
        .map((term) => `content.ilike.%${escapeSupabaseFilterValue(term)}%`)
        .join(",")})`
    );
  }

  try {
    const response = await fetch(
      `${config.url}/${encodeURIComponent(config.table)}?${params.toString()}`,
      {
        headers: {
          apikey: config.key,
          Authorization: `Bearer ${config.key}`,
          "Accept-Profile": config.schema,
          Accept: "application/json"
        },
        next: { revalidate: 60 }
      }
    );

    if (!response.ok) {
      return {
        status: "unavailable",
        rows: [],
        message:
          response.status === 406
            ? `${config.schema} schema 미노출`
            : `${config.table} 테이블 확인 필요`
      };
    }

    const rows = (await response.json()) as KnowledgeRow[];

    if (!rows.length) {
      return {
        status: "empty",
        rows: [],
        message: `${config.schema}.${config.table} 데이터 없음`
      };
    }

    return {
      status: "ready",
      rows,
      message: `${config.schema}.${config.table} ${rows.length}건 사용`
    };
  } catch {
    return {
      status: "unavailable",
      rows: [],
      message: "연결 실패"
    };
  }
}

function buildSearchTerms(analysis: QueryAnalysis) {
  return Array.from(
    new Set(
      [
        analysis.place_name,
        analysis.location,
        ...analysis.keywords,
        ...analysis.accessibility_needs.flatMap((need) =>
          need === "wheelchair"
            ? ["휠체어", "장애인", "경사로", "엘리베이터"]
            : need === "stroller"
              ? ["유모차", "수유실", "엘리베이터"]
              : need === "elderly" || need === "mobility_access"
                ? ["이동약자", "계단", "경사로", "휴식"]
                : [need]
        ),
        analysis.weather_sensitive ? "실내" : null,
        analysis.weather_sensitive ? "우천" : null
      ]
        .filter((term): term is string => Boolean(term))
        .map((term) => term.trim())
        .filter(Boolean)
    )
  ).slice(0, 10);
}

function escapeSupabaseFilterValue(value: string) {
  return value.replace(/[%*,()]/g, "");
}

function formatKnowledgeContext(knowledge: KnowledgeResult) {
  if (!knowledge.rows.length) {
    return [
      "Supabase 근거 데이터는 아직 사용할 수 없다.",
      `상태: ${knowledge.message}`
    ].join("\n");
  }

  return [
    "Supabase 근거 데이터:",
    ...knowledge.rows.map((row, index) =>
      [
        `${index + 1}. ${getRowText(row, "title") || "제목 없음"}`,
        getRowText(row, "category") ? `분류: ${getRowText(row, "category")}` : null,
        row.content ? `내용: ${row.content}` : null,
        getRowText(row, "source") ? `출처: ${getRowText(row, "source")}` : null,
        getRowTags(row).length ? `태그: ${getRowTags(row).join(", ")}` : null
      ]
        .filter(Boolean)
        .join("\n")
    )
  ].join("\n\n");
}

function getRowText(row: KnowledgeRow, key: "title" | "category" | "source") {
  const direct = row[key];
  const metadataValue = row.metadata?.[key];
  return typeof direct === "string"
    ? direct
    : typeof metadataValue === "string"
      ? metadataValue
      : null;
}

function getRowTags(row: KnowledgeRow) {
  const metadataTags = row.metadata?.tags;
  if (Array.isArray(row.tags)) return row.tags;
  if (Array.isArray(metadataTags)) {
    return metadataTags.filter((tag): tag is string => typeof tag === "string");
  }
  return [];
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { message?: unknown };
    const message = typeof body.message === "string" ? body.message.trim() : "";

    if (!message) {
      return NextResponse.json(
        { error: "message is required" },
        { status: 400 }
      );
    }

    const apiKey = process.env.DEEPSEEK_API_KEY?.trim();
    const model = getDeepSeekModel();

    if (!apiKey) {
      return NextResponse.json(
        createErrorResponse(
          "DeepSeek API 키가 서버 환경에 아직 적용되지 않았어요. .env.local에 DEEPSEEK_API_KEY를 넣고 서버를 다시 시작해 주세요."
        )
      );
    }

    const analysis = await classifyQuestion({ apiKey, message, model });

    if (!analysis.in_scope) {
      return NextResponse.json(createOutOfScopeResponse(analysis));
    }

    const searchTerms = buildSearchTerms(analysis);
    const knowledge = await fetchKnowledge(analysis);

    if (knowledge.status !== "ready") {
      return NextResponse.json(
        createNoKnowledgeResponse({ analysis, knowledge, searchTerms })
      );
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);

    const deepSeekResponse = await fetch(DEEPSEEK_CHAT_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "system", content: formatKnowledgeContext(knowledge) },
          { role: "user", content: message }
        ],
        thinking: { type: "disabled" },
        max_tokens: 600,
        temperature: 0.3,
        stream: false
      }),
      signal: controller.signal
    }).finally(() => clearTimeout(timeout));

    if (!deepSeekResponse.ok) {
      return NextResponse.json(
        createErrorResponse(
          "DeepSeek API 호출에 실패했어요. 키, 잔액, 모델명을 확인한 뒤 다시 시도해 주세요."
        )
      );
    }

    const data = (await deepSeekResponse.json()) as DeepSeekChatResponse;
    const answer = data.choices?.[0]?.message?.content?.trim();

    if (!answer) {
      return NextResponse.json(
        createErrorResponse(
          "DeepSeek 응답은 도착했지만 답변 본문이 비어 있어요. 잠시 뒤 다시 질문해 주세요."
        )
      );
    }

    return NextResponse.json(
      createSuccessResponse({
        message: answer,
        model: data.model || model,
        usage: data.usage,
        knowledge,
        analysis,
        searchTerms
      })
    );
  } catch (error) {
    const message =
      error instanceof Error && error.name === "AbortError"
        ? "DeepSeek 응답 시간이 길어져 요청을 중단했어요. 질문을 조금 짧게 해서 다시 시도해 주세요."
        : "응답을 만드는 중 문제가 생겼어요. 잠시 뒤 다시 질문해 주세요.";

    return NextResponse.json(createErrorResponse(message));
  }
}
