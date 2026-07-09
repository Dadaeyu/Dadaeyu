import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/supabase/require-admin";

export const dynamic = "force-dynamic";

const POST_TYPE_LABELS: Record<string, string> = {
  review: "리뷰",
  tip: "팁",
  share: "공유"
};

export async function GET(request: Request) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") ?? "").trim().toLowerCase();

  try {
    const supabase = createAdminClient();

    const { data: posts, error } = await supabase
      .from("tb_community_posts")
      .select(
        "id, title, post_type, like_count, comment_count, created_at, author_id, tb_members(nickname)"
      )
      .order("created_at", { ascending: false });

    if (error) throw error;

    let result = (posts ?? []).map((p) => {
      const author = p.tb_members as { nickname: string } | { nickname: string }[] | null;
      const nickname = Array.isArray(author) ? author[0]?.nickname : author?.nickname;

      return {
        id: p.id,
        title: p.title,
        post_type: p.post_type,
        post_type_label: POST_TYPE_LABELS[p.post_type] ?? p.post_type,
        author_nickname: nickname ?? "알 수 없음",
        author_id: p.author_id,
        like_count: p.like_count,
        comment_count: p.comment_count,
        created_at: p.created_at
      };
    });

    if (q) {
      result = result.filter(
        (p) => p.title.toLowerCase().includes(q) || p.author_nickname.toLowerCase().includes(q)
      );
    }

    return NextResponse.json({ posts: result });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to fetch posts" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const idParam = searchParams.get("id");

  if (!idParam) {
    return NextResponse.json({ error: "Missing post id" }, { status: 400 });
  }

  const id = Number(idParam);
  if (!Number.isFinite(id)) {
    return NextResponse.json({ error: "Invalid post id" }, { status: 400 });
  }

  try {
    const supabase = createAdminClient();
    const { error } = await supabase.from("tb_community_posts").delete().eq("id", id);

    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to delete post" },
      { status: 500 }
    );
  }
}
