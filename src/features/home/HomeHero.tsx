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
  formatSourceDate,
  getHomeEvidenceStatus,
  sortHomeEvidenceForNeeds,
  summarizeVisitInfo,
  type HomeNeedId
} from "@/features/home/homeData";
import { getHomeRefinementStatusLabel } from "@/features/home/homePresentation";
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
  const refinementStatusLabel = getHomeRefinementStatusLabel(
    experience.committedQuery,
    experience.loadState
  );

  return (
    <section
      className="border-hairline overflow-hidden rounded-[1.25rem] border bg-white shadow-[0_18px_54px_-46px_rgba(15,44,41,0.75)] sm:rounded-[1.5rem]"
      aria-labelledby="home-heading"
    >
      <div className="p-4 sm:p-7 lg:p-8">
        <div className="home-heading-row flex items-start justify-between gap-3">
          <p className="text-brand-800 home-profile-label pt-2 text-sm font-semibold">
            대전 여행 브리핑
          </p>
          <Link
            href={auth.user ? "/mypage" : "/login?next=%2F"}
            className="border-hairline text-ink bg-surface hover:bg-brand-50 inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl border px-4 text-sm font-semibold transition-colors"
            aria-label={auth.user ? "내 조건과 프로필 보기" : "로그인하고 내 조건 저장하기"}
          >
            <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />내 조건
          </Link>
        </div>

        <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(18rem,0.72fr)_minmax(28rem,1.28fr)] lg:items-end lg:gap-8">
          <div>
            <h1
              id="home-heading"
              className="text-ink max-w-[16ch] text-[1.9rem] leading-[1.08] font-semibold tracking-[-0.03em] text-balance break-keep sm:text-[2.55rem]"
            >
              {displayName
                ? `${displayName}님, 오늘 갈 곳부터 확인해요`
                : "오늘 갈 곳, 필요한 정보부터 확인해요"}
            </h1>
            <p className="text-slate mt-3 max-w-[30rem] text-[0.95rem] leading-6 break-keep">
              공개된 방문·편의 정보를 바탕으로 대전에서 둘러볼 곳을 빠르게 좁혀보세요.
            </p>
          </div>

          <div>
            <form
              aria-labelledby="home-refine-title"
              onSubmit={(event) => {
                event.preventDefault();
                experience.submitSearch();
              }}
            >
              <div className="border-hairline bg-surface rounded-2xl border p-2 shadow-[0_16px_40px_-34px_rgba(15,75,67,0.45)]">
                <div className="flex items-center justify-between gap-3 px-2 pt-1">
                  <label
                    id="home-refine-title"
                    htmlFor="home-search"
                    className="text-brand-800 text-xs font-semibold tracking-[0.04em]"
                  >
                    홈 추천 키워드
                  </label>
                  <Link
                    href={
                      experience.query.trim()
                        ? `/map?query=${encodeURIComponent(experience.query.trim())}`
                        : "/map"
                    }
                    className="text-steel hover:text-brand-800 inline-flex min-h-8 items-center gap-1.5 text-xs font-semibold transition-colors"
                  >
                    지도에서 키워드 이어보기
                    <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                  </Link>
                </div>
                <div className="home-search-row flex min-h-12 min-w-0 items-center gap-2 pt-1 sm:min-h-14">
                  <Search className="text-steel ml-2 h-5 w-5 shrink-0" aria-hidden="true" />
                  <input
                    id="home-search"
                    type="search"
                    value={experience.query}
                    onChange={(event) => experience.setQuery(event.target.value)}
                    placeholder="실내, 공원, 장애인 화장실로 홈 추천 좁히기"
                    className="home-search-input text-ink placeholder:text-steel min-h-11 min-w-0 flex-1 bg-transparent text-[0.95rem] outline-none sm:min-h-12 sm:text-base"
                  />
                  <button
                    type="submit"
                    className="home-search-submit bg-brand-800 hover:bg-brand-900 inline-flex h-11 shrink-0 items-center justify-center gap-1.5 rounded-xl px-4 text-sm font-semibold text-white transition-colors sm:h-12 sm:px-5"
                    aria-label="홈 추천 조건 적용"
                  >
                    홈추천 적용
                    <ArrowRight className="hidden h-4 w-4 sm:block" aria-hidden="true" />
                  </button>
                </div>
                <p className="text-steel mt-2 px-2 text-xs leading-5">
                  이 입력은 홈 추천 목록 안의 결과만 정리하는 필터예요.
                </p>
              </div>
              {refinementStatusLabel ? (
                <div className="border-brand-100 mt-2 flex items-center justify-between gap-3 rounded-xl border bg-white px-3 py-2">
                  <p className="text-slate line-clamp-1 text-sm" aria-live="polite">
                    {refinementStatusLabel}
                  </p>
                  <button
                    type="button"
                    onClick={experience.clearSearch}
                    className="text-brand-800 min-h-11 shrink-0 px-2 text-sm font-semibold"
                  >
                    전체 추천
                  </button>
                </div>
              ) : null}
            </form>

            {!experience.committedQuery ? (
              <div className="mt-3 grid grid-cols-3 gap-2" aria-label="상황별 빠른 조건">
                <span className="sr-only">이럴 때</span>
                {QUICK_SEARCHES.map((item) => (
                  <button
                    key={item.query}
                    type="button"
                    onClick={() => experience.searchFor(item.query)}
                    className="border-hairline text-slate hover:border-brand-300 hover:bg-brand-50 min-h-10 min-w-0 rounded-xl border bg-white px-1.5 text-xs leading-4 font-semibold transition-colors sm:px-3"
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        </div>

        <div
          className="home-action-grid border-hairline mt-5 grid grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)_minmax(0,0.85fr)] gap-2 border-t pt-4 sm:grid-cols-[minmax(0,1.25fr)_minmax(0,0.875fr)_minmax(0,0.875fr)]"
          aria-label="여행 바로가기"
        >
          <button
            type="button"
            onClick={onOpenChat}
            className="bg-brand-800 hover:bg-brand-900 inline-flex min-h-12 min-w-0 items-center justify-center gap-1.5 rounded-xl px-2 text-sm font-semibold text-white transition-colors sm:gap-2 sm:px-5"
            aria-haspopup="dialog"
            aria-label="다유에게 물어보기"
          >
            <MessageCircle className="h-4 w-4" aria-hidden="true" />
            <span className="truncate">다유에게</span>
          </button>
          <Link
            href="/map"
            className="border-hairline text-ink bg-surface hover:bg-brand-50 inline-flex min-h-12 min-w-0 items-center justify-center gap-2 rounded-xl border px-3 text-sm font-semibold transition-colors"
          >
            <Map className="hidden h-4 w-4 sm:block" aria-hidden="true" />
            <span className="truncate">지도</span>
          </Link>
          <button
            type="button"
            onClick={location.start}
            disabled={location.status === "locating"}
            className="border-hairline text-ink bg-surface hover:bg-brand-50 inline-flex min-h-12 min-w-0 items-center justify-center gap-2 rounded-xl border px-3 text-sm font-semibold transition-colors disabled:opacity-60"
            aria-describedby="home-location-status"
          >
            <LocateFixed className="hidden h-4 w-4 sm:block" aria-hidden="true" />
            <span className="truncate">
              {location.status === "idle" ? "내 주변" : locationLabel}
            </span>
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
          <div className="border-hairline bg-surface mt-3 flex min-h-[14rem] items-center justify-center rounded-[1.75rem] border px-5 py-8 text-center sm:min-h-[16rem] sm:px-8">
            <div className="max-w-md">
              <span className="border-brand-100 text-brand-800 mx-auto grid size-12 place-items-center rounded-2xl border bg-white shadow-sm">
                <Map className="h-5 w-5" aria-hidden="true" />
              </span>
              <p className="text-ink mt-4 font-semibold">
                {experience.loadState === "error"
                  ? "추천 장소를 불러오지 못했어요."
                  : "조건에 맞는 추천 장소가 아직 없어요."}
              </p>
              <p className="text-slate mt-2 text-sm leading-6">
                {experience.loadError ?? "입력 조건이나 도움 조건을 바꿔서 다시 살펴보세요."}
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
  const sourceDate = formatSourceDate(place.sourceUpdatedAt);
  const availableEvidenceCount = place.accessibility.filter(
    (item) => getHomeEvidenceStatus(item) === "available"
  ).length;
  const attentionEvidenceCount = place.accessibility.filter(
    (item) => getHomeEvidenceStatus(item) !== "available"
  ).length;
  const evidence = sortHomeEvidenceForNeeds(place.accessibility, experience.selectedNeedIds)
    .slice(0, 4)
    .filter((item) => getHomeEvidenceStatus(item) === "available")
    .slice(0, 2);
  const evidenceSummary = [
    {
      label: "정보 기준",
      value: sourceDate ?? "공개일 미확인"
    },
    {
      label: "공개 편의정보",
      value: `${availableEvidenceCount}개`
    },
    {
      label: "확인 필요",
      value: `${attentionEvidenceCount}개`
    }
  ];

  return (
    <section aria-labelledby="featured-place-title">
      <h2
        id="featured-place-title"
        className="text-ink mb-3 text-xl font-semibold tracking-[-0.02em] sm:text-2xl"
      >
        오늘의 방문 브리핑
      </h2>

      <article className="border-hairline overflow-hidden rounded-[1.35rem] border bg-white shadow-[0_22px_60px_-48px_rgba(15,44,41,0.65)] md:grid md:grid-cols-[minmax(0,1.05fr)_minmax(20rem,0.95fr)]">
        <div className="relative aspect-[16/10] min-h-[14rem] overflow-hidden md:aspect-auto md:min-h-[22rem]">
          <HomePlaceImage
            src={place.imageUrl}
            alt={place.title}
            className="block h-full w-full object-cover"
          />
        </div>
        <div className="flex flex-col justify-between p-5 sm:p-6">
          <div>
            <p className="text-brand-800 text-sm font-semibold">{place.category ?? "대전 여행"}</p>
            <h3 className="text-ink mt-2 text-2xl leading-tight font-semibold tracking-[-0.02em] break-keep sm:text-[2rem]">
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
            <dl className="border-hairline bg-surface mt-5 grid grid-cols-3 overflow-hidden rounded-2xl border">
              {evidenceSummary.map((item) => (
                <div
                  key={item.label}
                  className="border-hairline border-r px-3 py-3 last:border-r-0"
                >
                  <dt className="text-steel text-[0.68rem] font-semibold tracking-[0.04em]">
                    {item.label}
                  </dt>
                  <dd className="text-ink mt-1 text-sm leading-5 font-semibold [overflow-wrap:anywhere]">
                    {item.value}
                  </dd>
                </div>
              ))}
            </dl>
            {evidence.length ? (
              <ul className="mt-5 space-y-2">
                {evidence.map((item) => (
                  <li
                    key={item.key}
                    className="border-hairline text-slate flex items-center gap-2 rounded-xl border bg-white px-3 py-2.5 text-sm font-medium"
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
            aria-label={`${place.title} 방문 준비 정보 보기`}
          >
            방문 준비 보기
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
      className="border-hairline rounded-[1.25rem] border bg-white p-4 sm:p-5"
      aria-labelledby="needs-title"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 id="needs-title" className="text-ink text-base font-semibold sm:text-lg">
            어떤 점이 가장 중요한가요?
          </h2>
          <p className="text-steel mt-0.5 text-sm">
            원하는 조건과 관련된 정보가 있는 곳을 먼저 살펴볼 수 있어요.
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

      <div className="home-needs-grid mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
        {HOME_NEED_OPTIONS.map((option) => {
          const selected = experience.selectedNeedIds.includes(option.id);
          const Icon = NEED_ICONS[option.id];
          return (
            <button
              key={option.id}
              type="button"
              onClick={() => experience.toggleNeed(option.id)}
              aria-pressed={selected}
              className={`flex min-h-12 min-w-0 items-center justify-center gap-2 rounded-xl border px-3 text-sm font-semibold transition-colors ${
                selected
                  ? "border-brand-800 bg-brand-800 text-white"
                  : "border-hairline text-slate hover:border-brand-300 bg-surface"
              }`}
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
              <span className="truncate">{option.label}</span>
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
