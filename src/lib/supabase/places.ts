import { createClient } from "./server";
import { PLACES as FALLBACK_PLACES, type Place, type PlaceDetail, type Review } from "@/data/placesData";
import type { DbPlace, DbPlaceReview } from "./types";

function toPlace(row: DbPlace): Place {
  const fallback = FALLBACK_PLACES.find((p) => p.id === row.id);
  return {
    id: row.id,
    name: row.name,
    lat: Number(row.lat) || fallback?.lat || 36.3504,
    lng: Number(row.lng) || fallback?.lng || 127.3845,
    cx: Number(row.cx),
    cy: Number(row.cy),
    color: row.color,
    bg: row.bg,
    category: row.category,
    rating: Number(row.rating),
    accessibility: row.accessibility ?? [],
    distance: row.distance ?? "",
    emoji: row.emoji ?? "",
    hot: row.hot,
  };
}

function toPlaceDetail(row: DbPlace, reviews: DbPlaceReview[]): PlaceDetail {
  return {
    description: row.description ?? "",
    tags: row.tags ?? [],
    address: row.address ?? "",
    hours: row.hours ?? "",
    phone: row.phone ?? "",
    reviews: reviews.map(
      (r): Review => ({
        id: r.id,
        user: r.user_name,
        rating: r.rating,
        content: r.content,
        date: r.review_date,
      })
    ),
  };
}

export async function fetchPlacesFromDb(): Promise<{
  places: Place[];
  details: Record<number, PlaceDetail>;
} | null> {
  try {
    const supabase = await createClient();

    const { data: placeRows, error: placesError } = await supabase
      .from("places")
      .select("*")
      .order("id");

    if (placesError || !placeRows?.length) return null;

    const { data: reviewRows, error: reviewsError } = await supabase
      .from("place_reviews")
      .select("*")
      .order("id");

    if (reviewsError) return null;

    const reviewsByPlace = (reviewRows as DbPlaceReview[]).reduce<
      Record<number, DbPlaceReview[]>
    >((acc, review) => {
      (acc[review.place_id] ??= []).push(review);
      return acc;
    }, {});

    const places = (placeRows as DbPlace[]).map(toPlace);
    const details = Object.fromEntries(
      (placeRows as DbPlace[]).map((row) => [
        row.id,
        toPlaceDetail(row, reviewsByPlace[row.id] ?? []),
      ])
    );

    return { places, details };
  } catch {
    return null;
  }
}
