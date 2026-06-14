import { NextResponse } from "next/server";
import { brfrTourInfoApi } from "@/utils/api/external";

export const dynamic = "force-dynamic";

export async function GET(request: Request, { params }: { params: Promise<{ action: string }> }) {
  if (!process.env.PUBLIC_DATA_OPEN_API_SERVICE_KEY) {
    return NextResponse.json(
      { error: ".env에 PUBLIC_DATA_OPEN_API_SERVICE_KEY가 설정되지 않았습니다." },
      { status: 500 }
    );
  }

  const { action } = await params;
  const { searchParams } = new URL(request.url);

  try {
    switch (action) {
      case "areaBasedList2": {
        const data = await brfrTourInfoApi.areaBasedList({
          lDongRegnCd: searchParams.get("lDongRegnCd") ?? "30",
          lclsSystm1: searchParams.get("lclsSystm1") ?? "FD",
          numOfRows: searchParams.get("numOfRows") ?? "5"
        });
        return NextResponse.json(data);
      }

      case "areaCode2": {
        const data = await brfrTourInfoApi.areaCode({
          areaCode: searchParams.get("areaCode") ?? ""
        });
        return NextResponse.json(data);
      }

      default:
        return NextResponse.json({ error: `알 수 없는 액션: ${action}` }, { status: 404 });
    }
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "외부 API 호출 실패" },
      { status: 502 }
    );
  }
}
