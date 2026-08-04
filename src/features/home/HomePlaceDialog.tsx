"use client";

import { useEffect, useMemo, useRef, useState, type ComponentType } from "react";
import Link from "next/link";
import {
  Accessibility,
  Baby,
  CalendarX2,
  ChevronDown,
  ChevronUp,
  CircleAlert,
  CircleCheck,
  CircleHelp,
  ClipboardCheck,
  Clock3,
  Ear,
  ExternalLink,
  Eye,
  MapPin,
  Phone,
  Share2,
  WalletCards,
  X
} from "lucide-react";
import { HomePlaceImage } from "@/features/home/HomePlaceImage";
import {
  formatDistance,
  formatSourceDate,
  getAccessibilityGroups,
  getHomeEvidenceStatus,
  getNeedEvidenceChecks,
  sortHomeEvidenceForNeeds,
  type HomeAccessibilityEvidence,
  type HomeAccessibilityGroup,
  type HomeEvidenceStatus,
  type HomeNeedEvidenceCheck,
  type HomeNeedId,
  type RankedHomePlace
} from "@/features/home/homeData";

type PlaceSectionId = "decision" | "visit" | "access";

const SECTION_LINKS: Array<{ id: PlaceSectionId; label: string }> = [
  { id: "decision", label: "방문 전 확인" },
  { id: "visit", label: "장소 안내" },
  { id: "access", label: "접근성 상세" }
];

const GROUP_ICONS: Record<
  HomeAccessibilityGroup["id"],
  ComponentType<{ className?: string; "aria-hidden"?: boolean }>
> = {
  mobility: Accessibility,
  visual: Eye,
  hearing: Ear,
  family: Baby
};

