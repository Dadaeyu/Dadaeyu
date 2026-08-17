"use client";

import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, Eraser, FileText, MessageSquare } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { DEFAULT_PAGE_SIZE } from "@/lib/pagination";
import { formatDateTime } from "./helpers";
import { AdminListShell } from "./AdminListShell";
import { AdminSearchBar } from "./AdminSearchBar";
import { adminAlertClass, adminPanelClass } from "./adminUi";

type ReportTab = "all" | "post" | "comment";

type ReportGroupItem =
  | {
      targetType: "post";
      targetId: number;
      reportCount: number;
      latestAt: string;
      title: string;
      boardNm: string;
      useYn: boolean;
    }
  | {
      targetType: "comment";
      targetId: number;
      reportCount: number;
      latestAt: string;
      content: string;
      postId: number | null;
    };

type ReportDetailItem = {
  reportId: number;
  reporterNickname: string;
  reasonCode: string | null;
  reasonNm: string;
  createdAt: string;
};

const TABS: { key: ReportTab; label: string }[] = [
  { key: "all", label: "전체" },
  { key: "post", label: "게시글" },
  { key: "comment", label: "댓글" }
];

export function CommunityReportsSection() {
  const [tab, setTab] = useState<ReportTab>("all");
  const [page, setPage] = useState(0);
  const [searchInput, setSearchInput] = useState("");
  const [q, setQ] = useState("");
  const [items, setItems] = useState<ReportGroupItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [resetting, setResetting] = useState(false);

  const [selected, setSelected] = useState<ReportGroupItem | null>(null);
  const [detailItems, setDetailItems] = useState<ReportDetailItem[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  // 검색어 입력을 디바운스해 q로 반영하고, 검색이 바뀌면 1페이지로 되돌린다.
  useEffect(() => {
    const t = setTimeout(() => {
      setQ(searchInput.trim());
      setPage(0);
    }, 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  const loadList = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        type: tab,
        page: String(page + 1),
        pageSize: String(DEFAULT_PAGE_SIZE)
      });
      if (q) params.set("q", q);
      const res = await fetch(`/api/admin/community-reports?${params}`);
      const json = (await res.json().catch(() => ({}))) as {
        items?: ReportGroupItem[];
        total?: number;
        error?: string;
      };
      if (!res.ok) throw new Error(json.error ?? "신고 이력을 불러오지 못했습니다.");
      setItems(json.items ?? []);
      setTotal(json.total ?? 0);
    } catch (e) {
      setError(e instanceof Error ? e.message : "로드 실패");
    } finally {
      setLoading(false);
    }
  }, [tab, page, q]);

  useEffect(() => {
    if (!selected) queueMicrotask(() => void loadList());
  }, [selected, loadList]);

  const openDetail = useCallback(async (item: ReportGroupItem) => {
    setSelected(item);
    setDetailLoading(true);
    setDetailError(null);
    try {
      const params = new URLSearchParams({
        type: item.targetType,
        id: String(item.targetId)
      });
      const res = await fetch(`/api/admin/community-reports/detail?${params}`);
      const json = (await res.json().catch(() => ({}))) as {
        items?: ReportDetailItem[];
        error?: string;
      };
      if (!res.ok) throw new Error(json.error ?? "신고 사유를 불러오지 못했습니다.");
      setDetailItems(json.items ?? []);
    } catch (e) {
      setDetailError(e instanceof Error ? e.message : "로드 실패");
    } finally {
      setDetailLoading(false);
    }
  }, []);

  // 신고이력 초기화: tb_community_report에서 해당 대상 row 전부 삭제 + report_cnt 0.
  // 게시글이 신고 누적으로 자동 숨김돼 있었다면, 다시 "사용"으로 되돌릴지 별도로 물어본다.
  const resetReports = async (item: ReportGroupItem) => {
    if (!confirm("이 대상의 신고 이력을 초기화할까요? 신고 기록이 모두 삭제됩니다.")) return;
    setResetting(true);
    try {
      const res = await fetch("/api/admin/community-reports/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetType: item.targetType, targetId: item.targetId })
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string; wasHidden?: boolean };
      if (!res.ok) throw new Error(json.error ?? "초기화에 실패했습니다.");

      if (item.targetType === "post" && json.wasHidden) {
        if (confirm("이 게시글을 다시 '사용' 상태로 전환할까요?")) {
          await fetch("/api/admin/board-posts", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: item.targetId, use_yn: true })
          });
        }
      }

      setSelected(null);
      await loadList();
    } catch (e) {
      setError(e instanceof Error ? e.message : "초기화 실패");
    } finally {
      setResetting(false);
    }
  };

  if (selected) {
    return (
      <div className="space-y-5">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => setSelected(null)}>
            <ArrowLeft className="h-4 w-4" />
            목록으로
          </Button>
          <h1 className="text-ink text-xl font-semibold tracking-[-0.02em]">신고 상세</h1>
        </div>

        {detailError && <div className={adminAlertClass}>{detailError}</div>}

        <div className={`${adminPanelClass} space-y-4 p-5`}>
          <div className="flex flex-wrap items-center gap-2">
            {selected.targetType === "post" ? (
              <>
                <Badge tone="tag">{selected.boardNm}</Badge>
                <span className="text-ink font-semibold">{selected.title}</span>
              </>
            ) : (
              <>
                <Badge tone="tag">댓글</Badge>
                <span className="text-ink font-semibold">{selected.content}</span>
              </>
            )}
          </div>

          <div>
            <p className="text-stone mb-2 text-xs font-semibold">
              신고 사유 ({detailItems.length}건)
            </p>
            <div className="divide-hairline-soft divide-y">
              {detailLoading && (
                <p className="text-stone px-1 py-6 text-center text-sm">불러오는 중…</p>
              )}
              {!detailLoading && detailItems.length === 0 && (
                <p className="text-stone px-1 py-6 text-center text-sm">신고 내역이 없습니다.</p>
              )}
              {!detailLoading &&
                detailItems.map((r) => (
                  <div
                    key={r.reportId}
                    className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-sm"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-ink font-medium">{r.reasonNm}</span>
                      <span className="text-stone text-xs">{r.reporterNickname}</span>
                    </div>
                    <span className="text-stone text-xs">{formatDateTime(r.createdAt)}</span>
                  </div>
                ))}
            </div>
          </div>

          <div className="border-hairline-soft flex justify-end border-t pt-4">
            <Button
              size="sm"
              variant="destructive"
              disabled={resetting}
              onClick={() => resetReports(selected)}
            >
              <Eraser className="h-4 w-4" />
              신고이력 초기화
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <AdminListShell
      title="신고 관리"
      subtitle="커뮤니티 게시글·댓글 신고 이력을 확인하고 초기화합니다."
      total={total}
      page={page}
      pageSize={DEFAULT_PAGE_SIZE}
      loading={loading}
      error={error}
      onPageChange={setPage}
      toolbar={
        <>
          <AdminSearchBar
            value={searchInput}
            onChange={setSearchInput}
            placeholder="게시글 제목 또는 댓글 내용 검색"
          />
          <div className="flex gap-1.5">
            {TABS.map((t) => (
              <button
                key={t.key}
                onClick={() => {
                  setTab(t.key);
                  setPage(0);
                }}
                className={`rounded-full px-3.5 py-1.5 text-sm font-semibold transition-colors ${
                  tab === t.key
                    ? "bg-navy-600 text-fixed-white"
                    : "border-hairline text-steel hover:bg-surface-soft border"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </>
      }
    >
      <div className="divide-hairline-soft divide-y">
        {loading && <p className="text-stone px-4 py-8 text-center text-sm">불러오는 중…</p>}
        {!loading && items.length === 0 && (
          <p className="text-stone px-4 py-8 text-center text-sm">신고 이력이 없습니다.</p>
        )}
        {!loading &&
          items.map((item) => (
            <button
              key={`${item.targetType}:${item.targetId}`}
              type="button"
              onClick={() => openDetail(item)}
              className="hover:bg-surface-soft/60 flex w-full cursor-pointer items-center gap-3 px-4 py-3.5 text-left transition-colors"
            >
              <span className="text-stone shrink-0">
                {item.targetType === "post" ? (
                  <FileText className="h-4 w-4" />
                ) : (
                  <MessageSquare className="h-4 w-4" />
                )}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  {item.targetType === "post" ? (
                    <>
                      <Badge tone="tag">{item.boardNm}</Badge>
                      <span className="text-ink truncate font-semibold">{item.title}</span>
                    </>
                  ) : (
                    <span className="text-ink truncate font-semibold">{item.content}</span>
                  )}
                </div>
                <p className="text-stone mt-0.5 text-xs">
                  신고 {item.reportCount}건 · 최근 {formatDateTime(item.latestAt)}
                </p>
              </div>
            </button>
          ))}
      </div>
    </AdminListShell>
  );
}
