import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, "../.env.local");
const env = Object.fromEntries(
  readFileSync(envPath, "utf8")
    .split("\n")
    .filter((l) => l && !l.startsWith("#"))
    .map((l) => l.split("=").map((s) => s.trim()))
);

const url = env.NEXT_PUBLIC_SUPABASE_URL;
const secretKey = env.SUPABASE_SECRET_KEY;

const supabase = createClient(url, secretKey);

// 기존 테이블 확인
const tables = ["places", "place_reviews", "courses", "community_posts", "users"];
for (const table of tables) {
  const { data, error } = await supabase.from(table).select("*").limit(1);
  console.log(`[${table}]`, error ? `ERROR: ${error.message}` : `OK (${data?.length ?? 0} rows sampled)`);
}
