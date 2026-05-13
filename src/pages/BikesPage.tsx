import { useState } from "react";
import { v4 as uuid } from "uuid";
import { bikes } from "../db";
import { useAsync } from "../hooks";
import { searchBikes, parseGeometryTable, parseSpecsText } from "../lookup";
import type { GeoPasteResult } from "../lookup";
import type { Bike, BikeType, BikeStatus, BikeGeometry, BikeSpec } from "../types";
import {
  BIKE_TYPE_LABELS,
  BIKE_STATUS_LABELS,
  GEOMETRY_LABELS,
  SPEC_LABELS,
} from "../types";

export default function BikesPage() {
  const { data: bikeList, loading, reload } = useAsync(() => bikes.getAll());
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (loading) return <p className="loading">Loading bikes...</p>;

  const handleDelete = async (id: string) => {
    if (confirm("Delete this bike and all its data?")) {
      await bikes.remove(id);
      reload();
    }
  };

  return (
    <div className="page">
      <header className="page-header">
        <h1>Bikes</h1>
        <button className="btn-primary" onClick={() => { setEditId(null); setShowForm(true); }}>
          + Add Bike
        </button>
      </header>

      {showForm && (
        <BikeForm
          existingId={editId}
          onSaved={() => { setShowForm(false); reload(); }}
          onCancel={() => setShowForm(false)}
        />
      )}

      {bikeList && bikeList.length === 0 && !showForm && (
        <p className="empty-state">No bikes yet. Add your first ride.</p>
      )}

      <div className="card-grid">
        {bikeList?.map((bike) => (
          <div key={bike.id} className={`card card--${bike.status}`}>
            <div className="card-header">
              <h3>{bike.name}</h3>
              <span className={`badge badge--${bike.status}`}>
                {BIKE_STATUS_LABELS[bike.status]}
              </span>
            </div>
            <p className="card-subtitle">
              {bike.brand} {bike.model} {bike.year ? `(${bike.year})` : ""}
              {bike.size ? ` — ${bike.size}` : ""}
            </p>
            <p className="card-meta">{BIKE_TYPE_LABELS[bike.type]}</p>
            {bike.specUrl && (
              <a className="card-link" href={bike.specUrl} target="_blank" rel="noopener noreferrer">
                View full specs ↗
              </a>
            )}
            {bike.notes && <p className="card-notes">{bike.notes}</p>}

            {(bike.geometry || bike.specs) && (
              <button className="btn-toggle" onClick={() => setExpandedId(expandedId === bike.id ? null : bike.id)}>
                {expandedId === bike.id ? "▲ Hide details" : "▼ Show geometry & specs"}
              </button>
            )}
            {expandedId === bike.id && (
              <div className="bike-details">
                {bike.geometry && <GeometryTable geometry={bike.geometry} />}
                {bike.specs && <SpecsTable specs={bike.specs} />}
              </div>
            )}

            <div className="card-actions">
              <button onClick={() => { setEditId(bike.id); setShowForm(true); }}>Edit</button>
              <button className="btn-danger" onClick={() => handleDelete(bike.id)}>Delete</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Geometry display ──

function GeometryTable({ geometry }: { geometry: BikeGeometry }) {
  const entries = Object.entries(geometry).filter(([, v]) => v != null) as [keyof BikeGeometry, number][];
  if (entries.length === 0) return null;
  return (
    <div className="detail-section">
      <h4>Geometry</h4>
      <table className="spec-table"><tbody>
        {entries.map(([key, val]) => (
          <tr key={key}><td>{GEOMETRY_LABELS[key] ?? key}</td><td>{val}</td></tr>
        ))}
      </tbody></table>
    </div>
  );
}

// ── Specs display ──

function SpecsTable({ specs }: { specs: BikeSpec }) {
  const entries = Object.entries(specs).filter(([, v]) => v != null && v !== "") as [keyof BikeSpec, string][];
  if (entries.length === 0) return null;
  return (
    <div className="detail-section">
      <h4>Specifications</h4>
      <table className="spec-table"><tbody>
        {entries.map(([key, val]) => (
          <tr key={key}><td>{SPEC_LABELS[key] ?? key}</td><td>{val}</td></tr>
        ))}
      </tbody></table>
    </div>
  );
}

// ── Inline form ──

function BikeForm({
  existingId,
  onSaved,
  onCancel,
}: {
  existingId: string | null;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState("");
  const [type, setType] = useState<BikeType>("road");
  const [brand, setBrand] = useState("");
  const [model, setModel] = useState("");
  const [year, setYear] = useState("");
  const [size, setSize] = useState("");
  const [status, setStatus] = useState<BikeStatus>("active");
  const [specUrl, setSpecUrl] = useState("");
  const [geometry, setGeometry] = useState<BikeGeometry>({});
  const [specs, setSpecs] = useState<BikeSpec>({});
  const [notes, setNotes] = useState("");

  // Lookup state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<{ brand: string; model: string; year?: number; specUrl: string }[]>([]);
  const [searching, setSearching] = useState(false);
  const [showGeoTab, setShowGeoTab] = useState(false);
  const [showSpecTab, setShowSpecTab] = useState(false);
  const [pasteGeoText, setPasteGeoText] = useState("");
  const [pasteSpecText, setPasteSpecText] = useState("");

  // Multi-size geometry paste state
  const [geoPasteResult, setGeoPasteResult] = useState<GeoPasteResult | null>(null);

  useAsync(async () => {
    if (existingId) {
      const b = await bikes.get(existingId);
      if (b) {
        setName(b.name);
        setType(b.type);
        setBrand(b.brand);
        setModel(b.model);
        setYear(b.year?.toString() ?? "");
        setSize(b.size ?? "");
        setStatus(b.status);
        setSpecUrl(b.specUrl ?? "");
        setGeometry(b.geometry ?? {});
        setSpecs(b.specs ?? {});
        setNotes(b.notes ?? "");
      }
    }
    return null;
  }, [existingId]);

  const handleSearch = async () => {
    if (searchQuery.length < 2) return;
    setSearching(true);
    try {
      const results = await searchBikes(searchQuery);
      setSearchResults(results);
    } catch {
      setSearchResults([]);
    }
    setSearching(false);
  };

  const handlePickResult = async (result: { brand: string; model: string; year?: number; specUrl: string }) => {
    setBrand(result.brand);
    setModel(result.model);
    if (result.year) setYear(result.year.toString());
    if (result.specUrl) setSpecUrl(result.specUrl);
    if (!name) setName(`${result.brand} ${result.model}`);
    setSearchResults([]);
    setSearchQuery("");
    // Auto-expand geometry & specs so user can fill them
    setShowGeoTab(true);
    setShowSpecTab(true);
  };

  const specsSearchUrl = brand && model
    ? `https://99spokes.com/en/bikes?q=${encodeURIComponent(`${brand} ${model} ${year}`.trim())}`
    : null;

  /** Process a geometry paste result — if multi-size, show picker; if single, fill directly. */
  const applyGeoPaste = (result: GeoPasteResult) => {
    if (result.sizes.length === 0) return;
    if (result.sizes.length === 1) {
      const s = result.sizes[0];
      setGeometry({ ...geometry, ...result.geometry[s] });
      if (s !== "default") setSize(s);
      setShowGeoTab(true);
      setGeoPasteResult(null);
    } else {
      // Multiple sizes — show picker
      setGeoPasteResult(result);
    }
  };

  const handlePickSize = (s: string) => {
    if (!geoPasteResult) return;
    setSize(s);
    setGeometry({ ...geometry, ...geoPasteResult.geometry[s] });
    setShowGeoTab(true);
    setGeoPasteResult(null);
  };

  const handleClipboardGeo = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text.trim()) {
        applyGeoPaste(parseGeometryTable(text));
      }
    } catch {
      alert("Clipboard access denied. Use the paste textarea instead.");
    }
  };

  const handleClipboardSpecs = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text.trim()) {
        const parsed = parseSpecsText(text);
        setSpecs({ ...specs, ...parsed });
      }
    } catch {
      alert("Clipboard access denied. Use the paste textarea instead.");
    }
  };

  const handlePasteGeometry = () => {
    if (pasteGeoText.trim()) {
      applyGeoPaste(parseGeometryTable(pasteGeoText));
      setPasteGeoText("");
    }
  };

  const handlePasteSpecs = () => {
    if (pasteSpecText.trim()) {
      const parsed = parseSpecsText(pasteSpecText);
      setSpecs({ ...specs, ...parsed });
      setPasteSpecText("");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const now = new Date().toISOString();
    const bike: Bike = {
      id: existingId ?? uuid(),
      name,
      type,
      brand,
      model,
      year: year ? parseInt(year) : undefined,
      size: size || undefined,
      status,
      specUrl: specUrl || undefined,
      geometry: Object.keys(geometry).length > 0 ? geometry : undefined,
      specs: Object.keys(specs).length > 0 ? specs : undefined,
      notes: notes || undefined,
      createdAt: now,
      updatedAt: now,
    };
    await bikes.save(bike);
    onSaved();
  };

  const hasGeometry = Object.values(geometry).some((v) => v != null);
  const hasSpecs = Object.values(specs).some((v) => v != null && v !== "");

  return (
    <form className="form" onSubmit={handleSubmit}>
      {/* ── Online Lookup ── */}
      <div className="lookup-section">
        <h3>🔍 Search Online</h3>
        <div className="form-row">
          <label style={{ flex: 3 }}>
            Search by brand and model
            <div className="input-with-btn">
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleSearch(); } }}
                placeholder="e.g. Canyon Aeroad 2024"
              />
              <button type="button" className="btn-primary" onClick={handleSearch} disabled={searching}>
                {searching ? "Searching..." : "Search"}
              </button>
            </div>
          </label>
        </div>

        {searchResults.length > 0 && (
          <div className="search-results">
            {searchResults.map((r, i) => (
              <button key={i} type="button" className="search-result-item" onClick={() => handlePickResult(r)}>
                <span className="result-name">{r.brand} {r.model}</span>
                {r.year ? <span className="result-year-badge">{r.year}</span> : <span className="result-year-badge result-year-badge--unknown">Year N/A</span>}
              </button>
            ))}
          </div>
        )}

      </div>

      {/* ── 99spokes link ── */}
      {specsSearchUrl && (
        <div className="specs-hint">
          <p>Find your bike on
            <a href={specsSearchUrl} target="_blank" rel="noopener noreferrer"> 99spokes.com ↗</a>,
            select the geometry table (all sizes), copy it, then use <strong>Paste from Clipboard</strong> below.
            You'll be able to pick your size.
          </p>
        </div>
      )}

      <hr className="form-divider" />

      {/* ── Basic fields ── */}
      <div className="form-row">
        <label>
          Name
          <input required value={name} onChange={(e) => setName(e.target.value)} placeholder="My Road Bike" />
        </label>
        <label>
          Type
          <select value={type} onChange={(e) => setType(e.target.value as BikeType)}>
            {Object.entries(BIKE_TYPE_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </label>
      </div>
      <div className="form-row">
        <label>
          Brand
          <input required value={brand} onChange={(e) => setBrand(e.target.value)} placeholder="Canyon" />
        </label>
        <label>
          Model
          <input required value={model} onChange={(e) => setModel(e.target.value)} placeholder="Aeroad CF SLX" />
        </label>
        <label>
          Year
          <input type="number" value={year} onChange={(e) => setYear(e.target.value)} placeholder="2024" />
        </label>
        <label>
          Size
          <input value={size} onChange={(e) => setSize(e.target.value)} placeholder="56 / L" />
        </label>
      </div>
      <div className="form-row">
        <label>
          Status
          <select value={status} onChange={(e) => setStatus(e.target.value as BikeStatus)}>
            {Object.entries(BIKE_STATUS_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </label>
        <label style={{ flex: 2 }}>
          Spec URL
          <input value={specUrl} onChange={(e) => setSpecUrl(e.target.value)} placeholder="https://99spokes.com/en/bikes/..." />
        </label>
      </div>

      {/* ── Size picker (multi-size paste) ── */}
      {geoPasteResult && geoPasteResult.sizes.length > 1 && (
        <div className="size-picker">
          <h3>Pick your size</h3>
          <div className="size-chips">
            {geoPasteResult.sizes.map((s) => (
              <button key={s} type="button" className="size-chip" onClick={() => handlePickSize(s)}>
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Geometry ── */}
      <div className="collapsible-section">
        <button type="button" className="btn-toggle" onClick={() => setShowGeoTab(!showGeoTab)}>
          {showGeoTab ? "▲" : "▼"} Geometry {hasGeometry && <span className="badge badge--active">✓</span>}
        </button>
        {showGeoTab && (
          <div className="collapsible-body">
            <div className="clipboard-actions">
              <button type="button" className="btn-clipboard" onClick={handleClipboardGeo}>
                📋 Paste from Clipboard
              </button>
              <span className="clipboard-hint">Copy a geometry table from 99spokes or a manufacturer page, then click paste</span>
            </div>
            <div className="form-row form-row--wrap">
              {(Object.keys(GEOMETRY_LABELS) as (keyof BikeGeometry)[]).map((key) => (
                <label key={key} className="geo-field">
                  {GEOMETRY_LABELS[key]}
                  <input type="number" step="0.1" value={geometry[key] ?? ""}
                    onChange={(e) => setGeometry({ ...geometry, [key]: e.target.value ? parseFloat(e.target.value) : undefined })} />
                </label>
              ))}
            </div>
            <details className="paste-section">
              <summary>Or paste text manually</summary>
              <textarea rows={4} value={pasteGeoText} onChange={(e) => setPasteGeoText(e.target.value)}
                placeholder="Paste a geometry table from a manufacturer website..." />
              <button type="button" onClick={handlePasteGeometry} disabled={!pasteGeoText.trim()}>Parse & Fill</button>
            </details>
          </div>
        )}
      </div>

      {/* ── Specifications ── */}
      <div className="collapsible-section">
        <button type="button" className="btn-toggle" onClick={() => setShowSpecTab(!showSpecTab)}>
          {showSpecTab ? "▲" : "▼"} Specifications {hasSpecs && <span className="badge badge--active">✓</span>}
        </button>
        {showSpecTab && (
          <div className="collapsible-body">
            <div className="clipboard-actions">
              <button type="button" className="btn-clipboard" onClick={handleClipboardSpecs}>
                📋 Paste from Clipboard
              </button>
              <span className="clipboard-hint">Copy a spec list from 99spokes or a manufacturer page, then click paste</span>
            </div>
            {(Object.keys(SPEC_LABELS) as (keyof BikeSpec)[]).map((key) => (
              <label key={key}>
                {SPEC_LABELS[key]}
                <input value={specs[key] ?? ""} onChange={(e) => setSpecs({ ...specs, [key]: e.target.value || undefined })} />
              </label>
            ))}
            <details className="paste-section">
              <summary>Or paste text manually</summary>
              <textarea rows={4} value={pasteSpecText} onChange={(e) => setPasteSpecText(e.target.value)}
                placeholder={"Frame: Carbon\nFork: Carbon\nGroupset: Shimano Ultegra Di2\n..."} />
              <button type="button" onClick={handlePasteSpecs} disabled={!pasteSpecText.trim()}>Parse & Fill</button>
            </details>
          </div>
        )}
      </div>

      <label>
        Notes
        <textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
      </label>
      <div className="form-actions">
        <button type="submit" className="btn-primary">{existingId ? "Update" : "Add"} Bike</button>
        <button type="button" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  );
}
