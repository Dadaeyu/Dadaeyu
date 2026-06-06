import Link from "next/link";
import { Home } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center py-20">
      <div className="mb-4 text-6xl">🗺️</div>
      <h1 className="mb-2 text-3xl font-bold text-gray-800">페이지를 찾을 수 없습니다</h1>
      <p className="mb-8 text-gray-600">요청하신 페이지가 존재하지 않습니다.</p>
      <Link
        href="/"
        className="bg-brand-600 hover:bg-brand-700 flex items-center gap-2 rounded-lg px-6 py-3 text-white transition-colors"
      >
        <Home className="h-5 w-5" />
        홈으로 돌아가기
      </Link>
    </div>
  );
}
