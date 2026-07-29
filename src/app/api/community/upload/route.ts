import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const BUCKET = "postImg";

// 게시글 작성/수정 화면의 이미지·파일 첨부 업로드. tb_board.allow_image/allow_file 여부는
// 호출하는 쪽(글쓰기 화면)에서 board 설정을 보고 판단하고, 여긴 실제 스토리지 업로드만 담당한다.
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
    }

    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "파일이 없습니다." }, { status: 400 });
    }

    const ext = file.name.includes(".") ? file.name.split(".").pop() : "";
    const path = `${user.id}/${crypto.randomUUID()}${ext ? `.${ext}` : ""}`;

    const { error: uploadError } = await supabase.storage.from(BUCKET).upload(path, file);
    if (uploadError) throw uploadError;

    const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);

    return NextResponse.json({ url: data.publicUrl, name: file.name, size: file.size });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "업로드에 실패했습니다." },
      { status: 500 }
    );
  }
}
