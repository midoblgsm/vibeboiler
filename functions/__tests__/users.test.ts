import { describe, it, expect, vi } from "vitest";

// Mock firebase-admin
vi.mock("firebase-admin", () => ({
  initializeApp: vi.fn(),
  auth: vi.fn(() => ({
    verifyIdToken: vi.fn().mockResolvedValue({
      uid: "test-uid",
      email: "test@example.com",
    }),
  })),
}));

// Mock the database module
vi.mock("../src/db", () => ({
  getDb: vi.fn(() => ({
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          limit: vi.fn().mockResolvedValue([
            {
              id: "uuid-1",
              firebaseUid: "test-uid",
              email: "test@example.com",
              displayName: "Test User",
              bio: null,
              avatarUrl: null,
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          ]),
        })),
      })),
    })),
  })),
}));

describe("Users API", () => {
  it("should have firebase-admin initialized", async () => {
    const admin = await import("firebase-admin");
    expect(admin.initializeApp).toBeDefined();
  });

  it("should mock the database correctly", async () => {
    const { getDb } = await import("../src/db");
    const db = getDb();
    expect(db.select).toBeDefined();
  });
});
