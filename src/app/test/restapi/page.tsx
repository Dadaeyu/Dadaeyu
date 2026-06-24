import Link from "next/link";
import { brfrTourInfoApi } from "@/utils/api/external";

// 서버 컴포넌트는 매 요청마다 서버에서 외부 API를 조회한 뒤 HTML로 전달합니다.
export const dynamic = "force-dynamic";

// ── 공공데이터포털 응답 타입 (필요한 필드만) ──────────────────
type TourItem = {
  title?: string;
  addr1?: string;
  cat1?: string;
  contentid?: string;
  mapx?: string;
  mapy?: string;
  [key: string]: unknown;
};

type TourResponse = {
  response?: {
    header?: { resultCode?: string; resultMsg?: string };
    body?: {
      items?: { item?: TourItem[] | TourItem | "" } | "";
      totalCount?: number;
      numOfRows?: number;
    };
  };
};

// items.item은 결과가 여러 개면 배열, 1개면 객체, 0개면 "" 로 옵니다. 항상 배열로 정규화.
function extractItems(data: TourResponse): TourItem[] {
  const items = data?.response?.body?.items;
  if (!items) return []; // undefined 또는 "" (결과 0개)
  const inner = items.item;
  if (!inner) return []; // undefined 또는 "" (결과 0개)
  return Array.isArray(inner) ? inner : [inner];
}

const PREVIEW_COLUMNS = ["title", "addr1", "cat1", "contentid", "mapx", "mapy"] as const;

export default async function OpenApiServerTestPage() {
  // 서버 컴포넌트 — 'use client'가 없습니다.
  // brfrTourInfoApi가 서버 환경의 serviceKey를 사용해 외부 API를 직접 호출합니다.
  let data: TourResponse | null = null;
  let errorMessage = "";

  if (!process.env.PUBLIC_DATA_OPEN_API_SERVICE_KEY) {
    errorMessage =
      ".env에 PUBLIC_DATA_OPEN_API_SERVICE_KEY 설정되지 않았습니다. 서버를 재시작하세요.";
  } else {
    try {
      data = await brfrTourInfoApi.areaBasedList<TourResponse>({
        lDongRegnCd: "30", // 대전
        lclsSystm1: "FD", // 음식
        numOfRows: "5"
      });
    } catch (e) {
      errorMessage = e instanceof Error ? e.message : "외부 API 호출 실패";
    }
  }

  const items = data ? extractItems(data) : [];
  const resultMsg = data?.response?.header?.resultMsg;

  return (
    <div className="space-y-6 px-4 py-6 md:px-8">
      {/* 헤더 */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-ink text-xl font-bold">서버 컴포넌트 조회 결과</h1>
            <span className="bg-brand-100 text-brand-700 rounded-full px-2.5 py-0.5 text-xs font-bold">
              Server Component
            </span>
          </div>
          <p className="text-stone mt-1 text-sm">
            이 페이지는 서버에서 <code className="font-mono">tourApi.areaBasedList()</code>로 외부
            API를 직접 호출한 뒤 완성된 HTML을 전달합니다. (라우트:{" "}
            <code className="font-mono">/test/restapi</code>)
          </p>
        </div>
        <Link
          href="/admin/restapi"
          className="border-hairline text-steel hover:bg-surface-soft rounded-lg border px-4 py-2 text-sm font-semibold transition-colors"
        >
          ← 테스트 탭으로
        </Link>
      </div>

      {/* 조회 코드 */}
      <div className="bg-surface-code overflow-hidden rounded-lg">
        <div className="border-charcoal flex items-center gap-1.5 border-b px-4 py-2.5">
          <span className="h-2.5 w-2.5 rounded-full bg-red-500" />
          <span className="bg-gold-500 h-2.5 w-2.5 rounded-full" />
          <span className="bg-brand-500 h-2.5 w-2.5 rounded-full" />
          <span className="text-steel ml-2 font-mono text-xs">src/app/test/restapi/page.tsx</span>
        </div>
        <pre className="text-hairline overflow-x-auto p-4 font-mono text-xs leading-relaxed">
          {`import { brfrTourInfoApi } from '@/utils/api/external'

// 서버에서 직접 외부 API 호출 (serviceKey 노출 없음)
const data = await brfrTourInfoApi.areaBasedList({
  lDongRegnCd: '30',  // 대전
  lclsSystm1: 'FD',   // 음식
  numOfRows: '5',
})

const items = data.response.body.items.item`}
        </pre>
      </div>

      {/* 결과 */}
      {errorMessage ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-5">
          <p className="mb-1 text-sm font-bold text-red-700">✗ 조회 오류</p>
          <pre className="overflow-x-auto font-mono text-xs whitespace-pre-wrap text-red-600">
            {errorMessage}
          </pre>
        </div>
      ) : items.length === 0 ? (
        <div className="border-gold-200 bg-gold-50 rounded-lg border p-5">
          <p className="text-gold-800 text-sm font-semibold">조회는 됐지만 항목이 0개입니다.</p>
          <p className="text-gold-700 mt-1 text-sm">
            serviceKey가 유효한지, 응답 메시지를 확인하세요. {resultMsg ? `(${resultMsg})` : ""}
          </p>
        </div>
      ) : (
        <div className="border-hairline-soft overflow-hidden rounded-lg border bg-white">
          <div className="border-hairline-soft bg-surface-soft flex items-center justify-between border-b px-4 py-3">
            <p className="text-slate text-sm font-semibold">대전 · 음식 무장애 관광정보</p>
            <span className="text-stone text-xs">{items.length}개 항목</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-hairline-soft bg-surface-soft/50 border-b">
                  {PREVIEW_COLUMNS.map((col) => (
                    <th
                      key={col}
                      className="text-steel px-4 py-3 text-left font-mono text-xs font-bold whitespace-nowrap"
                    >
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {items.map((row, i) => (
                  <tr
                    key={row.contentid ?? i}
                    className="border-hairline-soft hover:bg-surface-soft border-b transition-colors"
                  >
                    {PREVIEW_COLUMNS.map((col) => (
                      <td key={col} className="text-slate px-4 py-3 whitespace-nowrap">
                        {row[col] !== undefined && row[col] !== "" ? String(row[col]) : "—"}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 원본 JSON */}
      {data && (
        <div className="border-hairline-soft rounded-lg border bg-white p-5">
          <p className="text-slate mb-2 text-sm font-semibold">원본 응답 (JSON)</p>
          <pre className="border-hairline-soft bg-surface-soft text-slate max-h-96 overflow-auto rounded-lg border p-3 font-mono text-xs">
            {JSON.stringify(data, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
