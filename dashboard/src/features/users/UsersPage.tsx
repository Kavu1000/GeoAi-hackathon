import { useState } from "react";
import { Navigate } from "react-router-dom";
import { useDeleteUser, useUpdateUserRole, useUsers } from "../../api/hooks";
import { useAuthStore } from "../../store/authStore";
import type { UserRole } from "../../api/types";

const ROLE_OPTIONS: UserRole[] = ["resident", "traveller", "operator", "admin"];

export function UsersPage() {
  const currentUser = useAuthStore((s) => s.user);
  const [page, setPage] = useState(1);
  const [role, setRole] = useState<UserRole | undefined>(undefined);
  const [q, setQ] = useState("");
  const { data, isLoading, isError } = useUsers({ page, role, q: q || undefined });
  const updateRole = useUpdateUserRole();
  const deleteUser = useDeleteUser();

  // Belt-and-braces client-side gate — the API itself already rejects
  // non-admins with 403, this just avoids flashing the table before that.
  if (currentUser && currentUser.role !== "admin") return <Navigate to="/" replace />;

  return (
    <div>
      <div className="page-header">
        <h1>Users</h1>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <input
            placeholder="Search by email..."
            value={q}
            onChange={(e) => {
              setPage(1);
              setQ(e.target.value);
            }}
          />
          <select
            value={role ?? "all"}
            onChange={(e) => {
              setPage(1);
              setRole(e.target.value === "all" ? undefined : (e.target.value as UserRole));
            }}
          >
            <option value="all">All roles</option>
            {ROLE_OPTIONS.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </div>
      </div>

      {isLoading && <p className="muted">Loading users...</p>}
      {isError && <p className="error-text">Could not load users.</p>}

      {data && (
        <>
          <table className="data-table">
            <thead>
              <tr>
                <th>Email / Device</th>
                <th>Role</th>
                <th>Locale</th>
                <th>Points</th>
                <th>Joined</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((u) => {
                const isSelf = u._id === currentUser?.id;
                return (
                  <tr key={u._id}>
                    <td>{u.email ?? <code>{u.deviceId}</code>}</td>
                    <td>
                      <select
                        value={u.role}
                        disabled={isSelf || updateRole.isPending}
                        onChange={(e) => updateRole.mutate({ id: u._id, role: e.target.value as UserRole })}
                      >
                        {ROLE_OPTIONS.map((r) => (
                          <option key={r} value={r}>
                            {r}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>{u.locale}</td>
                    <td>{u.points}</td>
                    <td>{new Date(u.createdAt).toLocaleDateString()}</td>
                    <td>
                      <button
                        className="btn-ghost"
                        disabled={isSelf || deleteUser.isPending}
                        title={isSelf ? "You can't delete your own account" : "Delete user"}
                        onClick={() => {
                          if (confirm(`Delete ${u.email ?? u.deviceId}? This can't be undone.`)) {
                            deleteUser.mutate(u._id);
                          }
                        }}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                );
              })}
              {data.items.length === 0 && (
                <tr>
                  <td colSpan={6} className="muted" style={{ textAlign: "center", padding: 24 }}>
                    No users for this filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          <div className="pagination">
            <button className="btn-ghost" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              Previous
            </button>
            <span className="muted">
              Page {data.page} · {data.total} total
            </span>
            <button
              className="btn-ghost"
              disabled={page * data.limit >= data.total}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </button>
          </div>
        </>
      )}
    </div>
  );
}
