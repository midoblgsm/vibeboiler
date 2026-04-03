import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { isValidEmail } from "@vibeboiler/shared";

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
    <div style={{ maxWidth: 400, margin: "2rem auto", padding: "0 1rem" }}>
      <h1>Reset Password</h1>
      {success ? (
        <div>
          <p style={{ color: "green" }}>
            Password reset email sent! Check your inbox.
          </p>
          <Link to="/login">Back to login</Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} noValidate>
          {error && <p style={{ color: "red" }}>{error}</p>}
          <div style={{ marginBottom: "1rem" }}>
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={{ display: "block", width: "100%", padding: "0.5rem" }}
            />
          </div>
          <button type="submit" disabled={loading} style={{ padding: "0.5rem 1rem" }}>
            {loading ? "Sending..." : "Send Reset Email"}
          </button>
          <p style={{ marginTop: "1rem" }}>
            <Link to="/login">Back to login</Link>
          </p>
        </form>
      )}
    </div>
  );
}