export function HomePlaceDialog({
  place,
  selectedNeedIds,
  onClose
}: {
  place: RankedHomePlace;
  selectedNeedIds: readonly HomeNeedId[];
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [overviewOpen, setOverviewOpen] = useState(false);
  const [shareStatus, setShareStatus] = useState<string | null>(null);
  const groups = useMemo(() => getAccessibilityGroups(place.accessibility), [place.accessibility]);
  const needChecks = useMemo(
    () => getNeedEvidenceChecks(place, selectedNeedIds),
    [place, selectedNeedIds]
  );
  const sourceDate = formatSourceDate(place.sourceUpdatedAt);
  const distance = formatDistance(place.distanceMeters);
  const decisionChecks = useMemo<HomeNeedEvidenceCheck[]>(() => {
    if (!selectedNeedIds.includes("short_distance")) return needChecks;
    return [
      ...needChecks,
      {
        id: "location-distance",
        label: "현재 위치와의 거리",
        status: distance ? "available" : "unknown",
        evidence: []
      }
    ];
  }, [distance, needChecks, selectedNeedIds]);
  const usesSelectedNeedSummary = decisionChecks.length > 0;
  const statusCounts = usesSelectedNeedSummary
    ? countNeedCheckStatuses(decisionChecks)
    : countEvidenceStatuses(place.accessibility);
  const decisionSummary = getDecisionSummary(statusCounts);
  const summaryEvidence = sortHomeEvidenceForNeeds(place.accessibility, selectedNeedIds)
    .filter((item) => getHomeEvidenceStatus(item) === "available")
    .slice(0, 2);
  const attentionCount = statusCounts.unavailable + statusCounts.unknown;
  const hasLongOverview = (place.overview?.length ?? 0) > 220;
  const phoneHref = place.phone ? `tel:${place.phone.replace(/[^\d+]/g, "")}` : null;

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const previousDocumentOverflow = document.documentElement.style.overflow;
    const previousBodyOverflow = document.body.style.overflow;
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    if (!dialog.open) dialog.showModal();
    return () => {
      if (dialog.open) dialog.close();
      document.documentElement.style.overflow = previousDocumentOverflow;
      document.body.style.overflow = previousBodyOverflow;
    };
  }, []);

  const scrollToSection = (sectionId: PlaceSectionId) => {
    const section = dialogRef.current?.querySelector<HTMLElement>(
      `[data-place-section="${sectionId}"]`
    );
    section?.scrollIntoView({
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
      block: "start"
    });
    section?.focus({ preventScroll: true });
  };

  const sharePlace = async () => {
    setShareStatus(null);
    const shareUrl = `${window.location.origin}/map?query=${encodeURIComponent(place.title)}`;
    try {
      if (navigator.share) {
        await navigator.share({
          title: place.title,
          text: `${place.title} 관광·접근성 정보를 확인해 보세요.`,
          url: shareUrl
        });
        setShareStatus("공유 메뉴를 열었습니다.");
        return;
      }
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(shareUrl);
        setShareStatus("장소 링크를 복사했습니다.");
        return;
      }
      setShareStatus("이 브라우저에서는 링크 복사를 지원하지 않습니다.");
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setShareStatus("공유하지 못했습니다. 잠시 후 다시 시도해 주세요.");
    }
  };

  return (
    <dialog
      ref={dialogRef}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      className="m-0 h-dvh max-h-none w-full max-w-none bg-transparent p-0 backdrop:bg-black/55 md:m-auto md:h-[min(90dvh,54rem)] md:w-[min(64rem,calc(100%-3rem))] md:rounded-3xl md:shadow-2xl"
      aria-labelledby="place-dialog-title"
      aria-describedby="place-dialog-summary"
    >
      <div className="relative flex h-full min-h-0 flex-col overflow-hidden bg-white md:rounded-3xl">
        <button
          type="button"
          onClick={onClose}
          className="text-slate hover:bg-surface absolute top-[max(0.75rem,env(safe-area-inset-top))] right-3 z-30 grid h-11 w-11 place-items-center rounded-full bg-white/95 shadow-md ring-1 ring-black/10 backdrop-blur-sm transition-colors md:top-4 md:right-4"
          aria-label="장소 정보 닫기"
        >
          <X className="h-5 w-5" aria-hidden="true" />
        </button>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          <section className="border-hairline border-b md:grid md:min-h-[25rem] md:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
            <div className="bg-surface relative min-h-0 overflow-hidden">
              <HomePlaceImage
                src={place.imageUrl}
                alt={place.title}
                className="aspect-[16/9] h-full w-full object-cover sm:aspect-[16/10] md:aspect-auto md:min-h-[25rem]"
              />
              <span className="text-brand-900 absolute bottom-4 left-4 rounded-full bg-white/95 px-3 py-1.5 text-xs font-semibold shadow-sm ring-1 ring-black/10 backdrop-blur-sm">
                {place.category ?? "대전 관광"}
              </span>
            </div>
            <div className="flex flex-col justify-center p-4 pt-4 sm:p-7 md:p-8 md:pr-12">
              <h2
                id="place-dialog-title"
                className="text-ink pr-10 text-[1.75rem] leading-[1.15] font-semibold tracking-[-0.025em] [overflow-wrap:anywhere] sm:text-3xl md:pr-0 md:text-4xl"
              >
                {place.title}
              </h2>
              {place.address ? (
                <p className="text-slate mt-3 flex items-start gap-2 text-sm leading-6 sm:text-base">
                  <MapPin className="text-brand-700 mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
                  <span>{place.address}</span>
                </p>
              ) : (
                <p className="text-steel mt-4">공개된 주소 정보가 없습니다.</p>
              )}
              <div className="text-steel mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-sm">
                {distance ? <span>내 위치에서 직선거리 {distance}</span> : null}
                <span>{sourceDate ? `정보 기준 ${sourceDate}` : "정보 기준일 미확인"}</span>
              </div>

              <div id="place-dialog-summary" className="border-hairline mt-4 border-y py-4 sm:mt-6">
                <div className="flex items-start gap-3">
                  <span className="bg-brand-800 grid h-10 w-10 shrink-0 place-items-center rounded-lg text-white">
                    <ClipboardCheck className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-brand-800 text-xs font-semibold tracking-[0.08em]">
                      {usesSelectedNeedSummary ? "내 조건 방문 준비표" : "전체 접근성 방문 준비표"}
                    </p>
                    <p className="text-ink mt-1 font-semibold">{decisionSummary.title}</p>
                    <p className="text-slate mt-1 text-sm leading-5">
                      {summaryEvidence.length
                        ? summaryEvidence.map((item) => item.label).join(" · ")
                        : decisionSummary.description}
                    </p>
                  </div>
                </div>
                <dl className="border-hairline mt-3 grid grid-cols-3 divide-x border-y bg-white">
                  <SummaryFact label="공개 편의정보" value={`${statusCounts.available}개`} />
                  <SummaryFact label="확인 필요" value={`${attentionCount}개`} />
                  <SummaryFact label="정보 기준" value={sourceDate ?? "미제공"} />
                </dl>
                <p className="text-steel mt-2 text-xs leading-5">
                  한국관광공사 공개정보 · 제한 안내 {statusCounts.unavailable}개 · 판단 필요
                  {` ${statusCounts.unknown}개`} · 현장 확인일 미제공
                </p>
              </div>
            </div>
          </section>

          <nav
            className="border-hairline z-20 hidden border-b bg-white sm:sticky sm:top-0 sm:block sm:bg-white/95 sm:backdrop-blur-md"
            aria-label="장소 정보 바로가기"
          >
            <div className="mx-auto grid max-w-3xl grid-cols-3 gap-1 px-3 py-1.5 sm:px-5 sm:py-2">
              {SECTION_LINKS.map((section) => (
                <button
                  key={section.id}
                  type="button"
                  onClick={() => scrollToSection(section.id)}
                  className="text-slate hover:bg-surface hover:text-brand-800 min-h-11 min-w-0 rounded-lg px-1 text-sm leading-tight font-semibold [overflow-wrap:anywhere] transition-colors sm:px-2"
                >
                  {section.label}
                </button>
              ))}
            </div>
          </nav>

          <div className="mx-auto max-w-4xl px-4 py-3 sm:px-6 sm:py-9">
            <section
              data-place-section="decision"
              tabIndex={-1}
              className="scroll-mt-14 outline-none"
              aria-labelledby="decision-title"
            >
              <SectionHeading
                id="decision-title"
                eyebrow={usesSelectedNeedSummary ? "내 조건 체크" : "방문 전 체크"}
                title={
                  usesSelectedNeedSummary ? "내게 필요한 조건의 공개정보" : "출발 전에 확인할 점"
                }
                description={
                  usesSelectedNeedSummary
                    ? "선택한 조건과 관련된 공개 내용과 판단이 필요한 항목을 나눠 보여드려요."
                    : "접근성 정보는 실제 현장과 달라질 수 있어 중요한 시설을 한 번 더 확인하는 것이 좋아요."
                }
              />

              {decisionChecks.length ? (
                <div className="border-hairline mt-5 divide-y overflow-hidden rounded-2xl border bg-white">
                  {decisionChecks.map((check) => (
                    <NeedCheckRow
                      key={check.id}
                      check={check}
                      detail={
                        check.id === "location-distance"
                          ? distance
                            ? `직선거리 ${distance}입니다. 실제 이동 경로 거리는 지도에서 다시 확인해 주세요.`
                            : "내 위치를 사용하지 않아 거리를 계산하지 못했습니다."
                          : undefined
                      }
                    />
                  ))}
                </div>
              ) : (
                <div className="border-hairline mt-5 grid grid-cols-[1.5rem_minmax(0,1fr)] gap-3 border-y px-1 py-4">
                  <CircleHelp className="text-brand-700 mt-0.5 h-5 w-5" aria-hidden="true" />
                  <div>
                    <p className="text-ink font-semibold">필요한 시설을 아래에서 확인해 보세요</p>
                    <p className="text-slate mt-1 text-sm leading-6">
                      이동, 시각·청각 안내, 영유아 편의 정보는 접근성 상세에 목적별로 정리했어요.
                    </p>
                  </div>
                </div>
              )}

              <div className="border-gold-200 bg-gold-50 mt-5 grid grid-cols-[1.5rem_minmax(0,1fr)] gap-3 rounded-xl border p-4">
                <CircleAlert className="text-gold-700 mt-0.5 h-5 w-5" aria-hidden="true" />
                <div>
                  <p className="text-ink font-semibold">출발 전 한 번 더 확인해 주세요</p>
                  <p className="text-slate mt-1 text-sm leading-6">
                    공사나 시설 고장처럼 실시간으로 달라지는 내용은 방문 전에 최신 정보를 다시
                    확인해 주세요.
                  </p>
                </div>
              </div>
            </section>

            <section
              data-place-section="visit"
              tabIndex={-1}
              className="border-hairline mt-10 scroll-mt-14 border-t pt-9 outline-none"
              aria-labelledby="visit-title"
            >
              <SectionHeading
                id="visit-title"
                title="장소 안내"
                description="운영시간과 연락처처럼 방문 계획에 필요한 정보를 모았어요."
              />

              <dl className="border-hairline mt-5 divide-y border-y">
                <VisitInfoRow icon={Clock3} label="운영시간" value={place.hours} critical />
                {place.restDate ? (
                  <VisitInfoRow icon={CalendarX2} label="휴무일" value={place.restDate} />
                ) : null}
                {place.fee ? (
                  <VisitInfoRow icon={WalletCards} label="이용요금" value={place.fee} />
                ) : null}
                <VisitInfoRow icon={Phone} label="연락처" value={place.phone} critical />
                <VisitInfoRow icon={MapPin} label="주소" value={place.address} critical />
                {place.parking ? (
                  <VisitInfoRow icon={Accessibility} label="일반 주차 안내" value={place.parking} />
                ) : null}
              </dl>

              <div className="mt-7">
                <h3 className="text-ink text-lg font-semibold">장소 소개</h3>
                {place.overview ? (
                  <>
                    <p
                      className={`text-slate mt-3 max-w-[68ch] text-base leading-7 ${
                        hasLongOverview && !overviewOpen ? "line-clamp-5" : ""
                      }`}
                    >
                      {place.overview}
                    </p>
                    {hasLongOverview ? (
                      <button
                        type="button"
                        onClick={() => setOverviewOpen((value) => !value)}
                        aria-expanded={overviewOpen}
                        className="text-brand-800 mt-2 inline-flex min-h-12 items-center gap-1 font-medium"
                      >
                        {overviewOpen ? "소개 접기" : "소개 더 보기"}
                        {overviewOpen ? (
                          <ChevronUp className="h-4 w-4" aria-hidden="true" />
                        ) : (
                          <ChevronDown className="h-4 w-4" aria-hidden="true" />
                        )}
                      </button>
                    ) : null}
                  </>
                ) : (
                  <p className="text-steel mt-3 leading-6">공개된 장소 소개가 없습니다.</p>
                )}
              </div>
            </section>

            <section
              data-place-section="access"
              tabIndex={-1}
              className="border-hairline mt-10 scroll-mt-14 border-t pt-9 outline-none"
              aria-labelledby="access-title"
            >
              <SectionHeading
                id="access-title"
                title="접근성 상세"
                description="이동과 안내에 필요한 내용을 목적별로 나누어 확인할 수 있어요."
              />

              {groups.length ? (
                <div className="mt-6 space-y-9">
                  {groups.map((group) => (
                    <AccessGroup key={group.id} group={group} />
                  ))}
                </div>
              ) : (
                <div className="bg-surface-soft text-slate mt-5 rounded-2xl p-4 leading-6">
                  공개된 접근성 세부 정보가 없습니다. 방문 전 장소에 문의해 주세요.
                </div>
              )}
            </section>

            <details className="group border-hairline bg-surface-soft mt-10 overflow-hidden rounded-xl border">
              <summary className="text-ink flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 px-4 py-3 font-semibold select-none [&::-webkit-details-marker]:hidden">
                <span>
                  <span className="block">정보 출처와 기준일</span>
                  <span className="text-steel mt-0.5 block text-xs font-normal">
                    관광·접근성 정보가 언제, 어디서 제공됐는지 확인하기
                  </span>
                </span>
                <ChevronDown
                  className="text-steel h-5 w-5 shrink-0 transition-transform group-open:rotate-180"
                  aria-hidden="true"
                />
              </summary>
              <div className="border-hairline border-t bg-white px-4 pb-5">
                <dl className="divide-hairline divide-y">
                  <SourceRow label="정보 출처" value="한국관광공사 관광·무장애 여행정보" />
                  <SourceRow label="관광정보 갱신" value={sourceDate ?? "확인할 수 없음"} />
                  <SourceRow label="현장 접근성 확인일" value="제공되지 않음" />
                  <SourceRow label="실시간 운영·시설 상태" value="제공되지 않음" />
                </dl>
                <p className="text-steel mt-2 text-sm leading-6">
                  출입구, 엘리베이터, 화장실처럼 방문에 중요한 정보는 장소에 직접 확인해 주세요.
                </p>
              </div>
            </details>
          </div>
        </div>

        <footer className="border-hairline shrink-0 border-t bg-white p-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] sm:px-5 sm:py-3 md:shadow-[0_-12px_28px_rgba(0,0,0,0.05)]">
          {shareStatus ? (
            <p className="text-steel mb-2 text-center text-sm" role="status">
              {shareStatus}
            </p>
          ) : null}
          <div
            className={`grid gap-2 ${phoneHref ? "grid-cols-[minmax(0,1fr)_auto_auto]" : "grid-cols-[minmax(0,1fr)_auto]"}`}
          >
            <Link
              href={`/map?query=${encodeURIComponent(place.title)}`}
              className="bg-brand-800 hover:bg-brand-900 flex min-h-12 min-w-0 items-center justify-center gap-2 rounded-xl px-3 text-center leading-tight font-semibold whitespace-nowrap text-white transition-colors sm:px-4"
            >
              <span className="sm:hidden">지도 보기</span>
              <span className="hidden sm:inline">지도에서 보기</span>
              <ExternalLink className="h-4 w-4" aria-hidden="true" />
            </Link>
            {phoneHref ? (
              <a
                href={phoneHref}
                className="border-hairline text-ink hover:bg-surface flex min-h-12 min-w-[4.5rem] items-center justify-center gap-1.5 rounded-xl border px-3 text-center leading-tight font-semibold transition-colors"
              >
                <Phone className="h-4 w-4" aria-hidden="true" />
                전화
              </a>
            ) : null}
            <button
              type="button"
              onClick={() => void sharePlace()}
              className="border-hairline text-ink hover:bg-surface flex min-h-12 min-w-[4.5rem] items-center justify-center gap-1.5 rounded-xl border px-3 text-center leading-tight font-semibold transition-colors"
            >
              <Share2 className="h-4 w-4" aria-hidden="true" />
              공유
            </button>
          </div>
        </footer>
      </div>
    </dialog>
  );
}

