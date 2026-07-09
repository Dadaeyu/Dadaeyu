import Community from "@/components/screens/Community";
import { Suspense } from "react";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <Community />
    </Suspense>
  );
}
