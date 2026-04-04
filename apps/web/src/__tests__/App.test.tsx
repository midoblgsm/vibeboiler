import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { App } from "../App";

vi.mock("../lib/firebase", () => ({
  auth: {
    onAuthStateChanged: vi.fn((callback: (user: null) => void) => {
      callback(null);
      return vi.fn();
    }),
  },
  db: {},
  storage: {},
}));

vi.mock("firebase/auth", () => ({
  getAuth: vi.fn(),
  onAuthStateChanged: vi.fn((_, callback: (user: null) => void) => {
    callback(null);
    return vi.fn();
  }),
  signInWithEmailAndPassword: vi.fn(),
  createUserWithEmailAndPassword: vi.fn(),
  sendPasswordResetEmail: vi.fn(),
  signOut: vi.fn(),
}));

describe("App", () => {
  it("renders login page for unauthenticated users", async () => {
    render(
      <MemoryRouter initialEntries={["/login"]}>
        <App />
      </MemoryRouter>,
    );
    expect(await screen.findByRole("heading", { name: "Log In" })).toBeInTheDocument();
  });

  it("renders signup page", async () => {
    render(
      <MemoryRouter initialEntries={["/signup"]}>
        <App />
      </MemoryRouter>,
    );
    expect(await screen.findByRole("heading", { name: "Sign Up" })).toBeInTheDocument();
  });

  it("renders forgot password page", async () => {
    render(
      <MemoryRouter initialEntries={["/forgot-password"]}>
        <App />
      </MemoryRouter>,
    );
    expect(await screen.findByText("Reset Password")).toBeInTheDocument();
  });

  it("redirects unauthenticated users from home to login", async () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <App />
      </MemoryRouter>,
    );
    expect(await screen.findByRole("heading", { name: "Log In" })).toBeInTheDocument();
  });

  it("redirects unauthenticated users from admin to login", async () => {
    render(
      <MemoryRouter initialEntries={["/admin"]}>
        <App />
      </MemoryRouter>,
    );
    expect(await screen.findByRole("heading", { name: "Log In" })).toBeInTheDocument();
  });
});
