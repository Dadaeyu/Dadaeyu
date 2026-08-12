"use client";

import { useCallback, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

type DialogState = {
  message: string;
  okOnly: boolean;
  resolve: (value: boolean) => void;
};

// 네이티브 confirm()/alert()는 모바일 브라우저마다 스타일이 달라 앱과 이질감이 크다.
// 같은 역할을 하는 인앱 다이얼로그를 Promise 기반으로 제공한다.
export function useConfirmDialog() {
  const [state, setState] = useState<DialogState | null>(null);

  const confirm = useCallback((message: string) => {
    return new Promise<boolean>((resolve) => {
      setState({ message, okOnly: false, resolve });
    });
  }, []);

  const alert = useCallback((message: string) => {
    return new Promise<void>((resolve) => {
      setState({ message, okOnly: true, resolve: () => resolve() });
    });
  }, []);

  const close = (result: boolean) => {
    state?.resolve(result);
    setState(null);
  };

  const dialog = state ? (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-label={state.message}
      className="fixed inset-0 z-[200] flex items-end justify-center bg-black/50 px-4 py-6 sm:items-center"
      onClick={() => close(false)}
    >
      <Card className="w-full max-w-sm p-5" onClick={(e) => e.stopPropagation()}>
        <p className="text-ink text-base leading-6 whitespace-pre-wrap">{state.message}</p>
        <div className={`mt-5 grid gap-2 ${state.okOnly ? "grid-cols-1" : "grid-cols-2"}`}>
          {!state.okOnly && (
            <Button variant="outline" className="min-h-12" onClick={() => close(false)}>
              취소
            </Button>
          )}
          <Button className="min-h-12" onClick={() => close(true)}>
            확인
          </Button>
        </div>
      </Card>
    </div>
  ) : null;

  return { confirm, alert, dialog };
}
