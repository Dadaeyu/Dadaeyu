"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { fetchKakaoPlaces, type SearchPlace } from "@/lib/search/kakaoSearch";

export interface TourismDetail {
  title: string;
  category: string | null;
  image: string;
  addr1: string;
  overview: string | null;
  use_time: string | null;
  phone: string | null;
  accessibility: { category: string; items: { label: string; text: string }[] }[];
}

export interface AreaCode {
  code: string;
  name: string;
}

type SearchRequest = {
  keyword: string;
  revision: number;
};

type SearchResultState = {
  key: string;
  places: SearchPlace[];
};

type TourismDetailState = {
  contentId: string;
  detail: TourismDetail | null;
};

// DB(tb_place) + 카카오 로컬 검색을 병행 조회하고, 좌표 기준으로 중복을 제거한다.
export function usePlaceSearch({
  accessibility,
  gu,
  dong,
  favoritesOnly,
  headcount,
  dateFrom,
  dateTo,
  themes,
  minRating,
  initialKeyword = ""
}: {
  accessibility: string[];
  gu: string;
  dong: string;
  favoritesOnly: boolean;
  headcount: number;
  dateFrom: string;
  dateTo: string;
  themes: string[];
  minRating: number;
  initialKeyword?: string;
}) {
  const [keyword, setKeyword] = useState(initialKeyword);
  const [searchRequest, setSearchRequest] = useState<SearchRequest>({
    keyword: initialKeyword,
    revision: 0
  });
  const [searchResult, setSearchResult] = useState<SearchResultState>({
    key: "",
    places: []
  });
  const [searchDetailId, setSearchDetailId] = useState<string | null>(null);
  const [areaCodes, setAreaCodes] = useState<AreaCode[]>([]);

  useEffect(() => {
    const controller = new AbortController();

    void fetch("/api/area-code", { signal: controller.signal })
      .then((response) => (response.ok ? response.json() : []))
      .then((data) => setAreaCodes(Array.isArray(data) ? data : []))
      .catch((error: unknown) => {
        if (!isAbortError(error)) setAreaCodes([]);
      });

    return () => controller.abort();
  }, []);

  const selectedGuCode = useMemo(
    () => (gu ? areaCodes.find((area) => area.name === gu)?.code : undefined),
    [areaCodes, gu]
  );

  const [dongResult, setDongResult] = useState<{ guCode: string; options: string[] }>({
    guCode: "",
    options: []
  });

  useEffect(() => {
    if (!selectedGuCode) return;

    const controller = new AbortController();
    void fetch(`/api/area-code/dong?gu=${encodeURIComponent(selectedGuCode)}`, {
      signal: controller.signal
    })
      .then((response) => (response.ok ? response.json() : []))
      .then((data) =>
        setDongResult({
          guCode: selectedGuCode,
          options: Array.isArray(data) ? data : []
        })
      )
      .catch((error: unknown) => {
        if (!isAbortError(error)) {
          setDongResult({ guCode: selectedGuCode, options: [] });
        }
      });

    return () => controller.abort();
  }, [selectedGuCode]);

  const dongOptions = selectedGuCode === dongResult.guCode ? dongResult.options : [];

  const [likedPlaces, setLikedPlaces] = useState<SearchPlace[]>([]);
  const likedIds = useMemo(() => new Set(likedPlaces.map((place) => place.id)), [likedPlaces]);

  // 즐겨찾기 마커(하트) 표시용으로, 필터와 무관하게 내 즐겨찾기 목록을 유지한다.
  // 상세 패널에서 하트를 누른 직후에도 즉시 다시 불러올 수 있도록 콜백으로 노출한다.
  const refreshLiked = useCallback(async () => {
    const liked = await fetchLikedPlaces();
    setLikedPlaces(liked);
    return liked;
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    void fetchLikedPlaces(controller.signal)
      .then(setLikedPlaces)
      .catch((error: unknown) => {
        if (!isAbortError(error)) setLikedPlaces([]);
      });

    return () => controller.abort();
  }, []);

  const [topRatedPlaces, setTopRatedPlaces] = useState<SearchPlace[]>([]);

  useEffect(() => {
    const controller = new AbortController();

    void fetchTopRatedPlaces(controller.signal)
      .then(setTopRatedPlaces)
      .catch((error: unknown) => {
        if (!isAbortError(error)) setTopRatedPlaces([]);
      });

    return () => controller.abort();
  }, []);

  const searchKey = useMemo(
    () =>
      JSON.stringify([
        searchRequest.keyword.trim(),
        searchRequest.revision,
        accessibility,
        selectedGuCode ?? "",
        gu,
        dong,
        favoritesOnly,
        themes,
        minRating,
        headcount,
        dateFrom,
        dateTo
      ]),
    [
      accessibility,
      dong,
      favoritesOnly,
      gu,
      searchRequest,
      selectedGuCode,
      themes,
      minRating,
      headcount,
      dateFrom,
      dateTo
    ]
  );

  useEffect(() => {
    const controller = new AbortController();

    void fetchCombinedPlaces(
      {
        accessibility,
        dong,
        favoritesOnly,
        gu,
        guCode: selectedGuCode,
        keyword: searchRequest.keyword,
        themes,
        minRating,
        headcount,
        dateFrom,
        dateTo
      },
      controller.signal
    )
      .then(({ liked, places }) => {
        setSearchResult({ key: searchKey, places });
        setSearchDetailId(null);
        if (liked) setLikedPlaces(liked);
      })
      .catch((error: unknown) => {
        if (!isAbortError(error)) {
          setSearchResult({ key: searchKey, places: [] });
          setSearchDetailId(null);
        }
      });

    return () => controller.abort();
  }, [accessibility, dong, favoritesOnly, gu, searchKey, searchRequest.keyword, selectedGuCode]);

  const handleSearch = useCallback((nextKeyword: string) => {
    setSearchRequest((current) => ({
      keyword: nextKeyword,
      revision: current.revision + 1
    }));
  }, []);

  const searchPlaces = searchResult.places;
  const isSearching = searchResult.key !== searchKey;

  const searchDetail = searchDetailId
    ? (searchPlaces.find((place) => place.id === searchDetailId) ??
      topRatedPlaces.find((place) => place.id === searchDetailId) ??
      null)
    : null;

  const [tourismDetailResult, setTourismDetailResult] = useState<TourismDetailState | null>(null);

  useEffect(() => {
    if (!searchDetailId || !searchDetail || searchDetail.source === "kakao") return;

    const controller = new AbortController();
    void fetch(`/api/tourism/detail?contentId=${encodeURIComponent(searchDetailId)}`, {
      signal: controller.signal
    })
      .then(async (response) => {
        if (!response.ok) throw new Error("관광지 상세 정보를 불러오지 못했습니다.");
        return (await response.json()) as TourismDetail;
      })
      .then((detail) => setTourismDetailResult({ contentId: searchDetailId, detail }))
      .catch((error: unknown) => {
        if (!isAbortError(error)) {
          setTourismDetailResult({ contentId: searchDetailId, detail: null });
        }
      });

    return () => controller.abort();
  }, [searchDetail, searchDetailId]);

  const isDatabaseDetail = Boolean(
    searchDetailId && searchDetail && searchDetail.source !== "kakao"
  );
  const tourismDetail =
    searchDetailId && tourismDetailResult?.contentId === searchDetailId
      ? tourismDetailResult.detail
      : null;
  const isLoadingDetail = isDatabaseDetail && tourismDetailResult?.contentId !== searchDetailId;

  const focusPlaceById = useCallback(async (contentId: string) => {
    try {
      const response = await fetch(`/api/search?id=${encodeURIComponent(contentId)}`);
      if (!response.ok) return;

      const data = await response.json();
      const found: Omit<SearchPlace, "source"> | undefined = Array.isArray(data)
        ? data[0]
        : undefined;
      if (!found) return;

      const place: SearchPlace = { ...found, source: "db" };
      setSearchResult((current) => ({
        ...current,
        places: [place, ...current.places.filter((item) => item.id !== place.id)]
      }));
      setSearchDetailId(place.id);
    } catch {
      // 게시글 연결 장소를 찾지 못해도 지도 화면 자체는 계속 사용할 수 있다.
    }
  }, []);

  return {
    keyword,
    setKeyword,
    searchPlaces,
    searchDetailId,
    setSearchDetailId,
    searchDetail,
    isSearching,
    areaCodes,
    dongOptions,
    likedIds,
    refreshLiked,
    tourismDetail,
    isLoadingDetail,
    handleSearch,
    focusPlaceById,
    topRatedPlaces
  };
}

