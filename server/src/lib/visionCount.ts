import { env } from "../env";

export interface ImageData {
  mediaType: string; // e.g. "image/jpeg"
  data: string; // base64, no prefix
}

export interface CountDenomination {
  color: string;
  value: number;
  ref?: ImageData; // reference photo of this chip color
}

export interface PerColor {
  color: string;
  count: number;
  value: number;
  subtotal: number;
}

export interface CountResult {
  perColor: PerColor[];
  total: number;
}

export class VisionNotConfigured extends Error {}

function extractJson(text: string): any {
  const fenced = text.replace(/```json|```/g, "");
  const start = fenced.indexOf("{");
  const end = fenced.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("no JSON in vision response");
  return JSON.parse(fenced.slice(start, end + 1));
}

/**
 * Ask the vision model to count chips of each color in the count photo, using the
 * per-color reference photos. Returns per-color counts + computed total.
 */
export async function countChips(params: {
  countImage: ImageData;
  denominations: CountDenomination[];
}): Promise<CountResult> {
  if (!env.VISION_API_KEY) throw new VisionNotConfigured();

  const content: any[] = [
    {
      type: "text",
      text:
        "You count poker chips for a home cash game. Below are reference photos, " +
        "each labeled with its chip color and dollar value, followed by a COUNT " +
        "photo. Count how many chips of EACH listed color appear in the COUNT " +
        'photo. Respond with ONLY JSON: {"perColor":[{"color":"<color>",' +
        '"count":<integer>}]} including every listed color (0 if none). No prose.',
    },
  ];

  for (const d of params.denominations) {
    content.push({ type: "text", text: `Reference — ${d.color} = $${d.value}:` });
    if (d.ref) {
      content.push({
        type: "image",
        source: {
          type: "base64",
          media_type: d.ref.mediaType,
          data: d.ref.data,
        },
      });
    }
  }

  content.push({ type: "text", text: "COUNT photo:" });
  content.push({
    type: "image",
    source: {
      type: "base64",
      media_type: params.countImage.mediaType,
      data: params.countImage.data,
    },
  });
  content.push({
    type: "text",
    text: `Colors to report: ${params.denominations
      .map((d) => d.color)
      .join(", ")}. Return only JSON.`,
  });

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": env.VISION_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: env.VISION_MODEL,
      max_tokens: 1024,
      messages: [{ role: "user", content }],
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`vision API ${res.status}: ${body}`);
  }

  const data: any = await res.json();
  const text: string = data.content?.[0]?.text ?? "";
  const json = extractJson(text);

  const counts: Record<string, number> = {};
  for (const pc of json.perColor ?? []) {
    counts[String(pc.color).toLowerCase()] = Math.max(0, Number(pc.count) || 0);
  }

  const perColor: PerColor[] = params.denominations.map((d) => {
    const count = counts[d.color.toLowerCase()] ?? 0;
    return { color: d.color, count, value: d.value, subtotal: count * d.value };
  });
  const total = perColor.reduce((a, p) => a + p.subtotal, 0);
  return { perColor, total };
}