function NeedCheckRow({
  check,
  detail
}: {
  check: ReturnType<typeof getNeedEvidenceChecks>[number];
  detail?: string;
}) {
  const statusText =
    check.status === "available"
      ? "공개 정보 있음"
      : check.status === "unavailable"
        ? "이용 제한 내용 있음"
        : "공개 정보 없음";
  const evidenceText = detail ?? check.evidence[0]?.value;

  return (
    <div className="grid min-h-16 grid-cols-[1.5rem_minmax(0,1fr)] gap-3 p-4">
      <StatusIcon status={check.status} />
      <div className="min-w-0">
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
          <p className="text-ink font-semibold">{check.label}</p>
          <p className="text-steel text-sm">{statusText}</p>
        </div>
        {evidenceText ? (
          <p className="text-slate mt-1 line-clamp-3 text-sm leading-6">{evidenceText}</p>
        ) : (
          <p className="text-steel mt-1 text-sm leading-6">방문 전에 장소에 확인해 주세요.</p>
        )}
      </div>
    </div>
  );
}

function VisitInfoRow({
  icon: Icon,
  label,
  value,
  critical = false
}: {
  icon: ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  label: string;
  value: string | null;
  critical?: boolean;
}) {
  if (!value && !critical) return null;
  return (
    <div className="grid grid-cols-[2.5rem_minmax(0,1fr)] gap-3 py-4">
      <span className="bg-surface text-steel grid h-10 w-10 place-items-center rounded-md">
        <Icon className="h-5 w-5" aria-hidden={true} />
      </span>
      <div className="min-w-0">
        <dt className="text-steel text-sm">{label}</dt>
        <dd className={`mt-1 leading-6 ${value ? "text-ink" : "text-gold-800"}`}>
          {value ?? "공개 정보 없음"}
        </dd>
      </div>
    </div>
  );
}

