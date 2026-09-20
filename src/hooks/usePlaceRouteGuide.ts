"use client";

import { useCallback, useRef, useState } from "react";
import type { MapPathSegment } from "@/components/KakaoMap";
import type {
  PlaceRouteGuideState,
  RouteOriginPhase,
  RouteOriginPlace
} from "@/components/search/TourismDetailPanel";
import {
  buildRoutePathFromOption,
  fetchDirections,
  openKakaoMapRoute,
  pickRouteOption,
  type RouteMode,
  type RouteOption
} from "@/lib/kakao/directions";

export type PlaceRouteDestination = {
  lat: number;
  lng: number;
  name?: string;
};

export function usePlaceRouteGuide(options?: { onExpandSheet?: () => void }) {
  const [routePath, setRoutePath] = useState<MapPathSegment[]>([]);
  const [routeGuide, setRouteGuide] = useState<PlaceRouteGuideState | null>(null);
  const [routeStops, setRouteStops] = useState<PlaceRouteDestination[] | null>(null);
  const routeOptionsRef = useRef<RouteOption[] | null>(null);
  const [selectedRouteId, setSelectedRouteId] = useState("0");
  const routeRequestIdRef = useRef(0);
  const [routeOrigin, setRouteOrigin] = useState<RouteOriginPlace | null>(null);
  const [routeOriginPhase, setRouteOriginPhase] = useState<RouteOriginPhase>("idle");
  const expandSheet = options?.onExpandSheet;

  const clearRouteGuide = useCallback(() => {
    routeRequestIdRef.current += 1;
    routeOptionsRef.current = null;
    setSelectedRouteId("0");
    setRouteGuide(null);
    setRoutePath([]);
    setRouteStops(null);
  }, []);

  const handleSelectRoute = useCallback(
    (id: string) => {
      const routeOptions = routeOptionsRef.current;
      if (!routeOptions) return;
      const opt = routeOptions.find((r) => r.id === id);
      if (!opt) return;
      setSelectedRouteId(id);
      setRoutePath([
        buildRoutePathFromOption(
          opt,
          routeGuide?.mode ?? "car",
          routeGuide?.mode === "walk" ? "#0d9488" : "#2563eb"
        )
      ]);
      setRouteGuide((prev) =>
        prev
          ? {
              ...prev,
              distanceM: opt.distanceM,
              durationSec: opt.durationSec,
              tollFare: opt.tollFare,
              selectedRouteId: id,
              showTrafficLegend:
                prev.mode === "car" && !opt.fallback && Boolean(opt.trafficChunks?.length)
            }
          : prev
      );
    },
    [routeGuide?.mode]
  );

  const handleBeginRoute = useCallback(() => {
    expandSheet?.();
    if (routeOriginPhase === "searching") return;
    clearRouteGuide();
    setRouteOriginPhase(routeOrigin ? "picked" : "searching");
  }, [clearRouteGuide, expandSheet, routeOrigin, routeOriginPhase]);

  const handlePickOrigin = useCallback(
    (place: RouteOriginPlace) => {
      setRouteOrigin(place);
      setRouteOriginPhase("picked");
      expandSheet?.();
    },
    [expandSheet]
  );

  const handleChangeOrigin = useCallback(() => {
    clearRouteGuide();
    setRouteOriginPhase("searching");
    expandSheet?.();
  }, [clearRouteGuide, expandSheet]);

  const handleDismissRoute = useCallback(() => {
    clearRouteGuide();
    setRouteOriginPhase("idle");
  }, [clearRouteGuide]);

  const applyDirectionsResult = useCallback(
    (
      result: Awaited<ReturnType<typeof fetchDirections>>,
      mode: RouteMode,
      stops: PlaceRouteDestination[]
    ) => {
      const routeOptions = result.routes?.length ? result.routes : [pickRouteOption(result)];
      const multi = routeOptions.length > 1 ? routeOptions : null;
      routeOptionsRef.current = multi;
      const primary = pickRouteOption(result, "0");
      setSelectedRouteId(primary.id);
      setRoutePath([
        buildRoutePathFromOption(primary, mode, mode === "walk" ? "#0d9488" : "#2563eb")
      ]);
      const showTrafficLegend =
        mode === "car" && !result.fallback && Boolean(primary.trafficChunks?.length);
      setRouteGuide({
        mode,
        loading: false,
        error: result.fallback ? "대략 경로예요. 정확한 안내는 카카오맵에서 시작하세요." : null,
        distanceM: primary.distanceM,
        durationSec: primary.durationSec,
        tollFare: primary.tollFare,
        routeOptions: multi,
        selectedRouteId: primary.id,
        onSelectRoute: handleSelectRoute,
        showTrafficLegend,
        onOpenKakao: () => openKakaoMapRoute(stops, mode),
        onClear: clearRouteGuide
      });
    },
    [clearRouteGuide, handleSelectRoute]
  );

  const handleStartRoute = useCallback(
    async (mode: RouteMode, destination: PlaceRouteDestination | null) => {
      if (!destination) return;
      if (!routeOrigin) {
        setRouteOriginPhase("searching");
        return;
      }

      const origin = {
        lat: routeOrigin.lat,
        lng: routeOrigin.lng,
        name: routeOrigin.name
      };
      const stops = [origin, destination];
      const requestId = ++routeRequestIdRef.current;
      setRouteStops(stops);
      setRouteGuide({
        mode,
        loading: true,
        error: null,
        distanceM: null,
        durationSec: null,
        onOpenKakao: () => openKakaoMapRoute(stops, mode),
        onClear: clearRouteGuide
      });

      try {
        const result = await fetchDirections({ origin, destination, mode });
        if (requestId !== routeRequestIdRef.current) return;
        applyDirectionsResult(result, mode, stops);
      } catch (e) {
        if (requestId !== routeRequestIdRef.current) return;
        routeOptionsRef.current = null;
        setSelectedRouteId("0");
        setRoutePath([{ points: stops, color: "#94a3b8", dashed: true }]);
        setRouteGuide({
          mode,
          loading: false,
          error:
            e instanceof Error
              ? `${e.message} 카카오맵으로 안내할 수 있어요.`
              : "경로 미리보기에 실패했어요. 카카오맵으로 안내할 수 있어요.",
          distanceM: null,
          durationSec: null,
          onOpenKakao: () => openKakaoMapRoute(stops, mode),
          onClear: clearRouteGuide
        });
      }
    },
    [applyDirectionsResult, clearRouteGuide, routeOrigin]
  );

  const placeRouteActive = routeOriginPhase !== "idle" || Boolean(routeGuide);

  return {
    routePath,
    routeGuide,
    routeStops,
    routeOrigin,
    routeOriginPhase,
    selectedRouteId,
    placeRouteActive,
    handleBeginRoute,
    handlePickOrigin,
    handleChangeOrigin,
    handleDismissRoute,
    handleStartRoute,
    clearRouteGuide,
    setRouteOriginPhase
  };
}
