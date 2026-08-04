import assert from "node:assert/strict";
import test from "node:test";
import {
  getAdminSupabaseConfig,
  getPublicSupabaseConfig,
  getServerSupabaseConfig
} from "./config.ts";

const ENV_KEYS = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_URL",
  "SUPABASE_SECRET_KEY",
  "SUPABASE_SERVICE_ROLE_KEY"
] as const;

function withSupabaseEnv<T>(env: Partial<Record<(typeof ENV_KEYS)[number], string>>, run: () => T) {
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

test("public Supabase config는 기존 publishable/anon 계약을 유지한다", () => {
  withSupabaseEnv(
    {
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon",
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "publishable",
      NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co"
    },
    () => {
      assert.deepEqual(getPublicSupabaseConfig(), {
        isConfigured: true,
        key: "publishable",
        url: "https://example.supabase.co"
      });
    }
  );
});

test("server Supabase config는 public key만 있을 때 configured로 fallback하지 않는다", () => {
  withSupabaseEnv(
    {
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon",
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "publishable",
      NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co"
    },
    () => {
      assert.deepEqual(getServerSupabaseConfig(), {
        isConfigured: false,
        key: "",
        url: "https://example.supabase.co"
      });
    }
  );
});

test("server/admin Supabase config는 privileged key 계약을 유지한다", () => {
  withSupabaseEnv(
    {
      NEXT_PUBLIC_SUPABASE_URL: "https://public-url.supabase.co",
      SUPABASE_SERVICE_ROLE_KEY: "service-role",
      SUPABASE_URL: "https://server-url.supabase.co"
    },
    () => {
      assert.deepEqual(getServerSupabaseConfig(), {
        isConfigured: true,
        key: "service-role",
        url: "https://server-url.supabase.co"
      });
      assert.deepEqual(getAdminSupabaseConfig(), {
        isConfigured: true,
        key: "service-role",
        url: "https://server-url.supabase.co"
      });
    }
  );
});
