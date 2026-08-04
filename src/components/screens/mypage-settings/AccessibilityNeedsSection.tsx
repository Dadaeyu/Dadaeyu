"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { updateUserPreferences } from "@/lib/supabase/member";
import AccessibilityNeedsPicker from "@/components/AccessibilityNeedsPicker";
import { Button } from "@/components/ui/Button";

type Props = {
  onDirtyChange: (dirty: boolean) => void;
};

export function AccessibilityNeedsSection({ onDirtyChange }: Props) {
  const { user, preferences, refreshMember } = useAuth();
  const [access, setAccess] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const baseline = useRef<string[]>([]);

  useEffect(() => {
    const next = preferences?.accessibility_needs ?? [];
    queueMicrotask(() => {
      setAccess(next);
      baseline.current = next;
      onDirtyChange(false);
    });
  }, [preferences, onDirtyChange]);

  const onChange = useCallback(
    (next: string[]) => {
      setAccess(next);
      const same =
        next.length === baseline.current.length &&
        next.every((t) => baseline.current.includes(t)) &&
        baseline.current.every((t) => next.includes(t));
      onDirtyChange(!same);
    },
    [onDirtyChange]
  );

  const save = async () => {
    if (!user) return;
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      await updateUserPreferences(user.id, { accessibility_needs: access });
      await refreshMember();
      baseline.current = access;
      onDirtyChange(false);
      setSuccess("여행 접근성 설정이 저장되었습니다.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "저장에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-xl space-y-5">
      <AccessibilityNeedsPicker
        value={access}
        onChange={onChange}
        variant="chip"
        showLegacyValues
        label="접근성 항목"
        hint="필요한 항목을 모두 선택한 뒤 저장해 주세요"
      />

      {error && (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
      {success && <p className="text-brand-700 text-sm">{success}</p>}

      <Button type="button" variant="accent" onClick={() => void save()} disabled={saving}>
        {saving ? "저장 중…" : "저장"}
      </Button>
    </div>
  );
}
