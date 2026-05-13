import { useState } from "react";
import { v4 as uuid } from "uuid";
import { maintenance, bikes } from "../db";
import { useAsync } from "../hooks";
import type { MaintenanceEntry } from "../types";

export default function MaintenancePage() {
  const { data: entries, loading, reload } = useAsync(() => maintenance.getAll());
  const { data: bikeList } = useAsync(() => bikes.getAll());
  const [showForm, setShowForm] = useState(false);
  const [filterBike, setFilterBike] = useState("");

  if (loading) return <p className="loading">Loading maintenance log...</p>;

  const sorted = [...(entries ?? [])]
    .filter((e) => !filterBike || e.bikeId === filterBike)
    .sort((a, b) => b.date.localeCompare(a.date));

  const bikeName = (id: string) =>
    bikeList?.find((b) => b.id === id)?.name ?? "Unknown";

  const handleDelete = async (id: string) => {
    if (confirm("Delete this entry?")) {
      await maintenance.remove(id);
      reload();
    }
  };

  return (
    <div className="page">
      <header className="page-header">
        <h1>Maintenance Log</h1>
        <button className="btn-primary" onClick={() => setShowForm(true)}>
          + Log Work
        </button>
      </header>

      {bikeList && bikeList.length > 1 && (
        <div className="filter-row">
          <select value={filterBike} onChange={(e) => setFilterBike(e.target.value)}>
            <option value="">All Bikes</option>
            {bikeList.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        </div>
      )}

      {showForm && (
        <MaintenanceForm
          bikes={bikeList ?? []}
          onSaved={() => { setShowForm(false); reload(); }}
          onCancel={() => setShowForm(false)}
        />
      )}

      {sorted.length === 0 && !showForm && (
        <p className="empty-state">No maintenance logged yet.</p>
      )}

      <div className="log-list">
        {sorted.map((entry) => (
          <div key={entry.id} className="log-entry">
            <div className="log-date">{new Date(entry.date).toLocaleDateString()}</div>
            <div className="log-body">
              <strong>{bikeName(entry.bikeId)}</strong>
              <p>{entry.description}</p>
              <div className="log-meta">
                {entry.mileageAtService != null && <span>{entry.mileageAtService} km</span>}
                {entry.timeMinutes != null && <span>{entry.timeMinutes} min</span>}
                {entry.cost != null && <span>${entry.cost}</span>}
              </div>
            </div>
            <button className="btn-danger btn-sm" onClick={() => handleDelete(entry.id)}>×</button>
          </div>
        ))}
      </div>
    </div>
  );
}

function MaintenanceForm({
  bikes: bikeList,
  onSaved,
  onCancel,
}: {
  bikes: { id: string; name: string }[];
  onSaved: () => void;
  onCancel: () => void;
}) {
  const [bikeId, setBikeId] = useState(bikeList[0]?.id ?? "");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [description, setDescription] = useState("");
  const [mileage, setMileage] = useState("");
  const [time, setTime] = useState("");
  const [cost, setCost] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const entry: MaintenanceEntry = {
      id: uuid(),
      bikeId,
      date: new Date(date).toISOString(),
      description,
      mileageAtService: mileage ? parseInt(mileage) : undefined,
      timeMinutes: time ? parseInt(time) : undefined,
      cost: cost ? parseFloat(cost) : undefined,
      createdAt: new Date().toISOString(),
    };
    await maintenance.save(entry);
    onSaved();
  };

  return (
    <form className="form" onSubmit={handleSubmit}>
      <div className="form-row">
        <label>
          Bike
          <select value={bikeId} onChange={(e) => setBikeId(e.target.value)}>
            {bikeList.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        </label>
        <label>
          Date
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </label>
      </div>
      <label>
        What was done?
        <textarea required rows={3} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Replaced chain, adjusted rear derailleur..." />
      </label>
      <div className="form-row">
        <label>
          Mileage (km)
          <input type="number" value={mileage} onChange={(e) => setMileage(e.target.value)} />
        </label>
        <label>
          Time (min)
          <input type="number" value={time} onChange={(e) => setTime(e.target.value)} />
        </label>
        <label>
          Cost
          <input type="number" step="0.01" value={cost} onChange={(e) => setCost(e.target.value)} />
        </label>
      </div>
      <div className="form-actions">
        <button type="submit" className="btn-primary">Log Work</button>
        <button type="button" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  );
}
