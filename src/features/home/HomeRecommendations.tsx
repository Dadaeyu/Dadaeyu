"use client";

import Link from "next/link";
import {
  Accessibility,
  ArrowRight,
  ArrowUpDown,
  ChevronRight,
  CircleParking,
  CircleAlert,
  Compass,
  RefreshCw
} from "lucide-react";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious
} from "@/components/ui/Carousel";
import { HomePlaceImage } from "@/features/home/HomePlaceImage";
import {
  formatSourceDate,
  formatDistance,
  getHomeEvidenceStatus,
  HOME_NEED_OPTIONS,
  sortHomeEvidenceForNeeds,
  summarizeVisitInfo,
  type HomeNeedId,
  type RankedHomePlace
} from "@/features/home/homeData";
import type { HomeExperience } from "@/features/home/useHomeExperience";

export function HomeRecommendations({ experience }: { experience: HomeExperience }) {
  if (experience.loadState === "loading") {
    return <RecommendationsLoading />;
  }

  if (experience.loadState === "error") {
    return (
      <>
        <section
          className="rounded-lg border border-red-200 bg-red-50 p-5 sm:p-6"
          aria-labelledby="recommendation-error-title"
        >
          <CircleAlert className="h-7 w-7 text-red-700" aria-hidden="true" />
          <h2 id="recommendation-error-title" className="text-ink mt-3 text-xl font-semibold">
            추천 정보를 불러오지 못했어요
          </h2>
          <p className="text-slate mt-2 max-w-[52ch] leading-6">
            {experience.loadError ?? "연결을 확인한 뒤 다시 시도해 주세요."}
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={experience.retry}
              className="bg-primary text-primary-foreground inline-flex min-h-12 items-center gap-2 rounded-md px-5 font-medium"
            >
              <RefreshCw className="h-4 w-4" aria-hidden="true" />
              다시 불러오기
            </button>
            <Link
              href="/map"
              className="border-hairline text-ink inline-flex min-h-12 items-center rounded-md border bg-white px-5 font-medium"
            >
              지도에서 찾기
            </Link>
          </div>
        </section>
      </>
    );
  }

  if (experience.loadState === "empty" || !experience.data?.places.length) {
    return (
      <>
        <section
          className="border-hairline rounded-lg border bg-white p-5 sm:p-6"
          aria-labelledby="recommendation-empty-title"
        >
          <Compass className="text-brand-700 h-7 w-7" aria-hidden="true" />
          <h2 id="recommendation-empty-title" className="text-ink mt-3 text-xl font-semibold">
            조건에 맞는 추천을 찾지 못했어요
          </h2>
          <p className="text-slate mt-2 max-w-[52ch] leading-6">
            조건을 줄이거나 전체 추천으로 돌아가 보세요.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={experience.clearSearch}
              className="bg-primary text-primary-foreground min-h-12 rounded-md px-5 font-medium"
            >
              전체 추천 보기
            </button>
            <Link
              href="/map"
              className="border-hairline text-ink inline-flex min-h-12 items-center rounded-md border px-5 font-medium"
            >
              지도 열기
            </Link>
          </div>
        </section>
      </>
    );
  }

  return (
    <div className="space-y-10 sm:space-y-12">
      <CuratedPlaces places={experience.data.places} experience={experience} />
      <EssentialFacilities experience={experience} />
    </div>
  );
}

function RecommendationsLoading() {
  return (
    <section aria-labelledby="recommendation-title" aria-busy="true">
      <SectionTitle id="recommendation-title" title="갈 만한 곳을 찾고 있어요" />
      <div
        className="border-hairline mt-4 overflow-hidden rounded-lg border bg-white md:grid md:grid-cols-[minmax(0,1.25fr)_minmax(20rem,0.85fr)]"
        aria-hidden="true"
      >
        <div className="bg-surface aspect-[16/11] animate-pulse motion-reduce:animate-none md:aspect-auto md:min-h-[26rem]" />
        <div className="space-y-4 p-5 sm:p-6">
          <div className="bg-surface h-4 w-1/3 animate-pulse rounded motion-reduce:animate-none" />
          <div className="bg-surface h-8 w-4/5 animate-pulse rounded motion-reduce:animate-none" />
          <div className="bg-surface h-5 w-full animate-pulse rounded motion-reduce:animate-none" />
          <div className="bg-surface h-20 w-full animate-pulse rounded motion-reduce:animate-none" />
          <div className="bg-surface h-12 w-full animate-pulse rounded motion-reduce:animate-none" />
        </div>
      </div>
      <span className="sr-only" role="status">
        관광지 추천을 불러오는 중입니다.
      </span>
    </section>
  );
}

