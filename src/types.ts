// ── Core domain types for Bike Vault ──

export interface BikeGeometry {
  stack?: number;       // mm
  reach?: number;       // mm
  headTubeAngle?: number;
  seatTubeAngle?: number;
  chainstay?: number;   // mm
  wheelbase?: number;   // mm
  bbDrop?: number;      // mm
  headTubeLength?: number; // mm
  seatTubeLength?: number; // mm
  topTubeLength?: number;  // mm (effective/horizontal)
  trailMm?: number;
}

export interface BikeSpec {
  frame?: string;
  fork?: string;
  groupset?: string;
  shifters?: string;
  frontDerailleur?: string;
  rearDerailleur?: string;
  crankset?: string;
  cassette?: string;
  chain?: string;
  brakes?: string;
  wheels?: string;
  tires?: string;
  handlebar?: string;
  stem?: string;
  seatpost?: string;
  saddle?: string;
  weight?: string;
}

export interface Bike {
  id: string;
  name: string;
  type: BikeType;
  brand: string;
  model: string;
  year?: number;
  size?: string;
  status: BikeStatus;
  specUrl?: string;       // link to manufacturer / 99spokes page
  geometry?: BikeGeometry;
  specs?: BikeSpec;
  notes?: string;
  createdAt: string; // ISO
  updatedAt: string;
}

export type BikeType = "road" | "gravel" | "mtb" | "tt" | "commuter" | "other";
export type BikeStatus = "active" | "stored" | "sold";

export interface Component {
  id: string;
  bikeId: string; // which bike it's installed on (empty = spare)
  category: ComponentCategory;
  name: string;
  brand?: string;
  model?: string;
  installedAt?: string; // ISO date
  installedKm?: number; // mileage at install
  lifespanKm?: number; // expected lifespan
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export type ComponentCategory =
  | "chain"
  | "cassette"
  | "chainring"
  | "brake-pads"
  | "tires"
  | "tubes"
  | "cables"
  | "bar-tape"
  | "saddle"
  | "wheels"
  | "derailleur"
  | "bottom-bracket"
  | "headset"
  | "pedals"
  | "other";

export interface Tool {
  id: string;
  name: string;
  category: ToolCategory;
  brand?: string;
  quantity: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export type ToolCategory =
  | "hex-keys"
  | "torque-wrench"
  | "chain-tool"
  | "tire-levers"
  | "pump"
  | "stand"
  | "cable-cutter"
  | "bleed-kit"
  | "cassette-tool"
  | "bb-tool"
  | "headset-press"
  | "measuring"
  | "lubricant"
  | "cleaning"
  | "other";

export interface MaintenanceEntry {
  id: string;
  bikeId: string;
  date: string; // ISO
  mileageAtService?: number;
  description: string;
  partsUsed?: string[]; // component IDs
  timeMinutes?: number;
  cost?: number;
  createdAt: string;
}

export interface ReminderRule {
  id: string;
  bikeId: string;
  componentCategory: ComponentCategory;
  intervalKm?: number;
  intervalDays?: number;
  description: string;
  lastTriggeredAt?: string;
}

// ── UI helpers ──

export const BIKE_TYPE_LABELS: Record<BikeType, string> = {
  road: "Road",
  gravel: "Gravel",
  mtb: "Mountain",
  tt: "Time Trial",
  commuter: "Commuter",
  other: "Other",
};

export const BIKE_STATUS_LABELS: Record<BikeStatus, string> = {
  active: "Active",
  stored: "Stored",
  sold: "Sold",
};

export const COMPONENT_CATEGORY_LABELS: Record<ComponentCategory, string> = {
  chain: "Chain",
  cassette: "Cassette",
  chainring: "Chainring",
  "brake-pads": "Brake Pads",
  tires: "Tires",
  tubes: "Tubes",
  cables: "Cables / Housing",
  "bar-tape": "Bar Tape",
  saddle: "Saddle",
  wheels: "Wheels",
  derailleur: "Derailleur",
  "bottom-bracket": "Bottom Bracket",
  headset: "Headset",
  pedals: "Pedals",
  other: "Other",
};

export const TOOL_CATEGORY_LABELS: Record<ToolCategory, string> = {
  "hex-keys": "Hex / Torx Keys",
  "torque-wrench": "Torque Wrench",
  "chain-tool": "Chain Tool",
  "tire-levers": "Tire Levers",
  pump: "Pump",
  stand: "Work Stand",
  "cable-cutter": "Cable Cutter",
  "bleed-kit": "Bleed Kit",
  "cassette-tool": "Cassette / Lockring Tool",
  "bb-tool": "Bottom Bracket Tool",
  "headset-press": "Headset Press",
  measuring: "Measuring (Chain Checker, etc.)",
  lubricant: "Lubricant / Grease",
  cleaning: "Cleaning Supplies",
  other: "Other",
};

export const GEOMETRY_LABELS: Record<keyof BikeGeometry, string> = {
  stack: "Stack (mm)",
  reach: "Reach (mm)",
  headTubeAngle: "Head Tube Angle (°)",
  seatTubeAngle: "Seat Tube Angle (°)",
  chainstay: "Chainstay (mm)",
  wheelbase: "Wheelbase (mm)",
  bbDrop: "BB Drop (mm)",
  headTubeLength: "Head Tube (mm)",
  seatTubeLength: "Seat Tube (mm)",
  topTubeLength: "Top Tube Eff. (mm)",
  trailMm: "Trail (mm)",
};

export const SPEC_LABELS: Record<keyof BikeSpec, string> = {
  frame: "Frame",
  fork: "Fork",
  groupset: "Groupset",
  shifters: "Shifters",
  frontDerailleur: "Front Derailleur",
  rearDerailleur: "Rear Derailleur",
  crankset: "Crankset",
  cassette: "Cassette",
  chain: "Chain",
  brakes: "Brakes",
  wheels: "Wheels",
  tires: "Tires",
  handlebar: "Handlebar",
  stem: "Stem",
  seatpost: "Seatpost",
  saddle: "Saddle",
  weight: "Weight",
};

export interface ComponentPreset {
  name: string;
  brand: string;
  model: string;
  category: ComponentCategory;
  lifespanKm: number;
}
