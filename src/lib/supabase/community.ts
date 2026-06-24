import { createClient } from "./client";
import type { DbCommunityPost } from "./types";

export async function fetchMyPosts(userId: string): Promise<DbCommunityPost[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("community_posts")
    .select("*")
    .eq("author_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as DbCommunityPost[];
}
