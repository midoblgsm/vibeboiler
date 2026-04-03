import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../hooks/useAuth";
import { auth } from "../lib/firebase";
import styles from "./AdminPage.module.css";

interface AdminUser {
  uid: string;
  email: string;
  displayName: string | null;
  role: string;
  createdAt: string;
}

const FUNCTIONS_URL = import.meta.env.VITE_FUNCTIONS_URL as string;

async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = await auth.currentUser?.getIdToken();
  const res = await fetch(`${FUNCTIONS_URL}/${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error?.message ?? "Request failed");
  return json.data;
}

export function AdminPage() {
  const { user, logout } = useAuth();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newDisplayName, setNewDisplayName] = useState("");
  const [newRole, setNewRole] = useState<"user" | "admin">("user");
  const [creating, setCreating] = useState(false);

  const fetchUsers = useCallback(async () => {
    try {
      setError(null);
      const data = await apiFetch<AdminUser[]>("listUsers");
      setUsers(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load users");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setError(null);
    try {
      await apiFetch("createUser", {
        method: "POST",
        body: JSON.stringify({
          email: newEmail,
          password: newPassword,
          displayName: newDisplayName || undefined,
          role: newRole,
        }),
      });
      setNewEmail("");
      setNewPassword("");
      setNewDisplayName("");
      setNewRole("user");
      await fetchUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create user");
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (uid: string) => {
    if (!confirm("Are you sure you want to delete this user?")) return;
    setError(null);
    try {
      await apiFetch("deleteUser", {
        method: "DELETE",
        body: JSON.stringify({ uid }),
      });
      await fetchUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete user");
    }
  };

  const handleRoleChange = async (uid: string, role: "user" | "admin") => {
    setError(null);
    try {
      await apiFetch("setUserRole", {
        method: "POST",
        body: JSON.stringify({ uid, role }),
      });
      await fetchUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update role");
    }
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.heading}>Admin Dashboard</h1>
          <p className={styles.subtext}>Logged in as admin: {user?.email}</p>
        </div>
        <button onClick={logout} className={styles.logoutButton}>
          Log Out
        </button>
      </header>

      {error && <p className={styles.error}>{error}</p>}

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Users</h2>
        {loading ? (
          <p>Loading users...</p>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Email</th>
                <th>Display Name</th>
                <th>Role</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.uid}>
                  <td>{u.email}</td>
                  <td>{u.displayName ?? "-"}</td>
                  <td>
                    <select
                      value={u.role}
                      onChange={(e) =>
                        handleRoleChange(u.uid, e.target.value as "user" | "admin")
                      }
                    >
                      <option value="user">user</option>
                      <option value="admin">admin</option>
                    </select>
                  </td>
                  <td>
                    <button
                      onClick={() => handleDelete(u.uid)}
                      className={styles.deleteButton}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Create User</h2>
        <form onSubmit={handleCreate} className={styles.form}>
          <input
            type="email"
            placeholder="Email"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder="Password (min 8 chars)"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
            minLength={8}
          />
          <input
            type="text"
            placeholder="Display Name (optional)"
            value={newDisplayName}
            onChange={(e) => setNewDisplayName(e.target.value)}
          />
          <select value={newRole} onChange={(e) => setNewRole(e.target.value as "user" | "admin")}>
            <option value="user">user</option>
            <option value="admin">admin</option>
          </select>
          <button type="submit" disabled={creating} className={styles.createButton}>
            {creating ? "Creating..." : "Create User"}
          </button>
        </form>
      </section>
    </div>
  );
}
