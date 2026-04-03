import { useAuth } from "../hooks/useAuth";

export function HomePage() {
  const { user, logout } = useAuth();

  return (
    <div style={{ maxWidth: 600, margin: "2rem auto", padding: "0 1rem" }}>
      <h1>Welcome to VibeBoiler</h1>
      <p>You are logged in as: {user?.email}</p>
      <button onClick={logout} style={{ padding: "0.5rem 1rem" }}>
        Log Out
      </button>
    </div>
  );
}
