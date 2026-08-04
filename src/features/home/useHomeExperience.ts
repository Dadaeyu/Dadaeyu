"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useMyLocation } from "@/hooks/useMyLocation";
import { updateUserPreferences } from "@/lib/supabase/member";
import {
  homeNeedIdsToStorageValues,
  resolveHomeNeedIds,
  type HomeDataResponse,
  type HomeNeedId,
  type RankedHomePlace
} from "@/features/home/homeData";

type HomeLoadState = "loading" | "ready" | "empty" | "error";
type HomeResponseState = {
  key: string;
  data: HomeDataResponse | null;
  loadState: Exclude<HomeLoadState, "loading">;
  loadError: string | null;
};

export function useHomeExperience() {
  const auth = useAuth();
  const [needSelection, setNeedSelection] = useState<{
    ownerId: string | null;
    needIds: HomeNeedId[];
  } | null>(null);
  const [query, setQuery] = useState("");
  const [committedQuery, setCommittedQuery] = useState("");
  const [responseState, setResponseState] = useState<HomeResponseState | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);
  const [selectedPlace, setSelectedPlace] = useState<RankedHomePlace | null>(null);
  const placeTriggerRef = useRef<HTMLElement | null>(null);
  const homeRequestRef = useRef<{
    key: string;
    controller: AbortController;
  } | null>(null);

  const location = useMyLocation();
  const ownerId = auth.user?.id ?? null;
  const savedNeedIds = useMemo(
    () => resolveHomeNeedIds(auth.preferences?.accessibility_needs),
    [auth.preferences?.accessibility_needs]
  );
  const selectedNeedIds = needSelection?.ownerId === ownerId ? needSelection.needIds : savedNeedIds;
  const locationLat = location.location ? Number(location.location.lat.toFixed(4)) : null;
  const locationLng = location.location ? Number(location.location.lng.toFixed(4)) : null;
  const selectedNeedKey = selectedNeedIds.join(",");
  const requestUrl = useMemo(() => {
    if (auth.loading) return null;
    const params = new URLSearchParams();
    if (committedQuery) params.set("q", committedQuery);
    if (selectedNeedKey) params.set("needs", selectedNeedKey);
    if (locationLat !== null && locationLng !== null) {
      params.set("lat", String(locationLat));
      params.set("lng", String(locationLng));
    }
    return `/api/home?${params.toString()}`;
  }, [auth.loading, committedQuery, selectedNeedKey, locationLat, locationLng]);
  const requestKey = requestUrl ? `${requestUrl}#${retryKey}` : null;

  useEffect(() => {
    if (!requestUrl || !requestKey) return;
    if (
      homeRequestRef.current?.key === requestKey &&
      !homeRequestRef.current.controller.signal.aborted
    ) {
      return;
    }

    homeRequestRef.current?.controller.abort();
    const controller = new AbortController();
    homeRequestRef.current = { key: requestKey, controller };

    fetch(requestUrl, { signal: controller.signal })
      .then(async (response) => {
        const body = (await response.json().catch(() => null)) as
          HomeDataResponse | { message?: string } | null;
        if (!response.ok || !body || !("places" in body)) {
          throw new Error(
            body && "message" in body && body.message
              ? body.message
              : "관광정보를 불러오지 못했습니다."
          );
        }
        if (homeRequestRef.current?.key !== requestKey) return;
        setResponseState({
          key: requestKey,
          data: body,
          loadState: body.places.length ? "ready" : "empty",
          loadError: null
        });
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        if (homeRequestRef.current?.key !== requestKey) return;
        setResponseState({
          key: requestKey,
          data: null,
          loadState: "error",
          loadError: error instanceof Error ? error.message : "관광정보를 불러오지 못했습니다."
        });
      });
  }, [requestKey, requestUrl]);

  useEffect(
    () => () => {
      homeRequestRef.current?.controller.abort();
    },
    []
  );

  const currentResponse = requestKey && responseState?.key === requestKey ? responseState : null;
  const data = currentResponse?.data ?? null;
  const loadState: HomeLoadState = requestKey
    ? (currentResponse?.loadState ?? "loading")
    : "loading";
  const loadError = currentResponse?.loadError ?? null;

  const toggleNeed = useCallback(
    (needId: HomeNeedId) => {
      setSaveError(null);
      setSaveMessage(null);
      setNeedSelection({
        ownerId,
        needIds: selectedNeedIds.includes(needId)
          ? selectedNeedIds.filter((currentNeedId) => currentNeedId !== needId)
          : [...selectedNeedIds, needId]
      });
    },
    [ownerId, selectedNeedIds]
  );

  const saveNeeds = useCallback(async () => {
    if (!auth.user) return;
    setSaving(true);
    setSaveError(null);
    setSaveMessage(null);
    try {
      await updateUserPreferences(auth.user.id, {
        accessibility_needs: homeNeedIdsToStorageValues(selectedNeedIds)
      });
      await auth.refreshMember();
      setSaveMessage("선택한 도움을 내 조건에 저장했습니다.");
    } catch {
      setSaveError("조건을 저장하지 못했습니다. 연결을 확인하고 다시 시도해 주세요.");
    } finally {
      setSaving(false);
    }
  }, [auth, selectedNeedIds]);

  const submitSearch = useCallback(() => {
    const nextQuery = query.trim();
    if (nextQuery === committedQuery) {
      setRetryKey((value) => value + 1);
      return;
    }
    setCommittedQuery(nextQuery);
  }, [committedQuery, query]);

  const clearSearch = useCallback(() => {
    setQuery("");
    if (!committedQuery) {
      setRetryKey((value) => value + 1);
      return;
    }
    setCommittedQuery("");
  }, [committedQuery]);

  const searchFor = useCallback(
    (value: string) => {
      const nextQuery = value.trim();
      setQuery(nextQuery);
      if (nextQuery === committedQuery) {
        setRetryKey((current) => current + 1);
        return;
      }
      setCommittedQuery(nextQuery);
    },
    [committedQuery]
  );

  const openPlace = useCallback((place: RankedHomePlace, trigger: HTMLElement) => {
    placeTriggerRef.current = trigger;
    setSelectedPlace(place);
  }, []);

  const closePlace = useCallback(() => {
    setSelectedPlace(null);
    window.requestAnimationFrame(() => {
      if (placeTriggerRef.current?.isConnected) placeTriggerRef.current.focus();
    });
  }, []);

  const hasSavedNeeds = Boolean(auth.preferences?.accessibility_needs?.length);
  const needsProfilePrompt =
    !auth.loading && !hasSavedNeeds && (!auth.user || Boolean(auth.member));

  return useMemo(
    () => ({
      auth,
      selectedNeedIds,
      toggleNeed,
      query,
      setQuery,
      committedQuery,
      submitSearch,
      searchFor,
      clearSearch,
      data,
      loadState,
      loadError,
      retry: () => {
        setRetryKey((value) => value + 1);
      },
      location,
      saving,
      saveNeeds,
      saveError,
      saveMessage,
      hasSavedNeeds,
      needsProfilePrompt,
      selectedPlace,
      openPlace,
      closePlace
    }),
    [
      auth,
      selectedNeedIds,
      toggleNeed,
      query,
      committedQuery,
      submitSearch,
      searchFor,
      clearSearch,
      data,
      loadState,
      loadError,
      location,
      saving,
      saveNeeds,
      saveError,
      saveMessage,
      hasSavedNeeds,
      needsProfilePrompt,
      selectedPlace,
      openPlace,
      closePlace
    ]
  );
}

export type HomeExperience = ReturnType<typeof useHomeExperience>;
