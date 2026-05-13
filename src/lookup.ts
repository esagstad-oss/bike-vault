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

// ── Geometry label → our key mapping ──

const GEO_LABELS: [keyof BikeGeometry, RegExp][] = [
  ["stack", /^stack/i],
  ["reach", /^reach/i],
  ["headTubeAngle", /^head\s*(?:tube)?\s*angle/i],
  ["seatTubeAngle", /^seat\s*(?:tube)?\s*angle/i],
  ["chainstay", /^chain\s*stay/i],
  ["wheelbase", /^wheel\s*base/i],
  ["bbDrop", /^(?:bb|bottom\s*bracket)\s*drop/i],
  ["headTubeLength", /^head\s*tube(?:\s*(?:length))?$/i],
  ["seatTubeLength", /^seat\s*tube(?:\s*(?:length|\(c-t\)))?$/i],
  ["topTubeLength", /^(?:effective\s*)?top\s*tube/i],
  ["trailMm", /^trail$/i],
];

function matchGeoKey(label: string): keyof BikeGeometry | null {
  const clean = label.replace(/\(.*?\)/g, "").replace(/\s+/g, " ").trim();
  for (const [key, re] of GEO_LABELS) {
    if (re.test(clean)) return key;
  }
  return null;
}

/** Result of parsing a multi-size geometry paste. */
export interface GeoPasteResult {
  sizes: string[];
  geometry: Record<string, BikeGeometry>;
}

/**
 * Parse a pasted geometry table.
 *
 * Handles two formats:
 * 1. **Tab-separated multi-size table** (99spokes / manufacturer sites):
 *    First row = size headers, subsequent rows = "Label\tval1\tval2\t..."
 * 2. **Simple key: value lines** (fallback):
 *    "Stack: 560", "Reach: 390", etc.
 */
export function parseGeometryTable(text: string): GeoPasteResult {
  const lines = text.split(/\n/).filter((l) => l.trim());
  if (lines.length === 0) return { sizes: [], geometry: {} };

  // Detect tab-separated table: if most lines have tabs
  const tabLines = lines.filter((l) => l.includes("\t"));
  if (tabLines.length >= 2) {
    return parseTabSeparatedGeo(lines);
  }

  // Fallback: simple "label: value" format → single-size result
  const geo = parseSimpleGeo(lines);
  if (Object.keys(geo).length > 0) {
    return { sizes: ["default"], geometry: { default: geo } };
  }
  return { sizes: [], geometry: {} };
}

function parseTabSeparatedGeo(lines: string[]): GeoPasteResult {
  // Find header row: the one where most cells are non-numeric (size names)
  // Typically the first row with tabs
  let headerIdx = 0;
  for (let i = 0; i < Math.min(3, lines.length); i++) {
    const cells = lines[i].split("\t");
    if (cells.length >= 2) {
      // Check if this row's data cells are mostly non-numeric → likely header
      const dataCells = cells.slice(1).filter((c) => c.trim());
      const numericCount = dataCells.filter((c) => /^\d/.test(c.trim())).length;
      if (numericCount < dataCells.length / 2) {
        headerIdx = i;
        break;
      }
    }
  }

  const headerCells = lines[headerIdx].split("\t");
  const sizes: string[] = [];
  for (let i = 1; i < headerCells.length; i++) {
    const s = headerCells[i].trim();
    if (s) sizes.push(s);
  }

  if (sizes.length === 0) {
    // Can't determine sizes — fall back to simple parse
    const geo = parseSimpleGeo(lines);
    return Object.keys(geo).length > 0
      ? { sizes: ["default"], geometry: { default: geo } }
      : { sizes: [], geometry: {} };
  }

  const geometry: Record<string, BikeGeometry> = {};
  for (const s of sizes) geometry[s] = {};

  for (let i = headerIdx + 1; i < lines.length; i++) {
    const cells = lines[i].split("\t");
    if (cells.length < 2) continue;
    const key = matchGeoKey(cells[0]);
    if (!key) continue;
    for (let j = 1; j < cells.length && j - 1 < sizes.length; j++) {
      const val = parseFloat(cells[j].replace(/[^\d.-]/g, ""));
      if (!isNaN(val)) geometry[sizes[j - 1]][key] = val;
    }
  }

  return { sizes, geometry };
}

function parseSimpleGeo(lines: string[]): BikeGeometry {
  const geo: BikeGeometry = {};
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
    // Handle tab-separated "Label\tValue" format
    const tabParts = trimmed.split("\t");
    if (tabParts.length === 2) {
      const label = tabParts[0].trim().toLowerCase();
      const value = tabParts[1].trim();
      for (const [key, regex] of patterns) {
        if (regex.test(label + ": x") || regex.test(tabParts[0].trim() + ": " + value)) {
          if (!spec[key]) spec[key] = value;
          break;
        }
      }
    }
    // Also try colon-separated
    for (const [key, regex] of patterns) {
      const match = trimmed.match(regex);
      if (match && !spec[key]) {
        spec[key] = match[1].trim();
      }
    }
  }

  return spec;
}
