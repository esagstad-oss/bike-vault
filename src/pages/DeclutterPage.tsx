import { bikes, components, tools, maintenance } from "../db";
import { useAsync } from "../hooks";
import { BIKE_STATUS_LABELS } from "../types";

export default function DeclutterPage() {
  const { data: bikeList } = useAsync(() => bikes.getAll());
  const { data: allParts } = useAsync(() => components.getAll());
  const { data: allTools } = useAsync(() => tools.getAll());
  const { data: allMaint } = useAsync(() => maintenance.getAll());

  const now = Date.now();
  const DAY = 86400000;

  // Bikes not ridden (no maintenance) in 6+ months
  const staleBikes = (bikeList ?? []).filter((bike) => {
    if (bike.status !== "active") return false;
    const entries = (allMaint ?? []).filter((m) => m.bikeId === bike.id);
    if (entries.length === 0) return true; // never serviced = flag it
    const latest = Math.max(...entries.map((m) => new Date(m.date).getTime()));
    return now - latest > 180 * DAY;
  });

  // Spare parts sitting unused
  const spareParts = (allParts ?? []).filter((p) => !p.bikeId);

  // Duplicate tool categories
  const toolsByCat = new Map<string, typeof allTools>();
  for (const t of allTools ?? []) {
    const list = toolsByCat.get(t.category) ?? [];
    list.push(t);
    toolsByCat.set(t.category, list);
  }
  const duplicateTools = [...toolsByCat.entries()].filter(
    ([, list]) => list!.length > 1
  );

  const nothingToShow =
    staleBikes.length === 0 &&
    spareParts.length === 0 &&
    duplicateTools.length === 0;

  return (
    <div className="page">
      <header className="page-header">
        <h1>Declutter</h1>
      </header>

      {nothingToShow && (
        <p className="empty-state">Everything looks lean. Nothing to flag.</p>
      )}

      {staleBikes.length > 0 && (
        <section>
          <h2 className="section-title">Bikes with no activity (6+ months)</h2>
          <div className="card-grid">
            {staleBikes.map((b) => (
              <div key={b.id} className="card card--warning">
                <h3>{b.name}</h3>
                <p className="card-subtitle">
                  {b.brand} {b.model} — {BIKE_STATUS_LABELS[b.status]}
                </p>
                <p className="card-notes">
                  Consider selling, storing, or at least servicing this bike.
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {spareParts.length > 0 && (
        <section>
          <h2 className="section-title">Uninstalled spare parts</h2>
          <p className="section-hint">
            Parts not assigned to any bike. Install them or consider selling.
          </p>
          <div className="card-grid">
            {spareParts.map((p) => (
              <div key={p.id} className="card card--warning">
                <h3>{p.name}</h3>
                <p className="card-subtitle">
                  {p.brand} {p.model ?? ""}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {duplicateTools.length > 0 && (
        <section>
          <h2 className="section-title">Possible duplicate tools</h2>
          {duplicateTools.map(([cat, list]) => (
            <div key={cat} className="card card--warning">
              <h3>{cat}</h3>
              <ul>
                {list!.map((t) => (
                  <li key={t.id}>
                    {t.name} {t.brand ? `(${t.brand})` : ""}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}
