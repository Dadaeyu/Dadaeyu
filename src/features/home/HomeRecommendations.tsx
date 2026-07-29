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
  formatDistance,
  sortHomeEvidenceForNeeds,
  summarizeVisitInfo,
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
            조건에 맞는 결과를 찾지 못했어요
          </h2>
          <p className="text-slate mt-2 max-w-[52ch] leading-6">
            검색어를 바꾸거나 조건 없이 전체 장소를 확인해 보세요.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={experience.clearSearch}
              className="bg-primary text-primary-foreground min-h-12 rounded-md px-5 font-medium"
            >
              전체 장소 보기
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
    ? `“${experience.committedQuery}”와 관련된 장소`
    : experience.selectedNeedIds.length
      ? "선택한 조건에 맞는 곳"
      : "이런 곳은 어때요?";

  return (
    <section aria-labelledby="recommendation-title">
      {otherPlaces.length ? (
        <OtherPlaces places={otherPlaces} experience={experience} title={title} />
      ) : null}
    </section>
  );
}

function OtherPlaces({
  places,
  experience,
  title
}: {
  places: RankedHomePlace[];
  experience: HomeExperience;
  title: string;
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
      className="mt-7 sm:mt-9"
      aria-label="다른 추천 관광지"
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-brand-800 text-sm font-semibold">추천 {places.length}곳</p>
          <h2 id="recommendation-title" className="text-ink mt-1 text-xl font-semibold sm:text-2xl">
            {title}
          </h2>
        </div>
        <div className="flex shrink-0 gap-2" aria-label="다른 추천 장소 이동">
          <CarouselPrevious
            aria-label="이전 추천 장소"
            className="border-hairline hover:bg-surface static size-12 translate-y-0 rounded-full border bg-white"
          />
          <CarouselNext
            aria-label="다음 추천 장소"
            className="border-hairline hover:bg-surface static size-12 translate-y-0 rounded-full border bg-white"
          />
        </div>
      </div>
      <CarouselContent className="mt-4 -ml-3 items-stretch">
        {places.map((place) => (
          <CarouselItem
            key={place.id}
            className="flex basis-[78%] pl-3 min-[430px]:basis-[68%] sm:basis-[46%] lg:basis-[31%]"
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
  const evidence = sortHomeEvidenceForNeeds(place.accessibility, experience.selectedNeedIds)[0];

  return (
    <article className="h-full min-w-0">
      <button
        type="button"
        onClick={(event) => experience.openPlace(place, event.currentTarget)}
        className="group bg-brand-900 focus-visible:outline-brand-600 relative flex aspect-[4/5] h-full min-h-[21rem] w-full overflow-hidden rounded-[1.5rem] text-left shadow-[0_18px_45px_-34px_rgba(15,44,41,0.9)] focus-visible:outline-2 focus-visible:outline-offset-4"
        aria-label={`${place.title} 자세히 보기`}
      >
        <HomePlaceImage
          src={place.imageUrl}
          alt={place.title}
          className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.04] motion-reduce:transform-none motion-reduce:transition-none"
        />
        <span className="absolute inset-0 bg-[linear-gradient(180deg,rgba(8,24,22,0.02)_24%,rgba(8,24,22,0.82)_100%)]" />
        <span className="absolute inset-x-0 top-0 flex items-start justify-between gap-2 p-4">
          <span className="rounded-full border border-white/25 bg-black/25 px-3 py-1.5 text-xs font-medium text-white backdrop-blur-md">
            {place.category ?? "대전 여행"}
          </span>
          {evidence ? (
            <span className="bg-brand-300/90 text-brand-900 max-w-[62%] truncate rounded-full px-3 py-1.5 text-xs font-semibold backdrop-blur-sm">
              {evidence.label}
            </span>
          ) : null}
        </span>
        <span className="absolute inset-x-0 bottom-0 p-4 text-white sm:p-5">
          <span className="block text-xl leading-tight font-semibold [overflow-wrap:anywhere]">
            {place.title}
          </span>
          <span className="mt-2 flex items-center justify-between gap-3 text-sm text-white/[0.78]">
            <span className="line-clamp-1">
              {distance ? `${distance} 거리` : (visitInfo ?? "대전에서 만나는 장소")}
            </span>
            <span className="text-brand-900 grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white transition-transform group-hover:translate-x-0.5 motion-reduce:transform-none">
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
      <SectionTitle id="facility-title" title="편의시설이 있는 곳" />
      <p className="text-steel mt-2 text-sm leading-6">
        화장실, 엘리베이터, 장애인 주차가 있는 곳을 모았어요.
      </p>
      <div className="-mx-4 mt-4 flex snap-x [scrollbar-width:none] gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-3 sm:px-0 [&::-webkit-scrollbar]:hidden">
        {facilities.map((facility) => {
          const distance = formatDistance(facility.distanceMeters);
          const FacilityIcon = FACILITY_ICONS[facility.key];
          return (
            <Link
              key={facility.key}
              href={`/map?query=${encodeURIComponent(facility.placeTitle)}`}
              className="border-hairline hover:border-brand-200 hover:bg-brand-50/40 group flex min-h-36 min-w-[76%] snap-start flex-col rounded-[1.25rem] border bg-white p-4 transition-colors sm:min-w-0"
              aria-label={`${facility.label}, ${facility.placeTitle}, ${
                distance ? `장소까지 직선거리 ${distance}` : "지도에서 위치 확인"
              }`}
            >
              <span className="bg-brand-50 text-brand-800 grid h-11 w-11 place-items-center rounded-xl">
                <FacilityIcon className="h-5 w-5" aria-hidden="true" />
              </span>
              <span className="mt-4 min-w-0">
                <span className="text-ink block font-semibold">{facility.label}</span>
                <span className="text-steel mt-1 line-clamp-2 block text-sm leading-5">
                  {facility.placeTitle}
                </span>
              </span>
              <span className="text-brand-800 mt-auto flex items-center gap-1 pt-4 text-sm font-semibold">
                {distance ?? "지도 보기"}
                <ChevronRight
                  className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
                  aria-hidden="true"
                />
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
