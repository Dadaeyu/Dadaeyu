import { Suspense } from "react";
import { WithdrawAccountPage } from "@/components/screens/WithdrawAccountPage";

export default function Page() {
  return (
    <Suspense fallback={<div className="text-stone p-6 text-sm">불러오는 중…</div>}>
      <WithdrawAccountPage />
    </Suspense>
  );
}
