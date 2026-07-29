"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { type UserRole, type UserStatus } from "@/lib/supabase/types";
import { CommunityLevelBadge } from "@/components/community/CommunityLevelBadge";
import { formatDate } from "./helpers";

type AdminUser = {
  id: string;
  nickname: string;
  email: string | null;
  role: UserRole;
  status: UserStatus;
  community_level: number;
  suspended_reason: string | null;
  created_at: string;
};

type SortKey = "created_at" | "nickname" | "role";

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "created_at", label: "최신 가입순" },
  { value: "nickname", label: "닉네임순" },
  { value: "role", label: "역할순" }
];

const TABLE_COLUMNS = [
  { key: "no", label: "No.", className: "w-12 text-center" },
  { key: "nickname", label: "닉네임", className: "w-[7.5rem]" },
  { key: "email", label: "이메일", className: "min-w-[10rem]" },
  { key: "created_at", label: "가입일", className: "w-28 text-center" },
  { key: "level", label: "등급", className: "w-24 text-center" },
  { key: "role", label: "역할", className: "w-20 text-center" },
  { key: "status", label: "상태", className: "w-20 text-center" },
  { key: "actions", label: "관리", className: "w-44 text-center" }
] as const;

function sortUsers(users: AdminUser[], sortKey: SortKey): AdminUser[] {
  const list = [...users];
  list.sort((a, b) => {
    if (sortKey === "nickname") {
      return a.nickname.localeCompare(b.nickname, "ko");
    }
    if (sortKey === "role") {
      if (a.role !== b.role) return a.role === "admin" ? -1 : 1;
      return a.nickname.localeCompare(b.nickname, "ko");
    }
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });
  return list;
}

