import type { RankedHomePlace } from "@/features/home/homeData";

export interface HomeDiscoveryHotPlace {
  id: string;
  name: string;
  image: string;
  address?: string;
  categoryCode?: string;
  average_rating: number | null;
  review_count: number;
  like_count: number;
}

export interface HomeDiscoveryCoursePlace {
  title: string | null;
  addr1: string | null;
  firstimage: string | null;
  contentid?: string | null;
}

export interface HomeDiscoveryCourse {
  course_id: number;
  course_nm: string;
  places: HomeDiscoveryCoursePlace[];
  day_count: number;
  place_count: number;
  like_count: number;
  average_rating: number;
  review_count?: number;
  hashtags?: string[];
  author_nickname?: string | null;
}

export interface RankedHomeDiscoveryCourse extends HomeDiscoveryCourse {
  discoveryImage: string;
}

export function rankReviewPlaces(
  places: readonly Partial<HomeDiscoveryHotPlace>[],
  limit = 4
): HomeDiscoveryHotPlace[] {
  return places
    .flatMap(normalizeHotPlace)
    .filter((place) => place.review_count > 0 && place.average_rating !== null)
    .sort(
      (a, b) =>
        (b.average_rating ?? 0) - (a.average_rating ?? 0) ||
        b.review_count - a.review_count ||
        b.like_count - a.like_count ||
        a.name.localeCompare(b.name, "ko")
    )
    .slice(0, limit);
}

export function rankFavoritePlaces(
  places: readonly Partial<HomeDiscoveryHotPlace>[],
  limit = 4
): HomeDiscoveryHotPlace[] {
  return places
    .flatMap(normalizeHotPlace)
    .filter((place) => place.like_count > 0)
    .sort(
      (a, b) =>
        b.like_count - a.like_count ||
        (b.average_rating ?? 0) - (a.average_rating ?? 0) ||
        b.review_count - a.review_count ||
        a.name.localeCompare(b.name, "ko")
    )
    .slice(0, limit);
}

export function rankSharedCourses(
  courses: readonly Partial<HomeDiscoveryCourse>[],
  limit = 2
): RankedHomeDiscoveryCourse[] {
  return courses
    .flatMap(normalizeCourse)
    .filter(hasRealCourseSignal)
    .flatMap((course) => {
      const image = pickCourseDiscoveryImage(course);
      return image ? [{ ...course, discoveryImage: image }] : [];
    })
    .sort(
      (a, b) =>
        getCourseSignalScore(b) - getCourseSignalScore(a) ||
        b.like_count - a.like_count ||
        (b.review_count ?? 0) - (a.review_count ?? 0) ||
        b.average_rating - a.average_rating ||
        a.course_nm.localeCompare(b.course_nm, "ko")
    )
    .slice(0, limit);
}

export function pickCourseDiscoveryImage(
  course: Pick<HomeDiscoveryCourse, "places">
): string | null {
  for (const place of course.places) {
    const image = place.firstimage?.trim();
    if (image) return image;
  }
  return null;
}

export function getCourseDiscoveryTitle(
  course: Pick<HomeDiscoveryCourse, "course_nm" | "place_count" | "places">
) {
  const title = course.course_nm.trim();
  if (!/^코스\s*\d+(?:\s*[-_]\s*\d+)?$/u.test(title)) return title;
  const firstPlace = course.places[0]?.title?.trim();
  const placeCount = course.place_count || course.places.length;
  return firstPlace
    ? `${firstPlace}부터 둘러보는 ${placeCount}곳 코스`
    : `${placeCount}곳을 잇는 대전 여행 코스`;
}

export function formatHomeDiscoveryPeriod(
  startDate: string | null | undefined,
  endDate: string | null | undefined
) {
  const start = formatCompactDate(startDate);
  const end = formatCompactDate(endDate);
  if (start && end) return start === end ? start : `${start} - ${end}`;
  if (start) return `${start}부터`;
  if (end) return `${end}까지`;
  return "일정 확인";
}

export function pickFestivalPlaces(
  festivals: readonly RankedHomePlace[],
  limit = 3
): RankedHomePlace[] {
  return festivals.slice(0, limit);
}

function normalizeHotPlace(place: Partial<HomeDiscoveryHotPlace>): HomeDiscoveryHotPlace[] {
  const id = normalizeText(place.id);
  const name = normalizeText(place.name);
  if (!id || !name) return [];

  return [
    {
      id,
      name,
      image: normalizeText(place.image),
      address: normalizeText(place.address) || undefined,
      categoryCode: normalizeText(place.categoryCode) || undefined,
      average_rating: normalizeNullableNumber(place.average_rating),
      review_count: normalizeCount(place.review_count),
      like_count: normalizeCount(place.like_count)
    }
  ];
}

function normalizeCourse(course: Partial<HomeDiscoveryCourse>): HomeDiscoveryCourse[] {
  const courseId = Number(course.course_id);
  if (!Number.isFinite(courseId)) return [];

  return [
    {
      course_id: courseId,
      course_nm: normalizeText(course.course_nm) || `코스 #${courseId}`,
      places: Array.isArray(course.places)
        ? course.places.map((place) => ({
            title: normalizeText(place.title) || null,
            addr1: normalizeText(place.addr1) || null,
            firstimage: normalizeText(place.firstimage) || null,
            contentid: normalizeText(place.contentid) || null
          }))
        : [],
      day_count: normalizeCount(course.day_count),
      place_count: normalizeCount(course.place_count),
      like_count: normalizeCount(course.like_count),
      average_rating: normalizeCount(course.average_rating),
      review_count: normalizeCount(course.review_count),
      hashtags: Array.isArray(course.hashtags)
        ? course.hashtags.map(normalizeText).filter(Boolean)
        : undefined,
      author_nickname: normalizeText(course.author_nickname) || null
    }
  ];
}

function hasRealCourseSignal(course: HomeDiscoveryCourse) {
  const isTestCourse = /^(?:\[?테스트|test)/iu.test(course.course_nm.trim());
  return (
    !isTestCourse &&
    course.places.length > 0 &&
    ((course.review_count ?? 0) > 0 || course.like_count >= 2)
  );
}

function getCourseSignalScore(course: HomeDiscoveryCourse) {
  return course.like_count * 3 + (course.review_count ?? 0) * 2 + course.average_rating;
}

function normalizeText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeCount(value: unknown) {
  const count = Number(value);
  return Number.isFinite(count) && count > 0 ? count : 0;
}

function normalizeNullableNumber(value: unknown) {
  const count = Number(value);
  return Number.isFinite(count) && count > 0 ? count : null;
}

function formatCompactDate(value: string | null | undefined) {
  const digits = value?.replace(/\D/g, "").slice(0, 8);
  if (!digits || digits.length !== 8) return null;

  const year = Number(digits.slice(0, 4));
  const month = Number(digits.slice(4, 6));
  const day = Number(digits.slice(6, 8));
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }

  return `${month}. ${day}.`;
}
