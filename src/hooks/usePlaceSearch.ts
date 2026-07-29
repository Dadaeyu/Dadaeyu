"use client";

import { useEffect, useState } from "react";
import { fetchKakaoPlaces, type SearchPlace } from "@/lib/search/kakaoSearch";

export interface TourismDetail {
  title: string;
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

// DB(tb_tourism_places) + 카카오 로컬 검색을 병행 조회하고, 좌표 기준으로 중복을 제거한다.
export function usePlaceSearch({
  accessibility,
  gu,
  initialKeyword = ""
}: {
  accessibility: string[];
  gu: string;
  initialKeyword?: string;
}) {
  const [keyword, setKeyword] = useState(initialKeyword);
  const [searchPlaces, setSearchPlaces] = useState<SearchPlace[]>([]);
  const [searchDetailId, setSearchDetailId] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [areaCodes, setAreaCodes] = useState<AreaCode[]>([]);

  useEffect(() => {
    fetch("/api/area-code")
      .then((r) => r.json())
      .then((data) => setAreaCodes(Array.isArray(data) ? data : []))
      .catch(() => setAreaCodes([]));
  }, []);

  const [tourismDetail, setTourismDetail] = useState<TourismDetail | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);

  useEffect(() => {
    const sp = searchDetailId ? searchPlaces.find((p) => p.id === searchDetailId) : null;
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
    if (!kw.trim() && accessibility.length === 0 && !guCode) {
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

      const [dbRes, kakaoResults] = await Promise.all([
        fetch(`/api/search?${params}`)
          .then((r) => r.json())
          .catch(() => []),
        kw.trim() ? fetchKakaoPlaces(kw, gu || undefined) : Promise.resolve([])
      ]);

      const dbResults: SearchPlace[] = (Array.isArray(dbRes) ? dbRes : []).map(
        (p: Omit<SearchPlace, "source">) => ({ ...p, source: "db" as const })
      );

      // 좌표 기준 중복 제거 (소수점 3자리 ≈ 100m)
      const coordKey = (lat: number, lng: number) => `${lat.toFixed(3)}_${lng.toFixed(3)}`;
      const dbCoords = new Set(dbResults.map((p) => coordKey(p.lat, p.lng)));
      const uniqueKakao = kakaoResults.filter((p) => !dbCoords.has(coordKey(p.lat, p.lng)));

      setSearchPlaces([...dbResults, ...uniqueKakao]);
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
  }, [accessibility, gu]);

  const searchDetail = searchDetailId
    ? (searchPlaces.find((p) => p.id === searchDetailId) ?? null)
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
    tourismDetail,
    isLoadingDetail,
    handleSearch
  };
}