function CuratedPlaces({
  places,
  experience
}: {
  places: RankedHomePlace[];
  experience: HomeExperience;
}) {
  const otherPlaces = places.slice(1, 9);
  const title = experience.committedQuery
    ? `“${experience.committedQuery}” 검색 적용`
    : experience.selectedNeedIds.length
      ? "선택한 조건과 관련된 정보가 있는 곳"
      : "둘러볼 만한 대전";
  const description = experience.committedQuery
    ? "홈 추천 후보군 안에서 장소·활동·편의 정보를 함께 본 결과예요."
    : experience.selectedNeedIds.length
      ? "선택한 조건과 관련된 공개 정보가 있는 장소를 먼저 보여드려요."
      : "공개된 방문·편의 정보가 많은 곳부터 모았어요.";

  if (!otherPlaces.length) return null;

  return (
    <section aria-labelledby="recommendation-title">
      <OtherPlaces
        places={otherPlaces}
        experience={experience}
        title={title}
        description={description}
      />
    </section>
  );
}

function OtherPlaces({
  places,
  experience,
  title,
  description
}: {
  places: RankedHomePlace[];
  experience: HomeExperience;
  title: string;
  description: string;
}) {
  return (
    <Carousel
      opts={{
        align: "start",
        containScroll: "trimSnaps",
        dragFree: false,
        skipSnaps: false,
        duration: 34
      }}
      className="mt-6 sm:mt-8"
      aria-label="다른 추천 관광지"
    >
      <div className="flex items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="text-brand-800 text-sm font-semibold">추천 {places.length}곳</p>
          <h2 id="recommendation-title" className="text-ink mt-1 text-xl font-semibold sm:text-2xl">
            {title}
          </h2>
          <p className="text-steel mt-2 max-w-[46rem] text-sm leading-6">{description}</p>
          <p className="text-steel mt-2 text-xs sm:hidden">옆으로 넘겨 더 보기</p>
        </div>
        <div className="flex shrink-0 gap-2" aria-label="다른 추천 장소 이동">
          <CarouselPrevious
            aria-label="이전 추천 장소"
            className="border-hairline hover:bg-surface static hidden size-12 translate-y-0 rounded-full border bg-white sm:grid"
          />
          <CarouselNext
            aria-label="다음 추천 장소"
            className="border-hairline hover:bg-surface static hidden size-12 translate-y-0 rounded-full border bg-white sm:grid"
          />
        </div>
      </div>
      <CarouselContent className="mt-4 -ml-3 items-stretch pb-1">
        {places.map((place) => (
          <CarouselItem
            key={place.id}
            className="flex basis-[86%] pl-3 min-[430px]:basis-[72%] sm:basis-[46%] lg:basis-[31%]"
          >
            <CompactPlaceCard place={place} experience={experience} />
          </CarouselItem>
        ))}
      </CarouselContent>
    </Carousel>
  );
}

function CompactPlaceCard({
  place,
  experience
}: {
  place: RankedHomePlace;
  experience: HomeExperience;
}) {
  const distance = formatDistance(place.distanceMeters);
  const visitInfo = summarizeVisitInfo(place);
  const summary = getPlaceEvidenceSummary(place, experience.selectedNeedIds);
  const needLabels = getMatchedNeedLabels(place);

  return (
    <article className="h-full w-full min-w-0">
      <button
        type="button"
        onClick={(event) => experience.openPlace(place, event.currentTarget)}
        className="border-hairline group focus-visible:outline-brand-600 hover:border-brand-200 flex h-full min-h-[20.5rem] w-full flex-col overflow-hidden rounded-lg border bg-white text-left shadow-[0_18px_44px_-36px_rgba(15,44,41,0.75)] transition-colors focus-visible:outline-2 focus-visible:outline-offset-4"
        aria-label={`${place.title} 자세히 보기`}
      >
        <span className="bg-surface relative block aspect-[16/10] w-full overflow-hidden">
          <HomePlaceImage
            src={place.imageUrl}
            alt={place.title}
            className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.035] motion-reduce:transform-none motion-reduce:transition-none"
          />
          <span className="absolute inset-x-0 bottom-0 h-20 bg-[linear-gradient(180deg,rgba(8,24,22,0)_0%,rgba(8,24,22,0.64)_100%)]" />
          <span className="absolute bottom-3 left-3 rounded-md border border-white/25 bg-black/32 px-2.5 py-1 text-xs font-medium text-white backdrop-blur-md">
            {place.category ?? "대전 여행"}
          </span>
        </span>
        <span className="flex flex-1 flex-col p-4 sm:p-5">
          <span className="text-ink block text-lg leading-tight font-semibold [overflow-wrap:anywhere]">
            {place.title}
          </span>
          <span className="text-steel mt-2 line-clamp-1 text-sm">
            {distance ? `${distance} 거리` : (visitInfo ?? "대전에서 만나는 장소")}
          </span>

          <span className="border-hairline bg-surface/70 mt-4 block rounded-md border p-3">
            <span className="text-ink block text-sm font-semibold">{summary.reason}</span>
            <span className="text-steel mt-1 line-clamp-2 block text-xs leading-5">
              {summary.detail}
            </span>
            <span className="mt-3 grid grid-cols-2 gap-2 text-xs">
              <span className="text-steel leading-4">
                <span className="block">확인 필요</span>
                <span className="text-ink font-semibold">{summary.attentionCount}개</span>
              </span>
              <span className="text-steel text-right leading-4">
                <span className="block">정보 기준</span>
                <span className="text-ink font-semibold">{summary.sourceDate ?? "미제공"}</span>
              </span>
            </span>
          </span>

          {needLabels ? (
            <span className="text-steel mt-3 line-clamp-1 text-xs">{needLabels}</span>
          ) : null}

          <span className="text-brand-800 mt-auto flex items-center justify-between gap-3 pt-4 text-sm font-semibold">
            자세히 보기
            <span className="bg-brand-50 grid h-9 w-9 shrink-0 place-items-center rounded-full transition-transform group-hover:translate-x-0.5 motion-reduce:transform-none">
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </span>
          </span>
        </span>
      </button>
    </article>
  );
}

