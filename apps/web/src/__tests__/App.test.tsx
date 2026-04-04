import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

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

describe("App", () => {
  it("renders login page for unauthenticated users", async () => {
    const { App } = await import("../App");
    const errors: string[] = [];
    const origError = console.error;
    console.error = (...args: unknown[]) => {
      errors.push(args.map(String).join(" "));
    };
    try {
      render(
        <MemoryRouter initialEntries={["/login"]}>
          <App />
        </MemoryRouter>,
      );
      if (document.body.innerHTML.includes("<div />") || !document.body.textContent?.trim()) {
        throw new Error(
          `Empty DOM rendered. console.error output:\n${errors.join("\n")}\nHTML: ${document.body.innerHTML}`,
        );
      }
      expect(screen.getByRole("heading", { name: "Log In" })).toBeInTheDocument();
    } finally {
      console.error = origError;
    }
  });

  it("renders signup page", async () => {
    const { App } = await import("../App");
    render(
      <MemoryRouter initialEntries={["/signup"]}>
        <App />
      </MemoryRouter>,
    );
    expect(screen.getByRole("heading", { name: "Sign Up" })).toBeInTheDocument();
  });

  it("renders forgot password page", async () => {
    const { App } = await import("../App");
    render(
      <MemoryRouter initialEntries={["/forgot-password"]}>
        <App />
      </MemoryRouter>,
    );
    expect(screen.getByText("Reset Password")).toBeInTheDocument();
  });

  it("redirects unauthenticated users from home to login", async () => {
    const { App } = await import("../App");
    render(
      <MemoryRouter initialEntries={["/"]}>
        <App />
      </MemoryRouter>,
    );
    expect(screen.getByRole("heading", { name: "Log In" })).toBeInTheDocument();
  });

  it("redirects unauthenticated users from admin to login", async () => {
    const { App } = await import("../App");
    render(
      <MemoryRouter initialEntries={["/admin"]}>
        <App />
      </MemoryRouter>,
    );
    expect(screen.getByRole("heading", { name: "Log In" })).toBeInTheDocument();
  });
});
