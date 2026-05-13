import type { ComponentPreset } from "./types";

// ── Common component presets with typical lifespans ──
// Lifespan values are mid-range estimates for road/gravel riding.

export const COMPONENT_PRESETS: ComponentPreset[] = [
  // ── Chains ──
  { name: "CN-HG701-11", brand: "Shimano", model: "CN-HG701", category: "chain", lifespanKm: 5000 },
  { name: "CN-HG901-11", brand: "Shimano", model: "CN-HG901", category: "chain", lifespanKm: 5000 },
  { name: "CN-M6100", brand: "Shimano", model: "CN-M6100 12sp", category: "chain", lifespanKm: 4000 },
  { name: "PC-1170", brand: "SRAM", model: "PC-1170 11sp", category: "chain", lifespanKm: 4500 },
  { name: "PC-1270", brand: "SRAM", model: "PC-1270 12sp", category: "chain", lifespanKm: 4000 },
  { name: "KMC X11SL", brand: "KMC", model: "X11SL Gold", category: "chain", lifespanKm: 5000 },
  { name: "KMC X12", brand: "KMC", model: "X12", category: "chain", lifespanKm: 4000 },

  // ── Cassettes ──
  { name: "CS-R8100 11-34", brand: "Shimano", model: "Ultegra CS-R8100", category: "cassette", lifespanKm: 15000 },
  { name: "CS-R7100 11-34", brand: "Shimano", model: "105 CS-R7100", category: "cassette", lifespanKm: 12000 },
  { name: "XG-1290 10-36", brand: "SRAM", model: "Force XG-1290", category: "cassette", lifespanKm: 15000 },
  { name: "CS-M8100 10-51", brand: "Shimano", model: "XT CS-M8100", category: "cassette", lifespanKm: 10000 },

  // ── Brake pads ──
  { name: "L03A Resin", brand: "Shimano", model: "L03A", category: "brake-pads", lifespanKm: 3000 },
  { name: "L05A Resin", brand: "Shimano", model: "L05A-RF", category: "brake-pads", lifespanKm: 3000 },
  { name: "K03Ti Resin", brand: "Shimano", model: "K03Ti", category: "brake-pads", lifespanKm: 2500 },
  { name: "Disc Brake Pad HRD", brand: "SRAM", model: "HRD Organic", category: "brake-pads", lifespanKm: 3000 },
  { name: "Swiss Stop Disc 35", brand: "SwissStop", model: "Disc 35 RS", category: "brake-pads", lifespanKm: 4000 },

  // ── Tires ──
  { name: "GP 5000 S TR 28c", brand: "Continental", model: "GP 5000 S TR", category: "tires", lifespanKm: 7000 },
  { name: "GP 5000 25c", brand: "Continental", model: "GP 5000", category: "tires", lifespanKm: 6000 },
  { name: "Pro One TLE 28c", brand: "Schwalbe", model: "Pro One TLE", category: "tires", lifespanKm: 6000 },
  { name: "Corsa N.EXT 28c", brand: "Vittoria", model: "Corsa N.EXT TLR", category: "tires", lifespanKm: 5000 },
  { name: "Power Road TLR 28c", brand: "Michelin", model: "Power Road TLR", category: "tires", lifespanKm: 7000 },
  { name: "Pathfinder Pro 42c", brand: "Specialized", model: "Pathfinder Pro", category: "tires", lifespanKm: 5000 },
  { name: "G-One Allround 40c", brand: "Schwalbe", model: "G-One Allround", category: "tires", lifespanKm: 5000 },

  // ── Bar tape ──
  { name: "Supacaz Super Sticky Kush", brand: "Supacaz", model: "Super Sticky Kush", category: "bar-tape", lifespanKm: 8000 },
  { name: "Lizard Skins DSP 2.5", brand: "Lizard Skins", model: "DSP 2.5mm", category: "bar-tape", lifespanKm: 8000 },
  { name: "Fizik Vento Tacky", brand: "Fizik", model: "Vento Microtex Tacky", category: "bar-tape", lifespanKm: 6000 },

  // ── Cables ──
  { name: "Optislick Shift Cable Set", brand: "Shimano", model: "Optislick", category: "cables", lifespanKm: 8000 },
  { name: "Polymer Shift Cable Set", brand: "Shimano", model: "Polymer-coated", category: "cables", lifespanKm: 10000 },

  // ── Chainrings ──
  { name: "FC-R8100 50/34T", brand: "Shimano", model: "Ultegra FC-R8100", category: "chainring", lifespanKm: 20000 },
  { name: "FC-R7100 50/34T", brand: "Shimano", model: "105 FC-R7100", category: "chainring", lifespanKm: 18000 },
  { name: "Force AXS 48/35T", brand: "SRAM", model: "Force AXS", category: "chainring", lifespanKm: 20000 },

  // ── Bottom brackets ──
  { name: "SM-BBR60", brand: "Shimano", model: "BBR60 Ultegra", category: "bottom-bracket", lifespanKm: 20000 },
  { name: "BB-RS500", brand: "Shimano", model: "RS500 PressFit", category: "bottom-bracket", lifespanKm: 15000 },
  { name: "DUB BSA", brand: "SRAM", model: "DUB BSA", category: "bottom-bracket", lifespanKm: 20000 },
  { name: "T47 Thread Together", brand: "Chris King", model: "T47 24mm", category: "bottom-bracket", lifespanKm: 30000 },
];

// ── Group by category for UI ──

export function presetsByCategory(): Map<string, ComponentPreset[]> {
  const map = new Map<string, ComponentPreset[]>();
  for (const p of COMPONENT_PRESETS) {
    const list = map.get(p.category) ?? [];
    list.push(p);
    map.set(p.category, list);
  }
  return map;
}
