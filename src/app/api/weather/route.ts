import { NextResponse } from "next/server";
import { fetchTourWeather } from "@/lib/tour-weather";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const location = url.searchParams.get("location")?.trim() || "대전";
  const weatherSensitive = url.searchParams.get("weatherSensitive") !== "false";
  const result = await fetchTourWeather({ location, weatherSensitive });

  return NextResponse.json({
    ok: result.status === "ready",
    ...result
  });
}
