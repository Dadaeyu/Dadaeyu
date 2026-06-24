import { createClient } from "./client";
import type { DbUserFavorite, FavoriteTargetType } from "./types";

export async function fetchFavorites(
  userId: string,
  targetType?: FavoriteTargetType
): Promise<DbUserFavorite[]> {
  const supabase = createClient();
  let query = supabase
    .from("user_favorites")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (targetType) {
    query = query.eq("target_type", targetType);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as DbUserFavorite[];
}

export async function isFavorited(
  userId: string,
  targetType: FavoriteTargetType,
  targetId: number
): Promise<boolean> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("user_favorites")
    .select("id")
    .eq("user_id", userId)
    .eq("target_type", targetType)
    .eq("target_id", targetId)
    .maybeSingle();

  if (error) throw error;
  return !!data;
}

export async function toggleFavorite(
  userId: string,
  targetType: FavoriteTargetType,
  targetId: number
): Promise<boolean> {
  const supabase = createClient();
  const existing = await isFavorited(userId, targetType, targetId);

  if (existing) {
    const { error } = await supabase
      .from("user_favorites")
      .delete()
      .eq("user_id", userId)
      .eq("target_type", targetType)
      .eq("target_id", targetId);
    if (error) throw error;
    return false;
  }

  const { error } = await supabase.from("user_favorites").insert({
    user_id: userId,
    target_type: targetType,
    target_id: targetId,
  });
  if (error) throw error;
  return true;
}
