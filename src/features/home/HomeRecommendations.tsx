"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight, CircleAlert, Compass, MapPinned, RefreshCw } from "lucide-react";
import { HomePlaceImage } from "@/features/home/HomePlaceImage";
import {
  HOME_NEED_OPTIONS,
  formatDistance,
  getConfirmedHomeEvidenceForNeeds,
  getHomeEvidenceStatus,
  getHomeRecommendationNeedIds,
  sortHomeEvidenceForNeeds,
  summarizeVisitInfo,
  type HomeAccessibilityEvidence,
  type HomeNeedId,
  type RankedHomePlace
} from "@/features/home/homeData";
import { summarizeHomeEvidence } from "@/features/home/homePresentation";
import type { HomeExperience } from "@/features/home/useHomeExperience";

export function HomeRecommendations({ experience }: { experience: HomeExperience }) {
  return (
    <div className="border-hairline bg-surface-soft/60 border-t px-3 py-4 sm:px-5 sm:py-5">
      <RecommendationResults experience={experience} />
    </div>
  );
}

function RecommendationResults({ experience }: { experience: HomeExperience }) {
  const hasVisiblePlaces = Boolean(experience.data?.places.length);

  if (experience.loadState === "loading" && !hasVisiblePlaces) {
    return <RecommendationsLoading />;
  }

  if (experience.loadState === "error") {
    return (
      <section
        id="home-recommendations"
        className="rounded-xl border border-red-200 bg-red-50 p-5 sm:p-6"
        aria-labelledby="recommendation-error-title"
      >
        <CircleAlert className="h-6 w-6 text-red-700" aria-hidden="true" />
        <h2 id="recommendation-error-title" className="text-ink mt-3 text-xl font-semibold">
          다른 후보를 불러오지 못했어요
        </h2>
        <p className="text-slate mt-2 max-w-[52ch] text-sm leading-6">
          {experience.loadError ?? "연결을 확인한 뒤 다시 시도해 주세요."}
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={experience.retry}
            className="bg-brand-800 inline-flex min-h-11 items-center gap-2 rounded-xl px-4 text-sm font-semibold text-white"
          >
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            다시 불러오기
          </button>
          <Link
            href="/map"
            className="border-hairline text-ink inline-flex min-h-11 items-center rounded-xl border bg-white px-4 text-sm font-semibold"
          >
            지도에서 찾기
          </Link>
        </div>
      </section>
    );
  }

  if (experience.loadState === "empty" || !experience.data?.places.length) {
    return (
      <section
        id="home-recommendations"
        className="border-hairline rounded-xl border bg-white p-5 sm:p-6"
        aria-labelledby="recommendation-empty-title"
      >
        <Compass className="text-brand-700 h-6 w-6" aria-hidden="true" />
        <h2 id="recommendation-empty-title" className="text-ink mt-3 text-xl font-semibold">
          조건을 모두 확인한 장소가 아직 없어요
        </h2>
        <p className="text-slate mt-2 max-w-[52ch] text-sm leading-6">
          무관한 장소를 대신 보여드리지 않았어요. 꼭 필요한 조건을 하나씩 줄이거나 지도에서
          편의정보를 직접 비교해 보세요.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={experience.clearNeeds}
            className="bg-brand-800 min-h-11 rounded-xl px-4 text-sm font-semibold text-white"
          >
            조건 다시 고르기
          </button>
          <Link
            href="/map"
            className="border-hairline text-ink inline-flex min-h-11 items-center rounded-xl border px-4 text-sm font-semibold"
          >
            지도에서 더 찾기
          </Link>
        </div>
      </section>
    );
  }

  return (
    <CuratedPlaces
      places={experience.data.places}
      experience={experience}
      isRefreshing={experience.isRefreshing}
    />
  );
}

function RecommendationsLoading() {
  return (
    <section id="home-recommendations" aria-labelledby="recommendation-title" aria-busy="true">
      <SectionHeading id="recommendation-title" title="조건에 맞는 장소를 준비하고 있어요" />
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4" aria-hidden="true">
        {[0, 1, 2, 3].map((item) => (
          <div key={item} className="border-hairline overflow-hidden rounded-xl border bg-white">
            <div className="bg-surface aspect-[16/9] animate-pulse motion-reduce:animate-none" />
            <div className="space-y-3 p-4">
              <div className="bg-surface h-5 w-4/5 animate-pulse rounded motion-reduce:animate-none" />
              <div className="bg-surface h-16 w-full animate-pulse rounded motion-reduce:animate-none" />
            </div>
          </div>
        ))}
      </div>
      <span className="sr-only" role="status">
        비교할 추천 장소를 불러오는 중입니다.
      </span>
    </section>
  );
}

