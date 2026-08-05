import assert from "node:assert/strict";
import test from "node:test";
import { createTimeoutSignal } from "./timeout-signal.ts";

test("createTimeoutSignal combines caller abort with timeout abort", () => {
  const controller = new AbortController();
  const signal = createTimeoutSignal(60_000, controller.signal);

  assert.equal(signal.aborted, false);
  controller.abort();
  assert.equal(signal.aborted, true);
});

test("createTimeoutSignal returns an already aborted caller signal", () => {
  const controller = new AbortController();
  controller.abort();

  assert.equal(createTimeoutSignal(60_000, controller.signal), controller.signal);
});
