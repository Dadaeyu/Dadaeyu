import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import manifest from "./manifest.ts";

const projectRoot = process.cwd();

async function readPngSize(relativePath: string) {
  const file = await readFile(path.join(projectRoot, relativePath));
  assert.equal(file.toString("ascii", 1, 4), "PNG");
  return {
    width: file.readUInt32BE(16),
    height: file.readUInt32BE(20)
  };
}

test("PWA 매니페스트는 설치에 필요한 앱 정보를 제공한다", () => {
  const value = manifest();

  assert.equal(value.name, "다대유 - 대전 무장애 여행");
  assert.equal(value.short_name, "다대유");
  assert.equal(value.start_url, "/");
  assert.equal(value.scope, "/");
  assert.equal(value.display, "standalone");
  assert.equal(value.prefer_related_applications, false);

  const iconSizes = new Set(value.icons?.map((icon) => icon.sizes));
  assert.equal(iconSizes.has("192x192"), true);
  assert.equal(iconSizes.has("512x512"), true);
  assert.equal(
    value.icons?.some((icon) => icon.purpose === "maskable"),
    true
  );
});

test("PWA 설치 아이콘은 매니페스트에 선언한 실제 크기와 일치한다", async () => {
  const expectedSizes = [
    ["public/icons/pwa-192x192.png", 192],
    ["public/icons/pwa-512x512.png", 512],
    ["public/icons/pwa-maskable-192x192.png", 192],
    ["public/icons/pwa-maskable-512x512.png", 512],
    ["public/icons/apple-touch-icon.png", 180],
    ["src/app/icon.png", 512],
    ["src/app/apple-icon.png", 180]
  ] as const;

  for (const [relativePath, expectedSize] of expectedSizes) {
    assert.deepEqual(await readPngSize(relativePath), {
      width: expectedSize,
      height: expectedSize
    });
  }
});

test("서비스 워커는 화면 문서와 API 응답을 저장하지 않고 오프라인 안내만 제공한다", async () => {
  const serviceWorker = await readFile(path.join(projectRoot, "public", "sw.js"), "utf8");
  const precacheBlock = serviceWorker.slice(
    serviceWorker.indexOf("const PRECACHE_URLS"),
    serviceWorker.indexOf("];", serviceWorker.indexOf("const PRECACHE_URLS")) + 2
  );
  const navigationBlock = serviceWorker.slice(
    serviceWorker.indexOf('if (request.mode === "navigate")'),
    serviceWorker.indexOf('if (url.pathname.startsWith("/api/")')
  );

  assert.doesNotMatch(precacheBlock, /manifest\.webmanifest/u);
  assert.match(serviceWorker, /request\.mode === "navigate"/u);
  assert.match(serviceWorker, /caches\.match\("\/offline\.html"\)/u);
  assert.match(serviceWorker, /url\.pathname\.startsWith\("\/api\/"\)/u);
  assert.doesNotMatch(navigationBlock, /cache\.put/u);
});
