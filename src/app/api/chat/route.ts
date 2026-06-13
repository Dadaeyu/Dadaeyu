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

type OpenAIEmbeddingResponse = {
  data?: Array<{
    embedding?: number[];
    index?: number;
  }>;
};

type KnowledgeRow = {
  id?: string | null;
  document_id?: string | null;
  chunk_index?: number | null;
  title?: string | null;
  category?: string | null;
  content?: string | null;
  metadata?: Record<string, unknown> | null;
  similarity?: number | null;
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
  searchMode: "vector" | "keyword" | "none";
  embeddingModel?: string;
  fallbackReason?: string;
};

type VectorReadiness = {
  ready: boolean;
  message: string;
};

const DEEPSEEK_CHAT_URL = "https://api.deepseek.com/chat/completions";
const OPENAI_EMBEDDINGS_URL = "https://api.openai.com/v1/embeddings";
const DEFAULT_MODEL = "deepseek-v4-flash";
const DEFAULT_EMBEDDING_MODEL = "text-embedding-3-small";
const DEFAULT_EMBEDDING_DIMENSIONS = 1536;
const SUPPORTED_MODELS = new Set(["deepseek-v4-flash", "deepseek-v4-pro"]);
const KNOWLEDGE_CANDIDATE_LIMIT = 100;
const KNOWLEDGE_RESULT_LIMIT = 5;
const VECTOR_CANDIDATE_LIMIT = 20;
const VECTOR_READINESS_TTL_MS = 60_000;
const SITE_GUIDE_CHIPS = [
  "왜 만들었어?",
  "어떻게 질문하면 돼?",
  "데이터 출처는 어디야?"
];
const FALLBACK_CHIPS = [
  "다대유는 어떤 사이트야?",
  "대전어린이회관 휠체어 가능해?",
  "대전한밭도서관 접근성 알려줘"
];

let vectorReadinessCache:
  | {
      checkedAt: number;
      key: string;
      result: VectorReadiness;
    }
  | null = null;

const GENERIC_SEARCH_TERMS = new Set([
  "대전",
  "추천",
  "여행",
  "장소",
  "어디",
  "오늘",
  "날씨",
  "정보",
  "알려줘"
]);

const CATEGORY_ALIASES: Record<string, string[]> = {
  관광지: ["관광", "관광지", "여행지", "공원", "산책", "코스"],
  문화시설: ["문화", "문화시설", "박물관", "미술관", "도서관", "전시"],
  음식점: ["음식", "음식점", "식당", "맛집", "카페", "밥"],
  쇼핑: ["쇼핑", "시장", "백화점", "상점"],
  숙박: ["숙박", "호텔", "숙소", "레지던스"],
  레포츠: ["레포츠", "운동", "체육", "캠핑"]
};

const ACCESSIBILITY_RULES: Record<
  string,
  { tags: string[]; fields: string[]; terms: string[] }
> = {
  wheelchair: {
    tags: ["wheelchair", "mobility_access"],
    fields: [
      "parking",
      "publictransport",
      "route",
      "wheelchair",
      "exit",
      "elevator",
      "restroom",
      "auditorium",
      "room",
      "handicapetc"
    ],
    terms: ["휠체어", "장애인", "경사로", "엘리베이터", "화장실", "접근로"]
  },
  mobility_access: {
    tags: ["wheelchair", "mobility_access"],
    fields: ["parking", "publictransport", "route", "exit", "elevator", "restroom"],
    terms: ["이동약자", "장애인", "경사로", "엘리베이터", "화장실", "접근로"]
  },
  elderly: {
    tags: ["mobility_access"],
    fields: ["publictransport", "route", "exit", "elevator", "restroom"],
    terms: ["이동약자", "계단", "경사로", "엘리베이터", "휴식"]
  },
  stroller: {
    tags: ["stroller"],
    fields: ["stroller", "lactationroom", "babysparechair", "infantsfamilyetc", "elevator"],
    terms: ["유모차", "수유실", "유아", "엘리베이터"]
  },
  visual_impairment: {
    tags: ["visual_impairment"],
    fields: [
      "braileblock",
      "helpdog",
      "guidehuman",
      "audioguide",
      "bigprint",
      "brailepromotion",
      "guidesystem",
      "blindhandicapetc"
    ],
    terms: ["점자", "보조견", "오디오", "안내요원", "시각장애"]
  },
  hearing_impairment: {
    tags: ["hearing_impairment"],
    fields: ["signguide", "videoguide", "hearingroom", "hearinghandicapetc"],
    terms: ["수화", "자막", "청각장애"]
  }
};

