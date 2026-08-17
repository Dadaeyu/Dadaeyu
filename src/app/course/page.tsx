import { Suspense } from "react";
import Course from "@/components/screens/Course";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <Course />
    </Suspense>
  );
}
