import { useState } from "react";
import { v4 as uuid } from "uuid";
import { tools } from "../db";
import { useAsync } from "../hooks";
import type { Tool, ToolCategory } from "../types";
import { TOOL_CATEGORY_LABELS } from "../types";

export default function ToolsPage() {
  const { data: toolList, loading, reload } = useAsync(() => tools.getAll());
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  if (loading) return <p className="loading">Loading tools...</p>;

  const handleDelete = async (id: string) => {
    if (confirm("Delete this tool?")) {
      await tools.remove(id);
      reload();
    }
  };

  return (
    <div className="page">
      <header className="page-header">
        <h1>Tools</h1>
        <button className="btn-primary" onClick={() => { setEditId(null); setShowForm(true); }}>
          + Add Tool
        </button>
      </header>

      {showForm && (
        <ToolForm
          existingId={editId}
          onSaved={() => { setShowForm(false); reload(); }}
          onCancel={() => setShowForm(false)}
        />
      )}

      {toolList && toolList.length === 0 && !showForm && (
        <p className="empty-state">No tools tracked yet.</p>
      )}

      <div className="card-grid">
        {toolList?.map((tool) => (
          <div key={tool.id} className="card">
            <div className="card-header">
              <h3>{tool.name}</h3>
              <span className="badge">{TOOL_CATEGORY_LABELS[tool.category]}</span>
            </div>
            {tool.brand && <p className="card-subtitle">{tool.brand}</p>}
            {tool.quantity > 1 && <p className="card-meta">Qty: {tool.quantity}</p>}
            {tool.notes && <p className="card-notes">{tool.notes}</p>}
            <div className="card-actions">
              <button onClick={() => { setEditId(tool.id); setShowForm(true); }}>Edit</button>
              <button className="btn-danger" onClick={() => handleDelete(tool.id)}>Delete</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ToolForm({
  existingId,
  onSaved,
  onCancel,
}: {
  existingId: string | null;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState<ToolCategory>("hex-keys");
  const [brand, setBrand] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [notes, setNotes] = useState("");

  useAsync(async () => {
    if (existingId) {
      const t = await tools.get(existingId);
      if (t) {
        setName(t.name);
        setCategory(t.category);
        setBrand(t.brand ?? "");
        setQuantity(t.quantity.toString());
        setNotes(t.notes ?? "");
      }
    }
    return null;
  }, [existingId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const now = new Date().toISOString();
    const tool: Tool = {
      id: existingId ?? uuid(),
      name,
      category,
      brand: brand || undefined,
      quantity: parseInt(quantity) || 1,
      notes: notes || undefined,
      createdAt: now,
      updatedAt: now,
    };
    await tools.save(tool);
    onSaved();
  };

  return (
    <form className="form" onSubmit={handleSubmit}>
      <div className="form-row">
        <label>
          Name
          <input required value={name} onChange={(e) => setName(e.target.value)} placeholder="Park Tool TW-5.2" />
        </label>
        <label>
          Category
          <select value={category} onChange={(e) => setCategory(e.target.value as ToolCategory)}>
            {Object.entries(TOOL_CATEGORY_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </label>
      </div>
      <div className="form-row">
        <label>
          Brand
          <input value={brand} onChange={(e) => setBrand(e.target.value)} placeholder="Park Tool" />
        </label>
        <label>
          Quantity
          <input type="number" min="1" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
        </label>
      </div>
      <label>
        Notes
        <textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
      </label>
      <div className="form-actions">
        <button type="submit" className="btn-primary">{existingId ? "Update" : "Add"} Tool</button>
        <button type="button" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  );
}
