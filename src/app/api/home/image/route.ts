import { NextResponse } from "next/server";
import {
  readHomeImageBody,
  validateHomeImageFinalUrl,
  validateHomeImageResponse,
  validateHomeImageSource
} from "./request-policy";

export async function GET(request: Request) {
  const source = new URL(request.url).searchParams.get("src");
  const sourceValidation = validateHomeImageSource(source);
  if (!sourceValidation.ok) {
    return NextResponse.json(
      { message: sourceValidation.message },
      { status: sourceValidation.status }
    );
  }

  try {
    const response = await fetch(sourceValidation.url, {
      redirect: "manual",
      signal: AbortSignal.timeout(4_000),
      next: { revalidate: 86_400 }
    });
    const finalUrlFailure = validateHomeImageFinalUrl(sourceValidation.url, response.url);
    if (finalUrlFailure) {
      return NextResponse.json(
        { message: finalUrlFailure.message },
        { status: finalUrlFailure.status }
      );
    }

    const contentType = response.headers.get("content-type") ?? "";
    const contentLength = Number(response.headers.get("content-length") ?? 0);
    const responseBody = response.body;
    const responseFailure = validateHomeImageResponse({
      contentLength,
      contentType,
      hasBody: Boolean(responseBody),
      ok: response.ok
    });
    if (responseFailure) {
      return NextResponse.json(
        { message: responseFailure.message },
        { status: responseFailure.status }
      );
    }
    if (!responseBody) {
      return NextResponse.json({ message: "이미지를 불러올 수 없습니다." }, { status: 502 });
    }

    const imageBody = await readHomeImageBody(responseBody);
    if (!imageBody.ok) {
      return NextResponse.json({ message: imageBody.message }, { status: imageBody.status });
    }

    return new Response(imageBody.bytes, {
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
