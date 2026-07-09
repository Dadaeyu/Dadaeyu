import { supabase } from "@/lib/supabase";

export async function GET() {
  const { data, error } = await supabase
    .from("tb_area_code")
    .select("area_code, area_name")
    .order("area_code", { ascending: true });

  if (error) return Response.json({ error: error.message }, { status: 500 });

  return Response.json((data ?? []).map((a) => ({ code: a.area_code, name: a.area_name })));
}
