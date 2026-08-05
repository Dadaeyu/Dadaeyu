import assert from "node:assert/strict";
import test from "node:test";
import {
  fetchTourWeather,
  KMA_TOUR_WEATHER_TIMEOUT_MS,
  type TourWeatherRuntime
} from "./tour-weather.ts";

const ENV_KEYS = [
  "KMA_TOUR_WEATHER_SERVICE_KEY",
  "TOUR_WEATHER_SERVICE_KEY",
  "TOUR_API_SERVICE_KEY",
  "KMA_TOUR_WEATHER_CITY_AREA_ID",
  "KMA_TOUR_WEATHER_ENABLED"
] as const;

function withTourWeatherEnv<T>(
  env: Partial<Record<(typeof ENV_KEYS)[number], string>>,
  run: () => T
) {
  const previous = new Map(ENV_KEYS.map((key) => [key, process.env[key]]));
  for (const key of ENV_KEYS) delete process.env[key];
  Object.assign(process.env, env);

  try {
    return run();
  } finally {
    for (const key of ENV_KEYS) {
      const value = previous.get(key);
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  }
}

test("기상청 관광 날씨 fetch는 bounded timeout signal을 전달한다", async () => {
  await withTourWeatherEnv({ KMA_TOUR_WEATHER_SERVICE_KEY: "service-key" }, async () => {
    const signal = new AbortController().signal;
    const runtime: TourWeatherRuntime = {
      createTimeoutSignal(timeoutMs) {
        assert.equal(timeoutMs, KMA_TOUR_WEATHER_TIMEOUT_MS);
        return signal;
      },
      async fetch(_url, init) {
        assert.equal(init.signal, signal);
        return new Response(
          JSON.stringify({
            response: {
              body: {
                items: {
                  item: [
                    {
                      cityName: "대전",
                      kmaTci: "70",
                      tciGrade: "좋음",
                      tm: "2026073109"
                    }
                  ]
                }
              },
              header: { resultCode: "00" }
            }
          }),
          { headers: { "content-type": "application/json" } }
        );
      }
    };

    const result = await fetchTourWeather({}, runtime);

    assert.equal(result.status, "ready");
    assert.equal(result.items.length, 1);
  });
});

test("기상청 관광 날씨 timeout/abort 실패는 unavailable degradation을 유지한다", async () => {
  await withTourWeatherEnv({ KMA_TOUR_WEATHER_SERVICE_KEY: "service-key" }, async () => {
    const runtime: TourWeatherRuntime = {
      createTimeoutSignal: () => new AbortController().signal,
      fetch: async () => {
        throw new DOMException("The operation was aborted.", "AbortError");
      },
      timeoutMs: 10
    };

    const result = await fetchTourWeather({}, runtime);

    assert.equal(result.status, "unavailable");
    assert.equal(result.message, "기상청 관광 날씨 API 연결 실패");
  });
});