const systemPrompt = [
  "너는 대전 무장애 여행 앱 '다유'의 챗봇이다.",
  "사용자에게 이동약자, 휠체어, 유모차, 고령자 관점의 여행 정보를 한국어로 짧고 실용적으로 답한다.",
  "말투는 자연스러운 현대 표준어를 기본으로 하되, 대전/충청권 안내원이 말하듯 다정하고 느긋한 호흡을 섞는다.",
  "사투리 표현은 단어 자체보다 말의 속도와 태도에 가깝게 쓴다. 예를 들면 '천천히 같이 봐요', '걱정부터 덜어볼게요', '한번 확인해보면 좋아요'처럼 부드럽게 안내한다.",
  "'가능해유', '좋아유', '그려유'처럼 노골적인 방언형 어미는 가급적 쓰지 않는다.",
  "모든 문장 끝에 '~유'를 붙이는 식의 과장된 사투리는 절대 쓰지 않는다.",
  "자연스럽게 어울릴 때만 '괜찮아요', '한번 확인해보면 좋아요', '그럴 수 있어요', '맞을 거예요' 같은 부드러운 표현을 사용한다.",
  "희화화된 방언, 억지스러운 사투리, 장난스러운 말투는 피한다.",
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

function createStaticSiteFaqResponse(message: string): ChatResponse | null {
  const compactMessage = normalizeStaticFaqText(message);

  if (
    includesAny(compactMessage, [
      "어떤사이트",
      "무슨사이트",
      "뭐하는사이트",
      "뭐하는앱",
      "뭐하는서비스",
      "다대유뭐",
      "다유뭐",
      "사이트소개",
      "서비스소개"
    ])
  ) {
    return createSiteGuideResponse({
      message:
        "다대유는 대전 여행을 준비할 때, 방문 전에 접근성 정보를 먼저 살펴볼 수 있게 돕는 무장애 여행 플랫폼이에요. 휠체어, 유모차, 고령자 동선처럼 막상 가면 중요한 것들을 미리 챙겨보자는 취지예요. 지도랑 코스 흐름까지 이어서 볼 수 있게 만드는 중이라, 걱정부터 조금 덜고 천천히 골라볼 수 있어요.",
      rows: [
        "대상: 대전 여행을 준비하는 누구나",
        "핵심: 접근성 정보와 여행지 탐색",
        "챗봇: 장소 추천과 방문 전 확인사항 정리"
      ]
    });
  }

  if (
    includesAny(compactMessage, [
      "왜만들",
      "만든이유",
      "기획의도",
      "서비스목적",
      "취지",
      "왜필요"
    ])
  ) {
    return createSiteGuideResponse({
      message:
        "여행지는 많은데, 이동약자에게 꼭 필요한 정보는 여기저기 흩어져 있는 경우가 많잖아요. 다대유는 대전에 가보고 싶은 마음이 생겼을 때 '갈 수 있을까?'부터 걱정하지 않도록 만든 서비스예요. 방문 전에 확인할 정보를 한곳에 모아두면, 같이 가는 사람들도 훨씬 편하게 계획할 수 있어요.",
      rows: [
        "문제: 접근성 정보가 여러 곳에 흩어져 있음",
        "목표: 방문 전 확인 부담 줄이기",
        "방향: 모두가 함께 계획할 수 있는 대전 여행"
      ]
    });
  }

  if (
    includesAny(compactMessage, [
      "어떻게써",
      "사용법",
      "이용방법",
      "질문하면",
      "뭐물어",
      "뭘물어",
      "어떤질문",
      "질문예시"
    ])
  ) {
    return createSiteGuideResponse({
      message:
        "장소명에 필요한 조건을 붙여서 물어보면 제일 좋아요. 예를 들면 '대전어린이회관 휠체어 가능해?', '유모차로 갈만한 문화시설 추천해줘', '비 오는 날 실내로 갈 곳 알려줘'처럼요. 조건이 조금 애매해도 괜찮아요. 제가 먼저 분류하고, 근거가 있는 것만 차근차근 정리해볼게요.",
      rows: [
        "장소 확인: 특정 여행지 접근성 질문",
        "조건 추천: 휠체어, 유모차, 고령자, 날씨",
        "주의: DB 근거가 없으면 추측하지 않음"
      ]
    });
  }

  if (
    includesAny(compactMessage, [
      "누가써",
      "누구를위한",
      "사용자",
      "대상",
      "장애인만",
      "비장애인"
    ])
  ) {
    return createSiteGuideResponse({
      message:
        "다대유는 장애인만을 위한 서비스로 좁히기보다, 이동이 편한 여행을 준비하고 싶은 모두를 위한 서비스에 가까워요. 휠체어 이용자, 유모차를 끄는 가족, 고령자와 함께 가는 여행자, 처음 가는 장소가 걱정되는 사람도 편하게 쓸 수 있어요. 누구랑 가든 먼저 동선을 살펴보면 마음이 조금 놓이니까요.",
      rows: [
        "휠체어 이용자와 보호자",
        "유모차 동반 가족과 고령자 동반 여행자",
        "방문 전 동선을 미리 보고 싶은 사용자"
      ]
    });
  }

  if (
    includesAny(compactMessage, [
      "데이터출처",
      "정보출처",
      "근거",
      "믿을만",
      "어디서가져",
      "공공데이터"
    ])
  ) {
    return createSiteGuideResponse({
      message:
        "현재 챗봇 테스트 데이터는 한국관광공사 TourAPI의 대전 무장애 여행 데이터를 바탕으로 정리하고 있어요. 다만 운영 여부나 편의시설은 현장에서 바뀔 수 있잖아요. 그래서 중요한 방문 전에는 공식 홈페이지나 전화로 한 번 더 확인하는 흐름을 권장해요.",
      rows: [
        "현재 원천: 한국관광공사 TourAPI 테스트 데이터",
        "처리 방식: DB 근거를 먼저 찾고 답변 생성",
        "주의: 운영 정보는 방문 전 재확인 권장"
      ]
    });
  }

  return null;
}

function createSiteGuideResponse({
  message,
  rows
}: {
  message: string;
  rows: string[];
}): ChatResponse {
  return {
    message,
    card: {
      title: "다대유 안내",
      rows,
      source: "고정 서비스 안내"
    },
    chips: [
      ...SITE_GUIDE_CHIPS,
      "대전어린이회관 휠체어 가능해?"
    ],
    confidence: "high",
    sources: []
  };
}

function normalizeStaticFaqText(value: string) {
  return value.toLocaleLowerCase("ko-KR").replace(/\s+/g, "");
}

function includesAny(value: string, terms: string[]) {
  return terms.some((term) => value.includes(term));
}

function createOutOfScopeResponse(analysis: QueryAnalysis): ChatResponse {
  return {
    message:
      "저는 대전 무장애 여행과 접근성 정보를 도와주는 챗봇이에요. 이 질문은 제가 잘 도와드리기 어려워요. 여행지 추천, 휠체어 이동 가능 여부, 유모차 동선, 장애인 화장실, 실내외 코스처럼 대전 여행과 관련된 내용으로 다시 물어봐 주세요. 그쪽은 제가 차근차근 같이 볼 수 있어요.",
    card: {
      title: "질문 범위 안내",
      rows: [
        "도움 가능: 대전 여행지, 접근성, 무장애 코스",
        `판단: ${analysis.scope_reason}`,
        "처리: 여행 범위 질문만 답변"
      ],
      source: "다유 안내"
    },
    chips: FALLBACK_CHIPS,
    confidence: "high",
    sources: [],
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
  const hasNoMatchingEvidence = knowledge.message.includes("조건 일치 없음");
  const target = analysis.place_name
    ? `'${analysis.place_name}'에 대한`
    : "질문 조건에 맞는";

  return {
    message: hasNoMatchingEvidence
      ? `현재 100개 테스트 데이터 안에서는 ${target} 접근성 근거를 찾지 못했어요. 여기서 가능 여부를 단정하면 오히려 위험할 수 있어서, 그 부분은 멈춰둘게요. 데이터가 더 들어오면 다시 한번 같이 확인해볼 수 있어요.`
      : "질문 분류는 완료했지만 아직 Supabase 근거 데이터가 준비되지 않아 최종 추천 답변은 만들지 않았어요. chatbot schema를 Data API에 노출하고 chunks 데이터가 들어가면, 그 근거를 조회한 뒤 차근차근 답변할게요.",
    card: {
      title: hasNoMatchingEvidence ? "확인 가능한 근거 없음" : "DB 조회 대기",
      rows: hasNoMatchingEvidence
        ? [
            "현재 테스트 데이터에서는 확인되지 않음",
            "근거 없는 답변은 생성하지 않음",
            `검색 방식: ${getKnowledgeSearchLabel(knowledge)}`
          ]
        : [
            "Supabase 연결 또는 데이터 적재 확인 필요",
            "처리: DB 근거 없음으로 최종 답변 생성 중단",
            `검색 방식: ${getKnowledgeSearchLabel(knowledge)}`
          ],
      source: hasNoMatchingEvidence ? "Supabase 테스트 DB" : "Supabase 조회"
    },
    chips: [
      "대전어린이회관 휠체어 가능해?",
      "유모차로 갈만한 문화시설",
      "대전한밭도서관 접근성 알려줘"
    ],
    confidence: "low",
    sources: [],
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
  const evidenceCount = knowledge.rows.length;
  const rows = [
    knowledge.searchMode === "vector"
      ? `pgvector 유사도 검색 결과 ${evidenceCount}건 참고`
      : `TourAPI 테스트 데이터 ${KNOWLEDGE_CANDIDATE_LIMIT}개 중 ${evidenceCount}건 참고`,
    "운영 여부와 편의시설은 방문 전 재확인 권장"
  ];

  if (knowledge.searchMode === "vector" && knowledge.embeddingModel) {
    rows.push(`질문 embedding: ${knowledge.embeddingModel}`);
  }

  if (knowledge.fallbackReason) {
    rows.push(`fallback: ${knowledge.fallbackReason}`);
  }

  if (usage?.total_tokens) {
    rows.push("AI가 근거 내용을 짧게 요약");
  }

  return {
    message,
    card: {
      title: "답변 근거",
      rows,
      source:
        knowledge.searchMode === "vector"
          ? "한국관광공사 TourAPI 기반 테스트 데이터 + pgvector"
          : "한국관광공사 TourAPI 기반 테스트 데이터"
    },
    chips: [
      "유모차 기준으로 다시 추천해줘",
      "문화시설만 더 추천해줘",
      "장애인 화장실 있는 곳 알려줘"
    ],
    confidence: "medium",
    sources: [
      `DeepSeek API (${model})`,
      ...(knowledge.searchMode === "vector" && knowledge.embeddingModel
        ? [`OpenAI embeddings (${knowledge.embeddingModel})`]
        : []),
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

function getEmbeddingConfig() {
  const dimensions = Number(
    process.env.EMBEDDING_DIMENSIONS || DEFAULT_EMBEDDING_DIMENSIONS
  );

  return {
    apiKey: (
      process.env.OPENAI_API_KEY ||
      process.env.EMBEDDING_API_KEY ||
      ""
    ).trim(),
    dimensions: Number.isInteger(dimensions) && dimensions > 0
      ? dimensions
      : DEFAULT_EMBEDDING_DIMENSIONS,
    model: (process.env.EMBEDDING_MODEL || DEFAULT_EMBEDDING_MODEL).trim()
  };
}

function getSupabaseHeaders(
  config: ReturnType<typeof getSupabaseConfig>,
  extra?: HeadersInit
) {
  return {
    apikey: config.key,
    Authorization: `Bearer ${config.key}`,
    "Content-Type": "application/json",
    "Accept-Profile": config.schema,
    "Content-Profile": config.schema,
    ...(extra || {})
  };
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

function rankKnowledgeRows(
  rows: KnowledgeRow[],
  analysis: QueryAnalysis,
  searchTerms: string[]
) {
  const placeName = normalizeForSearch(analysis.place_name || "");
  const placeMatchedRows = placeName
    ? rows.filter((row) => rowMatchesPlaceName(row, placeName))
    : [];

  if (
    placeName &&
    analysis.intent === "check_accessibility" &&
    !placeMatchedRows.length
  ) {
    return [];
  }

  const candidates = placeMatchedRows.length ? placeMatchedRows : rows;
  const desiredCategories = getDesiredCategories(searchTerms);
  const usefulTerms = searchTerms.filter(isUsefulRankingTerm);

  return candidates
    .map((row) => ({
      row,
      score: scoreKnowledgeRow({
        row,
        analysis,
        desiredCategories,
        placeName,
        searchTerms: usefulTerms
      })
    }))
    .filter(({ score }) => score > 0)
    .sort((left, right) => {
      if (right.score !== left.score) return right.score - left.score;
      return (getRowText(left.row, "title") || "").localeCompare(
        getRowText(right.row, "title") || "",
        "ko-KR"
      );
    })
    .map(({ row }) => row);
}

function scoreKnowledgeRow({
  row,
  analysis,
  desiredCategories,
  placeName,
  searchTerms
}: {
  row: KnowledgeRow;
  analysis: QueryAnalysis;
  desiredCategories: string[];
  placeName: string;
  searchTerms: string[];
}) {
  const title = normalizeForSearch(getRowText(row, "title") || "");
  const category = getRowText(row, "category") || "";
  const normalizedCategory = normalizeForSearch(category);
  const tags = getRowTags(row).map(normalizeForSearch);
  const accessibility = getRowAccessibility(row);
  const accessibilityText = normalizeForSearch(
    Object.values(accessibility).join(" ")
  );
  const rowText = buildRowSearchText(row);
  let score = 0;

  if (placeName) {
    if (title.includes(placeName)) score += 90;
    else if (rowText.includes(placeName)) score += 35;
  }

  if (desiredCategories.length) {
    score += desiredCategories.includes(category) ? 35 : -18;
  } else if (analysis.intent === "recommend_place") {
    if (["관광지", "문화시설"].includes(category)) score += 8;
  }

  for (const term of searchTerms) {
    const normalizedTerm = normalizeForSearch(term);
    if (!normalizedTerm) continue;

    if (title.includes(normalizedTerm)) score += 14;
    if (normalizedCategory.includes(normalizedTerm)) score += 10;
    if (tags.some((tag) => tag.includes(normalizedTerm))) score += 10;
    if (accessibilityText.includes(normalizedTerm)) score += 9;
    if (rowText.includes(normalizedTerm)) score += 3;
  }

  for (const need of analysis.accessibility_needs) {
    score += scoreAccessibilityNeed({
      need,
      rowText,
      tags,
      accessibility
    });
  }

  if (analysis.weather_sensitive) {
    if (["문화시설", "쇼핑", "숙박", "음식점"].includes(category)) score += 14;
    if (["관광지", "레포츠"].includes(category)) score -= 6;
    if (rowText.includes("실내") || rowText.includes("우천")) score += 12;
  }

  return score;
}

function scoreAccessibilityNeed({
  need,
  rowText,
  tags,
  accessibility
}: {
  need: string;
  rowText: string;
  tags: string[];
  accessibility: Record<string, string>;
}) {
  const rule = ACCESSIBILITY_RULES[need];
  if (!rule) return 0;

  let score = 0;
  if (rule.tags.some((tag) => tags.includes(tag))) score += 22;

  for (const field of rule.fields) {
    if (accessibility[field]) score += 11;
  }

  for (const term of rule.terms) {
    if (rowText.includes(normalizeForSearch(term))) score += 5;
  }

  return score;
}

function getDesiredCategories(searchTerms: string[]) {
  const normalizedTerms = searchTerms.map(normalizeForSearch).filter(Boolean);
  return Object.entries(CATEGORY_ALIASES)
    .filter(([, aliases]) =>
      aliases.some((alias) => {
        const normalizedAlias = normalizeForSearch(alias);
        return normalizedTerms.some(
          (term) => term.includes(normalizedAlias) || normalizedAlias.includes(term)
        );
      })
    )
    .map(([category]) => category);
}

function isUsefulRankingTerm(term: string) {
  const normalized = normalizeForSearch(term);
  return normalized.length >= 2 && !GENERIC_SEARCH_TERMS.has(normalized);
}

function rowMatchesPlaceName(row: KnowledgeRow, normalizedPlaceName: string) {
  const title = normalizeForSearch(getRowText(row, "title") || "");
  return title.includes(normalizedPlaceName) || buildRowSearchText(row).includes(normalizedPlaceName);
}

function buildRowSearchText(row: KnowledgeRow) {
  const metadata = row.metadata || {};
  const metadataValues = [
    getRowText(row, "title"),
    getRowText(row, "category"),
    getRowText(row, "source"),
    row.content,
    ...getRowTags(row),
    ...Object.values(getRowAccessibility(row)),
    textMetadataValue(metadata.address),
    textMetadataValue(metadata.tel)
  ];

  return normalizeForSearch(metadataValues.filter(Boolean).join(" "));
}

function getRowAccessibility(row: KnowledgeRow) {
  const value = row.metadata?.accessibility;
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .map(([key, item]) => [key, textMetadataValue(item)])
      .filter(([, item]) => item)
  );
}

function textMetadataValue(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeForSearch(value: string) {
  return value.toLocaleLowerCase("ko-KR").replace(/\s+/g, " ").trim();
}

async function createQueryEmbedding({
  apiKey,
  dimensions,
  input,
  model
}: {
  apiKey: string;
  dimensions: number;
  input: string;
  model: string;
}) {
  const response = await fetch(OPENAI_EMBEDDINGS_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model,
      input,
      dimensions
    })
  });

  if (!response.ok) {
    throw new Error("OpenAI embedding request failed.");
  }

  const data = (await response.json()) as OpenAIEmbeddingResponse;
  const embedding = data.data
    ?.slice()
    .sort((left, right) => (left.index || 0) - (right.index || 0))[0]
    ?.embedding;

  if (!Array.isArray(embedding) || embedding.length !== dimensions) {
    throw new Error("OpenAI embedding response was invalid.");
  }

  return embedding;
}

function buildEmbeddingInput(analysis: QueryAnalysis, searchTerms: string[]) {
  return [
    `질문 의도: ${analysis.intent}`,
    `지역: ${analysis.location || "대전"}`,
    analysis.place_name ? `장소명: ${analysis.place_name}` : null,
    analysis.accessibility_needs.length
      ? `접근성 조건: ${analysis.accessibility_needs.join(", ")}`
      : null,
    analysis.weather_sensitive ? "날씨/실내 조건 고려" : null,
    analysis.keywords.length ? `핵심어: ${analysis.keywords.join(", ")}` : null,
    searchTerms.length ? `검색어: ${searchTerms.join(", ")}` : null
  ]
    .filter(Boolean)
    .join("\n");
}

function getVectorFailureMessage(status: number, text: string) {
  const lowerText = text.toLocaleLowerCase("ko-KR");

  if (
    lowerText.includes("match_chunks") ||
    lowerText.includes("function") ||
    lowerText.includes("schema cache")
  ) {
    return "pgvector RPC match_chunks 준비 필요";
  }

  if (lowerText.includes("embedding") || lowerText.includes("vector")) {
    return "chunks.embedding 컬럼 또는 vector 설정 확인 필요";
  }

  if (status === 401 || status === 403) {
    return "Supabase service role 권한 확인 필요";
  }

  return "pgvector 검색 호출 실패";
}

function getKnowledgeSearchLabel(knowledge: KnowledgeResult) {
  if (knowledge.searchMode === "vector") return "pgvector";
  if (knowledge.searchMode === "keyword") return "JS 랭킹 fallback";
  return "검색 준비 전";
}

async function checkVectorReadiness(
  config: ReturnType<typeof getSupabaseConfig>,
  dimensions: number
): Promise<VectorReadiness> {
  const cacheKey = `${config.url}|${config.schema}|${config.table}|${dimensions}`;
  const now = Date.now();

  if (
    vectorReadinessCache &&
    vectorReadinessCache.key === cacheKey &&
    now - vectorReadinessCache.checkedAt < VECTOR_READINESS_TTL_MS
  ) {
    return vectorReadinessCache.result;
  }

  const result = await fetchVectorReadiness(config, dimensions);
  vectorReadinessCache = {
    checkedAt: now,
    key: cacheKey,
    result
  };

  return result;
}

async function fetchVectorReadiness(
  config: ReturnType<typeof getSupabaseConfig>,
  dimensions: number
): Promise<VectorReadiness> {
  const params = new URLSearchParams({
    select: "id",
    limit: "1",
    embedding: "not.is.null"
  });

  try {
    const embeddedRowsResponse = await fetch(
      `${config.url}/${encodeURIComponent(config.table)}?${params.toString()}`,
      {
        headers: getSupabaseHeaders(config, { Accept: "application/json" }),
        next: { revalidate: 60 }
      }
    );

    if (!embeddedRowsResponse.ok) {
      const text = await embeddedRowsResponse.text();
      return {
        ready: false,
        message: getVectorFailureMessage(embeddedRowsResponse.status, text)
      };
    }

    const embeddedRows = (await embeddedRowsResponse.json()) as unknown[];
    if (!embeddedRows.length) {
      return {
        ready: false,
        message: "chunks.embedding 데이터 없음"
      };
    }

    const rpcResponse = await fetch(`${config.url}/rpc/match_chunks`, {
      method: "POST",
      headers: getSupabaseHeaders(config),
      body: JSON.stringify({
        query_embedding: Array.from({ length: dimensions }, () => 0),
        match_count: 1
      })
    });

    if (!rpcResponse.ok) {
      const text = await rpcResponse.text();
      return {
        ready: false,
        message: getVectorFailureMessage(rpcResponse.status, text)
      };
    }

    return {
      ready: true,
      message: "pgvector 준비됨"
    };
  } catch {
    return {
      ready: false,
      message: "pgvector 준비 상태 확인 실패"
    };
  }
}

async function fetchKnowledge(analysis: QueryAnalysis): Promise<KnowledgeResult> {
  const config = getSupabaseConfig();

  if (!config.url || !config.key || !config.schema || !config.table) {
    return {
      status: "not_configured",
      rows: [],
      message: "환경변수 미설정",
      searchMode: "none"
    };
  }

  const searchTerms = buildSearchTerms(analysis);

  const vectorKnowledge = await fetchVectorKnowledge(config, analysis, searchTerms);
  if (vectorKnowledge.status === "ready") {
    return vectorKnowledge;
  }

  const keywordKnowledge = await fetchKeywordKnowledge(config, analysis, searchTerms);
  if (
    keywordKnowledge.status === "ready" &&
    vectorKnowledge.status !== "not_configured"
  ) {
    return {
      ...keywordKnowledge,
      fallbackReason: vectorKnowledge.message
    };
  }

  return keywordKnowledge;
}

async function fetchVectorKnowledge(
  config: ReturnType<typeof getSupabaseConfig>,
  analysis: QueryAnalysis,
  searchTerms: string[]
): Promise<KnowledgeResult> {
  const embedding = getEmbeddingConfig();

  if (!embedding.apiKey) {
    return {
      status: "not_configured",
      rows: [],
      message: "OpenAI embedding 키 미설정",
      searchMode: "none"
    };
  }

  try {
    const readiness = await checkVectorReadiness(config, embedding.dimensions);
    if (!readiness.ready) {
      return {
        status: readiness.message.includes("데이터 없음") ? "empty" : "unavailable",
        rows: [],
        message: readiness.message,
        searchMode: "none",
        embeddingModel: embedding.model
      };
    }

    const queryEmbedding = await createQueryEmbedding({
      apiKey: embedding.apiKey,
      dimensions: embedding.dimensions,
      input: buildEmbeddingInput(analysis, searchTerms),
      model: embedding.model
    });

    const response = await fetch(`${config.url}/rpc/match_chunks`, {
      method: "POST",
      headers: getSupabaseHeaders(config),
      body: JSON.stringify({
        query_embedding: queryEmbedding,
        match_count: VECTOR_CANDIDATE_LIMIT
      })
    });

    if (!response.ok) {
      const text = await response.text();
      return {
        status: "unavailable",
        rows: [],
        message: getVectorFailureMessage(response.status, text),
        searchMode: "none",
        embeddingModel: embedding.model
      };
    }

    const rows = (await response.json()) as KnowledgeRow[];

    if (!rows.length) {
      return {
        status: "empty",
        rows: [],
        message: "pgvector 검색 결과 없음",
        searchMode: "vector",
        embeddingModel: embedding.model
      };
    }

    const rankedRows = rankKnowledgeRows(rows, analysis, searchTerms).slice(
      0,
      KNOWLEDGE_RESULT_LIMIT
    );

    if (!rankedRows.length) {
      return {
        status: "empty",
        rows: [],
        message: `pgvector ${rows.length}개 후보 중 조건 일치 없음`,
        searchMode: "vector",
        embeddingModel: embedding.model
      };
    }

    return {
      status: "ready",
      rows: rankedRows,
      message: `pgvector ${rows.length}개 후보 중 ${rankedRows.length}건 사용`,
      searchMode: "vector",
      embeddingModel: embedding.model
    };
  } catch {
    return {
      status: "unavailable",
      rows: [],
      message: "embedding 또는 pgvector 검색 실패",
      searchMode: "none",
      embeddingModel: embedding.model
    };
  }
}

async function fetchKeywordKnowledge(
  config: ReturnType<typeof getSupabaseConfig>,
  analysis: QueryAnalysis,
  searchTerms: string[]
): Promise<KnowledgeResult> {
  const params = new URLSearchParams({
    select: "*",
    limit: String(KNOWLEDGE_CANDIDATE_LIMIT),
    order: "created_at.asc"
  });

  try {
    const response = await fetch(
      `${config.url}/${encodeURIComponent(config.table)}?${params.toString()}`,
      {
        headers: getSupabaseHeaders(config, { Accept: "application/json" }),
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
            : `${config.table} 테이블 확인 필요`,
        searchMode: "keyword"
      };
    }

    const rows = (await response.json()) as KnowledgeRow[];

    if (!rows.length) {
      return {
        status: "empty",
        rows: [],
        message: `${config.schema}.${config.table} 데이터 없음`,
        searchMode: "keyword"
      };
    }

    const rankedRows = rankKnowledgeRows(rows, analysis, searchTerms).slice(
      0,
      KNOWLEDGE_RESULT_LIMIT
    );

    if (!rankedRows.length) {
      return {
        status: "empty",
        rows: [],
        message: `${config.schema}.${config.table} ${rows.length}개 후보 중 조건 일치 없음`,
        searchMode: "keyword"
      };
    }

    return {
      status: "ready",
      rows: rankedRows,
      message: `${config.schema}.${config.table} ${rows.length}개 후보 중 ${rankedRows.length}건 사용`,
      searchMode: "keyword"
    };
  } catch {
    return {
      status: "unavailable",
      rows: [],
      message: "연결 실패",
      searchMode: "keyword"
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

    const staticSiteFaqResponse = createStaticSiteFaqResponse(message);
    if (staticSiteFaqResponse) {
      return NextResponse.json(staticSiteFaqResponse);
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