function CuratedPlaces({
  places,
  experience,
  isRefreshing
}: {
  places: RankedHomePlace[];
  experience: HomeExperience;
  isRefreshing: boolean;
}) {
  const placesKey = places.map((place) => place.id).join("|");
  const selectedNeedsKey = getHomeRecommendationNeedIds(experience.selectedNeedIds).join("|");
  const [placeView, setPlaceView] = useState({
    placesKey: "",
    selectedNeedsKey: "",
    groupIndex: 0,
    showAllOnMobile: false
  });
  const isCurrentPlaceView =
    placeView.placesKey === placesKey && placeView.selectedNeedsKey === selectedNeedsKey;
  const placeGroupIndex = isCurrentPlaceView ? placeView.groupIndex : 0;
  const showAllOnMobile = isCurrentPlaceView ? placeView.showAllOnMobile : false;
  const groupSize = 8;
  const groupCount = Math.max(Math.ceil(places.length / groupSize), 1);
  const safeGroupIndex = Math.min(placeGroupIndex, groupCount - 1);
  const groupStartIndex = safeGroupIndex * groupSize;
  const displayPlaces = places.slice(groupStartIndex, groupStartIndex + groupSize);
  const hasMorePlaceGroups = places.length > groupSize;
  const mapHref = "/map";
  const hasEvidenceCondition = Boolean(selectedNeedsKey);

  if (!displayPlaces.length) return null;

  const title = getRecommendationTitle(experience.selectedNeedIds);
  const showNextPlaceGroup = () => {
    if (safeGroupIndex + 1 >= groupCount) {
      experience.refreshRecommendations();
      return;
    }
    setPlaceView({
      placesKey,
      selectedNeedsKey,
      groupIndex: safeGroupIndex + 1,
      showAllOnMobile: false
    });
  };
  const toggleMobilePlaceList = () => {
    setPlaceView({
      placesKey,
      selectedNeedsKey,
      groupIndex: safeGroupIndex,
      showAllOnMobile: !showAllOnMobile
    });
  };

  return (
    <section
      id="home-recommendations"
      className="scroll-mt-24"
      aria-labelledby="recommendation-title"
      aria-busy={isRefreshing}
    >
      {isRefreshing ? (
        <span className="sr-only" role="status" aria-live="polite">
          선택한 조건으로 장소를 다시 정리하고 있습니다.
        </span>
      ) : null}
      <div className="flex items-end justify-between gap-3">
        <SectionHeading
          id="recommendation-title"
          title={title}
          description={
            hasEvidenceCondition
              ? "선택한 조건이 공개 정보에서 확인된 장소만 모았어요."
              : "사진과 위치, 확인된 방문 정보를 나란히 비교해 보세요."
          }
        />
        <Link
          href={mapHref}
          className="border-hairline text-ink hover:bg-brand-50 hidden min-h-11 shrink-0 items-center gap-2 rounded-xl border bg-white px-4 text-sm font-semibold sm:inline-flex"
        >
          <MapPinned className="h-4 w-4" aria-hidden="true" />
          지도에서 비교
        </Link>
      </div>

      <div
        className={`mt-4 grid gap-3 transition-opacity duration-150 sm:grid-cols-2 lg:grid-cols-4 ${
          isRefreshing ? "opacity-60" : "opacity-100"
        }`}
      >
        {displayPlaces.map((place, index) => (
          <div
            key={place.id}
            className={index >= 3 && !showAllOnMobile ? "hidden sm:block" : "block"}
          >
            <CompactPlaceCard
              place={place}
              experience={experience}
              cardIndex={groupStartIndex + index}
            />
          </div>
        ))}
      </div>

      {hasMorePlaceGroups ? (
        <div className="mt-4 hidden justify-center sm:flex">
          <button
            type="button"
            onClick={showNextPlaceGroup}
            disabled={isRefreshing}
            className="border-hairline text-ink hover:bg-brand-50 inline-flex min-h-11 items-center justify-center rounded-xl border bg-white px-5 text-sm font-semibold disabled:cursor-wait disabled:opacity-60"
          >
            {isRefreshing ? "새 장소 찾는 중…" : "다른 장소 보기"}
          </button>
        </div>
      ) : null}

      <div className="mt-3 grid gap-2 sm:hidden">
        {displayPlaces.length > 3 ? (
          <button
            type="button"
            onClick={toggleMobilePlaceList}
            className="border-hairline text-ink hover:bg-brand-50 min-h-11 rounded-xl border bg-white px-4 text-sm font-semibold"
          >
            {showAllOnMobile ? "후보 접기" : `${displayPlaces.length}곳 모두 보기`}
          </button>
        ) : null}
        {hasMorePlaceGroups ? (
          <button
            type="button"
            onClick={showNextPlaceGroup}
            disabled={isRefreshing}
            className="border-hairline text-ink hover:bg-brand-50 min-h-11 rounded-xl border bg-white px-4 text-sm font-semibold disabled:cursor-wait disabled:opacity-60"
          >
            {isRefreshing ? "새 장소 찾는 중…" : "다른 장소 보기"}
          </button>
        ) : null}
        <Link
          href={mapHref}
          className="text-brand-800 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold"
        >
          <MapPinned className="h-4 w-4" aria-hidden="true" />
          지도에서 함께 보기
        </Link>
      </div>
    </section>
  );
}

