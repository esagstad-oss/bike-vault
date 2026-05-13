import { supabase } from "./supabaseClient";
import * as db from "./db";
import type { Bike, Component, Tool, MaintenanceEntry, ReminderRule } from "./types";

// ── Mapping helpers: camelCase ↔ snake_case ──

function bikeToRow(b: Bike) {
  return {
    id: b.id,
    name: b.name,
    type: b.type,
    brand: b.brand,
    model: b.model,
    year: b.year ?? null,
    size: b.size ?? null,
    status: b.status,
    spec_url: b.specUrl ?? null,
    geometry: b.geometry ?? null,
    specs: b.specs ?? null,
    notes: b.notes ?? null,
    created_at: b.createdAt,
    updated_at: b.updatedAt,
  };
}

function rowToBike(r: Record<string, unknown>): Bike {
  return {
    id: r.id as string,
    name: r.name as string,
    type: r.type as Bike["type"],
    brand: r.brand as string,
    model: r.model as string,
    year: r.year as number | undefined,
    size: r.size as string | undefined,
    status: r.status as Bike["status"],
    specUrl: r.spec_url as string | undefined,
    geometry: r.geometry as Bike["geometry"],
    specs: r.specs as Bike["specs"],
    notes: r.notes as string | undefined,
    createdAt: r.created_at as string,
    updatedAt: r.updated_at as string,
  };
}

function compToRow(c: Component) {
  return {
    id: c.id,
    bike_id: c.bikeId,
    category: c.category,
    name: c.name,
    brand: c.brand ?? null,
    model: c.model ?? null,
    installed_at: c.installedAt ?? null,
    installed_km: c.installedKm ?? null,
    lifespan_km: c.lifespanKm ?? null,
    notes: c.notes ?? null,
    created_at: c.createdAt,
    updated_at: c.updatedAt,
  };
}

function rowToComp(r: Record<string, unknown>): Component {
  return {
    id: r.id as string,
    bikeId: r.bike_id as string,
    category: r.category as Component["category"],
    name: r.name as string,
    brand: r.brand as string | undefined,
    model: r.model as string | undefined,
    installedAt: r.installed_at as string | undefined,
    installedKm: r.installed_km as number | undefined,
    lifespanKm: r.lifespan_km as number | undefined,
    notes: r.notes as string | undefined,
    createdAt: r.created_at as string,
    updatedAt: r.updated_at as string,
  };
}

function toolToRow(t: Tool) {
  return {
    id: t.id,
    name: t.name,
    category: t.category,
    brand: t.brand ?? null,
    quantity: t.quantity,
    notes: t.notes ?? null,
    created_at: t.createdAt,
    updated_at: t.updatedAt,
  };
}

function rowToTool(r: Record<string, unknown>): Tool {
  return {
    id: r.id as string,
    name: r.name as string,
    category: r.category as Tool["category"],
    brand: r.brand as string | undefined,
    quantity: r.quantity as number,
    notes: r.notes as string | undefined,
    createdAt: r.created_at as string,
    updatedAt: r.updated_at as string,
  };
}

function maintToRow(m: MaintenanceEntry) {
  return {
    id: m.id,
    bike_id: m.bikeId,
    date: m.date,
    mileage_at_service: m.mileageAtService ?? null,
    description: m.description,
    parts_used: m.partsUsed ?? null,
    time_minutes: m.timeMinutes ?? null,
    cost: m.cost ?? null,
    created_at: m.createdAt,
  };
}

function rowToMaint(r: Record<string, unknown>): MaintenanceEntry {
  return {
    id: r.id as string,
    bikeId: r.bike_id as string,
    date: r.date as string,
    mileageAtService: r.mileage_at_service as number | undefined,
    description: r.description as string,
    partsUsed: r.parts_used as string[] | undefined,
    timeMinutes: r.time_minutes as number | undefined,
    cost: r.cost as number | undefined,
    createdAt: r.created_at as string,
  };
}

