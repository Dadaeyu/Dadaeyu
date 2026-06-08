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
            <h1 className="text-xl font-bold text-gray-800">서버 컴포넌트 조회 결과</h1>
            <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-bold text-green-700">
              Server Component
            </span>
          </div>
          <p className="mt-1 text-sm text-gray-400">
            이 페이지는 서버에서 <code className="font-mono">tb_test</code>를 조회한 뒤 완성된
            HTML을 전달합니다. (라우트: <code className="font-mono">/supabase</code>)
          </p>
        </div>
        <Link
          href="/admin/supabase"
          className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 transition-colors hover:bg-gray-50"
        >
          ← 테스트 탭으로
        </Link>
      </div>

      {/* 조회 코드 */}
      <div className="overflow-hidden rounded-2xl bg-gray-950">
        <div className="flex items-center gap-1.5 border-b border-gray-800 px-4 py-2.5">
          <span className="h-2.5 w-2.5 rounded-full bg-red-500" />
          <span className="h-2.5 w-2.5 rounded-full bg-yellow-500" />
          <span className="h-2.5 w-2.5 rounded-full bg-green-500" />
          <span className="ml-2 font-mono text-xs text-gray-500">src/app/supabase/page.tsx</span>
        </div>
        <pre className="overflow-x-auto p-4 font-mono text-xs leading-relaxed text-gray-200">
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
        <div className="rounded-2xl border border-red-200 bg-red-50 p-5">
          <p className="mb-1 text-sm font-bold text-red-700">✗ 조회 오류</p>
          <pre className="overflow-x-auto font-mono text-xs whitespace-pre-wrap text-red-600">
            {error.message}
          </pre>
        </div>
      ) : !data || data.length === 0 ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
          <p className="text-sm font-semibold text-amber-800">조회는 성공했지만 행이 0개입니다.</p>
          <p className="mt-1 text-sm text-amber-700">
            RLS 정책(SELECT to public)이 설정되어 있는지, 테이블에 데이터가 있는지 확인하세요.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50 px-4 py-3">
            <p className="text-sm font-semibold text-gray-700">tb_test</p>
            <span className="text-xs text-gray-400">{data.length}개 행</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50">
                  {columns.map((col) => (
                    <th
                      key={col}
                      className="px-4 py-3 text-left font-mono text-xs font-bold whitespace-nowrap text-gray-500"
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
                    className="border-b border-gray-50 transition-colors hover:bg-gray-50"
                  >
                    {columns.map((col) => (
                      <td key={col} className="px-4 py-3 font-mono whitespace-nowrap text-gray-700">
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
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <p className="mb-2 text-sm font-semibold text-gray-700">원본 응답 (JSON)</p>
          <pre className="overflow-x-auto rounded-lg border border-gray-100 bg-gray-50 p-3 font-mono text-xs text-gray-700">
            {JSON.stringify(data, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
