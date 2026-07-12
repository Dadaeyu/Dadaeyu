"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Users,
  UserPlus,
  ShieldOff,
  AlertCircle,
  TrendingUp,
  ShieldCheck,
  ChevronRight
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import type { DbPlaceReport, ReportStatus } from "@/lib/supabase/types";
import { formatDate, formatMonthLabel, reportTone, REPORT_STATUS_LABELS } from "./helpers";

type Stats = {
  totalMembers: number;
  todaySignups: number;
  activeMembers: number;
  suspendedMembers: number;
  pendingReports: number;
  totalPosts: number;
  monthlySignups: { month: string; count: number }[];
};

export function DashboardSection() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [recentReports, setRecentReports] = useState<DbPlaceReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [statsRes, reportsRes] = await Promise.all([
          fetch("/api/admin/stats"),
          fetch("/api/admin/reports")
        ]);

        if (!statsRes.ok) {
          const j = await statsRes.json().catch(() => ({}));
          throw new Error(j.error ?? "통계를 불러오지 못했습니다.");
        }

        const statsJson = (await statsRes.json()) as Stats;
        if (!cancelled) setStats(statsJson);

        if (reportsRes.ok) {
          const reportsJson = (await reportsRes.json()) as { reports: DbPlaceReport[] };
          const pending = (reportsJson.reports ?? [])
            .filter((r) => r.status === "pending" || r.status === "reviewing")
            .slice(0, 5);
          if (!cancelled) setRecentReports(pending);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "데이터 로드 실패");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const monthly = [...(stats?.monthlySignups ?? [])].reverse().slice(-6);
  const maxMonthly = Math.max(...monthly.map((m) => m.count), 1);

  const cards = stats
    ? [
        {
          label: "전체 회원",
          value: stats.totalMembers.toLocaleString(),
          sub: `활성 ${stats.activeMembers.toLocaleString()}`,
          icon: Users,
          bg: "bg-navy-50",
          color: "text-navy-600"
        },
        {
          label: "오늘 가입",
          value: stats.todaySignups.toLocaleString(),
          sub: "신규 가입",
          icon: UserPlus,
          bg: "bg-brand-50",
          color: "text-brand-600"
        },
        {
          label: "활동 정지",
          value: stats.suspendedMembers.toLocaleString(),
          sub: "정지 계정",
          icon: ShieldOff,
          bg: "bg-red-50",
          color: "text-red-600"
        },
        {
          label: "제보 대기",
          value: stats.pendingReports.toLocaleString(),
          sub: "처리 필요",
          icon: AlertCircle,
          bg: "bg-gold-50",
          color: "text-gold-700"
        }
      ]
    : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-ink text-xl font-bold">관리자 대시보드</h1>
        <p className="text-stone mt-0.5 text-sm">
          {new Date().toLocaleDateString("ko-KR", {
            year: "numeric",
            month: "long",
            day: "numeric"
          })}{" "}
          기준
        </p>
      </div>

      {error && (
        <div className="border-error/30 text-error rounded-lg border bg-red-50 px-4 py-3 text-sm">
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => (
              <Card
                key={i}
                padding="none"
                className="border-hairline-soft h-32 animate-pulse p-5"
              />
            ))
          : cards.map(({ label, value, sub, icon: Icon, bg, color }) => (
              <Card key={label} padding="none" className="border-hairline-soft p-5">
                <div className={`h-10 w-10 ${bg} mb-3 flex items-center justify-center rounded-lg`}>
                  <Icon className={`h-5 w-5 ${color}`} />
                </div>
                <p className="text-ink text-2xl font-bold">{value}</p>
                <div className="mt-1 flex items-center justify-between">
                  <p className="text-steel text-sm">{label}</p>
                  <span className="text-annotate text-xs font-semibold">{sub}</span>
                </div>
              </Card>
            ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="border-hairline-soft rounded-lg border bg-white p-5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-ink font-bold">월별 가입자 (최근 6개월)</h3>
            <TrendingUp className="text-brand-500 h-4 w-4" />
          </div>
          {loading ? (
            <div className="bg-surface-soft h-28 animate-pulse rounded-lg" />
          ) : monthly.length === 0 ? (
            <p className="text-stone py-8 text-center text-sm">가입 데이터가 없습니다.</p>
          ) : (
            <div className="flex h-32 items-end gap-2">
              {monthly.map((m) => (
                <div key={m.month} className="flex min-w-0 flex-1 flex-col items-center gap-1">
                  <span className="text-steel text-[10px] font-semibold">{m.count}</span>
                  <div
                    className="bg-brand-400 w-full rounded-t-md transition-all"
                    style={{
                      height: `${(m.count / maxMonthly) * 100}%`,
                      minHeight: m.count > 0 ? "4px" : 0
                    }}
                  />
                  <span className="text-stone w-full truncate text-center text-[9px]">
                    {formatMonthLabel(m.month)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="border-hairline-soft rounded-lg border bg-white p-5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-ink font-bold">처리 필요 제보</h3>
            <Link
              href="/admin/reports"
              className="text-navy-600 flex items-center gap-0.5 text-xs font-semibold hover:underline"
            >
              전체 보기
              <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="space-y-3">
            {!loading && recentReports.length === 0 && (
              <p className="text-stone py-4 text-center text-sm">처리할 제보가 없어요</p>
            )}
            {recentReports.map((r) => (
              <div
                key={r.id}
                className="bg-surface-soft flex items-start justify-between gap-3 rounded-lg p-3"
              >
                <div className="min-w-0">
                  <p className="text-ink text-sm font-semibold">{r.target_name}</p>
                  <p className="text-steel truncate text-xs">{r.content}</p>
                  <p className="text-stone mt-0.5 text-[10px]">{formatDate(r.created_at)}</p>
                </div>
                <Badge
                  tone={reportTone(r.status as ReportStatus)}
                  className="shrink-0 font-semibold"
                >
                  {REPORT_STATUS_LABELS[r.status as ReportStatus]}
                </Badge>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="border-navy-100 bg-navy-50 flex items-start gap-4 rounded-lg border p-5">
        <ShieldCheck className="text-navy-500 mt-0.5 h-8 w-8 shrink-0" />
        <div>
          <p className="text-navy-800 mb-1 font-bold">관리자 접근 권한</p>
          <p className="text-navy-600 text-sm">
            회원·게시물·제보는 실시간 DB와 연동됩니다. 장소·코스·이벤트는 정적/목업 데이터로
            유지됩니다.
            {stats && (
              <span className="mt-1 block">
                커뮤니티 게시물 {stats.totalPosts.toLocaleString()}건
              </span>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}
