"use client";

import Link from "next/link";
import {
  Accessibility,
  ArrowRight,
  BookOpenText,
  Check,
  Clock3,
  Ear,
  Eye,
  Footprints,
  LocateFixed,
  Map,
  MessageCircle,
  Route,
  Search,
  SlidersHorizontal
} from "lucide-react";
import { HomePlaceImage } from "@/features/home/HomePlaceImage";
import {
  HOME_NEED_OPTIONS,
  formatDistance,
  sortHomeEvidenceForNeeds,
  summarizeVisitInfo,
  type HomeNeedId
} from "@/features/home/homeData";
import { getHomeSearchStatusLabel } from "@/features/home/homePresentation";
import type { HomeExperience } from "@/features/home/useHomeExperience";

const NEED_ICONS = {
  step_free: Footprints,
  short_distance: Route,
  visual_guidance: Eye,
  hearing_guidance: Ear,
  easy_explanation: BookOpenText
} satisfies Record<HomeNeedId, typeof Accessibility>;

const QUICK_SEARCHES = [
  { label: "비 오는 날", query: "실내" },
  { label: "아이와 함께", query: "어린이" },
  { label: "가벼운 산책", query: "공원" }
] as const;

export function HomeHero({
  experience,
  onOpenChat
}: {
  experience: HomeExperience;
  onOpenChat: () => void;
}) {
  const { auth, location } = experience;
  const displayName = auth.member?.nickname?.trim();
  const locationLabel = getLocationLabel(location.status, location.errorReason);
  const locationHelp = getLocationHelp(location.status, location.errorReason);
  const searchStatusLabel = getHomeSearchStatusLabel(
    experience.committedQuery,
    experience.loadState
  );

  return (
    <section
      className="border-brand-100 bg-brand-50/70 overflow-hidden rounded-[1.75rem] border"
      aria-labelledby="home-heading"
    >
      <div className="p-5 sm:p-8 lg:p-10">
        <div className="flex items-start justify-between gap-3">
          <p className="text-brand-800 pt-2 text-sm font-semibold">대전 나들이</p>
          <Link
            href={auth.user ? "/mypage" : "/login?next=%2F"}
            className="border-brand-200 text-brand-900 inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl border bg-white px-4 text-sm font-semibold transition-colors hover:bg-white/70"
            aria-label={auth.user ? "내 조건과 프로필 보기" : "로그인하고 내 조건 저장하기"}
          >
            <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />내 조건
          </Link>
        </div>

        <div className="mt-8 grid gap-7 lg:grid-cols-[minmax(18rem,0.72fr)_minmax(28rem,1.28fr)] lg:items-end lg:gap-10">
          <div>
            <h1
              id="home-heading"
              className="text-ink max-w-[16ch] text-[2rem] leading-[1.08] font-semibold tracking-[-0.04em] text-balance break-keep sm:text-[2.8rem]"
            >
              {displayName ? `${displayName}님, 오늘은 어디 가볼까요?` : "오늘은 어디 가볼까요?"}
            </h1>
            <p className="text-slate mt-3 max-w-[31rem] text-[0.95rem] leading-6 break-keep sm:text-base">
              가고 싶은 곳이나 필요한 편의시설을 검색해 보세요.
            </p>
          </div>

          <div>
            <form
              role="search"
              onSubmit={(event) => {
                event.preventDefault();
                experience.submitSearch();
              }}
            >
              <label htmlFor="home-search" className="sr-only">
                장소, 활동, 필요한 편의시설 검색
              </label>
              <div className="home-search-row border-brand-100 flex min-h-16 items-center gap-2 rounded-2xl border bg-white p-2 pl-4 shadow-[0_16px_40px_-32px_rgba(15,75,67,0.55)]">
                <Search className="text-steel h-5 w-5 shrink-0" aria-hidden="true" />
                <input
                  id="home-search"
                  type="search"
                  value={experience.query}
                  onChange={(event) => experience.setQuery(event.target.value)}
                  placeholder="장소나 활동을 검색해 보세요"
                  className="home-search-input text-ink placeholder:text-steel min-h-12 min-w-0 flex-1 bg-transparent text-base outline-none"
                />
                <button
                  type="submit"
                  className="home-search-submit bg-brand-800 hover:bg-brand-900 grid h-12 w-12 shrink-0 place-items-center rounded-xl text-white transition-colors"
                  aria-label="관광지 검색"
                >
                  <ArrowRight className="h-5 w-5" aria-hidden="true" />
                </button>
              </div>
              {searchStatusLabel ? (
                <div className="border-brand-100 mt-2 flex items-center justify-between gap-3 rounded-xl border bg-white px-3 py-2">
                  <p className="text-slate line-clamp-1 text-sm" aria-live="polite">
                    {searchStatusLabel}
                  </p>
                  <button
                    type="button"
                    onClick={experience.clearSearch}
                    className="text-brand-800 min-h-11 shrink-0 px-2 text-sm font-semibold"
                  >
                    전체 보기
                  </button>
                </div>
              ) : null}
            </form>

            {!experience.committedQuery ? (
              <div className="mt-3 flex [scrollbar-width:none] items-center gap-2 overflow-x-auto pb-1 [&::-webkit-scrollbar]:hidden">
                <span className="text-steel shrink-0 text-xs font-semibold">이럴 때</span>
                {QUICK_SEARCHES.map((item) => (
                  <button
                    key={item.query}
                    type="button"
                    onClick={() => experience.searchFor(item.query)}
                    className="border-brand-200 text-brand-900 min-h-11 shrink-0 rounded-full border bg-white px-3 text-xs font-semibold transition-colors hover:bg-white/70"
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        </div>

        <div
          className="border-brand-100 mt-7 grid gap-2 border-t pt-5 sm:grid-cols-3"
          aria-label="여행 바로가기"
        >
          <button
            type="button"
            onClick={onOpenChat}
            className="bg-brand-800 hover:bg-brand-900 inline-flex min-h-12 items-center justify-center gap-2 rounded-xl px-5 text-sm font-semibold text-white transition-colors"
            aria-haspopup="dialog"
          >
            <MessageCircle className="h-4 w-4" aria-hidden="true" />
            다유에게 물어보기
          </button>
          <Link
            href="/map"
            className="border-brand-200 text-brand-900 inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border bg-white px-5 text-sm font-semibold transition-colors hover:bg-white/70"
          >
            <Map className="h-4 w-4" aria-hidden="true" />
            지도에서 찾기
          </Link>
          <button
            type="button"
            onClick={location.start}
            disabled={location.status === "locating"}
            className="border-brand-200 text-brand-900 inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border bg-white px-4 text-sm font-semibold transition-colors hover:bg-white/70 disabled:opacity-60"
            aria-describedby="home-location-status"
          >
            <LocateFixed className="h-4 w-4" aria-hidden="true" />
            {locationLabel}
          </button>
        </div>
        <p id="home-location-status" className="sr-only" role="status">
          {locationLabel}
        </p>
        {locationHelp ? (
          <p className="text-slate mt-3 text-sm leading-5" role="status">
            {locationHelp}
          </p>
        ) : null}
      </div>
    </section>
  );
}

export function HomeFeaturedPlace({ experience }: { experience: HomeExperience }) {
  const place = experience.data?.places[0] ?? null;

  if (!place) {
    if (experience.loadState !== "loading") {
      return (
        <section aria-labelledby="featured-place-title">
          <h2
            id="featured-place-title"
            className="text-ink text-xl font-semibold tracking-[-0.02em] sm:text-2xl"
          >
            오늘 가볼 만한 곳
          </h2>
          <div className="border-hairline bg-surface mt-3 rounded-[1.75rem] border px-5 py-8 text-center sm:px-8">
            <p className="text-ink font-semibold">
              {experience.loadState === "error"
                ? "추천 장소를 불러오지 못했어요."
                : "조건에 맞는 추천 장소가 아직 없어요."}
            </p>
            <p className="text-slate mt-2 text-sm leading-6">
              {experience.loadError ?? "검색어나 도움 조건을 바꿔서 다시 찾아보세요."}
            </p>
            {experience.loadState === "error" ? (
              <button
                type="button"
                onClick={experience.retry}
                className="bg-brand-800 hover:bg-brand-900 mt-4 min-h-11 rounded-xl px-4 text-sm font-semibold text-white transition-colors"
              >
                다시 불러오기
              </button>
            ) : null}
          </div>
        </section>
      );
    }

    return (
      <section aria-labelledby="featured-place-title" aria-busy="true">
        <h2 id="featured-place-title" className="text-brand-800 text-sm font-semibold">
          오늘 가볼 만한 곳
        </h2>
        <div
          className="border-hairline bg-surface mt-3 aspect-[16/10] animate-pulse rounded-[1.75rem] border motion-reduce:animate-none sm:aspect-[16/7]"
          aria-hidden="true"
        />
        <span className="sr-only" role="status">
          가볼 만한 곳을 불러오는 중입니다.
        </span>
      </section>
    );
  }

  const distance = formatDistance(place.distanceMeters);
  const visitInfo = summarizeVisitInfo(place);
  const evidence = sortHomeEvidenceForNeeds(place.accessibility, experience.selectedNeedIds).slice(
    0,
    2
  );

  return (
    <section aria-labelledby="featured-place-title">
      <h2
        id="featured-place-title"
        className="text-ink mb-3 text-xl font-semibold tracking-[-0.02em] sm:text-2xl"
      >
        오늘 가볼 만한 곳
      </h2>

      <article className="border-hairline overflow-hidden rounded-[1.75rem] border bg-white shadow-[0_22px_60px_-46px_rgba(15,44,41,0.75)] md:grid md:grid-cols-[minmax(0,1.3fr)_minmax(20rem,0.7fr)]">
        <div className="relative aspect-[16/10] min-h-[17rem] overflow-hidden md:aspect-auto md:min-h-[28rem]">
          <HomePlaceImage
            src={place.imageUrl}
            alt={place.title}
            className="h-full w-full object-cover"
          />
        </div>
        <div className="flex flex-col justify-between p-5 sm:p-7">
          <div>
            <p className="text-brand-800 text-sm font-semibold">{place.category ?? "대전 여행"}</p>
            <h3 className="text-ink mt-2 text-2xl leading-tight font-semibold tracking-[-0.025em] break-keep sm:text-3xl">
              {place.title}
            </h3>
            <div className="text-slate mt-4 flex flex-wrap gap-x-3 gap-y-2 text-sm">
              {distance ? <span>{distance} 거리</span> : null}
              {visitInfo ? (
                <span className="inline-flex items-center gap-1.5">
                  <Clock3 className="h-4 w-4" aria-hidden="true" />
                  {visitInfo}
                </span>
              ) : null}
            </div>
            {evidence.length ? (
              <ul className="mt-5 space-y-2">
                {evidence.map((item) => (
                  <li
                    key={item.key}
                    className="bg-brand-50 text-brand-900 flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium"
                  >
                    <Check className="text-brand-700 h-4 w-4 shrink-0" aria-hidden="true" />
                    {item.label}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
          <button
            type="button"
            onClick={(event) => experience.openPlace(place, event.currentTarget)}
            className="bg-brand-800 hover:bg-brand-900 mt-6 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl px-5 text-sm font-semibold text-white transition-colors"
            aria-label={`${place.title} 자세히 보기`}
          >
            자세히 보기
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </article>
    </section>
  );
}

export function HomeNeedsPicker({ experience }: { experience: HomeExperience }) {
  const { auth } = experience;
  return (
    <section
      className="border-brand-100 bg-brand-50/65 rounded-[1.5rem] border p-4 sm:p-5"
      aria-labelledby="needs-title"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 id="needs-title" className="text-ink text-base font-semibold sm:text-lg">
            어떤 점이 가장 중요한가요?
          </h2>
          <p className="text-steel mt-0.5 text-sm">
            원하는 조건을 고르면 더 잘 맞는 곳부터 보여드려요.
          </p>
        </div>
        {auth.user ? (
          <button
            type="button"
            onClick={() => void experience.saveNeeds()}
            disabled={experience.saving}
            className="bg-primary text-primary-foreground min-h-11 shrink-0 rounded-full px-4 text-sm font-semibold disabled:opacity-60"
          >
            {experience.saving ? "저장 중" : "저장"}
          </button>
        ) : (
          <Link
            href="/login?next=%2F"
            className="text-brand-800 min-h-11 shrink-0 content-center px-2 text-sm font-semibold"
          >
            로그인
          </Link>
        )}
      </div>

      <div className="-mx-1 mt-4 flex snap-x [scrollbar-width:none] gap-2 overflow-x-auto px-1 pb-1 [&::-webkit-scrollbar]:hidden">
        {HOME_NEED_OPTIONS.map((option) => {
          const selected = experience.selectedNeedIds.includes(option.id);
          const Icon = NEED_ICONS[option.id];
          return (
            <button
              key={option.id}
              type="button"
              onClick={() => experience.toggleNeed(option.id)}
              aria-pressed={selected}
              className={`flex min-h-12 shrink-0 snap-start items-center gap-2 rounded-full border px-4 text-sm font-semibold transition-colors ${
                selected
                  ? "border-brand-800 bg-brand-800 text-white"
                  : "border-brand-100 text-slate hover:border-brand-300 bg-white"
              }`}
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
              {option.label}
              {selected ? <Check className="h-4 w-4" aria-hidden="true" /> : null}
            </button>
          );
        })}
      </div>

      {experience.saveError ? (
        <p className="text-error mt-3 text-sm" role="alert">
          {experience.saveError}
        </p>
      ) : null}
      {experience.saveMessage ? (
        <p className="text-brand-800 mt-3 text-sm" role="status">
          {experience.saveMessage}
        </p>
      ) : null}
    </section>
  );
}

function getLocationLabel(
  status: HomeExperience["location"]["status"],
  errorReason: HomeExperience["location"]["errorReason"]
) {
  if (status === "locating") return "가까운 곳 찾는 중";
  if (status === "active") return "가까운 곳부터 보는 중";
  if (status === "error") {
    if (errorReason === "denied") return "위치 권한이 꺼져 있어요";
    if (errorReason === "outside_daejeon") return "대전 밖 위치예요";
    return "위치를 다시 확인해 주세요";
  }
  return "내 주변 보기";
}

function getLocationHelp(
  status: HomeExperience["location"]["status"],
  errorReason: HomeExperience["location"]["errorReason"]
) {
  if (status !== "error") return null;
  if (errorReason === "denied") {
    return "브라우저에서 위치 권한을 켜면 가까운 장소부터 볼 수 있어요.";
  }
  if (errorReason === "outside_daejeon") {
    return "거리순은 대전 안에서만 제공해요. 위치 없이도 장소는 찾을 수 있어요.";
  }
  return "위치를 확인하지 못했어요. 위치 없이 계속 둘러볼 수 있어요.";
}
