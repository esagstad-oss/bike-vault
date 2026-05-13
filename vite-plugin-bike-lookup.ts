// ── Vite plugin: Bike spec lookup API ──
// Proxies search and detail requests to 99spokes.com, parsing HTML into
// structured JSON so the browser never hits CORS issues.
// Only active during `vite dev`; for production, replace with a backend.

import type { Plugin } from "vite";

export function bikeLookupPlugin(): Plugin {
  return {
    name: "bike-lookup-api",
    configureServer(server) {
      // GET /api/lookup/search?q=canyon+aeroad
      server.middlewares.use("/api/lookup/search", async (req, res) => {
        try {
          const url = new URL(req.url ?? "", "http://localhost");
          const query = url.searchParams.get("q") ?? "";
          if (query.length < 2) {
            res.writeHead(200, { "Content-Type": "application/json" });
            res.end("[]");
            return;
          }

          const searchUrl = `https://99spokes.com/api/v2/search?q=${encodeURIComponent(query)}&type=bike`;
          const resp = await fetch(searchUrl, {
            headers: { "User-Agent": "BikeVault/1.0" },
          });

          if (!resp.ok) {
            // Fallback: try HTML search page and parse
            const results = await searchFallback(query);
            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(JSON.stringify(results));
            return;
          }

          const data = await resp.json() as { results?: unknown[] };
          const results = (data.results ?? []).slice(0, 20).map(mapSearchResult);
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify(results));
        } catch (err) {
          console.error("[bike-lookup] search error:", err);
          // Try fallback on any error
          try {
            const url = new URL(req.url ?? "", "http://localhost");
            const query = url.searchParams.get("q") ?? "";
            const results = await searchFallback(query);
            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(JSON.stringify(results));
          } catch {
            res.writeHead(200, { "Content-Type": "application/json" });
            res.end("[]");
          }
        }
      });

      // GET /api/lookup/details?url=<99spokes-url-or-path>
      server.middlewares.use("/api/lookup/details", async (req, res) => {
        try {
          const url = new URL(req.url ?? "", "http://localhost");
          let specUrl = url.searchParams.get("url") ?? "";
          if (!specUrl) {
            res.writeHead(400, { "Content-Type": "application/json" });
            res.end('{"error":"url required"}');
            return;
          }

          // Ensure full URL
          if (specUrl.startsWith("/")) {
            specUrl = `https://99spokes.com${specUrl}`;
          }

          const resp = await fetch(specUrl, {
            headers: { "User-Agent": "BikeVault/1.0" },
          });
          if (!resp.ok) {
            res.writeHead(resp.status, { "Content-Type": "application/json" });
            res.end('{"error":"upstream error"}');
            return;
          }

          const html = await resp.text();
          const result = parseDetailPage(html, specUrl);
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify(result));
        } catch (err) {
          console.error("[bike-lookup] details error:", err);
          res.writeHead(500, { "Content-Type": "application/json" });
          res.end('{"error":"internal error"}');
        }
      });
    },
  };
}

// ── Search fallback: scrape the 99spokes search results page ──

async function searchFallback(query: string) {
  const url = `https://99spokes.com/en/bikes?q=${encodeURIComponent(query)}`;
  const resp = await fetch(url, {
    headers: { "User-Agent": "BikeVault/1.0" },
  });
  if (!resp.ok) return [];

  const html = await resp.text();
  const results: {
    brand: string;
    model: string;
    year?: number;
    specUrl: string;
  }[] = [];

  // Parse bike cards from search results HTML
  // Looking for patterns like: <a href="/en/bikes/canyon-aeroad-cf-slx-2024">
  const linkRegex = /href="(\/en\/bikes\/[^"]+)"/g;
  const titleRegex =
    /<(?:h[23]|a)[^>]*>([^<]*(?:20\d{2})[^<]*)<\/(?:h[23]|a)>/gi;
  const links = new Set<string>();
  let match;

  while ((match = linkRegex.exec(html)) !== null) {
    const path = match[1];
    if (!links.has(path) && results.length < 20) {
      links.add(path);
      // Extract brand/model/year from path
      const parts = path
        .replace("/en/bikes/", "")
        .split("-")
        .filter(Boolean);
      const yearMatch = parts.find((p) => /^20\d{2}$/.test(p));
      const year = yearMatch ? parseInt(yearMatch) : undefined;
      const nameParts = parts.filter((p) => p !== yearMatch);

      results.push({
        brand: capitalize(nameParts[0] ?? ""),
        model: nameParts.slice(1).map(capitalize).join(" "),
        year,
        specUrl: `https://99spokes.com${path}`,
      });
    }
  }

  // Also try to find titles in the page
  while ((match = titleRegex.exec(html)) !== null) {
    // Additional parsing if needed
  }

  return results;
}

