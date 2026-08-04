import assert from "node:assert/strict";
import test from "node:test";
import {
  createBoundedBodyAccumulator,
  readBoundedRequestBody
} from "./read-bounded-request-body.ts";

test("bounded body accumulator rejects overflow before storing excess bytes", () => {
  const accumulator = createBoundedBodyAccumulator(5);

  assert.equal(accumulator.append(new TextEncoder().encode("123")), true);
  assert.equal(accumulator.append(new TextEncoder().encode("456")), false);
  assert.equal(accumulator.sizeBytes, 6);
  assert.equal(accumulator.getText(), "123");
});

test("readBoundedRequestBody reads within the limit", async () => {
  const request = new Request("https://example.test/api", {
    body: JSON.stringify({ message: "hi" }),
    method: "POST"
  });

  assert.deepEqual(await readBoundedRequestBody(request, 64), {
    ok: true,
    text: '{"message":"hi"}',
    sizeBytes: 16
  });
});

test("readBoundedRequestBody cancels once the body exceeds the limit", async () => {
  let cancelled = false;
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(new TextEncoder().encode("123"));
      controller.enqueue(new TextEncoder().encode("456"));
    },
    cancel() {
      cancelled = true;
    }
  });
  const request = new Request("https://example.test/api", {
    body: stream,
    duplex: "half",
    method: "POST"
  } as RequestInit);

  assert.deepEqual(await readBoundedRequestBody(request, 5), {
    ok: false,
    reason: "too_large",
    sizeBytes: 6
  });
  assert.equal(cancelled, true);
});

test("readBoundedRequestBody keeps the overflow result when cancel rejects", async () => {
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(new TextEncoder().encode("123"));
      controller.enqueue(new TextEncoder().encode("456"));
    },
    cancel() {
      throw new Error("cancel failed");
    }
  });
  const request = new Request("https://example.test/api", {
    body: stream,
    duplex: "half",
    method: "POST"
  } as RequestInit);

  assert.deepEqual(await readBoundedRequestBody(request, 5), {
    ok: false,
    reason: "too_large",
    sizeBytes: 6
  });
});
