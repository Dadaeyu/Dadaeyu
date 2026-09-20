import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const source = await readFile(new URL("./usePlaceRouteGuide.ts", import.meta.url), "utf8");

test("장소 경로안내는 GPS origin 없이 고른 출발지로 길찾기를 한다", () => {
  assert.doesNotMatch(source, /name:\s*["']내 위치["']/u);
  assert.match(source, /handlePickOrigin/u);
  assert.match(source, /handleBeginRoute/u);
  assert.match(source, /if \(routeOriginPhase === "searching"\) return/u);
  assert.match(source, /fetchDirections\(\{ origin, destination, mode \}\)/u);
});
