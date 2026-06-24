import { createClient } from "./client";
import type { DbCourse } from "./types";

export async function fetchMyCourses(userId: string): Promise<DbCourse[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("courses")
    .select("*")
    .eq("author_id", userId)
    .order("updated_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as DbCourse[];
}

export async function createCourse(
  userId: string,
  input: Pick<DbCourse, "title" | "description" | "duration_label" | "is_public">
): Promise<DbCourse> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("courses")
    .insert({ ...input, author_id: userId })
    .select()
    .single();

  if (error) throw error;
  return data as DbCourse;
}

export async function updateCourse(
  courseId: number,
  userId: string,
  patch: Partial<Pick<DbCourse, "title" | "description" | "duration_label" | "is_public">>
): Promise<DbCourse> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("courses")
    .update(patch)
    .eq("id", courseId)
    .eq("author_id", userId)
    .select()
    .single();

  if (error) throw error;
  return data as DbCourse;
}

export async function deleteCourse(courseId: number, userId: string) {
  const supabase = createClient();
  const { error } = await supabase
    .from("courses")
    .delete()
    .eq("id", courseId)
    .eq("author_id", userId);

  if (error) throw error;
}