function AccessGroup({ group }: { group: HomeAccessibilityGroup }) {
  const Icon = GROUP_ICONS[group.id];
  return (
    <section aria-labelledby={`access-group-${group.id}`}>
      <div className="flex items-start gap-3">
        <span className="bg-brand-50 text-brand-800 grid h-11 w-11 shrink-0 place-items-center rounded-md">
          <Icon className="h-5 w-5" aria-hidden={true} />
        </span>
        <div>
          <h3 id={`access-group-${group.id}`} className="text-ink text-lg font-semibold">
            {group.label}
          </h3>
          <p className="text-steel mt-1 text-sm leading-5">{group.description}</p>
        </div>
      </div>
      <dl className="border-hairline mt-4 divide-y border-y">
        {group.evidence.map((evidence) => (
          <AccessDetail key={evidence.key} evidence={evidence} />
        ))}
      </dl>
    </section>
  );
}

function AccessDetail({ evidence }: { evidence: HomeAccessibilityEvidence }) {
  const status = getHomeEvidenceStatus(evidence);
  const statusLabel =
    status === "available"
      ? "공개 내용 있음"
      : status === "unavailable"
        ? "이용 제한 안내"
        : "내용 확인 필요";

  return (
    <div className="grid grid-cols-[1.5rem_minmax(0,1fr)] gap-3 py-4">
      <StatusIcon status={status} />
      <div className="min-w-0">
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
          <dt className="text-ink font-semibold">{evidence.label}</dt>
          <dd className="text-steel text-sm">{statusLabel}</dd>
        </div>
        <dd className="text-slate mt-1 leading-6">{evidence.value}</dd>
      </div>
    </div>
  );
}

