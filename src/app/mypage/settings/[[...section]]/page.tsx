import { Suspense } from "react";
import MyPageSettings from "@/components/screens/MyPageSettings";

export default function Page() {
  return (
    <Suspense fallback={<div className="text-stone p-6 text-sm">불러오는 중…</div>}>
      <MyPageSettings />
    </Suspense>
  );
}
