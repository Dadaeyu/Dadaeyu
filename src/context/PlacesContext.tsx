"use client";

import { createContext, useContext, type ReactNode } from "react";
import {
  PLACES as FALLBACK_PLACES,
  PLACE_DETAILS as FALLBACK_DETAILS,
  type Place,
  type PlaceDetail,
} from "@/data/placesData";

interface PlacesContextValue {
  places: Place[];
  placeDetails: Record<number, PlaceDetail>;
  fromDb: boolean;
}

const PlacesContext = createContext<PlacesContextValue>({
  places: FALLBACK_PLACES,
  placeDetails: FALLBACK_DETAILS,
  fromDb: false,
});

export function PlacesProvider({
  children,
  initialPlaces,
  initialDetails,
  fromDb = false,
}: {
  children: ReactNode;
  initialPlaces?: Place[];
  initialDetails?: Record<number, PlaceDetail>;
  fromDb?: boolean;
}) {
  return (
    <PlacesContext.Provider
      value={{
        places: initialPlaces ?? FALLBACK_PLACES,
        placeDetails: initialDetails ?? FALLBACK_DETAILS,
        fromDb,
      }}
    >
      {children}
    </PlacesContext.Provider>
  );
}

export function usePlaces() {
  return useContext(PlacesContext);
}
