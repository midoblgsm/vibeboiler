import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, act, cleanup } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { App } from "../App";

vi.mock("../hooks/useAuth", () => ({
  useAuth: vi.fn(() => ({
    user: null,
    loading: false,
    error: null,
    role: "user" as const,
    isAdmin: false,
    login: vi.fn(),
    signup: vi.fn(),
    forgotPassword: vi.fn(),
    logout: vi.fn(),
  })),
}));

vi.mock("../lib/firebase", () => ({
  auth: {},
  db: {},
  storage: {},
}));

vi.mock("firebase/auth", () => ({
  getAuth: vi.fn(),
  onAuthStateChanged: vi.fn(() => vi.fn()),
  signInWithEmailAndPassword: vi.fn(),
  createUserWithEmailAndPassword: vi.fn(),
  sendPasswordResetEmail: vi.fn(),
  signOut: vi.fn(),
}));

vi.mock("@vibeboiler/shared", () => ({
  isValidEmail: vi.fn(() => true),
  validatePassword: vi.fn(() => ({ isValid: true, errors: [] })),
  isNonEmpty: vi.fn(() => true),
}));

beforeEach(() => {
  cleanup();
});

function renderWithRouter(route: string) {
  return act(() => {
    render(
      <MemoryRouter initialEntries={[route]}>
        <App />
      </MemoryRouter>,
    );
  });
}

describe("App", () => {
  it("renders login page for unauthenticated users", async () => {
    await renderWithRouter("/login");
    expect(screen.getByRole("heading", { name: "Log In" })).toBeInTheDocument();
  });

  it("renders signup page", async () => {
    await renderWithRouter("/signup");
    expect(screen.getByRole("heading", { name: "Sign Up" })).toBeInTheDocument();
  });

  it("renders forgot password page", async () => {
    await renderWithRouter("/forgot-password");
    expect(screen.getByText("Reset Password")).toBeInTheDocument();
  });

  it("redirects unauthenticated users from home to login", async () => {
    await renderWithRouter("/");
    expect(screen.getByRole("heading", { name: "Log In" })).toBeInTheDocument();
  });

  it("redirects unauthenticated users from admin to login", async () => {
    await renderWithRouter("/admin");
    expect(screen.getByRole("heading", { name: "Log In" })).toBeInTheDocument();
  });
});
