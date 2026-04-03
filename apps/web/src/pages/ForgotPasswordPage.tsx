import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { isValidEmail } from "@vibeboiler/shared";
import { AuthLayout } from "../components/AuthLayout";
import styles from "../components/AuthLayout.module.css";

export function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const { forgotPassword } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (!isValidEmail(email)) {
      setError("Please enter a valid email address");
      return;
    }

    setLoading(true);
    try {
      await forgotPassword(email);
      setSuccess(true);
    } catch {
      setError("Failed to send reset email. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout title="Reset Password" subtitle="Enter your email to receive a reset link">
      {success ? (
        <div>
          <p className={styles.success}>
            Password reset email sent! Check your inbox.
          </p>
          <div className={styles.footer}>
            <Link to="/login">Back to login</Link>
          </div>
        </div>
      ) : (
        <>
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
            <button type="submit" disabled={loading} className={styles.button}>
              {loading ? "Sending..." : "Send Reset Email"}
            </button>
          </form>
          <div className={styles.footer}>
            <Link to="/login">Back to login</Link>
          </div>
        </>
      )}
    </AuthLayout>
  );
}
