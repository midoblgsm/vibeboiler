import { useAuth } from "../hooks/useAuth";
import styles from "./HomePage.module.css";

export function HomePage() {
  const { user, logout } = useAuth();

  return (
    <div className={styles.container}>
      <h1 className={styles.heading}>Welcome to VibeBoiler</h1>
      <p className={styles.email}>You are logged in as: {user?.email}</p>
      <button onClick={logout} className={styles.logoutButton}>
        Log Out
      </button>
    </div>
  );
}
