import Link from "next/link";
import { Home } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center py-20">
      <div className="mb-4 text-6xl">🗺️</div>
      <h1 className="text-ink mb-2 text-3xl font-bold">페이지를 찾을 수 없습니다</h1>
      <p className="text-steel mb-8">요청하신 페이지가 존재하지 않습니다.</p>
      <Link
        href="/"
        className="bg-brand-500 hover:bg-brand-600 text-ink flex items-center gap-2 rounded-full px-6 py-3 transition-colors"
      >
        <Home className="h-5 w-5" />
        홈으로 돌아가기
      </Link>
    </div>
  );
}
