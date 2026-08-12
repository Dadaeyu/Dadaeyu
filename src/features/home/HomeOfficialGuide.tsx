import { ArrowUpRight, ShieldCheck } from "lucide-react";

type OfficialSource = {
  name: string;
  purpose: string;
  href: string;
};

const OFFICIAL_SOURCES: OfficialSource[] = [
  {
    name: "대전관광공사",
    purpose: "관광 소식과 시티투어",
    href: "https://www.djto.kr/kor/index.do"
  },
  {
    name: "대전광역시",
    purpose: "축제·문화·시정 소식",
    href: "https://www.daejeon.go.kr/index.do"
  },
  {
    name: "대전의 맛",
    purpose: "대표 음식과 미식 여행",
    href: "https://www.daejeon.go.kr/fod/index.do"
  },
  {
    name: "대전 교통정보",
    purpose: "도로와 버스·이동 안내",
    href: "https://www.daejeon.go.kr/drh/DrhContentsHtmlView.do?menuSeq=1497"
  }
];

export function HomeOfficialGuide() {
  return (
    <section
      className="border-hairline overflow-hidden rounded-2xl border bg-white dark:bg-neutral-950"
      aria-labelledby="home-official-guide-title"
    >
      <div className="grid lg:grid-cols-[minmax(16rem,0.72fr)_minmax(0,1.28fr)]">
        <div className="border-hairline bg-navy-50 border-b px-5 py-6 sm:px-7 lg:border-r lg:border-b-0 dark:bg-neutral-900">
          <div className="text-navy-700 flex items-center gap-2 text-sm font-semibold">
            <ShieldCheck className="h-4 w-4" aria-hidden="true" />
            대전 공식 여행 안내
          </div>
          <h2
            id="home-official-guide-title"
            className="text-ink mt-3 max-w-md text-2xl leading-tight font-semibold tracking-[-0.035em] break-keep"
          >
            대전의 공식 여행 정보를 한곳에서 만나보세요
          </h2>
          <p className="text-steel mt-3 max-w-md text-sm leading-6 break-keep">
            관광 소식과 축제, 대전의 맛, 교통 정보까지 여행에 필요한 안내를 공식 채널에서
            살펴보세요.
          </p>
        </div>

        <div className="grid sm:grid-cols-2">
          {OFFICIAL_SOURCES.map((source) => (
            <a
              key={source.name}
              href={source.href}
              target="_blank"
              rel="noreferrer"
              className="border-hairline group focus-visible:outline-navy-500 hover:bg-surface-soft flex min-h-24 items-center gap-4 border-b px-5 py-4 transition-colors focus-visible:z-10 focus-visible:outline-2 focus-visible:outline-offset-[-2px] dark:hover:bg-neutral-900 sm:[&:nth-child(odd)]:border-r sm:[&:nth-last-child(-n+2)]:border-b-0"
            >
              <span className="min-w-0 flex-1">
                <span className="text-ink block text-sm font-semibold">{source.name}</span>
                <span className="text-steel mt-1 block text-sm">{source.purpose}</span>
              </span>
              <ArrowUpRight
                className="text-stone group-hover:text-navy-600 h-4 w-4 shrink-0 transition-colors"
                aria-hidden="true"
              />
              <span className="sr-only">새 창에서 열기</span>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
