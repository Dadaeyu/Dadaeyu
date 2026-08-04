import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const schema = readFileSync("supabase/schema-tts-usage.sql", "utf8");

test("TTS usage schema keeps finalize_tts_usage service-role only", () => {
  assert.match(schema, /create function public\.finalize_tts_usage\(p_reservation_token uuid\)/);
  assert.match(schema, /revoke all on function public\.finalize_tts_usage\(uuid\) from public;/);
  assert.match(
    schema,
    /grant execute on function public\.finalize_tts_usage\(uuid\) to service_role;/
  );
});

test("TTS usage finalize deletes reservation rows and retries are not_found", () => {
  assert.match(
    schema,
    /delete from public\.tts_usage_reservations[\s\S]+where reservation_token = p_reservation_token[\s\S]+returning true into v_deleted/
  );
  assert.match(schema, /return query select false, 'not_found';/);
  assert.doesNotMatch(schema, /return query select false, 'already_refunded';/);
  assert.doesNotMatch(schema, /set refunded_at/);
});

test("TTS usage refund deletes the locked reservation after decrement", () => {
  assert.match(
    schema,
    /update public\.tts_monthly_usage[\s\S]+usage_units = greatest\(usage_units - v_reservation\.usage_units, 0\)[\s\S]+delete from public\.tts_usage_reservations[\s\S]+where reservation_token = p_reservation_token;[\s\S]+return query select true, v_reservation\.usage_units, 'ok';/
  );
});

test("TTS usage schema purges legacy refunded rows and drops refunded_at storage", () => {
  assert.match(
    schema,
    /delete from public\.tts_usage_reservations\s+where refunded_at is not null;/
  );
  assert.match(schema, /alter table public\.tts_usage_reservations\s+drop column refunded_at;/);
});
