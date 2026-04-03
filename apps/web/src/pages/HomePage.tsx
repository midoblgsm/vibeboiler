import { Link } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import styles from "./HomePage.module.css";

export function HomePage() {
  const { user, role, isAdmin, logout } = useAuth();

  return (
    <div className={styles.container}>
      <h1 className={styles.heading}>Welcome to VibeBoiler</h1>
      <p className={styles.email}>
        Logged in as {role}: {user?.email}
      </p>
      {isAdmin && (
        <Link to="/admin" className={styles.adminLink}>
          Admin Dashboard
        </Link>
      )}
      <button onClick={logout} className={styles.logoutButton}>
        Log Out
      </button>
    </div>
  );
}