function reminderToRow(r: ReminderRule) {
  return {
    id: r.id,
    bike_id: r.bikeId,
    component_category: r.componentCategory,
    interval_km: r.intervalKm ?? null,
    interval_days: r.intervalDays ?? null,
    description: r.description,
    last_triggered_at: r.lastTriggeredAt ?? null,
  };
}

function rowToReminder(r: Record<string, unknown>): ReminderRule {
  return {
    id: r.id as string,
    bikeId: r.bike_id as string,
    componentCategory: r.component_category as ReminderRule["componentCategory"],
    intervalKm: r.interval_km as number | undefined,
    intervalDays: r.interval_days as number | undefined,
    description: r.description as string,
    lastTriggeredAt: r.last_triggered_at as string | undefined,
  };
}

// ── Pull: Supabase → IndexedDB (full replace) ──

export async function pullFromCloud(): Promise<void> {
  const [bikesRes, compsRes, toolsRes, maintRes, remRes] = await Promise.all([
    supabase.from("bikes").select("*"),
    supabase.from("components").select("*"),
    supabase.from("tools").select("*"),
    supabase.from("maintenance").select("*"),
    supabase.from("reminders").select("*"),
  ]);

  if (bikesRes.error) throw bikesRes.error;
  if (compsRes.error) throw compsRes.error;
  if (toolsRes.error) throw toolsRes.error;
  if (maintRes.error) throw maintRes.error;
  if (remRes.error) throw remRes.error;

  // Write cloud data to local IDB
  for (const row of bikesRes.data) await db.bikes.save(rowToBike(row));
  for (const row of compsRes.data) await db.components.save(rowToComp(row));
  for (const row of toolsRes.data) await db.tools.save(rowToTool(row));
  for (const row of maintRes.data) await db.maintenance.save(rowToMaint(row));
  for (const row of remRes.data) await db.reminders.save(rowToReminder(row));
}

// ── Push: IndexedDB → Supabase (upsert all) ──

export async function pushToCloud(): Promise<void> {
  const [allBikes, allComps, allTools, allMaint, allRem] = await Promise.all([
    db.bikes.getAll(),
    db.components.getAll(),
    db.tools.getAll(),
    db.maintenance.getAll(),
    db.reminders.getAll(),
  ]);

  const ops = [];

  if (allBikes.length)
    ops.push(supabase.from("bikes").upsert(allBikes.map(bikeToRow)));
  if (allComps.length)
    ops.push(supabase.from("components").upsert(allComps.map(compToRow)));
  if (allTools.length)
    ops.push(supabase.from("tools").upsert(allTools.map(toolToRow)));
  if (allMaint.length)
    ops.push(supabase.from("maintenance").upsert(allMaint.map(maintToRow)));
  if (allRem.length)
    ops.push(supabase.from("reminders").upsert(allRem.map(reminderToRow)));

  const results = await Promise.all(ops);
  for (const res of results) {
    if (res.error) throw res.error;
  }
}

// ── Single-record push (called on each save/delete) ──

export async function pushRecord(
  table: "bikes" | "components" | "tools" | "maintenance" | "reminders",
  item: Bike | Component | Tool | MaintenanceEntry | ReminderRule
): Promise<void> {
  const mappers: Record<string, (x: never) => unknown> = {
    bikes: bikeToRow,
    components: compToRow,
    tools: toolToRow,
    maintenance: maintToRow,
    reminders: reminderToRow,
  };
  const row = mappers[table](item as never);
  const { error } = await supabase.from(table).upsert(row as Record<string, unknown>);
  if (error) console.error(`Sync push failed (${table}):`, error);
}

export async function deleteRecord(
  table: "bikes" | "components" | "tools" | "maintenance" | "reminders",
  id: string
): Promise<void> {
  const { error } = await supabase.from(table).delete().eq("id", id);
  if (error) console.error(`Sync delete failed (${table}):`, error);
}
