import { NextResponse } from "next/server";
import { entityHref, modalities, specialties, useCases } from "@/lib/catalog";
import { entityKinds } from "@/lib/catalog-types";
import {
  answer,
  interpret,
  weakConfidence,
  withFilters,
  type ModelFilters,
} from "@/lib/assistant/engine";

const requests = new Map<string, { count: number; resetAt: number }>();
const windowMs = 60_000;
const maxPerWindow = 30;

function rateLimited(key: string) {
  const now = Date.now();
  const entry = requests.get(key);
  if (!entry || now > entry.resetAt) {
    requests.set(key, { count: 1, resetAt: now + windowMs });
    return false;
  }
  entry.count += 1;
  return entry.count > maxPerWindow;
}

/** Keeps only values that exist in the catalog's own vocabulary. */
function sanitize(filters: unknown): ModelFilters {
  if (!filters || typeof filters !== "object") return {};
  const raw = filters as Record<string, unknown>;
  const pick = (key: string, allowed: readonly string[]) => {
    const value = raw[key];
    if (!Array.isArray(value)) return undefined;
    const kept = value.filter(
      (item): item is string => typeof item === "string" && allowed.includes(item),
    );
    return kept.length > 0 ? kept : undefined;
  };

  return {
    specialties: pick("specialties", specialties),
    useCases: pick("useCases", useCases),
    modalities: pick("modalities", modalities),
    kinds: pick("kinds", entityKinds) as ModelFilters["kinds"],
  };
}

/**
 * Asks the configured model to restate an unclear question using the
 * catalog's vocabulary. The model never writes an answer and never sees
 * anything but the query text; its output is a filter set that is then run
 * through the same local retrieval as everything else.
 */
async function readQueryWithModel(query: string): Promise<ModelFilters> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) return {};

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 2500);

  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.OPENROUTER_MODEL || "openrouter/free",
        temperature: 0,
        messages: [
          {
            role: "system",
            content:
              "Map the user's question about medical extended reality onto the provided vocabulary. Reply with JSON only, using the exact strings given. Use empty arrays when nothing applies. Never invent values.",
          },
          {
            role: "user",
            content: JSON.stringify({
              question: query,
              specialties,
              useCases,
              modalities,
              kinds: entityKinds,
            }),
          },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) return {};
    const payload = await response.json();
    const content = payload?.choices?.[0]?.message?.content;
    if (typeof content !== "string") return {};
    return sanitize(JSON.parse(content));
  } catch {
    // No paid fallback and no retry: local results stand on their own.
    return {};
  } finally {
    clearTimeout(timeout);
  }
}

export async function POST(request: Request) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  if (rateLimited(ip)) {
    return NextResponse.json({ ok: false, message: "Too many requests." }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid JSON." }, { status: 400 });
  }

  const query = (body as { q?: unknown })?.q;
  if (typeof query !== "string" || query.trim().length === 0) {
    return NextResponse.json({ ok: false, message: "Ask a question." }, { status: 422 });
  }

  let interpretation = interpret(query.slice(0, 300));
  let assisted = false;

  if (interpretation.confidence < weakConfidence) {
    const filters = await readQueryWithModel(interpretation.query);
    if (Object.values(filters).some((value) => value && value.length > 0)) {
      interpretation = withFilters(interpretation, filters);
      assisted = true;
    }
  }

  const result = answer(interpretation);

  return NextResponse.json({
    ok: true,
    assisted,
    lead: result.lead,
    kind: result.kind,
    links: result.links,
    topics: result.topics.map((topic) => ({
      slug: topic.slug,
      name: topic.shortName,
    })),
    entities: result.entities.map((entity) => ({
      slug: entity.slug,
      href: entityHref(entity),
      name: entity.name,
      typeLabel: entity.typeLabel,
      summary: entity.summary,
    })),
  });
}
