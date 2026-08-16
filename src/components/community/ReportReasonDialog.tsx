"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

// tb_code(code_group='report_reason')와 동일한 값. 신고 모달을 열자마자 바로 보여주기 위해
// DB 조회 없이 하드코딩한다(코드가 자주 바뀌지 않는 고정 목록이라 매번 불러올 필요가 없음).
const REPORT_REASONS = [
  { code_id: "01", code_nm: "욕설 및 비방" },
  { code_id: "02", code_nm: "스팸 및 광고" },
  { code_id: "03", code_nm: "음란물 및 유해 콘텐츠" },
  { code_id: "04", code_nm: "불법 정보 및 사기" },
  { code_id: "05", code_nm: "개인정보 노출" },
  { code_id: "06", code_nm: "기타 운영방해" }
];

// 게시글/댓글 신고 시 사유(tb_code.code_group='report_reason')를 고르는 모달.
// ConfirmDialog와 달리 목록을 보여줘야 해서 별도 컴포넌트로 분리했다.
export function ReportReasonDialog({
  open,
  onCancel,
  onSubmit,
  submitting
}: {
  open: boolean;
  onCancel: () => void;
  onSubmit: (reasonCode: string) => void;
  submitting: boolean;
}) {
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    queueMicrotask(() => setSelected(null));
  }, [open]);

  if (!open) return null;

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-label="신고 사유 선택"
      className="fixed inset-0 z-[200] flex items-end justify-center bg-black/50 px-4 py-6 sm:items-center"
      onClick={onCancel}
    >
      <Card className="w-full max-w-sm p-5" onClick={(e) => e.stopPropagation()}>
        <p className="text-ink text-base font-semibold">신고 사유를 선택해 주세요</p>

        <div className="mt-4 max-h-72 space-y-1.5 overflow-y-auto">
          {REPORT_REASONS.map((r) => (
            <label
              key={r.code_id}
              className={`flex min-h-11 cursor-pointer items-center gap-2.5 rounded-lg border px-3 py-2.5 text-sm transition-colors ${
                selected === r.code_id
                  ? "border-brand-400 bg-brand-50 text-brand-800"
                  : "border-hairline text-ink hover:bg-surface-soft"
              }`}
            >
              <input
                type="radio"
                name="report-reason"
                value={r.code_id}
                checked={selected === r.code_id}
                onChange={() => setSelected(r.code_id)}
                className="shrink-0"
              />
              {r.code_nm}
            </label>
          ))}
        </div>

        <div className="mt-5 grid grid-cols-2 gap-2">
          <Button variant="outline" className="min-h-12" disabled={submitting} onClick={onCancel}>
            취소
          </Button>
          <Button
            className="min-h-12"
            disabled={!selected || submitting}
            onClick={() => selected && onSubmit(selected)}
          >
            {submitting ? "신고 중…" : "신고하기"}
          </Button>
        </div>
      </Card>
    </div>
  );
}
