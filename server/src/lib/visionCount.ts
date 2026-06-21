import { env } from "../env";

export interface ImageData {
  mediaType: string; // e.g. "image/jpeg"
  data: string; // base64, no prefix
}

export interface CountDenomination {
  color: string;
  value: number;
  ref?: ImageData; // face reference photo
  edge?: ImageData; // side/edge reference photo (key for counting stacks)
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
        "photo.\n\n" +
        "The COUNT photo may show chips either (a) spread out, where you see the " +
        "round faces, or (b) STACKED, where you see their colored edges from the " +
        "side. If stacked, count chips one at a time from top to bottom of each " +
        "stack, identifying each chip by its edge color and stripe/diamond " +
        "pattern and matching it to the reference chips. Count carefully and " +
        "include EVERY chip — do not estimate or round.\n\n" +
        'Respond with ONLY JSON: {"perColor":[{"color":"<color>",' +
        '"count":<integer>}]} including every listed color (0 if none). No prose.',
    },
  ];

  for (const d of params.denominations) {
    content.push({
      type: "text",
      text: `Reference — ${d.color} = $${d.value} (face then edge):`,
    });
    if (d.ref) {
      content.push({
        type: "image",
        source: { type: "base64", media_type: d.ref.mediaType, data: d.ref.data },
      });
    }
    if (d.edge) {
      content.push({
        type: "image",
        source: {
          type: "base64",
          media_type: d.edge.mediaType,
          data: d.edge.data,
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

/** Identify a single chip's color and printed value from a photo. */
export async function identifyChip(
  image: ImageData,
): Promise<{ color: string; value: number | null }> {
  if (!env.VISION_API_KEY) throw new VisionNotConfigured();

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": env.VISION_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: env.VISION_MODEL,
      max_tokens: 256,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text:
                "Identify this single poker chip. Return ONLY JSON: " +
                '{"color":"<short lowercase color name>","value":<integer ' +
                "dollar value printed on the chip, or null if unreadable>}. " +
                'Example: {"color":"red","value":5}. No prose.',
            },
            {
              type: "image",
              source: {
                type: "base64",
                media_type: image.mediaType,
                data: image.data,
              },
            },
          ],
        },
      ],
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`vision API ${res.status}: ${body}`);
  }
  const data: any = await res.json();
  const json = extractJson(data.content?.[0]?.text ?? "");
  const value =
    json.value === null || json.value === undefined ? null : Number(json.value);
  return {
    color: String(json.color ?? "").toLowerCase(),
    value: Number.isFinite(value as number) ? (value as number) : null,
  };
}
