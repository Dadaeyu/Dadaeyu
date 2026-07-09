"use client";

import { useCallback, useEffect, useState } from "react";
import { Search } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { COMMUNITY_LEVEL_LABELS, type UserRole, type UserStatus } from "@/lib/supabase/types";
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

export function UsersSection() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | UserRole>("all");
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
        throw new Error(j.error ?? "회원 목록을 불러오지 못했습니다.");
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
        <h1 className="text-ink text-xl font-bold">유저 관리</h1>
        <span className="text-stone text-sm">총 {users.length}명</span>
      </div>

      {error && (
        <div className="border-error/30 text-error rounded-lg border bg-red-50 px-4 py-3 text-sm">
          {error}
        </div>
      )}

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="text-stone absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="닉네임 또는 이메일 검색"
            className="border-hairline focus:ring-navy-400 w-full rounded-lg border py-2.5 pr-4 pl-9 text-sm focus:ring-2 focus:outline-none"
          />
        </div>
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value as "all" | UserRole)}
          className="border-hairline rounded-lg border px-3 py-2.5 text-sm"
        >
          <option value="all">전체 역할</option>
          <option value="user">일반</option>
          <option value="admin">관리자</option>
        </select>
      </div>

      <div className="border-hairline-soft overflow-hidden rounded-lg border bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-hairline-soft bg-surface-soft border-b">
                {["닉네임", "이메일", "가입일", "등급", "역할", "상태", "액션"].map((h) => (
                  <th
                    key={h}
                    className="text-steel px-4 py-3 text-left text-xs font-bold whitespace-nowrap"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={7} className="text-stone px-4 py-8 text-center">
                    불러오는 중…
                  </td>
                </tr>
              )}
              {!loading && users.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-stone px-4 py-8 text-center">
                    검색 결과가 없습니다.
                  </td>
                </tr>
              )}
              {!loading &&
                users.map((u) => (
                  <tr
                    key={u.id}
                    className="border-hairline-soft hover:bg-surface-soft border-b transition-colors"
                  >
                    <td className="text-ink px-4 py-3 font-semibold">{u.nickname}</td>
                    <td className="text-steel px-4 py-3 whitespace-nowrap">{u.email ?? "—"}</td>
                    <td className="text-stone px-4 py-3 whitespace-nowrap">
                      {formatDate(u.created_at)}
                    </td>
                    <td className="px-4 py-3">
                      <span className="bg-surface text-steel rounded-full px-2 py-0.5 text-xs font-semibold">
                        {COMMUNITY_LEVEL_LABELS[u.community_level] ?? `Lv.${u.community_level}`}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <Badge tone={u.role === "admin" ? "brand" : "neutral"}>
                        {u.role === "admin" ? "관리자" : "일반"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Badge tone={u.status === "active" ? "brand" : "error"}>
                        {u.status === "active" ? "정상" : "정지"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1.5">
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={saving}
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
                            onClick={() => patchUser(u.id, { status: "active" })}
                          >
                            해제
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>

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
              className="border-hairline mb-4 w-full rounded-lg border p-3 text-sm"
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
