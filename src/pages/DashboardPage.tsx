import { bikes, components, tools, maintenance, exportAll, importAll } from "../db";
import { useAsync } from "../hooks";

export default function DashboardPage() {
  const { data: bikeList } = useAsync(() => bikes.getAll());
  const { data: partList } = useAsync(() => components.getAll());
  const { data: toolList } = useAsync(() => tools.getAll());
  const { data: maintList } = useAsync(() => maintenance.getAll());

  const activeBikes = bikeList?.filter((b) => b.status === "active").length ?? 0;
  const totalParts = partList?.length ?? 0;
  const spareParts = partList?.filter((p) => !p.bikeId).length ?? 0;
  const totalTools = toolList?.length ?? 0;
  const totalMaint = maintList?.length ?? 0;

  const recentMaint = [...(maintList ?? [])]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 5);

  const bikeName = (id: string) =>
    bikeList?.find((b) => b.id === id)?.name ?? "Unknown";

  const handleExport = async () => {
    const json = await exportAll();
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `bike-vault-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const text = await file.text();
      await importAll(text);
      window.location.reload();
    };
    input.click();
  };

  return (
    <div className="page">
      <header className="page-header">
        <h1>Dashboard</h1>
      </header>

      <div className="stats-grid">
        <div className="stat-card">
          <span className="stat-number">{activeBikes}</span>
          <span className="stat-label">Active Bikes</span>
        </div>
        <div className="stat-card">
          <span className="stat-number">{totalParts}</span>
          <span className="stat-label">Parts ({spareParts} spare)</span>
        </div>
        <div className="stat-card">
          <span className="stat-number">{totalTools}</span>
          <span className="stat-label">Tools</span>
        </div>
        <div className="stat-card">
          <span className="stat-number">{totalMaint}</span>
          <span className="stat-label">Service Entries</span>
        </div>
      </div>

      {recentMaint.length > 0 && (
        <section>
          <h2 className="section-title">Recent Maintenance</h2>
          <div className="log-list">
            {recentMaint.map((entry) => (
              <div key={entry.id} className="log-entry">
                <div className="log-date">
                  {new Date(entry.date).toLocaleDateString()}
                </div>
                <div className="log-body">
                  <strong>{bikeName(entry.bikeId)}</strong>
                  <p>{entry.description}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="backup-section">
        <h2 className="section-title">Data</h2>
        <div className="form-actions">
          <button className="btn-primary" onClick={handleExport}>
            Export Backup (JSON)
          </button>
          <button onClick={handleImport}>Import Backup</button>
        </div>
      </section>
    </div>
  );
}
