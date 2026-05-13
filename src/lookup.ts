import type { BikeGeometry, BikeSpec } from "./types";

// ── Bike Lookup Service ──
// Uses BikeIndex.org (free, open API, no auth) for bike search.
// Geometry and specs are entered manually or via paste-to-parse.

export interface LookupResult {
  brand: string;
  model: string;
  year?: number;
  colors?: string;
  specUrl: string;
  imageUrl?: string;
}

const BIKEINDEX_API = "https://bikeindex.org/api/v3";

/**
 * Search for bikes by brand and model name via BikeIndex.org.
 */
export async function searchBikes(query: string): Promise<LookupResult[]> {
  if (!query || query.length < 2) return [];

  const url = `${BIKEINDEX_API}/search?page=1&per_page=15&query=${encodeURIComponent(query)}&stolenness=non`;
  const res = await fetch(url);
  if (!res.ok) return [];

  const data = await res.json();
  const seen = new Set<string>();

  return (data.bikes ?? [])
    .map((bike: Record<string, unknown>) => {
      const brand = (bike.manufacturer_name as string) ?? "";
      const model = (bike.frame_model as string) ?? "";
      const year = bike.year as number | undefined;
      const colors = Array.isArray(bike.frame_colors)
        ? (bike.frame_colors as string[]).join(", ")
        : undefined;
      const imageUrl = (bike.large_img as string) || (bike.thumb as string) || undefined;

      // Deduplicate by brand+model+year
      const key = `${brand}|${model}|${year ?? ""}`.toLowerCase();
      if (seen.has(key)) return null;
      seen.add(key);

      return {
        brand,
        model,
        year,
        colors,
        specUrl: "",
        imageUrl,
      } as LookupResult;
    })
    .filter(Boolean) as LookupResult[];
}

// ── Fallback: parse geometry from a pasted spec table ──
// Users can paste a geometry table (e.g. from a manufacturer site) and we parse it.

export function parseGeometryTable(text: string): BikeGeometry {
  const geo: BikeGeometry = {};
  const lines = text.split(/\n/);

  const patterns: [keyof BikeGeometry, RegExp][] = [
    ["stack", /stack[:\s]+(\d+(?:\.\d+)?)/i],
    ["reach", /reach[:\s]+(\d+(?:\.\d+)?)/i],
    ["headTubeAngle", /head\s*(?:tube)?\s*angle[:\s]+(\d+(?:\.\d+)?)/i],
    ["seatTubeAngle", /seat\s*(?:tube)?\s*angle[:\s]+(\d+(?:\.\d+)?)/i],
    ["chainstay", /chain\s*stay[:\s]+(\d+(?:\.\d+)?)/i],
    ["wheelbase", /wheel\s*base[:\s]+(\d+(?:\.\d+)?)/i],
    ["bbDrop", /bb\s*drop[:\s]+(\d+(?:\.\d+)?)/i],
    ["headTubeLength", /head\s*tube(?:\s*length)?[:\s]+(\d+(?:\.\d+)?)/i],
    ["seatTubeLength", /seat\s*tube(?:\s*length)?[:\s]+(\d+(?:\.\d+)?)/i],
    ["topTubeLength", /(?:effective\s*)?top\s*tube[:\s]+(\d+(?:\.\d+)?)/i],
    ["trailMm", /trail[:\s]+(\d+(?:\.\d+)?)/i],
  ];

  for (const line of lines) {
    for (const [key, regex] of patterns) {
      const match = line.match(regex);
      if (match && !geo[key]) {
        geo[key] = parseFloat(match[1]);
      }
    }
  }

  return geo;
}

// ── Parse specs from a pasted spec list ──

export function parseSpecsText(text: string): BikeSpec {
  const spec: BikeSpec = {};
  const lines = text.split(/\n/);

  const patterns: [keyof BikeSpec, RegExp][] = [
    ["frame", /^frame[:\s]+(.+)/i],
    ["fork", /^fork[:\s]+(.+)/i],
    ["groupset", /^group\s*set[:\s]+(.+)/i],
    ["shifters", /^shifters?[:\s]+(.+)/i],
    ["frontDerailleur", /^front\s*derailleur[:\s]+(.+)/i],
    ["rearDerailleur", /^rear\s*derailleur[:\s]+(.+)/i],
    ["crankset", /^crank(?:set)?[:\s]+(.+)/i],
    ["cassette", /^cassette[:\s]+(.+)/i],
    ["chain", /^chain[:\s]+(.+)/i],
    ["brakes", /^brakes?[:\s]+(.+)/i],
    ["wheels", /^wheels?[:\s]+(.+)/i],
    ["tires", /^tires?[:\s]+(.+)/i],
    ["handlebar", /^handle\s*bar[:\s]+(.+)/i],
    ["stem", /^stem[:\s]+(.+)/i],
    ["seatpost", /^seat\s*post[:\s]+(.+)/i],
    ["saddle", /^saddle[:\s]+(.+)/i],
    ["weight", /^weight[:\s]+(.+)/i],
  ];

  for (const line of lines) {
    const trimmed = line.trim();
    for (const [key, regex] of patterns) {
      const match = trimmed.match(regex);
      if (match && !spec[key]) {
        spec[key] = match[1].trim();
      }
    }
  }

  return spec;
}
