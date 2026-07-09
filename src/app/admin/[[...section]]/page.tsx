import Admin from "@/components/screens/Admin";
import { Suspense } from "react";

export default function Page() {
  return (
    <Suspense fallback={<div className="text-stone p-6 text-sm">불러오는 중…</div>}>
      <Admin />
    </Suspense>
  );
}
