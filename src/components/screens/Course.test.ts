import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const source = await readFile(new URL("./Course.tsx", import.meta.url), "utf8");

test("코스 보기 경로안내는 코스 지도에서 출발지 검색을 연다", () => {
  assert.match(source, /usePlaceRouteGuide/u);
  assert.match(source, /onBeginRoute=/u);
  assert.match(source, /!isEditing && coursePlaceDestination/u);
  assert.doesNotMatch(source, /buildPlaceRouteMapHref/u);
  assert.match(source, /placeRouteActive \? routePath/u);
  assert.match(source, /routeOrigin && placeRouteActive/u);
});

test("커뮤니티에서 연 코스 상세 뒤로가기는 그 게시글로 돌아간다", () => {
  assert.match(source, /parseCommunityPostReturnPath/u);
  assert.match(source, /communityReturnPath/u);
  assert.match(source, /router\.replace\(communityReturnPath\)/u);
});

test("코스 편집 장소 추가 검색에는 경로안내를 넘기지 않는다", () => {
  const placeSearchBlock = source.slice(
    source.indexOf("{placeSearchOpen ?"),
    source.indexOf(") : selectedSearchPlace ?")
  );
  assert.match(placeSearchBlock, /detailAction=\{addPlaceFromSearch\}/u);
  assert.doesNotMatch(placeSearchBlock, /onBeginRoute=/u);
});
