import { openDB, type IDBPDatabase } from "idb";
import type {
  Bike,
  Component,
  Tool,
  MaintenanceEntry,
  ReminderRule,
} from "./types";
import { pushRecord, deleteRecord } from "./sync";

const DB_NAME = "bike-vault";
const DB_VERSION = 1;

type BikeVaultDB = IDBPDatabase;

let dbPromise: Promise<BikeVaultDB> | null = null;

function getDb(): Promise<BikeVaultDB> {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains("bikes")) {
          db.createObjectStore("bikes", { keyPath: "id" });
        }
        if (!db.objectStoreNames.contains("components")) {
          const store = db.createObjectStore("components", { keyPath: "id" });
          store.createIndex("bikeId", "bikeId");
        }
        if (!db.objectStoreNames.contains("tools")) {
          db.createObjectStore("tools", { keyPath: "id" });
        }
        if (!db.objectStoreNames.contains("maintenance")) {
          const store = db.createObjectStore("maintenance", { keyPath: "id" });
          store.createIndex("bikeId", "bikeId");
          store.createIndex("date", "date");
        }
        if (!db.objectStoreNames.contains("reminders")) {
          const store = db.createObjectStore("reminders", { keyPath: "id" });
          store.createIndex("bikeId", "bikeId");
        }
      },
    });
  }
  return dbPromise;
}

// ── Generic CRUD helpers ──

async function getAll<T>(store: string): Promise<T[]> {
  const db = await getDb();
  return db.getAll(store);
}

async function getById<T>(store: string, id: string): Promise<T | undefined> {
  const db = await getDb();
  return db.get(store, id);
}

async function put<T>(store: string, item: T): Promise<void> {
  const db = await getDb();
  await db.put(store, item);
}

async function remove(store: string, id: string): Promise<void> {
  const db = await getDb();
  await db.delete(store, id);
}

async function getAllByIndex<T>(
  store: string,
  index: string,
  value: string
): Promise<T[]> {
  const db = await getDb();
  return db.getAllFromIndex(store, index, value);
}

// ── Bikes ──

export const bikes = {
  getAll: () => getAll<Bike>("bikes"),
  get: (id: string) => getById<Bike>("bikes", id),
  save: async (bike: Bike) => { await put("bikes", bike); pushRecord("bikes", bike); },
  remove: async (id: string) => { await remove("bikes", id); deleteRecord("bikes", id); },
};

// ── Components ──

export const components = {
  getAll: () => getAll<Component>("components"),
  get: (id: string) => getById<Component>("components", id),
  getForBike: (bikeId: string) =>
    getAllByIndex<Component>("components", "bikeId", bikeId),
  getSpares: async () => {
    const all = await getAll<Component>("components");
    return all.filter((c) => !c.bikeId);
  },
  save: async (component: Component) => { await put("components", component); pushRecord("components", component); },
  remove: async (id: string) => { await remove("components", id); deleteRecord("components", id); },
};

// ── Tools ──

export const tools = {
  getAll: () => getAll<Tool>("tools"),
  get: (id: string) => getById<Tool>("tools", id),
  save: async (tool: Tool) => { await put("tools", tool); pushRecord("tools", tool); },
  remove: async (id: string) => { await remove("tools", id); deleteRecord("tools", id); },
};

// ── Maintenance ──

export const maintenance = {
  getAll: () => getAll<MaintenanceEntry>("maintenance"),
  get: (id: string) => getById<MaintenanceEntry>("maintenance", id),
  getForBike: (bikeId: string) =>
    getAllByIndex<MaintenanceEntry>("maintenance", "bikeId", bikeId),
  save: async (entry: MaintenanceEntry) => { await put("maintenance", entry); pushRecord("maintenance", entry); },
  remove: async (id: string) => { await remove("maintenance", id); deleteRecord("maintenance", id); },
};

// ── Reminders ──

export const reminders = {
  getAll: () => getAll<ReminderRule>("reminders"),
  getForBike: (bikeId: string) =>
    getAllByIndex<ReminderRule>("reminders", "bikeId", bikeId),
  save: async (rule: ReminderRule) => { await put("reminders", rule); pushRecord("reminders", rule); },
  remove: async (id: string) => { await remove("reminders", id); deleteRecord("reminders", id); },
};

// ── Export / Import (JSON backup) ──

export async function exportAll(): Promise<string> {
  const data = {
    bikes: await bikes.getAll(),
    components: await components.getAll(),
    tools: await tools.getAll(),
    maintenance: await maintenance.getAll(),
    reminders: await reminders.getAll(),
    exportedAt: new Date().toISOString(),
  };
  return JSON.stringify(data, null, 2);
}

export async function importAll(json: string): Promise<void> {
  const data = JSON.parse(json);
  const db = await getDb();
  const tx = db.transaction(
    ["bikes", "components", "tools", "maintenance", "reminders"],
    "readwrite"
  );
  for (const bike of data.bikes ?? []) await tx.objectStore("bikes").put(bike);
  for (const c of data.components ?? [])
    await tx.objectStore("components").put(c);
  for (const t of data.tools ?? []) await tx.objectStore("tools").put(t);
  for (const m of data.maintenance ?? [])
    await tx.objectStore("maintenance").put(m);
  for (const r of data.reminders ?? [])
    await tx.objectStore("reminders").put(r);
  await tx.done;
}
