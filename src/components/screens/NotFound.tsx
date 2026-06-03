import Link from "next/link";
import { Home } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center py-20">
      <div className="text-6xl mb-4">🗺️</div>
      <h1 className="text-3xl font-bold text-gray-800 mb-2">페이지를 찾을 수 없습니다</h1>
      <p className="text-gray-600 mb-8">요청하신 페이지가 존재하지 않습니다.</p>
      <Link
        href="/"
        className="flex items-center gap-2 px-6 py-3 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors"
      >
        <Home className="w-5 h-5" />
        홈으로 돌아가기
      </Link>
    </div>
  );
}
