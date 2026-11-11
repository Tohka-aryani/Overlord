/**
 * Optional live smoke: classify a sample MY ransomware-style title against LAN Ollama.
 * Exit 0 with { ok: true, result } on success; exit 0 with { ok: false, reason } if
 * host/model unreachable (so CI without LAN stays green); exit 1 only on unexpected throw.
 */
import "dotenv/config";
import { classifyEntity } from "../src/lib/ollama";

async function main() {
  const base =
    process.env.OLLAMA_BASE_URL?.replace(/\/$/, "") ||
    "http://192.168.100.140:11434";
  const model = process.env.OLLAMA_MODEL || "qwen2.5:14b";

  try {
    const tagsRes = await fetch(`${base}/api/tags`, {
      signal: AbortSignal.timeout(3000),
    });
    if (!tagsRes.ok) {
      console.log(
        JSON.stringify({
          ok: false,
          reason: `tags HTTP ${tagsRes.status}`,
          base,
          model,
        }),
      );
      return;
    }
    const tags = (await tagsRes.json()) as {
      models?: { name: string }[];
    };
    const names = (tags.models ?? []).map((m) => m.name);
    if (!names.includes(model) && !names.some((n) => n.startsWith(`${model}:`))) {
      console.log(
        JSON.stringify({
          ok: false,
          reason: `model not installed: ${model}`,
          available: names,
          base,
          model,
        }),
      );
      return;
    }
  } catch (err) {
    console.log(
      JSON.stringify({
        ok: false,
        reason: "ollama unreachable",
        error: err instanceof Error ? err.message : String(err),
        base,
        model,
      }),
    );
    return;
  }

  const result = await classifyEntity({
    title: "Maybank Malaysia claimed by LockBit ransomware group",
    body: "Victim listed on ransomware.live; country MY; finance sector.",
    country: "MY",
  });

  if (!result) {
    console.log(
      JSON.stringify({
        ok: false,
        reason: "classifyEntity returned null",
        base,
        model,
      }),
    );
    return;
  }

  console.log(JSON.stringify({ ok: true, base, model, result }, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
