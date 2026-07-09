/**
 * 테이블명 tb_ 접두사 일괄 치환 (1회성 스크립트)
 */
import { readFileSync, writeFileSync, readdirSync } from "fs";
import { join, relative } from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

const sqlReplacements = [
  ["public.community_comments", "public.tb_community_comments"],
  ["public.community_posts", "public.tb_community_posts"],
  ["public.course_day_places", "public.tb_course_day_places"],
  ["public.course_days", "public.tb_course_days"],
  ["public.place_reviews", "public.tb_place_reviews"],
  ["public.place_reports", "public.tb_place_reports"],
  ["public.user_preferences", "public.tb_user_preferences"],
  ["public.user_favorites", "public.tb_user_favorites"],
  ["public.user_point_events", "public.tb_user_point_events"],
  ["public.admin_monthly_signups", "public.tb_admin_monthly_signups"],
  ["public.post_likes", "public.tb_post_likes"],
  ["public.members", "public.tb_members"],
  ["public.courses", "public.tb_courses"],
  ["public.places", "public.tb_places"],
];

const codeReplacements = [
  ['"community_comments"', '"tb_community_comments"'],
  ['"community_posts"', '"tb_community_posts"'],
  ['"course_day_places"', '"tb_course_day_places"'],
  ['"course_days"', '"tb_course_days"'],
  ['"place_reviews"', '"tb_place_reviews"'],
  ['"place_reports"', '"tb_place_reports"'],
  ['"user_preferences"', '"tb_user_preferences"'],
  ['"user_favorites"', '"tb_user_favorites"'],
  ['"user_point_events"', '"tb_user_point_events"'],
  ['"admin_monthly_signups"', '"tb_admin_monthly_signups"'],
  ['"post_likes"', '"tb_post_likes"'],
  ['"members"', '"tb_members"'],
  ['"courses"', '"tb_courses"'],
  ['"places"', '"tb_places"'],
  ["'community_comments'", "'tb_community_comments'"],
  ["'community_posts'", "'tb_community_posts'"],
  ["'place_reviews'", "'tb_place_reviews'"],
  ["'place_reports'", "'tb_place_reports'"],
  ["'user_preferences'", "'tb_user_preferences'"],
  ["'user_favorites'", "'tb_user_favorites'"],
  ["'members'", "'tb_members'"],
  ["'courses'", "'tb_courses'"],
  ["'places'", "'tb_places'"],
];

function walk(dir, out = []) {
  for (const ent of readdirSync(dir, { withFileTypes: true })) {
    if (ent.name === "node_modules" || ent.name === ".next" || ent.name === ".git") continue;
    const p = join(dir, ent.name);
    if (ent.isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

function apply(content, reps) {
  let out = content;
  for (const [from, to] of reps) out = out.split(from).join(to);
  return out;
}

const targets = [
  ...walk(join(root, "supabase")).filter((f) => f.endsWith(".sql")),
  ...walk(join(root, "src")).filter((f) => /\.(ts|tsx)$/.test(f)),
  ...walk(join(root, "scripts")).filter((f) => f.endsWith(".mjs")),
].filter((f) => !f.endsWith("rename-tables-tb.mjs"));

let changed = 0;
for (const file of targets) {
  const orig = readFileSync(file, "utf8");
  const isSql = file.endsWith(".sql");
  const next = apply(orig, isSql ? sqlReplacements : codeReplacements);
  if (next !== orig) {
    writeFileSync(file, next);
    changed++;
    console.log("updated", relative(root, file));
  }
}
console.log("done", changed, "files");
