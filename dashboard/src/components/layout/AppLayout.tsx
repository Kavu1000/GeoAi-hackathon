import { NavLink, Outlet, Navigate } from "react-router-dom";
import { useAuthStore } from "../../store/authStore";

const links: { to: string; label: string; end?: boolean }[] = [
  { to: "/", label: "Overview", end: true },
  { to: "/map", label: "Coverage Map" },
  { to: "/reports", label: "Reports" },
  { to: "/recommendations", label: "Recommendations" },
  { to: "/towers", label: "Towers" },
  { to: "/forecast", label: "Forecast Planning" },
];

const adminLinks: { to: string; label: string; end?: boolean }[] = [{ to: "/users", label: "Users" }];

export function AppLayout() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  if (!user) return <Navigate to="/login" replace />;

  const navLinks = user.role === "admin" ? [...links, ...adminLinks] : links;

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">Connect4All</div>
        <nav>
          {navLinks.map((l) => (
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
