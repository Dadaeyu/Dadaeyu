import Link from "next/link";

/**
 * 다대유 브랜드 로고
 * - 마크: 네이비→틸 그라데이션 위치핀 + 하트 (장소 + 누구나·함께)
 * - 워드마크: "다대"(네이비) + "유"(틸) + 태그라인
 */
export default function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <Link
      href="/"
      className="flex items-center gap-2.5 shrink-0 group"
      aria-label="다대유 - 대전 무장애 여행 홈"
    >
      {/* Mark */}
      <span className="relative inline-flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-br from-navy-600 to-brand-500 shadow-sm shadow-brand-500/30 transition-transform duration-200 group-hover:scale-105">
        <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" aria-hidden="true">
          {/* pin */}
          <path
            d="M12 21.5s-6.6-5.6-6.6-10.8A6.6 6.6 0 0 1 12 4.1a6.6 6.6 0 0 1 6.6 6.6c0 5.2-6.6 10.8-6.6 10.8Z"
            fill="white"
          />
          {/* heart */}
          <path
            d="M12 13.9c-1.9-1.4-3.1-2.3-3.1-3.7 0-.95.74-1.7 1.68-1.7.55 0 1.07.27 1.42.69.35-.42.87-.69 1.42-.69.94 0 1.68.75 1.68 1.7 0 1.4-1.2 2.3-3.1 3.7Z"
            fill="#35b597"
          />
        </svg>
      </span>

      {/* Wordmark */}
      {!compact && (
        <span className="flex flex-col leading-none">
          <span className="text-lg font-extrabold tracking-tight">
            <span className="text-navy-600">다대</span>
            <span className="text-brand-500">유</span>
          </span>
          <span className="mt-1 text-[10px] font-semibold text-gray-400 tracking-tight">
            대전 무장애 여행
          </span>
        </span>
      )}
    </Link>
  );
}
