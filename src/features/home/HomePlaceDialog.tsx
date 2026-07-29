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
  type HomeAccessibilityEvidence,
  type HomeAccessibilityGroup,
  type HomeEvidenceStatus,
  type HomeNeedId,
  type RankedHomePlace
} from "@/features/home/homeData";

type PlaceSectionId = "decision" | "visit" | "access" | "source";

const SECTION_LINKS: Array<{ id: PlaceSectionId; label: string }> = [
  { id: "decision", label: "방문 판단" },
  { id: "visit", label: "관광 정보" },
  { id: "access", label: "접근성" },
  { id: "source", label: "정보 확인" }
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
  const statusCounts = countEvidenceStatuses(place.accessibility);
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
      className="m-0 h-dvh max-h-none w-full max-w-none bg-transparent p-0 backdrop:bg-black/45 md:m-auto md:h-[min(88dvh,56rem)] md:w-[min(68rem,calc(100%-3rem))] md:rounded-lg"
      aria-labelledby="place-dialog-title"
    >
      <div className="flex h-full min-h-0 flex-col overflow-hidden bg-white md:rounded-lg">
        <header className="border-hairline flex min-h-16 shrink-0 items-center justify-between gap-3 border-b bg-white px-4 sm:px-5">
          <div className="min-w-0">
            <p className="text-steel text-xs">장소 정보</p>
            <p className="text-ink line-clamp-2 leading-tight font-semibold">{place.title}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate hover:bg-surface grid h-12 w-12 shrink-0 place-items-center rounded-full"
            aria-label="장소 정보 닫기"
          >
            <X className="h-6 w-6" aria-hidden="true" />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          <section className="md:grid md:grid-cols-[minmax(0,1.15fr)_minmax(20rem,0.85fr)]">
            <HomePlaceImage
              src={place.imageUrl}
              alt={place.title}
              className="aspect-[16/10] h-full max-h-[30rem] w-full object-cover md:max-h-none md:min-h-[24rem]"
            />
            <div className="flex flex-col justify-end p-5 sm:p-6 md:p-8">
              <p className="text-brand-800 text-sm font-medium">{place.category ?? "대전 관광"}</p>
              <h2
                id="place-dialog-title"
                className="text-ink mt-2 text-3xl leading-tight font-semibold [overflow-wrap:anywhere]"
              >
                {place.title}
              </h2>
              {place.address ? (
                <p className="text-slate mt-4 flex items-start gap-2 leading-6">
                  <MapPin className="text-brand-700 mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
                  <span>{place.address}</span>
                </p>
              ) : (
                <p className="text-steel mt-4">공개된 주소 정보가 없습니다.</p>
              )}
              <div className="text-steel mt-4 flex flex-wrap gap-x-4 gap-y-2 text-sm">
                {distance ? <span>현재 위치에서 직선거리 {distance}</span> : null}
                <span>{sourceDate ? `관광정보 갱신 ${sourceDate}` : "갱신일 미확인"}</span>
              </div>
            </div>
          </section>

          <nav
            className="border-hairline sticky top-0 z-20 grid grid-cols-[repeat(4,minmax(0,1fr))] border-y bg-white/95 px-2 backdrop-blur-md sm:px-5"
            aria-label="장소 정보 바로가기"
          >
            {SECTION_LINKS.map((section) => (
              <button
                key={section.id}
                type="button"
                onClick={() => scrollToSection(section.id)}
                className="text-slate hover:text-brand-800 min-h-12 min-w-0 px-1 text-sm leading-tight font-medium [overflow-wrap:anywhere]"
              >
                {section.label}
              </button>
            ))}
          </nav>

          <div className="mx-auto max-w-4xl px-4 py-7 sm:px-6 sm:py-9">
            <section
              data-place-section="decision"
              tabIndex={-1}
              className="scroll-mt-14 outline-none"
              aria-labelledby="decision-title"
            >
              <SectionHeading
                id="decision-title"
                eyebrow={selectedNeedIds.length ? "내 조건으로 확인" : "공개 정보로 확인"}
                title="방문 전에 먼저 볼 정보"
                description="공개된 정보와 확인되지 않은 항목을 나누어 보여드립니다."
              />

              {needChecks.length ? (
                <div className="border-hairline mt-5 divide-y rounded-lg border bg-white">
                  {needChecks.map((check) => (
                    <NeedCheckRow key={check.id} check={check} />
                  ))}
                  {selectedNeedIds.includes("short_distance") ? (
                    <NeedCheckRow
                      check={{
                        id: "location-distance",
                        label: "현재 위치와의 거리",
                        status: distance ? "available" : "unknown",
                        evidence: []
                      }}
                      detail={
                        distance
                          ? `직선거리 ${distance}입니다. 실제 이동 경로 거리는 지도에서 다시 확인해 주세요.`
                          : "내 위치를 사용하지 않아 거리를 계산하지 못했습니다."
                      }
                    />
                  ) : null}
                </div>
              ) : (
                <div className="border-hairline mt-5 grid grid-cols-3 divide-x rounded-lg border bg-white">
                  <DecisionCount
                    label="이용 정보 있음"
                    count={statusCounts.available}
                    icon={CircleCheck}
                    tone="brand"
                  />
                  <DecisionCount
                    label="제한 내용 있음"
                    count={statusCounts.unavailable}
                    icon={CircleAlert}
                    tone="warn"
                  />
                  <DecisionCount
                    label="판단 어려움"
                    count={statusCounts.unknown}
                    icon={CircleHelp}
                    tone="neutral"
                  />
                </div>
              )}

              <div className="border-gold-200 bg-gold-50 mt-4 grid grid-cols-[1.5rem_minmax(0,1fr)] gap-3 rounded-lg border p-4">
                <CircleAlert className="text-gold-700 mt-0.5 h-5 w-5" aria-hidden="true" />
                <div>
                  <p className="text-ink font-semibold">현장 상태는 방문 전에 다시 확인해 주세요</p>
                  <p className="text-slate mt-1 text-sm leading-6">
                    실시간 운영, 공사, 시설 고장 정보와 현장 접근성 확인일은 현재 데이터에 포함되어
                    있지 않습니다.
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
                title="관광 정보"
                description="운영 정보는 실시간 상태가 아니므로 출발 전에 다시 확인해 주세요."
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
                <h3 className="text-ink text-lg font-semibold">이곳에서 할 수 있는 것</h3>
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
                title="접근성 정보"
                description="제공된 세부 내용을 이동과 안내 목적별로 정리했습니다."
              />

              {groups.length ? (
                <div className="mt-6 space-y-9">
                  {groups.map((group) => (
                    <AccessGroup key={group.id} group={group} />
                  ))}
                </div>
              ) : (
                <div className="bg-surface-soft text-slate mt-5 rounded-lg p-4 leading-6">
                  공개된 접근성 세부 정보가 없습니다. 방문 전 장소에 문의해 주세요.
                </div>
              )}
            </section>

            <section
              data-place-section="source"
              tabIndex={-1}
              className="border-hairline mt-10 scroll-mt-14 border-t pt-9 outline-none"
              aria-labelledby="source-title"
            >
              <SectionHeading
                id="source-title"
                title="정보 확인"
                description="출처와 데이터 범위를 확인한 뒤 방문을 결정해 주세요."
              />
              <dl className="border-hairline mt-5 divide-y border-y">
                <SourceRow label="정보 출처" value="한국관광공사 관광·무장애 여행정보" />
                <SourceRow label="관광정보 갱신" value={sourceDate ?? "확인할 수 없음"} />
                <SourceRow label="현장 접근성 확인일" value="제공되지 않음" />
                <SourceRow label="실시간 운영·시설 상태" value="제공되지 않음" />
              </dl>
              <p className="text-steel mt-4 text-sm leading-6">
                데이터가 오래되었거나 현장과 다를 수 있습니다. 출입구, 엘리베이터, 화장실처럼 방문에
                중요한 정보는 장소에 직접 확인해 주세요.
              </p>
            </section>
          </div>
        </div>

        <footer className="border-hairline shrink-0 border-t bg-white p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-5">
          {shareStatus ? (
            <p className="text-steel mb-2 text-center text-sm" role="status">
              {shareStatus}
            </p>
          ) : null}
          <div
            className={`grid gap-2 ${
              phoneHref
                ? "grid-cols-2 md:grid-cols-[minmax(0,1fr)_auto_auto]"
                : "grid-cols-1 md:grid-cols-[minmax(0,1fr)_auto]"
            }`}
          >
            <Link
              href={`/map?query=${encodeURIComponent(place.title)}`}
              className={`bg-primary text-primary-foreground flex min-h-12 min-w-0 items-center justify-center gap-2 rounded-md px-4 text-center leading-tight font-medium ${
                phoneHref ? "col-span-2 md:col-span-1" : ""
              }`}
            >
              지도에서 위치 보기
              <ExternalLink className="h-4 w-4" aria-hidden="true" />
            </Link>
            {phoneHref ? (
              <a
                href={phoneHref}
                className="border-hairline text-ink flex min-h-12 min-w-0 items-center justify-center gap-1.5 rounded-md border px-3 text-center leading-tight font-medium"
              >
                <Phone className="h-4 w-4" aria-hidden="true" />
                전화
              </a>
            ) : null}
            <button
              type="button"
              onClick={() => void sharePlace()}
              className="border-hairline text-ink flex min-h-12 min-w-0 items-center justify-center gap-1.5 rounded-md border px-3 text-center leading-tight font-medium"
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

function DecisionCount({
  label,
  count,
  icon: Icon,
  tone
}: {
  label: string;
  count: number;
  icon: ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  tone: "brand" | "warn" | "neutral";
}) {
  const iconClass =
    tone === "brand" ? "text-brand-700" : tone === "warn" ? "text-gold-700" : "text-steel";
  return (
    <div className="min-w-0 px-2 py-4 text-center sm:px-4">
      <Icon className={`mx-auto h-5 w-5 ${iconClass}`} aria-hidden={true} />
      <p className="text-ink mt-2 text-xl font-semibold">{count}</p>
      <p className="text-steel mt-0.5 text-xs sm:text-sm">{label}</p>
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
