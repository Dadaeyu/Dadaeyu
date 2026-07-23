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

// DB(tb_place) + 카카오 로컬 검색을 병행 조회하고, 좌표 기준으로 중복을 제거한다.
export function usePlaceSearch({
  accessibility,
  gu,
  dong,
  favoritesOnly
}: {
  accessibility: string[];
  gu: string;
  dong: string;
  favoritesOnly: boolean;
}) {
  const [keyword, setKeyword] = useState("");
  const [searchPlaces, setSearchPlaces] = useState<SearchPlace[]>([]);
  const [searchDetailId, setSearchDetailId] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [areaCodes, setAreaCodes] = useState<AreaCode[]>([]);
  const [dongOptions, setDongOptions] = useState<string[]>([]);

  useEffect(() => {
    fetch("/api/area-code")
      .then((r) => r.json())
      .then((data) => setAreaCodes(Array.isArray(data) ? data : []))
      .catch(() => setAreaCodes([]));
  }, []);

  // 구 선택이 바뀔 때마다 해당 구에 속한 동 목록을 다시 불러온다.
  useEffect(() => {
    const guCode = gu ? areaCodes.find((a) => a.name === gu)?.code : undefined;
    if (!guCode) {
      setDongOptions([]);
      return;
    }
    fetch(`/api/area-code/dong?gu=${guCode}`)
      .then((r) => r.json())
      .then((data) => setDongOptions(Array.isArray(data) ? data : []))
      .catch(() => setDongOptions([]));
  }, [gu, areaCodes]);

  const [likedPlaces, setLikedPlaces] = useState<SearchPlace[]>([]);
  const likedIds = useMemo(() => new Set(likedPlaces.map((p) => p.id)), [likedPlaces]);

  const fetchLiked = async (): Promise<SearchPlace[]> => {
    const liked = await fetch("/api/tourism/liked")
      .then((r) => r.json())
      .catch(() => []);
    return (Array.isArray(liked) ? liked : []).map(
      (p: Omit<SearchPlace, "source">) => ({ ...p, source: "db" as const })
    );
  };

  // 즐겨찾기 마커(하트) 표시용으로, 필터와 무관하게 내 즐겨찾기 목록을 유지한다.
  // 상세 패널에서 하트를 누른 직후에도 즉시 다시 불러올 수 있도록 콜백으로 노출한다.
  const refreshLiked = useCallback(async () => {
    const liked = await fetchLiked();
    setLikedPlaces(liked);
    return liked;
  }, []);

  useEffect(() => {
    refreshLiked();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 검색이 비어있을 때(idle) 좌측 목록/마커에 보여줄 "후기 평점 상위 5곳".
  const [topRatedPlaces, setTopRatedPlaces] = useState<SearchPlace[]>([]);

  const loadTopRatedPlaces = useCallback(async () => {
    try {
      const res = await fetch("/api/tourism/top-rated-places");
      const json = await res.json();
      const places: Omit<SearchPlace, "source">[] = Array.isArray(json?.places) ? json.places : [];
      setTopRatedPlaces(places.map((p) => ({ ...p, source: "db" as const })));
    } catch {
      setTopRatedPlaces([]);
    }
  }, []);

  useEffect(() => {
    loadTopRatedPlaces();
  }, [loadTopRatedPlaces]);

  const [tourismDetail, setTourismDetail] = useState<TourismDetail | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);

  useEffect(() => {
    const sp = searchDetailId
      ? (searchPlaces.find((p) => p.id === searchDetailId) ??
        topRatedPlaces.find((p) => p.id === searchDetailId))
      : null;
    if (!sp || sp.source === "kakao") {
      setTourismDetail(null);
      return;
    }
    setIsLoadingDetail(true);
    fetch(`/api/tourism/detail?contentId=${searchDetailId}`)
      .then((r) => r.json())
      .then((data) => setTourismDetail(data))
      .catch(() => setTourismDetail(null))
      .finally(() => setIsLoadingDetail(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchDetailId]);

  const handleSearch = async (kw: string) => {
    const guCode = gu ? areaCodes.find((a) => a.name === gu)?.code : undefined;
    const hasNormalQuery = !!(kw.trim() || accessibility.length > 0 || guCode || dong);
    if (!hasNormalQuery && !favoritesOnly) {
      setSearchPlaces([]);
      setSearchDetailId(null);
      return;
    }
    setIsSearching(true);
    try {
      const params = new URLSearchParams();
      if (kw.trim()) params.set("keyword", kw);
      if (accessibility.length > 0) params.set("accessibility", accessibility.join(","));
      if (guCode) params.set("gu", guCode);
      if (dong) params.set("dong", dong);

      const [dbRes, kakaoResults, likedResults] = await Promise.all([
        hasNormalQuery
          ? fetch(`/api/search?${params}`)
              .then((r) => r.json())
              .catch(() => [])
          : Promise.resolve([]),
        kw.trim() ? fetchKakaoPlaces(kw, gu || undefined, dong || undefined) : Promise.resolve([]),
        favoritesOnly ? refreshLiked() : Promise.resolve([])
      ]);

      const dbResults: SearchPlace[] = (Array.isArray(dbRes) ? dbRes : []).map(
        (p: Omit<SearchPlace, "source">) => ({ ...p, source: "db" as const })
      );

      // 일반 검색 결과 + 즐겨찾기 결과를 OR로 합친다 (id 기준 중복 제거).
      const dbMerged = Array.from(
        new Map([...dbResults, ...likedResults].map((p) => [p.id, p])).values()
      );

      // 좌표 기준 중복 제거 (소수점 3자리 ≈ 100m)
      const coordKey = (lat: number, lng: number) => `${lat.toFixed(3)}_${lng.toFixed(3)}`;
      const dbCoords = new Set(dbMerged.map((p) => coordKey(p.lat, p.lng)));
      const uniqueKakao = kakaoResults.filter((p) => !dbCoords.has(coordKey(p.lat, p.lng)));

      setSearchPlaces([...dbMerged, ...uniqueKakao]);
      setSearchDetailId(null);
    } catch {
      setSearchPlaces([]);
    } finally {
      setIsSearching(false);
    }
  };

  useEffect(() => {
    handleSearch(keyword);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessibility, gu, dong, favoritesOnly]);

  // 특정 contentid(글 첨부 장소 등)를 지도에 마커로 띄우고 상세를 연다.
  const focusPlaceById = useCallback(async (contentId: string) => {
    try {
      const res = await fetch(`/api/search?id=${encodeURIComponent(contentId)}`);
      const data = await res.json();
      const found: Omit<SearchPlace, "source"> | undefined = Array.isArray(data) ? data[0] : undefined;
      if (!found) return;
      const place: SearchPlace = { ...found, source: "db" };
      setSearchPlaces((prev) => [place, ...prev.filter((p) => p.id !== place.id)]);
      setSearchDetailId(place.id);
    } catch {
      // 조회 실패 시 조용히 무시
    }
  }, []);

  const searchDetail = searchDetailId
    ? (searchPlaces.find((p) => p.id === searchDetailId) ??
      topRatedPlaces.find((p) => p.id === searchDetailId) ??
      null)
    : null;

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