function StatusIcon({ status }: { status: HomeEvidenceStatus }) {
  if (status === "available") {
    return <CircleCheck className="text-brand-700 mt-0.5 h-5 w-5" aria-hidden="true" />;
  }
  if (status === "unavailable") {
    return <CircleAlert className="mt-0.5 h-5 w-5 text-red-700" aria-hidden="true" />;
  }
  return <CircleHelp className="text-gold-700 mt-0.5 h-5 w-5" aria-hidden="true" />;
}

function SourceRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1 py-4 sm:grid-cols-[11rem_minmax(0,1fr)] sm:gap-5">
      <dt className="text-steel text-sm">{label}</dt>
      <dd className="text-ink leading-6">{value}</dd>
    </div>
  );
}

function SummaryFact({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 px-2 py-2.5 text-center sm:px-3">
      <dt className="text-steel text-[0.6875rem] leading-4 sm:text-xs">{label}</dt>
      <dd className="text-ink mt-0.5 text-sm font-semibold sm:text-base">{value}</dd>
    </div>
  );
}

function SectionHeading({
  id,
  eyebrow,
  title,
  description
}: {
  id: string;
  eyebrow?: string;
  title: string;
  description: string;
}) {
  return (
    <div>
      {eyebrow ? <p className="text-brand-800 text-sm font-medium">{eyebrow}</p> : null}
      <h2 id={id} className={`text-ink text-2xl font-semibold ${eyebrow ? "mt-1" : ""}`}>
        {title}
      </h2>
      <p className="text-steel mt-2 max-w-[62ch] text-sm leading-6">{description}</p>
    </div>
  );
}

