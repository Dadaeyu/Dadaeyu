"use client";

import { useMemo, useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

export type ActiveNotice = {
  id: number;
  title: string;
  content: string;
  updated_at: string;
};

type NoticeModalProps = {
  notice: ActiveNotice;
  onClose: (opts: { snoozeToday: boolean }) => void;
};

export function getTodayKey(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export function snoozeStorageKey(noticeId: number) {
  return `notice_snooze:${noticeId}`;
}

export default function NoticeModal({ notice, onClose }: NoticeModalProps) {
  const [snoozeToday, setSnoozeToday] = useState(false);
  const bodyLines = useMemo(() => notice.content.split(/\r?\n/), [notice.content]);

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 px-4 py-6">
      <Card className="w-full max-w-lg overflow-hidden">
        <div className="flex items-start justify-between gap-4 border-b px-5 py-4">
          <div className="min-w-0">
            <p className="text-ink text-base font-bold">공지</p>
            <h2 className="text-ink mt-1 text-lg font-extrabold break-words">{notice.title}</h2>
          </div>
          <button
            type="button"
            onClick={() => onClose({ snoozeToday })}
            className="text-stone hover:bg-surface-soft hover:text-ink rounded-full p-2 transition-colors"
            aria-label="닫기"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="px-5 py-4">
          <div className="text-steel space-y-2 text-sm">
            {bodyLines.map((line, idx) => (
              <p key={idx} className="break-words whitespace-pre-wrap">
                {line}
              </p>
            ))}
          </div>

          <div className="mt-5 flex items-center justify-between gap-3">
            <label className="text-stone flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={snoozeToday}
                onChange={(e) => setSnoozeToday(e.target.checked)}
              />
              오늘 하루 안 보기
            </label>

            <div className="flex items-center gap-2">
              <Button variant="ghost" onClick={() => onClose({ snoozeToday: false })}>
                닫기
              </Button>
              <Button onClick={() => onClose({ snoozeToday })}>확인</Button>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
