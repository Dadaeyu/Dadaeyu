#!/usr/bin/env node

import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const DEFAULT_MODEL = "text-embedding-3-small";
const DEFAULT_DIMENSIONS = 1536;
const DEFAULT_LIMIT = 100;

function loadEnv(filePath = ".env.local") {
  const fullPath = resolve(process.cwd(), filePath);
  if (!existsSync(fullPath)) return;

  const contents = readFileSync(fullPath, "utf8");
  for (const line of contents.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const index = trimmed.indexOf("=");
    if (index === -1) continue;

    const key = trimmed.slice(0, index).trim();
    const value = trimmed.slice(index + 1).trim().replace(/^['"]|['"]$/g, "");
    if (key && process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

function parseArgs(argv) {
  const args = {
    dryRun: true,
    limit: DEFAULT_LIMIT
  };

  for (const item of argv) {
    if (item === "--write") {
      args.dryRun = false;
    } else if (item === "--dry-run") {
      args.dryRun = true;
    } else if (item.startsWith("--limit=")) {
      args.limit = Number(item.split("=", 2)[1]);
    }
  }

  if (!Number.isInteger(args.limit) || args.limit < 1) {
    throw new Error("--limit must be a positive integer.");
  }

  return args;
}

function normalizeSupabaseRestUrl(rawUrl) {
  if (!rawUrl) return "";

  try {
    const parsed = new URL(rawUrl);
    return rawUrl.includes("/rest/v1")
      ? rawUrl.replace(/\/$/, "")
      : `${parsed.origin}/rest/v1`;
  } catch {
    return "";
  }
}

function getSupabaseConfig() {
  const rawUrl =
    process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const key =
    process.env.SUPABASE_SECRET_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    "";

  return {
    key: key.trim(),
    schema: (process.env.SUPABASE_SCHEMA || "chatbot").trim(),
    table: (process.env.SUPABASE_CHAT_TABLE || "chunks").trim(),
    url: normalizeSupabaseRestUrl(rawUrl.trim())
  };
}

function getEmbeddingConfig() {
  return {
    apiKey: (process.env.OPENAI_API_KEY || process.env.EMBEDDING_API_KEY || "").trim(),
    dimensions: Number(process.env.EMBEDDING_DIMENSIONS || DEFAULT_DIMENSIONS),
    model: (process.env.EMBEDDING_MODEL || DEFAULT_MODEL).trim()
  };
}

function getSupabaseHeaders(config, extra = {}) {
  return {
    apikey: config.key,
    Authorization: `Bearer ${config.key}`,
    "Content-Type": "application/json",
    "Accept-Profile": config.schema,
    "Content-Profile": config.schema,
    ...extra
  };
}

async function supabaseRequest(config, path, options = {}) {
  const response = await fetch(`${config.url}${path}`, {
    ...options,
    headers: getSupabaseHeaders(config, options.headers)
  });

  if (!response.ok) {
    const text = await response.text();
    if (text.includes("chunks.embedding") || text.includes("'embedding' column")) {
      throw new Error(
        "chatbot.chunks.embedding column is not ready. Run scripts/chatbot/sql/setup-pgvector-openai-1536.sql in Supabase SQL Editor before embedding."
      );
    }
    throw new Error(
      `Supabase request failed (${response.status}): ${text.slice(0, 500)}`
    );
  }

  if (response.status === 204) return null;
  const text = await response.text();
  return text ? JSON.parse(text) : null;
}

async function fetchChunks(config, limit) {
  const params = new URLSearchParams({
    select: "id,content,metadata",
    limit: String(limit),
    embedding: "is.null"
  });

  return supabaseRequest(
    config,
    `/${encodeURIComponent(config.table)}?${params.toString()}`,
    { method: "GET" }
  );
}

async function createEmbeddings({ apiKey, dimensions, model }, inputs) {
  const response = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model,
      input: inputs,
      dimensions
    })
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`OpenAI embeddings failed (${response.status}): ${text}`);
  }

  const data = await response.json();
  return data.data
    .sort((a, b) => a.index - b.index)
    .map((item) => item.embedding);
}

async function updateChunkEmbedding(config, id, embedding) {
  await supabaseRequest(
    config,
    `/${encodeURIComponent(config.table)}?id=eq.${encodeURIComponent(id)}`,
    {
      method: "PATCH",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({ embedding })
    }
  );
}

async function main() {
  loadEnv();
  const args = parseArgs(process.argv.slice(2));
  const supabase = getSupabaseConfig();
  const embedding = getEmbeddingConfig();

  if (!supabase.url || !supabase.key || !supabase.schema || !supabase.table) {
    throw new Error("Supabase environment variables are missing.");
  }

  const chunks = await fetchChunks(supabase, args.limit);
  if (!Array.isArray(chunks)) {
    throw new Error("Supabase chunks response was not an array.");
  }

  if (args.dryRun) {
    console.log(
      JSON.stringify(
        {
          mode: "dry-run",
          count: chunks.length,
          message:
            "Embedding API was not called. Run the SQL first, then use --write with OPENAI_API_KEY only when paid embedding is approved.",
          preview: chunks.slice(0, 3).map((chunk) => ({
            id: chunk.id,
            title: chunk.metadata?.title,
            content: String(chunk.content || "").slice(0, 180)
          }))
        },
        null,
        2
      )
    );
    return;
  }

  if (!embedding.apiKey) {
    throw new Error("OPENAI_API_KEY or EMBEDDING_API_KEY is missing.");
  }
  if (!Number.isInteger(embedding.dimensions) || embedding.dimensions < 1) {
    throw new Error("EMBEDDING_DIMENSIONS must be a positive integer.");
  }

  const embeddings = await createEmbeddings(
    embedding,
    chunks.map((chunk) => chunk.content)
  );

  for (const [index, chunk] of chunks.entries()) {
    await updateChunkEmbedding(supabase, chunk.id, embeddings[index]);
  }

  console.log(
    JSON.stringify(
      {
        mode: "write",
        count: chunks.length,
        model: embedding.model,
        dimensions: embedding.dimensions,
        message: "Chunk embeddings were stored in Supabase."
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
