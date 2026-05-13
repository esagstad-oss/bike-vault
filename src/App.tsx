import { BrowserRouter, Routes, Route, NavLink, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./AuthContext";
import { useEffect } from "react";
import { pullFromCloud } from "./sync";
import LoginPage from "./LoginPage";
import DashboardPage from "./pages/DashboardPage";
import BikesPage from "./pages/BikesPage";
import PartsPage from "./pages/PartsPage";
import ToolsPage from "./pages/ToolsPage";
import MaintenancePage from "./pages/MaintenancePage";
import DeclutterPage from "./pages/DeclutterPage";
import "./app.css";

function AppShell() {
  const { user, loading, signOut } = useAuth();

  useEffect(() => {
    if (user) {
      pullFromCloud().catch((err) =>
        console.error("Initial sync pull failed:", err)
      );
    }
  }, [user]);

  if (loading) return <div className="loading">Loading…</div>;
  if (!user) return <LoginPage />;

  return (
    <BrowserRouter basename="/bike-vault">
      <nav className="nav">
        <NavLink to="/dashboard">Dashboard</NavLink>
        <NavLink to="/bikes">Bikes</NavLink>
        <NavLink to="/parts">Parts</NavLink>
        <NavLink to="/tools">Tools</NavLink>
        <NavLink to="/maintenance">Maintenance</NavLink>
        <NavLink to="/declutter">Declutter</NavLink>
        <button className="nav-signout" onClick={signOut}>Sign out</button>
      </nav>
      <Routes>
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/bikes" element={<BikesPage />} />
        <Route path="/parts" element={<PartsPage />} />
        <Route path="/tools" element={<ToolsPage />} />
        <Route path="/maintenance" element={<MaintenancePage />} />
        <Route path="/declutter" element={<DeclutterPage />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppShell />
    </AuthProvider>
  );
}
