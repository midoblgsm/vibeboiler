import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { isValidEmail } from "@vibeboiler/shared";
import { AuthLayout } from "../components/AuthLayout";
import styles from "../components/AuthLayout.module.css";

export function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!isValidEmail(email)) {
      setError("Please enter a valid email address");
      return;
    }

    setLoading(true);
    try {
      await login(email, password);
      navigate("/");
    } catch {
      setError("Invalid email or password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout title="Log In" subtitle="Welcome back to VibeBoiler">
      <form onSubmit={handleSubmit} noValidate className={styles.form}>
        {error && <p className={styles.error}>{error}</p>}
        <div className={styles.field}>
          <label htmlFor="email" className={styles.label}>Email</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className={styles.input}
          />
        </div>
        <div className={styles.field}>
          <label htmlFor="password" className={styles.label}>Password</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className={styles.input}
          />
        </div>
        <button type="submit" disabled={loading} className={styles.button}>
          {loading ? "Logging in..." : "Log In"}
        </button>
      </form>
      <div className={styles.footerLink}>
        <Link to="/forgot-password">Forgot password?</Link>
      </div>
      <div className={styles.footer}>
        Don&apos;t have an account? <Link to="/signup">Sign up</Link>
      </div>
    </AuthLayout>
  );
}