function EssentialFacilities({ experience }: { experience: HomeExperience }) {
  const facilities = experience.data?.facilities ?? [];
  if (!facilities.length) return null;

  return (
    <section aria-labelledby="facility-title">
      <SectionTitle id="facility-title" title="바로 확인할 편의시설" />
      <p className="text-steel mt-2 text-sm leading-6">
        공개 정보에 시설 내용이 있는 장소예요. 방문 전 운영 여부는 한 번 더 확인해 주세요.
      </p>
      <div className="-mx-4 mt-4 flex snap-x [scrollbar-width:none] gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-3 sm:px-0 [&::-webkit-scrollbar]:hidden">
        {facilities.map((facility) => {
          const distance = formatDistance(facility.distanceMeters);
          const FacilityIcon = FACILITY_ICONS[facility.key];
          return (
            <Link
              key={facility.key}
              href={`/map?query=${encodeURIComponent(facility.placeTitle)}`}
              className="border-hairline hover:border-brand-200 hover:bg-brand-50/30 group grid min-h-[7rem] min-w-[82%] snap-start grid-cols-[2.75rem_minmax(0,1fr)] gap-3 rounded-lg border bg-white p-4 transition-colors min-[430px]:min-w-[68%] sm:min-w-0"
              aria-label={`${facility.label}, ${facility.placeTitle}, ${
                distance ? `장소까지 직선거리 ${distance}` : "지도에서 위치 확인"
              }`}
            >
              <span className="bg-brand-50 text-brand-800 grid h-11 w-11 place-items-center rounded-xl">
                <FacilityIcon className="h-5 w-5" aria-hidden="true" />
              </span>
              <span className="min-w-0">
                <span className="text-ink block font-semibold">{facility.label}</span>
                <span className="text-steel mt-1 line-clamp-1 block text-sm leading-5">
                  {facility.placeTitle}
                </span>
                <span className="text-brand-800 mt-2 flex items-center gap-1 text-sm font-semibold">
                  {distance ?? "지도 보기"}
                  <ChevronRight
                    className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
                    aria-hidden="true"
                  />
                </span>
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

const FACILITY_ICONS = {
  restroom: Accessibility,
  elevator: ArrowUpDown,
  parking: CircleParking
} as const;

function getPlaceEvidenceSummary(place: RankedHomePlace, selectedNeedIds: readonly HomeNeedId[]) {
  const sortedEvidence = sortHomeEvidenceForNeeds(place.accessibility, selectedNeedIds);
  const availableCount = place.accessibility.filter(
    (item) => getHomeEvidenceStatus(item) === "available"
  ).length;
  const attentionCount = place.accessibility.filter(
    (item) => getHomeEvidenceStatus(item) !== "available"
  ).length;
  const selectedMatchCount = selectedNeedIds.length ? place.matchedNeedIds.length : 0;
  const topEvidence = sortedEvidence[0];
  const sourceDate = formatSourceDate(place.sourceUpdatedAt);

  const reason = selectedMatchCount
    ? `선택 조건 관련 ${selectedMatchCount}개`
    : availableCount
      ? `공개 편의정보 ${availableCount}개`
      : "방문 전 확인 필요";
  const detail = topEvidence
    ? `${topEvidence.label}: ${summarizeEvidenceValue(topEvidence.value)}`
    : "장소 상세 정보에서 방문 조건을 확인해 주세요.";

  return {
    reason,
    detail,
    attentionCount,
    sourceDate
  };
}

function getMatchedNeedLabels(place: RankedHomePlace) {
  if (!place.matchedNeedIds.length) return null;
  const labels = place.matchedNeedIds
    .map((needId) => HOME_NEED_OPTIONS.find((option) => option.id === needId)?.label)
    .filter(Boolean);
  return labels.length ? `관련 조건: ${labels.join(", ")}` : null;
}

function summarizeEvidenceValue(value: string) {
  return value.replace(/\s+/g, " ").trim().slice(0, 58);
}

function SectionTitle({ id, eyebrow, title }: { id: string; eyebrow?: string; title: string }) {
  return (
    <div>
      {eyebrow ? <p className="text-brand-800 text-sm font-medium">{eyebrow}</p> : null}
      <h2
        id={id}
        className={`text-ink text-xl leading-tight font-semibold sm:text-2xl ${
          eyebrow ? "mt-1" : ""
        }`}
      >
        {title}
      </h2>
    </div>
  );
}
