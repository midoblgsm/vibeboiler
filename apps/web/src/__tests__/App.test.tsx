import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
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

describe("App", () => {
  it("renders login page for unauthenticated users", () => {
    render(
      <MemoryRouter initialEntries={["/login"]}>
        <App />
      </MemoryRouter>,
    );
    expect(screen.getByRole("heading", { name: "Log In" })).toBeInTheDocument();
  });

  it("renders signup page", () => {
    render(
      <MemoryRouter initialEntries={["/signup"]}>
        <App />
      </MemoryRouter>,
    );
    expect(screen.getByRole("heading", { name: "Sign Up" })).toBeInTheDocument();
  });

  it("renders forgot password page", () => {
    render(
      <MemoryRouter initialEntries={["/forgot-password"]}>
        <App />
      </MemoryRouter>,
    );
    expect(screen.getByText("Reset Password")).toBeInTheDocument();
  });

  it("redirects unauthenticated users from home to login", () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <App />
      </MemoryRouter>,
    );
    expect(screen.getByRole("heading", { name: "Log In" })).toBeInTheDocument();
  });

  it("redirects unauthenticated users from admin to login", () => {
    render(
      <MemoryRouter initialEntries={["/admin"]}>
        <App />
      </MemoryRouter>,
    );
    expect(screen.getByRole("heading", { name: "Log In" })).toBeInTheDocument();
  });
});