function CompactPlaceCard({
  place,
  experience,
  cardIndex
}: {
  place: RankedHomePlace;
  experience: HomeExperience;
  cardIndex: number;
}) {
  const distance = formatDistance(place.distanceMeters);
  const visitInfo = summarizeVisitInfo(place);
  const fact = getPlaceDisplayFact(place, experience.selectedNeedIds, cardIndex);
  const titleId = `home-place-${cardIndex}-title`;
  const descriptionId = `home-place-${cardIndex}-description`;

  return (
    <article className="h-full min-w-0">
      <button
        type="button"
        onClick={(event) => experience.openPlace(place, event.currentTarget)}
        className="border-hairline group focus-visible:outline-brand-600 hover:border-brand-200 flex h-full w-full overflow-hidden rounded-xl border bg-white text-left shadow-[0_16px_38px_-34px_rgba(15,44,41,0.72)] transition-colors focus-visible:outline-2 focus-visible:outline-offset-3 sm:min-h-[18rem] sm:flex-col"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
      >
        <span className="bg-surface relative block min-h-full w-28 shrink-0 overflow-hidden sm:aspect-[16/9] sm:min-h-0 sm:w-full">
          <HomePlaceImage
            src={place.imageUrl}
            alt={place.title}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.025] motion-reduce:transform-none motion-reduce:transition-none"
          />
          <span className="absolute bottom-2 left-2 max-w-[calc(100%-1rem)] rounded-full border border-white/35 bg-black/55 px-2 py-1 text-[0.68rem] font-semibold text-white backdrop-blur-sm sm:bottom-2.5 sm:left-2.5 sm:px-2.5 sm:text-xs">
            {place.category ?? "대전 여행"}
          </span>
        </span>

        <span className="flex min-w-0 flex-1 flex-col p-3.5 sm:p-4">
          <span
            id={titleId}
            className="text-ink block text-base leading-tight font-semibold [overflow-wrap:anywhere] sm:text-lg"
          >
            {place.title}
          </span>
          <span className="text-steel mt-1 block text-xs sm:mt-1.5 sm:text-sm">
            {distance ? `${distance} 거리` : (visitInfo ?? "대전에서 만나는 장소")}
          </span>

          <span className="border-hairline bg-surface mt-2 block rounded-lg border p-2.5 sm:mt-3 sm:p-3">
            <span className="text-brand-800 block text-[0.7rem] font-semibold sm:text-xs">
              {fact.label}
            </span>
            <span className="text-ink mt-0.5 line-clamp-2 text-sm font-semibold sm:mt-1">
              {fact.title}
            </span>
            <span className="text-steel mt-1 line-clamp-2 text-xs leading-5">{fact.detail}</span>
          </span>

          <span className="text-brand-800 mt-auto flex items-center justify-between gap-3 pt-3 text-sm font-semibold sm:pt-4">
            <span className="sm:hidden">방문 정보</span>
            <span className="hidden sm:inline">방문 정보 보기</span>
            <span className="bg-brand-50 grid size-8 shrink-0 place-items-center rounded-full transition-transform group-hover:translate-x-0.5 motion-reduce:transform-none">
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </span>
          </span>
          <span id={descriptionId} className="sr-only">
            {place.category ?? "대전 여행"}. {distance ? `${distance} 거리. ` : ""}
            {fact.label}. {fact.title}. {fact.detail}
          </span>
        </span>
      </button>
    </article>
  );
}

