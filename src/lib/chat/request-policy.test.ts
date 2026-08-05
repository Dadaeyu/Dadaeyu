import assert from "node:assert/strict";
import test from "node:test";
import {
  CHAT_MAX_BODY_BYTES,
  CHAT_MAX_MESSAGE_LENGTH,
  isAllowedChatOrigin,
  isChatBodySizeAllowed,
  isChatMessageLengthAllowed,
  isValidChatClassifierEnvelope,
  shouldIncludeChatDebug,
  stripChatDebugForPolicy
} from "./request-policy.ts";

test("chat debug is only exposed outside production with CHAT_DEBUG=true", () => {
  assert.equal(shouldIncludeChatDebug({ NODE_ENV: "production", CHAT_DEBUG: "true" }), false);
  assert.equal(shouldIncludeChatDebug({ NODE_ENV: "development", CHAT_DEBUG: "false" }), false);
  assert.equal(shouldIncludeChatDebug({ NODE_ENV: "test", CHAT_DEBUG: "true" }), true);

  assert.deepEqual(
    stripChatDebugForPolicy(
      { message: "ok", debug: { secret: true } },
      { NODE_ENV: "production", CHAT_DEBUG: "true" }
    ),
    { message: "ok" }
  );
});

test("chat body and message limits are bounded", () => {
  assert.equal(isChatBodySizeAllowed(CHAT_MAX_BODY_BYTES), true);
  assert.equal(isChatBodySizeAllowed(CHAT_MAX_BODY_BYTES + 1), false);
  assert.equal(isChatMessageLengthAllowed("가".repeat(CHAT_MAX_MESSAGE_LENGTH)), true);
  assert.equal(isChatMessageLengthAllowed("가".repeat(CHAT_MAX_MESSAGE_LENGTH + 1)), false);
});

test("chat origin policy allows request origin and configured additions only", () => {
  assert.equal(
    isAllowedChatOrigin({
      configuredOrigins: "https://admin.example.test",
      origin: "https://app.example.test",
      requestOrigin: "https://app.example.test"
    }),
    true
  );
  assert.equal(
    isAllowedChatOrigin({
      configuredOrigins: "https://admin.example.test",
      origin: "https://admin.example.test",
      requestOrigin: "https://app.example.test"
    }),
    true
  );
  assert.equal(
    isAllowedChatOrigin({
      configuredOrigins: "https://admin.example.test",
      origin: "https://evil.example.test",
      requestOrigin: "https://app.example.test"
    }),
    false
  );
});

test("chat origin policy treats localhost and IPv4 loopback as the same origin on one port", () => {
  assert.equal(
    isAllowedChatOrigin({
      configuredOrigins: undefined,
      origin: "http://127.0.0.1:3010",
      requestOrigin: "http://localhost:3010"
    }),
    true
  );
  assert.equal(
    isAllowedChatOrigin({
      configuredOrigins: undefined,
      origin: "http://localhost:3010",
      requestOrigin: "http://127.0.0.1:3010"
    }),
    true
  );
  assert.equal(
    isAllowedChatOrigin({
      configuredOrigins: undefined,
      origin: "http://127.0.0.1:3010",
      requestOrigin: "http://0.0.0.0:3010"
    }),
    true
  );
  assert.equal(
    isAllowedChatOrigin({
      configuredOrigins: undefined,
      origin: "http://127.0.0.1:3000",
      requestOrigin: "http://localhost:3010"
    }),
    false
  );
  assert.equal(
    isAllowedChatOrigin({
      configuredOrigins: undefined,
      origin: "http://127.0.0.1:3010",
      requestOrigin: "https://app.example.test"
    }),
    false
  );
});

test("classifier envelope rejects empty or partial JSON before fallback normalization", () => {
  assert.equal(isValidChatClassifierEnvelope({}), false);
  assert.equal(
    isValidChatClassifierEnvelope({
      in_scope: true,
      intent: "recommend_place"
    }),
    false
  );
  assert.equal(
    isValidChatClassifierEnvelope({
      in_scope: true,
      scope_reason: "대전 여행지 추천",
      intent: "recommend_place",
      accessibility_needs: ["mobility_access"],
      weather_sensitive: false,
      place_name: null,
      location: "대전",
      keywords: ["짧은 동선", "쉬운 설명"]
    }),
    true
  );
});