async function fetchLikedPlaces(signal?: AbortSignal): Promise<SearchPlace[]> {
  const response = await fetch("/api/tourism/liked", { signal });
  if (!response.ok) return [];

  const liked = await response.json();
  return (Array.isArray(liked) ? liked : []).map((place: Omit<SearchPlace, "source">) => ({
    ...place,
    source: "db" as const
  }));
}

async function fetchTopRatedPlaces(signal?: AbortSignal): Promise<SearchPlace[]> {
  const response = await fetch("/api/tourism/top-rated-places", { signal });
  if (!response.ok) return [];

  const json = await response.json();
  const places: Omit<SearchPlace, "source">[] = Array.isArray(json?.places) ? json.places : [];
  return places.map((place) => ({ ...place, source: "db" as const }));
}

async function fetchCombinedPlaces(
  {
    accessibility,
    dong,
    favoritesOnly,
    gu,
    guCode,
    keyword,
    themes,
    minRating,
    headcount,
    dateFrom,
    dateTo
  }: {
    accessibility: string[];
    dong: string;
    favoritesOnly: boolean;
    gu: string;
    guCode?: string;
    keyword: string;
    themes: string[];
    minRating: number;
    headcount: number;
    dateFrom: string;
    dateTo: string;
  },
  signal: AbortSignal
) {
  const trimmedKeyword = keyword.trim();
  const hasNormalQuery = Boolean(
    trimmedKeyword ||
    accessibility.length > 0 ||
    guCode ||
    dong ||
    themes.length > 0 ||
    minRating > 0 ||
    headcount > 1 ||
    dateFrom ||
    dateTo
  );

  if (!hasNormalQuery && !favoritesOnly) {
    return { places: [] as SearchPlace[], liked: null as SearchPlace[] | null };
  }

  const params = new URLSearchParams();
  if (trimmedKeyword) params.set("keyword", trimmedKeyword);
  if (accessibility.length > 0) params.set("accessibility", accessibility.join(","));
  if (guCode) params.set("gu", guCode);
  if (dong) params.set("dong", dong);
  if (themes.length > 0) params.set("themes", themes.join(","));
  if (minRating > 0) params.set("minRating", String(minRating));
  if (headcount >= 1) params.set("headcount", String(headcount));
  if (dateFrom) params.set("dateFrom", dateFrom);
  if (dateTo) params.set("dateTo", dateTo);

  const [databaseResponse, kakaoResults, liked] = await Promise.all([
    hasNormalQuery
      ? fetch(`/api/search?${params}`, { signal }).then(async (response) => {
          if (!response.ok) throw new Error("장소 검색에 실패했습니다.");
          return response.json();
        })
      : Promise.resolve([]),
    trimmedKeyword
      ? fetchKakaoPlaces(trimmedKeyword, gu || undefined, dong || undefined)
      : Promise.resolve([]),
    favoritesOnly ? fetchLikedPlaces(signal) : Promise.resolve(null)
  ]);

  const databasePlaces: SearchPlace[] = (
    Array.isArray(databaseResponse) ? databaseResponse : []
  ).map((place: Omit<SearchPlace, "source">) => ({ ...place, source: "db" as const }));

  const mergedDatabasePlaces = Array.from(
    new Map([...databasePlaces, ...(liked ?? [])].map((place) => [place.id, place])).values()
  );

  const coordinateKey = (lat: number, lng: number) => `${lat.toFixed(3)}_${lng.toFixed(3)}`;
  const databaseCoordinates = new Set(
    mergedDatabasePlaces.map((place) => coordinateKey(place.lat, place.lng))
  );
  const uniqueKakaoPlaces = kakaoResults.filter(
    (place) => !databaseCoordinates.has(coordinateKey(place.lat, place.lng))
  );

  return {
    places: [...mergedDatabasePlaces, ...uniqueKakaoPlaces],
    liked
  };
}

function isAbortError(error: unknown) {
  return error instanceof Error && error.name === "AbortError";
}
