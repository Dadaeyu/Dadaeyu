import Link from "next/link";
import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";

// 서버 컴포넌트는 매 요청마다 서버에서 조회 후 HTML로 전달됩니다.
// 항상 최신 데이터를 보여주기 위해 캐시를 끕니다.
export const dynamic = "force-dynamic";

export default async function SupabaseServerTestPage() {
  // 서버 컴포넌트 — 'use client'가 없습니다.
  // createClient는 cookieStore를 받아 서버용 클라이언트를 만듭니다.
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { data, error } = await supabase.from("tb_test").select("*").limit(5);

  const columns = data && data.length > 0 ? Object.keys(data[0]) : [];

  return (
    <div className="space-y-6">
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
            이 페이지는 서버에서 <code className="font-mono">tb_test</code>를 조회한 뒤 완성된
            HTML을 전달합니다. (라우트: <code className="font-mono">/supabase</code>)
          </p>
        </div>
        <Link
          href="/admin/supabase"
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
          <span className="text-steel ml-2 font-mono text-xs">src/app/supabase/page.tsx</span>
        </div>
        <pre className="text-hairline overflow-x-auto p-4 font-mono text-xs leading-relaxed">
          {`const cookieStore = await cookies()
const supabase = createClient(cookieStore)

const { data, error } = await supabase
  .from('tb_test')
  .select('*')
  .limit(5)`}
        </pre>
      </div>

      {/* 결과 */}
      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-5">
          <p className="mb-1 text-sm font-bold text-red-700">✗ 조회 오류</p>
          <pre className="overflow-x-auto font-mono text-xs whitespace-pre-wrap text-red-600">
            {error.message}
          </pre>
        </div>
      ) : !data || data.length === 0 ? (
        <div className="border-gold-200 bg-gold-50 rounded-lg border p-5">
          <p className="text-gold-800 text-sm font-semibold">조회는 성공했지만 행이 0개입니다.</p>
          <p className="text-gold-700 mt-1 text-sm">
            RLS 정책(SELECT to public)이 설정되어 있는지, 테이블에 데이터가 있는지 확인하세요.
          </p>
        </div>
      ) : (
        <div className="border-hairline-soft overflow-hidden rounded-lg border bg-white">
          <div className="border-hairline-soft bg-surface-soft flex items-center justify-between border-b px-4 py-3">
            <p className="text-slate text-sm font-semibold">tb_test</p>
            <span className="text-stone text-xs">{data.length}개 행</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-hairline-soft bg-surface-soft/50 border-b">
                  {columns.map((col) => (
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
                {data.map((row, i) => (
                  <tr
                    key={i}
                    className="border-hairline-soft hover:bg-surface-soft border-b transition-colors"
                  >
                    {columns.map((col) => (
                      <td key={col} className="text-slate px-4 py-3 font-mono whitespace-nowrap">
                        {String((row as Record<string, unknown>)[col])}
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
      {data && data.length > 0 && (
        <div className="border-hairline-soft rounded-lg border bg-white p-5">
          <p className="text-slate mb-2 text-sm font-semibold">원본 응답 (JSON)</p>
          <pre className="border-hairline-soft bg-surface-soft text-slate overflow-x-auto rounded-lg border p-3 font-mono text-xs">
            {JSON.stringify(data, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