// ── Parse a 99spokes bike detail page ──

function parseDetailPage(html: string, specUrl: string) {
  const result: {
    brand: string;
    model: string;
    year?: number;
    specUrl: string;
    geometry: Record<string, Record<string, number>>;
    specs: Record<string, string>;
    sizes: string[];
  } = {
    brand: "",
    model: "",
    specUrl,
    geometry: {},
    specs: {},
    sizes: [],
  };

  // Try to extract structured data (JSON-LD)
  const jsonLdMatch = html.match(
    /<script type="application\/ld\+json">([\s\S]*?)<\/script>/
  );
  if (jsonLdMatch) {
    try {
      const ld = JSON.parse(jsonLdMatch[1]);
      if (ld.brand?.name) result.brand = ld.brand.name;
      if (ld.name) result.model = ld.name;
      if (ld.model) result.model = ld.model;
    } catch {
      // ignore parse errors
    }
  }

  // Extract title
  const titleMatch = html.match(/<title>([^<]+)<\/title>/);
  if (titleMatch && !result.model) {
    const parts = titleMatch[1].split(/[|\-–]/);
    if (parts.length >= 1) {
      result.model = parts[0].trim();
    }
  }

  // Extract year from URL or title
  const yearMatch = specUrl.match(/\b(20\d{2})\b/);
  if (yearMatch) result.year = parseInt(yearMatch[1]);

  // Parse spec table - look for common patterns
  const specPatterns: [string, RegExp][] = [
    ["frame", /frame[^<]*<\/(?:td|th|dt)>\s*<(?:td|dd)[^>]*>([^<]+)/i],
    ["fork", /fork[^<]*<\/(?:td|th|dt)>\s*<(?:td|dd)[^>]*>([^<]+)/i],
    ["groupset", /group\s*set[^<]*<\/(?:td|th|dt)>\s*<(?:td|dd)[^>]*>([^<]+)/i],
    ["shifters", /shifter[^<]*<\/(?:td|th|dt)>\s*<(?:td|dd)[^>]*>([^<]+)/i],
    [
      "frontDerailleur",
      /front\s*derailleur[^<]*<\/(?:td|th|dt)>\s*<(?:td|dd)[^>]*>([^<]+)/i,
    ],
    [
      "rearDerailleur",
      /rear\s*derailleur[^<]*<\/(?:td|th|dt)>\s*<(?:td|dd)[^>]*>([^<]+)/i,
    ],
    ["crankset", /crank(?:set)?[^<]*<\/(?:td|th|dt)>\s*<(?:td|dd)[^>]*>([^<]+)/i],
    ["cassette", /cassette[^<]*<\/(?:td|th|dt)>\s*<(?:td|dd)[^>]*>([^<]+)/i],
    ["chain", /\bchain\b[^<]*<\/(?:td|th|dt)>\s*<(?:td|dd)[^>]*>([^<]+)/i],
    ["brakes", /brakes?[^<]*<\/(?:td|th|dt)>\s*<(?:td|dd)[^>]*>([^<]+)/i],
    ["wheels", /wheels?[^<]*<\/(?:td|th|dt)>\s*<(?:td|dd)[^>]*>([^<]+)/i],
    ["tires", /tires?[^<]*<\/(?:td|th|dt)>\s*<(?:td|dd)[^>]*>([^<]+)/i],
    ["handlebar", /handle\s*bar[^<]*<\/(?:td|th|dt)>\s*<(?:td|dd)[^>]*>([^<]+)/i],
    ["stem", /\bstem\b[^<]*<\/(?:td|th|dt)>\s*<(?:td|dd)[^>]*>([^<]+)/i],
    ["seatpost", /seat\s*post[^<]*<\/(?:td|th|dt)>\s*<(?:td|dd)[^>]*>([^<]+)/i],
    ["saddle", /saddle[^<]*<\/(?:td|th|dt)>\s*<(?:td|dd)[^>]*>([^<]+)/i],
    ["weight", /weight[^<]*<\/(?:td|th|dt)>\s*<(?:td|dd)[^>]*>([^<]+)/i],
  ];

  for (const [key, regex] of specPatterns) {
    const match = html.match(regex);
    if (match) {
      result.specs[key] = cleanHtml(match[1]);
    }
  }

  // Parse geometry table - look for numbers in geometry rows
  const geoPatterns: [string, RegExp][] = [
    ["stack", /stack[^<]*<\/(?:td|th)>\s*<td[^>]*>(\d+(?:\.\d+)?)/i],
    ["reach", /reach[^<]*<\/(?:td|th)>\s*<td[^>]*>(\d+(?:\.\d+)?)/i],
    [
      "headTubeAngle",
      /head\s*(?:tube)?\s*angle[^<]*<\/(?:td|th)>\s*<td[^>]*>(\d+(?:\.\d+)?)/i,
    ],
    [
      "seatTubeAngle",
      /seat\s*(?:tube)?\s*angle[^<]*<\/(?:td|th)>\s*<td[^>]*>(\d+(?:\.\d+)?)/i,
    ],
    [
      "chainstay",
      /chain\s*stay[^<]*<\/(?:td|th)>\s*<td[^>]*>(\d+(?:\.\d+)?)/i,
    ],
    [
      "wheelbase",
      /wheel\s*base[^<]*<\/(?:td|th)>\s*<td[^>]*>(\d+(?:\.\d+)?)/i,
    ],
    ["bbDrop", /bb\s*drop[^<]*<\/(?:td|th)>\s*<td[^>]*>(\d+(?:\.\d+)?)/i],
    [
      "headTubeLength",
      /head\s*tube(?:\s*length)?[^<]*<\/(?:td|th)>\s*<td[^>]*>(\d+(?:\.\d+)?)/i,
    ],
    [
      "topTubeLength",
      /(?:effective\s*)?top\s*tube[^<]*<\/(?:td|th)>\s*<td[^>]*>(\d+(?:\.\d+)?)/i,
    ],
    ["trailMm", /trail[^<]*<\/(?:td|th)>\s*<td[^>]*>(\d+(?:\.\d+)?)/i],
  ];

  // Simple single-size geometry extraction
  const defaultGeo: Record<string, number> = {};
  for (const [key, regex] of geoPatterns) {
    const match = html.match(regex);
    if (match) {
      defaultGeo[key] = parseFloat(match[1]);
    }
  }
  if (Object.keys(defaultGeo).length > 0) {
    result.geometry["default"] = defaultGeo;
  }

  // Try to extract sizes
  const sizeRegex = /(?:size|sizes?)[:\s]*([XSML\d\s,\/]+)/i;
  const sizeMatch = html.match(sizeRegex);
  if (sizeMatch) {
    result.sizes = sizeMatch[1]
      .split(/[,\/]/)
      .map((s) => s.trim())
      .filter(Boolean);
  }

  return result;
}

// ── Helpers ──

function cleanHtml(text: string): string {
  return text.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapSearchResult(item: any) {
  return {
    brand: item.brand ?? item.make ?? "",
    model: item.model ?? item.name ?? "",
    year: item.year,
    specUrl: item.url
      ? `https://99spokes.com${item.url}`
      : item.specUrl ?? "",
  };
}
