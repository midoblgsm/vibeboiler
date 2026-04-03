import { useState, useEffect } from "react";
import {
  User,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut,
} from "firebase/auth";
import { auth } from "../lib/firebase";

interface AuthState {
  user: User | null;
  loading: boolean;
  error: string | null;
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    user: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setState({ user, loading: false, error: null });
    });
    return unsubscribe;
  }, []);

  const login = async (email: string, password: string) => {
    setState((prev) => ({ ...prev, error: null, loading: true }));
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Login failed";
      setState((prev) => ({ ...prev, error: message, loading: false }));
      throw err;
    }
  };

  const signup = async (email: string, password: string) => {
    setState((prev) => ({ ...prev, error: null, loading: true }));
    try {
      await createUserWithEmailAndPassword(auth, email, password);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Signup failed";
      setState((prev) => ({ ...prev, error: message, loading: false }));
      throw err;
    }
  };

  const forgotPassword = async (email: string) => {
    setState((prev) => ({ ...prev, error: null }));
    try {
      await sendPasswordResetEmail(auth, email);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Password reset failed";
      setState((prev) => ({ ...prev, error: message }));
      throw err;
    }
  };

  const logout = async () => {
    await signOut(auth);
  };

  return {
    user: state.user,
    loading: state.loading,
    error: state.error,
    login,
    signup,
    forgotPassword,
    logout,
  };
}
