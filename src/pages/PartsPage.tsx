import { useState } from "react";
import { v4 as uuid } from "uuid";
import { components, bikes } from "../db";
import { useAsync } from "../hooks";
import { COMPONENT_PRESETS } from "../presets";
import type { Component, ComponentCategory } from "../types";
import { COMPONENT_CATEGORY_LABELS } from "../types";

export default function PartsPage() {
  const { data: allParts, loading, reload } = useAsync(() => components.getAll());
  const { data: bikeList } = useAsync(() => bikes.getAll());
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  if (loading) return <p className="loading">Loading parts...</p>;

  const installed = allParts?.filter((p) => p.bikeId) ?? [];
  const spares = allParts?.filter((p) => !p.bikeId) ?? [];

  const bikeName = (id: string) =>
    bikeList?.find((b) => b.id === id)?.name ?? "Unknown";

  const handleDelete = async (id: string) => {
    if (confirm("Delete this part?")) {
      await components.remove(id);
      reload();
    }
  };

  return (
    <div className="page">
      <header className="page-header">
        <h1>Parts & Components</h1>
        <button className="btn-primary" onClick={() => { setEditId(null); setShowForm(true); }}>
          + Add Part
        </button>
      </header>

      {showForm && (
        <PartForm
          existingId={editId}
          bikes={bikeList ?? []}
          onSaved={() => { setShowForm(false); reload(); }}
          onCancel={() => setShowForm(false)}
        />
      )}

      {spares.length > 0 && (
        <>
          <h2 className="section-title">Spare Parts</h2>
          <div className="card-grid">
            {spares.map((p) => (
              <PartCard key={p.id} part={p} onEdit={() => { setEditId(p.id); setShowForm(true); }} onDelete={() => handleDelete(p.id)} />
            ))}
          </div>
        </>
      )}

      {installed.length > 0 && (
        <>
          <h2 className="section-title">Installed</h2>
          <div className="card-grid">
            {installed.map((p) => (
              <PartCard
                key={p.id}
                part={p}
                bikeLabel={bikeName(p.bikeId)}
                onEdit={() => { setEditId(p.id); setShowForm(true); }}
                onDelete={() => handleDelete(p.id)}
              />
            ))}
          </div>
        </>
      )}

      {allParts?.length === 0 && !showForm && (
        <p className="empty-state">No parts tracked yet.</p>
      )}
    </div>
  );
}

function PartCard({
  part,
  bikeLabel,
  onEdit,
  onDelete,
}: {
  part: Component;
  bikeLabel?: string;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const wearPct = part.lifespanKm && part.installedKm != null
    ? Math.min(100, Math.round(((Date.now() - new Date(part.installedAt ?? part.createdAt).getTime()) / 86400000 / 365) * 5000 / part.lifespanKm * 100))
    : null;

  return (
    <div className="card">
      <div className="card-header">
        <h3>{part.name}</h3>
        <span className="badge">{COMPONENT_CATEGORY_LABELS[part.category]}</span>
      </div>
      {part.brand && <p className="card-subtitle">{part.brand} {part.model ?? ""}</p>}
      {bikeLabel && <p className="card-meta">On: {bikeLabel}</p>}
      {wearPct !== null && (
        <div className="wear-bar">
          <div className="wear-fill" style={{ width: `${wearPct}%`, background: wearPct > 80 ? "var(--danger)" : "var(--accent)" }} />
        </div>
      )}
      {part.notes && <p className="card-notes">{part.notes}</p>}
      <div className="card-actions">
        <button onClick={onEdit}>Edit</button>
        <button className="btn-danger" onClick={onDelete}>Delete</button>
      </div>
    </div>
  );
}

function PartForm({
  existingId,
  bikes: bikeList,
  onSaved,
  onCancel,
}: {
  existingId: string | null;
  bikes: { id: string; name: string }[];
  onSaved: () => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState<ComponentCategory>("chain");
  const [brand, setBrand] = useState("");
  const [model, setModel] = useState("");
  const [bikeId, setBikeId] = useState("");
  const [lifespanKm, setLifespanKm] = useState("");
  const [notes, setNotes] = useState("");
  const [presetFilter, setPresetFilter] = useState("");

  const filteredPresets = presetFilter.length >= 2
    ? COMPONENT_PRESETS.filter((p) =>
        `${p.brand} ${p.name} ${p.model}`.toLowerCase().includes(presetFilter.toLowerCase())
      ).slice(0, 10)
    : [];

  useAsync(async () => {
    if (existingId) {
      const c = await components.get(existingId);
      if (c) {
        setName(c.name);
        setCategory(c.category);
        setBrand(c.brand ?? "");
        setModel(c.model ?? "");
        setBikeId(c.bikeId);
        setLifespanKm(c.lifespanKm?.toString() ?? "");
        setNotes(c.notes ?? "");
      }
    }
    return null;
  }, [existingId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const now = new Date().toISOString();
    const part: Component = {
      id: existingId ?? uuid(),
      bikeId,
      category,
      name,
      brand: brand || undefined,
      model: model || undefined,
      installedAt: bikeId ? now : undefined,
      lifespanKm: lifespanKm ? parseInt(lifespanKm) : undefined,
      notes: notes || undefined,
      createdAt: now,
      updatedAt: now,
    };
    await components.save(part);
    onSaved();
  };

  return (
    <form className="form" onSubmit={handleSubmit}>
      {!existingId && (
        <div className="lookup-section">
          <h3>⚡ Quick Add from Presets</h3>
          <label>
            Search components
            <input
              value={presetFilter}
              onChange={(e) => setPresetFilter(e.target.value)}
              placeholder="e.g. GP 5000, CN-HG701, SwissStop..."
            />
          </label>
          {filteredPresets.length > 0 && (
            <div className="search-results">
              {filteredPresets.map((p, i) => (
                <button key={i} type="button" className="search-result-item" onClick={() => {
                  setName(p.name);
                  setBrand(p.brand);
                  setModel(p.model);
                  setCategory(p.category);
                  setLifespanKm(p.lifespanKm.toString());
                  setPresetFilter("");
                }}>
                  <strong>{p.brand} {p.name}</strong>
                  <span className="result-year">{COMPONENT_CATEGORY_LABELS[p.category]} · {p.lifespanKm} km</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
      <div className="form-row">
        <label>
          Name
          <input required value={name} onChange={(e) => setName(e.target.value)} placeholder="Shimano CN-HG701" />
        </label>
        <label>
          Category
          <select value={category} onChange={(e) => setCategory(e.target.value as ComponentCategory)}>
            {Object.entries(COMPONENT_CATEGORY_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </label>
      </div>
      <div className="form-row">
        <label>
          Brand
          <input value={brand} onChange={(e) => setBrand(e.target.value)} placeholder="Shimano" />
        </label>
        <label>
          Model
          <input value={model} onChange={(e) => setModel(e.target.value)} />
        </label>
        <label>
          Installed on
          <select value={bikeId} onChange={(e) => setBikeId(e.target.value)}>
            <option value="">Spare (not installed)</option>
            {bikeList.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        </label>
      </div>
      <div className="form-row">
        <label>
          Lifespan (km)
          <input type="number" value={lifespanKm} onChange={(e) => setLifespanKm(e.target.value)} placeholder="5000" />
        </label>
      </div>
      <label>
        Notes
        <textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
      </label>
      <div className="form-actions">
        <button type="submit" className="btn-primary">{existingId ? "Update" : "Add"} Part</button>
        <button type="button" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  );
}
