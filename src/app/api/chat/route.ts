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
};

type ChatScenario = {
  id: string;
  keywords: string[];
  response: ChatResponse;
};

const scenarios: ChatScenario[] = [
  {
    id: "hanbat",
    keywords: ["한밭", "한밭수목원", "수목원"],
    response: {
      message:
        "네. 한밭수목원은 휠체어 접근성이 좋은 편이에요. 주요 산책로가 넓고 평탄해서 전동·수동 휠체어 모두 이동하기 쉬운 코스로 안내할 수 있습니다.",
      card: {
        title: "한밭수목원 접근성 요약",
        rows: [
          "주요 산책로 대부분 평탄 포장",
          "장애인 화장실과 전용 주차구역 확인",
          "비 온 뒤 일부 흙길 구간은 미끄러울 수 있음"
        ],
        source: "한국관광공사 무장애 여행 정보 · 시민제보 검토 완료"
      },
      chips: ["가는 길 보기", "비 오는 날 대안", "근처 무장애 카페"],
      confidence: "high",
      sources: ["한국관광공사 무장애 여행 정보", "시민제보"]
    }
  },
  {
    id: "sungsimdang",
    keywords: ["성심당"],
    response: {
      message:
        "성심당 본점은 입구 접근은 가능하지만 내부가 좁고 붐비는 시간이 많아 휠체어 이용 시 불편할 수 있어요. 가능 여부보다 혼잡도와 대기 동선을 먼저 확인하는 게 좋습니다.",
      card: {
        title: "성심당 접근성 주의사항",
        rows: [
          "입구 턱은 낮거나 보조 진입 가능",
          "내부 통로와 대기 줄이 좁을 수 있음",
          "점심·주말 시간대는 대안 지점 검토 권장"
        ],
        source: "시민제보 검토 완료 · 공공데이터 확인 부족"
      },
      chips: ["대안 지점 보기", "한가한 시간대", "근처 무장애 카페"],
      confidence: "medium",
      sources: ["시민제보"]
    }
  },
  {
    id: "baby",
    keywords: ["아기", "영유아", "유모차", "아이"],
    response: {
      message:
        "영유아 동반이면 유모차 동선과 수유실이 확인된 곳부터 추천드릴게요. 실내 휴식 공간이 있는 장소를 우선으로 보는 게 좋습니다.",
      card: {
        title: "영유아 가족 추천 3곳",
        rows: [
          "한밭수목원: 평탄 동선과 야외 산책",
          "국립중앙과학관: 실내 관람, 엘리베이터, 수유실",
          "대전시립미술관: 조용한 실내 코스"
        ],
        source: "관광공사 데이터 · 가족 편의시설 필터"
      },
      chips: ["코스로 묶기", "실내만 보기", "수유실 있는 곳"],
      confidence: "high",
      sources: ["한국관광공사 관광정보", "가족 편의시설 필터"]
    }
  }
];

const fallbackResponse: ChatResponse = {
  message:
    "지금 MVP 데이터로는 그 질문의 근거를 확인하기 어려워요. 확인되지 않은 정보는 단정하지 않고, 대전 무장애 여행 질문으로 다시 좁혀 답변할게요.",
  chips: [
    "한밭수목원 휠체어 가능해?",
    "성심당 휠체어로 갈 수 있어?",
    "아기랑 같이 갈만한 곳 추천해줘"
  ],
  confidence: "low",
  sources: []
};

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

    const normalized = message.toLowerCase();
    const scenario = scenarios.find((item) =>
      item.keywords.some((keyword) => normalized.includes(keyword.toLowerCase()))
    );

    return NextResponse.json(scenario?.response ?? fallbackResponse);
  } catch {
    return NextResponse.json(
      { error: "failed to create chat response" },
      { status: 500 }
    );
  }
}
