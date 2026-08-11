import { NavLink, Outlet, Navigate } from "react-router-dom";
import { useAuthStore } from "../../store/authStore";
import { useHexLiveSync } from "../../realtime/useHexLiveSync";

const links: { to: string; label: string; end?: boolean }[] = [
  { to: "/", label: "Coverage Map", end: true },
  { to: "/record", label: "Record" },
  { to: "/speedtest", label: "Test my speed" },
];

export function AppLayout() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  // Called unconditionally, before the early return below, to satisfy the
  // Rules of Hooks — persists one socket connection across in-app
  // navigation instead of reconnecting on every page.
  useHexLiveSync();

  if (!user) return <Navigate to="/login" replace />;

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">Connect4All</div>
        <nav>
          {links.map((l) => (
            <NavLink key={l.to} to={l.to} end={l.end} className={({ isActive }) => (isActive ? "nav-link active" : "nav-link")}>
              {l.label}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-footer">
          <div className="user-email">{user.email ?? user.role}</div>
          <button className="btn-ghost" onClick={logout}>
            Log out
          </button>
        </div>
      </aside>
      <main className="content">
        <Outlet />
      </main>
    </div>
  );
}