export function UsersSection() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | UserRole>("all");
  const [sortKey, setSortKey] = useState<SortKey>("created_at");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [suspendTarget, setSuspendTarget] = useState<AdminUser | null>(null);
  const [suspendReason, setSuspendReason] = useState("");
  const [saving, setSaving] = useState(false);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (query.trim()) params.set("q", query.trim());
      if (roleFilter !== "all") params.set("role", roleFilter);

      const res = await fetch(`/api/admin/users?${params}`);
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? "사용자 목록을 불러오지 못했습니다.");
      }
      const json = (await res.json()) as { users: AdminUser[] };
      setUsers(json.users ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "로드 실패");
    } finally {
      setLoading(false);
    }
  }, [query, roleFilter]);

  useEffect(() => {
    const t = setTimeout(loadUsers, 300);
    return () => clearTimeout(t);
  }, [loadUsers]);

  const sortedUsers = useMemo(() => sortUsers(users, sortKey), [users, sortKey]);

  const patchUser = async (
    id: string,
    patch: { role?: UserRole; status?: UserStatus; suspended_reason?: string }
  ) => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, ...patch })
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? "변경에 실패했습니다.");

      setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, ...json.user } : u)));
      setSuspendTarget(null);
      setSuspendReason("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "변경 실패");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-ink text-xl font-bold">사용자 관리</h1>
        <span className="text-stone text-sm">총 {users.length}명</span>
      </div>

      {error && (
        <div className="border-error/30 text-error rounded-lg border bg-red-50 px-4 py-3 text-sm">
          {error}
        </div>
      )}

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="relative min-w-0 flex-1">
          <Search className="text-stone absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="닉네임 또는 이메일 검색"
            className="border-hairline bg-background text-ink placeholder:text-stone focus:ring-navy-400 w-full rounded-lg border px-4 py-2.5 pr-4 pl-9 text-sm focus:ring-2 focus:outline-none"
          />
        </div>
        <div className="flex shrink-0 gap-2">
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value as "all" | UserRole)}
            className="select-on-light border-hairline min-w-[7.5rem] rounded-lg border px-3 py-2.5 text-sm"
          >
            <option value="all">전체 역할</option>
            <option value="user">일반</option>
            <option value="admin">관리자</option>
          </select>
          <select
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value as SortKey)}
            className="select-on-light border-hairline min-w-[8.5rem] rounded-lg border px-3 py-2.5 text-sm"
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <Card className="border-hairline-soft animate-pulse p-8 text-center">
          <p className="text-stone text-sm">불러오는 중…</p>
        </Card>
      ) : sortedUsers.length === 0 ? (
        <Card className="border-hairline-soft p-8 text-center">
          <p className="text-stone text-sm">검색 결과가 없습니다.</p>
        </Card>
      ) : (
        <div className="border-hairline-soft overflow-hidden rounded-lg border bg-white">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[52rem] table-fixed text-sm">
              <thead>
                <tr className="border-hairline-soft bg-surface-soft border-b">
                  {TABLE_COLUMNS.map((col) => (
                    <th
                      key={col.key}
                      className={`text-steel px-4 py-3 text-xs font-bold whitespace-nowrap ${col.className}`}
                    >
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-hairline-soft divide-y">
                {sortedUsers.map((u, index) => (
                  <tr key={u.id} className="hover:bg-surface-soft/60 transition-colors">
                    <td className="text-stone px-4 py-3.5 text-center align-middle tabular-nums">
                      {index + 1}
                    </td>
                    <td className="text-ink px-4 py-3.5 align-middle font-semibold">
                      <span className="block truncate" title={u.nickname}>
                        {u.nickname}
                      </span>
                    </td>
                    <td className="text-steel px-4 py-3.5 align-middle">
                      <span className="block truncate" title={u.email ?? undefined}>
                        {u.email ?? "—"}
                      </span>
                    </td>
                    <td className="text-stone px-4 py-3.5 text-center align-middle whitespace-nowrap tabular-nums">
                      {formatDate(u.created_at)}
                    </td>
                    <td className="px-4 py-3.5 text-center align-middle">
                      <div className="flex justify-center">
                        <CommunityLevelBadge level={u.community_level} size="sm" />
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-center align-middle">
                      <Badge tone={u.role === "admin" ? "brand" : "neutral"}>
                        {u.role === "admin" ? "관리자" : "일반"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3.5 text-center align-middle">
                      <Badge
                        tone={
                          u.status === "active"
                            ? "brand"
                            : u.status === "withdrawn"
                              ? "neutral"
                              : "error"
                        }
                      >
                        {u.status === "active"
                          ? "정상"
                          : u.status === "withdrawn"
                            ? "탈퇴"
                            : "정지"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3.5 text-center align-middle">
                      <div className="flex items-center justify-center gap-1.5">
                        {u.status === "withdrawn" ? (
                          <span className="text-stone text-xs">—</span>
                        ) : (
                          <>
                            <Button
                              size="sm"
                              variant="ghost"
                              disabled={saving}
                              className="h-8 px-2.5 text-xs whitespace-nowrap"
                              onClick={() =>
                                patchUser(u.id, {
                                  role: u.role === "admin" ? "user" : "admin"
                                })
                              }
                            >
                              {u.role === "admin" ? "일반 전환" : "관리자 지정"}
                            </Button>
                            {u.status === "active" ? (
                              <Button
                                size="sm"
                                variant="ghost"
                                disabled={saving}
                                className="h-8 px-2.5 text-xs whitespace-nowrap"
                                onClick={() => {
                                  setSuspendTarget(u);
                                  setSuspendReason("");
                                }}
                              >
                                정지
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                variant="ghost"
                                disabled={saving}
                                className="h-8 px-2.5 text-xs whitespace-nowrap"
                                onClick={() => patchUser(u.id, { status: "active" })}
                              >
                                해제
                              </Button>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {suspendTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h3 className="text-ink mb-1 text-lg font-bold">활동 정지</h3>
            <p className="text-steel mb-4 text-sm">
              <strong>{suspendTarget.nickname}</strong> 계정을 정지합니다.
            </p>
            <label className="text-steel mb-1 block text-xs font-semibold">정지 사유</label>
            <textarea
              value={suspendReason}
              onChange={(e) => setSuspendReason(e.target.value)}
              rows={3}
              placeholder="정지 사유를 입력하세요"
              className="border-hairline bg-background text-ink placeholder:text-stone mb-4 w-full rounded-lg border p-3 text-sm"
            />
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setSuspendTarget(null)} disabled={saving}>
                취소
              </Button>
              <Button
                variant="default"
                disabled={saving}
                onClick={() =>
                  patchUser(suspendTarget.id, {
                    status: "suspended",
                    suspended_reason: suspendReason
                  })
                }
              >
                정지하기
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