function countEvidenceStatuses(evidence: readonly HomeAccessibilityEvidence[]) {
  return evidence.reduce(
    (counts, item) => {
      counts[getHomeEvidenceStatus(item)] += 1;
      return counts;
    },
    { available: 0, unavailable: 0, unknown: 0 } satisfies Record<HomeEvidenceStatus, number>
  );
}

function countNeedCheckStatuses(checks: readonly HomeNeedEvidenceCheck[]) {
  return checks.reduce(
    (counts, check) => {
      counts[check.status] += 1;
      return counts;
    },
    { available: 0, unavailable: 0, unknown: 0 } satisfies Record<HomeEvidenceStatus, number>
  );
}

function getDecisionSummary(counts: Record<HomeEvidenceStatus, number>) {
  const total = counts.available + counts.unavailable + counts.unknown;
  if (total === 0) {
    return {
      title: "공개된 접근성 세부 정보가 아직 없어요",
      description: "출발 전에 필요한 시설의 최신 상태를 장소에 확인해 주세요."
    };
  }
  if (counts.unavailable > 0) {
    return {
      title: `주의해서 볼 내용 ${counts.unavailable}개`,
      description: counts.available
        ? `확인된 편의정보 ${counts.available}개와 함께 아래에서 자세히 살펴보세요.`
        : "이용이 어렵거나 제한된 내용이 있어 아래 세부 정보를 먼저 확인해 주세요."
    };
  }
  if (counts.available > 0) {
    return {
      title: `공개된 편의정보 ${counts.available}개`,
      description: counts.unknown
        ? `${counts.unknown}개 항목은 현장 확인이 필요해요. 아래에서 내용을 살펴보세요.`
        : "아래 접근성 상세에서 시설별 내용을 확인할 수 있어요."
    };
  }
  return {
    title: `판단이 필요한 정보 ${counts.unknown}개`,
    description: "공개된 설명만으로 판단하기 어려워 출발 전에 최신 상태를 확인하는 것이 좋아요."
  };
}
