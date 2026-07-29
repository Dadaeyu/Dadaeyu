import { NextResponse } from "next/server";

const ALLOWED_IMAGE_HOSTS = new Set(["tong.visitkorea.or.kr"]);
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

export async function GET(request: Request) {
  const source = new URL(request.url).searchParams.get("src");
  if (!source) {
    return NextResponse.json({ message: "이미지 주소가 없습니다." }, { status: 400 });
  }

  let imageUrl: URL;
  try {
    imageUrl = new URL(source);
  } catch {
    return NextResponse.json({ message: "올바르지 않은 이미지 주소입니다." }, { status: 400 });
  }

  if (imageUrl.protocol !== "https:" || !ALLOWED_IMAGE_HOSTS.has(imageUrl.hostname)) {
    return NextResponse.json({ message: "허용되지 않은 이미지 주소입니다." }, { status: 403 });
  }

  try {
    const response = await fetch(imageUrl, {
      signal: AbortSignal.timeout(4_000),
      next: { revalidate: 86_400 }
    });
    const contentType = response.headers.get("content-type") ?? "";
    const contentLength = Number(response.headers.get("content-length") ?? 0);
    if (
      !response.ok ||
      !contentType.startsWith("image/") ||
      (contentLength > 0 && contentLength > MAX_IMAGE_BYTES) ||
      !response.body
    ) {
      return NextResponse.json({ message: "이미지를 불러올 수 없습니다." }, { status: 502 });
    }

    const imageBytes = await response.arrayBuffer();
    if (imageBytes.byteLength > MAX_IMAGE_BYTES) {
      return NextResponse.json({ message: "이미지 크기가 너무 큽니다." }, { status: 413 });
    }

    return new Response(imageBytes, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
        "X-Content-Type-Options": "nosniff"
      }
    });
  } catch {
    return NextResponse.json({ message: "이미지를 불러올 수 없습니다." }, { status: 502 });
  }
}
