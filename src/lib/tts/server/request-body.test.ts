import assert from "node:assert/strict";
import test from "node:test";
import {
  getTextToSpeechRequestBodySizeBytes,
  isTextToSpeechBodySizeAllowed,
  TTS_MAX_BODY_BYTES
} from "./request-body.ts";

test("TTS raw JSON body cap is safely above 4096 Korean UTF-8 characters", () => {
  const jsonBytes = new TextEncoder().encode(JSON.stringify({ text: "가".repeat(4096) }));

  assert.equal(jsonBytes.byteLength < TTS_MAX_BODY_BYTES, true);
  assert.equal(isTextToSpeechBodySizeAllowed(TTS_MAX_BODY_BYTES), true);
  assert.equal(isTextToSpeechBodySizeAllowed(TTS_MAX_BODY_BYTES + 1), false);
});

test("TTS request body size reads valid Content-Length only", () => {
  assert.equal(getTextToSpeechRequestBodySizeBytes(new Headers({ "content-length": "123" })), 123);
  assert.equal(getTextToSpeechRequestBodySizeBytes(new Headers()), null);
  assert.equal(getTextToSpeechRequestBodySizeBytes(new Headers({ "content-length": "-1" })), null);
  assert.equal(getTextToSpeechRequestBodySizeBytes(new Headers({ "content-length": "bad" })), null);
});