function getPlaceDisplayFact(
  place: RankedHomePlace,
  selectedNeedIds: readonly HomeNeedId[],
  cardIndex: number
) {
  const confirmedEvidence = getConfirmedHomeEvidenceForNeeds(place, selectedNeedIds);
  const hasStrictCondition = selectedNeedIds.length > 0;
  const evidencePool = hasStrictCondition ? confirmedEvidence : place.accessibility;
  const sortedEvidence = sortHomeEvidenceForNeeds(evidencePool, selectedNeedIds).filter(
    (item) => getHomeEvidenceStatus(item) === "available"
  );
  const matchedNeedLabels = place.matchedNeedIds.flatMap((needId) => {
    const option = HOME_NEED_OPTIONS.find((candidate) => candidate.id === needId);
    return option ? [option.label] : [];
  });
  const evidenceIndex = selectedNeedIds.length
    ? 0
    : cardIndex % Math.max(Math.min(sortedEvidence.length, 3), 1);
  const evidence = sortedEvidence[evidenceIndex];

  if (evidence) {
    return {
      label: matchedNeedLabels.length ? "확인된 조건" : getEvidenceLabel(evidence),
      title: matchedNeedLabels.length ? matchedNeedLabels.join(" · ") : evidence.label,
      detail: matchedNeedLabels.length
        ? `${evidence.label}: ${summarizeHomeEvidence(evidence.value)}`
        : summarizeHomeEvidence(evidence.value)
    };
  }

  const visitInfo = summarizeVisitInfo(place);
  if (visitInfo) {
    return {
      label: "운영 정보",
      title: visitInfo,
      detail: "방문 전 당일 운영 여부를 확인해 주세요."
    };
  }

  if (place.address) {
    return { label: "위치 정보", title: "주소 확인 가능", detail: place.address };
  }

  return {
    label: "방문 전 확인",
    title: "상세 정보 확인 필요",
    detail: "상세 화면에서 운영과 편의 정보를 확인해 주세요."
  };
}

function getEvidenceLabel(evidence: HomeAccessibilityEvidence) {
  if (
    [
      "braile_block",
      "audio_guide",
      "guide_human",
      "big_print",
      "braile_promotion",
      "guide_system",
      "blind_handicap_etc"
    ].includes(evidence.key)
  ) {
    return "시각 지원";
  }
  if (
    ["sign_guide", "video_guide", "hearing_room", "hearing_handicap_etc"].includes(evidence.key)
  ) {
    return "청각 지원";
  }
  if (
    ["stroller", "lactation_room", "baby_spare_chair", "infants_family_etc"].includes(evidence.key)
  ) {
    return "동반 편의";
  }
  if (evidence.key === "parking") return "주차 정보";
  if (evidence.key === "restroom") return "화장실 정보";
  return "이동·편의 정보";
}

function getRecommendationTitle(selectedNeedIds: readonly HomeNeedId[]) {
  if (selectedNeedIds.includes("step_free")) return "계단 없는 이동이 확인된 장소";
  if (selectedNeedIds.includes("visual_guidance")) return "시각 지원이 확인된 장소";
  if (selectedNeedIds.includes("hearing_guidance")) return "청각 지원이 확인된 장소";
  if (selectedNeedIds.includes("stroller_friendly")) return "유모차로 이동하기 좋은 장소";
  if (selectedNeedIds.includes("family_support")) return "영유아 편의가 확인된 장소";
  if (selectedNeedIds.includes("accessible_toilet")) return "장애인 화장실이 확인된 장소";
  return "지금 살펴볼 장소";
}

function SectionHeading({
  id,
  title,
  description
}: {
  id: string;
  title: string;
  description?: string;
}) {
  return (
    <div className="min-w-0">
      <h2 id={id} className="text-ink text-xl leading-tight font-semibold sm:text-2xl">
        {title}
      </h2>
      {description ? (
        <p className="text-steel mt-1.5 hidden max-w-[46rem] text-sm leading-5 sm:block">
          {description}
        </p>
      ) : null}
    </div>
  );
}
