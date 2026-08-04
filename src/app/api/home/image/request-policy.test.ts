import assert from "node:assert/strict";
import test from "node:test";
import {
  MAX_IMAGE_BYTES,
  readHomeImageBody,
  validateHomeImageFinalUrl,
  validateHomeImageResponse,
  validateHomeImageSource
} from "./request-policy.ts";

test("홈 이미지 프록시는 HTTPS allowlist URL만 허용한다", () => {
  const allowed = validateHomeImageSource("https://tong.visitkorea.or.kr/image.jpg");

  assert.equal(allowed.ok, true);
  if (allowed.ok) assert.equal(allowed.url.hostname, "tong.visitkorea.or.kr");
  assert.deepEqual(validateHomeImageSource(null), {
    ok: false,
    message: "이미지 주소가 없습니다.",
    status: 400
  });
  assert.deepEqual(validateHomeImageSource("not a url"), {
    ok: false,
    message: "올바르지 않은 이미지 주소입니다.",
    status: 400
  });
  assert.deepEqual(validateHomeImageSource("http://tong.visitkorea.or.kr/image.jpg"), {
    ok: false,
    message: "허용되지 않은 이미지 주소입니다.",
    status: 403
  });
  assert.deepEqual(validateHomeImageSource("https://example.com/image.jpg"), {
    ok: false,
    message: "허용되지 않은 이미지 주소입니다.",
    status: 403
  });
});

test("홈 이미지 프록시는 redirect/final URL도 allowlist 안에 있어야 한다", () => {
  const originalUrl = new URL("https://tong.visitkorea.or.kr/image.jpg");

  assert.equal(validateHomeImageFinalUrl(originalUrl, originalUrl.href), null);
  assert.equal(
    validateHomeImageFinalUrl(originalUrl, "https://tong.visitkorea.or.kr/other.jpg"),
    null
  );
  assert.deepEqual(validateHomeImageFinalUrl(originalUrl, "https://example.com/image.jpg"), {
    message: "허용되지 않은 이미지 주소입니다.",
    status: 403
  });
  assert.deepEqual(validateHomeImageFinalUrl(originalUrl, "not a url"), {
    message: "이미지를 불러올 수 없습니다.",
    status: 502
  });
});

test("홈 이미지 프록시는 upstream content-type과 declared 8MB 제한을 검증한다", () => {
  assert.equal(
    validateHomeImageResponse({
      contentLength: MAX_IMAGE_BYTES,
      contentType: "image/jpeg; charset=binary",
      hasBody: true,
      ok: true
    }),
    null
  );
  assert.deepEqual(
    validateHomeImageResponse({
      contentLength: 100,
      contentType: "image/svg+xml",
      hasBody: true,
      ok: true
    }),
    { message: "이미지를 불러올 수 없습니다.", status: 502 }
  );
  assert.deepEqual(
    validateHomeImageResponse({
      contentLength: 100,
      contentType: "text/html",
      hasBody: true,
      ok: true
    }),
    { message: "이미지를 불러올 수 없습니다.", status: 502 }
  );
  assert.deepEqual(
    validateHomeImageResponse({
      contentLength: MAX_IMAGE_BYTES + 1,
      contentType: "image/png",
      hasBody: true,
      ok: true
    }),
    { message: "이미지를 불러올 수 없습니다.", status: 502 }
  );
});

test("홈 이미지 프록시는 stream을 8MB 한도 안에서만 결합한다", async () => {
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(new Uint8Array([1, 2]));
      controller.enqueue(new Uint8Array([3]));
      controller.close();
    }
  });

  const result = await readHomeImageBody(body, 3);

  assert.equal(result.ok, true);
  if (result.ok) assert.deepEqual(Array.from(new Uint8Array(result.bytes)), [1, 2, 3]);
  assert.equal(body.locked, false);
});

test("홈 이미지 프록시는 stream이 한도를 넘으면 reader를 취소하고 413을 반환한다", async () => {
  let cancelled = false;
  const body = new ReadableStream<Uint8Array>({
    cancel() {
      cancelled = true;
    },
    start(controller) {
      controller.enqueue(new Uint8Array([1, 2]));
      controller.enqueue(new Uint8Array([3, 4]));
    }
  });

  const result = await readHomeImageBody(body, 3);

  assert.deepEqual(result, { ok: false, message: "이미지 크기가 너무 큽니다.", status: 413 });
  assert.equal(cancelled, true);
  assert.equal(body.locked, false);
});
