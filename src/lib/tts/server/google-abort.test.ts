import assert from "node:assert/strict";
import test from "node:test";
import { withAbort } from "./abort.ts";

test("Google TTS abort wrapper rejects immediately when signal is already aborted", async () => {
  const controller = new AbortController();
  controller.abort();

  await assert.rejects(withAbort(Promise.resolve("ok"), controller.signal), {
    name: "AbortError"
  });
});
