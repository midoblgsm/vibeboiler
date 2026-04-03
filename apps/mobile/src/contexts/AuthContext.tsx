import React, { createContext, useContext, useEffect, useState } from "react";
import type { AuthTokens } from "@vibeboiler/shared";
import {
  signIn,
  signUp,
  forgotPassword,
  getStoredTokens,
  clearTokens,
  refreshToken,
} from "../services/firebaseAuth";

interface AuthContextType {
  tokens: AuthTokens | null;
  loading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [tokens, setTokens] = useState<AuthTokens | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const stored = await getStoredTokens();
        if (stored) {
          const refreshed = await refreshToken(stored.refreshToken);
          setTokens(refreshed);
        }
      } catch {
        await clearTokens();
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const login = async (email: string, password: string) => {
    setError(null);
    try {
      const result = await signIn(email, password);
      setTokens(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Login failed";
      setError(message);
      throw err;
    }
  };

  const register = async (email: string, password: string) => {
    setError(null);
    try {
      const result = await signUp(email, password);
      setTokens(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Registration failed";
      setError(message);
      throw err;
    }
  };

  const resetPassword = async (email: string) => {
    setError(null);
    try {
      await forgotPassword(email);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Password reset failed";
      setError(message);
      throw err;
    }
  };

  const logout = async () => {
    await clearTokens();
    setTokens(null);
  };

  return (
    <AuthContext.Provider
      value={{ tokens, loading, error, login, register, resetPassword, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthContext() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuthContext must be used within an AuthProvider");
  }
  return context;
}
