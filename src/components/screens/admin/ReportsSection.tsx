"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, X } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import type { DbPlaceReport, ReportStatus } from "@/lib/supabase/types";
import { formatDate, reportTone, REPORT_STATUS_LABELS } from "./helpers";

const FILTER_OPTIONS: Array<ReportStatus | "all"> = [
  "all",
  "pending",
  "reviewing",
  "approved",
  "rejected"
];

const FILTER_LABELS: Record<ReportStatus | "all", string> = {
  all: "전체",
  pending: "대기",
  reviewing: "검토중",
  approved: "반영됨",
  rejected: "반려"
};

export function ReportsSection() {
  const [reports, setReports] = useState<DbPlaceReport[]>([]);
  const [filter, setFilter] = useState<ReportStatus | "all">("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [noteEdits, setNoteEdits] = useState<Record<number, string>>({});
  const [savingId, setSavingId] = useState<number | null>(null);

  const loadReports = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/reports");
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? "제보를 불러오지 못했습니다.");
      }
      const json = (await res.json()) as { reports: DbPlaceReport[] };
      setReports(json.reports ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "로드 실패");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  const updateStatus = async (id: number, status: ReportStatus) => {
    setSavingId(id);
    setError(null);
    try {
      const res = await fetch("/api/admin/reports", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id,
          status,
          admin_note: noteEdits[id] ?? undefined
        })
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? "상태 변경에 실패했습니다.");

      setReports((prev) => prev.map((r) => (r.id === id ? (json.report as DbPlaceReport) : r)));
    } catch (e) {
      setError(e instanceof Error ? e.message : "변경 실패");
    } finally {
      setSavingId(null);
    }
  };

  const filtered = filter === "all" ? reports : reports.filter((r) => r.status === filter);

  const counts: Record<ReportStatus | "all", number> = {
    all: reports.length,
    pending: reports.filter((r) => r.status === "pending").length,
    reviewing: reports.filter((r) => r.status === "reviewing").length,
    approved: reports.filter((r) => r.status === "approved").length,
    rejected: reports.filter((r) => r.status === "rejected").length
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-ink text-xl font-bold">제보 내용 확인</h1>
        <span className="text-stone text-sm">총 {reports.length}건</span>
      </div>

      {error && (
        <div className="border-error/30 text-error rounded-lg border bg-red-50 px-4 py-3 text-sm">
          {error}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {FILTER_OPTIONS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-semibold transition-colors ${
              filter === f ? "bg-navy-600 text-white" : "bg-surface text-steel hover:bg-hairline"
            }`}
          >
            {FILTER_LABELS[f]}
            <span
              className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${filter === f ? "bg-white/20 text-white" : "text-steel bg-white"}`}
            >
              {counts[f]}
            </span>
          </button>
        ))}
      </div>

      {loading && <p className="text-stone text-sm">불러오는 중…</p>}

      <div className="space-y-3">
        {!loading &&
          filtered.map((r) => (
            <Card key={r.id} className="border-hairline-soft">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="mb-1.5 flex items-center gap-2">
                    <span className="text-ink font-bold">{r.target_name}</span>
                    <Badge tone={reportTone(r.status)} className="text-[10px] font-bold">
                      {REPORT_STATUS_LABELS[r.status]}
                    </Badge>
                  </div>
                  <p className="text-steel mb-2 text-sm">{r.content}</p>
                  <p className="text-stone text-xs">{formatDate(r.created_at)}</p>
                  {r.admin_note && (
                    <p className="text-steel mt-2 text-xs">관리자 메모: {r.admin_note}</p>
                  )}
                  <textarea
                    value={noteEdits[r.id] ?? r.admin_note ?? ""}
                    onChange={(e) => setNoteEdits((prev) => ({ ...prev, [r.id]: e.target.value }))}
                    placeholder="관리자 메모 (상태 변경 시 저장)"
                    rows={2}
                    className="border-hairline bg-background text-ink placeholder:text-stone mt-3 w-full rounded-lg border p-2 text-xs"
                  />
                </div>

                <div className="flex shrink-0 flex-wrap items-center gap-1.5">
                  {r.status === "pending" && (
                    <button
                      disabled={savingId === r.id}
                      onClick={() => updateStatus(r.id, "reviewing")}
                      className="border-gold-200 bg-gold-50 text-gold-700 hover:bg-gold-100 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors disabled:opacity-50"
                    >
                      검토 시작
                    </button>
                  )}
                  {(r.status === "pending" || r.status === "reviewing") && (
                    <>
                      <button
                        disabled={savingId === r.id}
                        onClick={() => updateStatus(r.id, "approved")}
                        className="bg-brand-50 border-brand-200 text-brand-700 hover:bg-brand-100 flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors disabled:opacity-50"
                      >
                        <Check className="h-3 w-3" />
                        반영
                      </button>
                      <button
                        disabled={savingId === r.id}
                        onClick={() => updateStatus(r.id, "rejected")}
                        className="border-hairline bg-surface-soft text-steel flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                      >
                        <X className="h-3 w-3" />
                        반려
                      </button>
                    </>
                  )}
                  {(r.status === "approved" || r.status === "rejected") && (
                    <button
                      disabled={savingId === r.id}
                      onClick={() => updateStatus(r.id, "pending")}
                      className="text-stone hover:text-steel text-xs underline underline-offset-2 disabled:opacity-50"
                    >
                      되돌리기
                    </button>
                  )}
                </div>
              </div>
            </Card>
          ))}
        {!loading && filtered.length === 0 && (
          <p className="text-stone py-8 text-center text-sm">해당 상태의 제보가 없습니다.</p>
        )}
      </div>
    </div>
  );
}
