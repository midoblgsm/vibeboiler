import { signIn, signUp, forgotPassword } from "../src/services/firebaseAuth";

// Mock expo-constants
jest.mock("expo-constants", () => ({
  expoConfig: {
    extra: {
      FIREBASE_API_KEY: "test-api-key",
    },
  },
}));

// Mock expo-secure-store
jest.mock("expo-secure-store", () => ({
  setItemAsync: jest.fn(),
  getItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

// Mock fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

beforeEach(() => {
  mockFetch.mockClear();
});

describe("Firebase Auth Service", () => {
  describe("signIn", () => {
    it("calls the signInWithPassword endpoint", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          idToken: "test-id-token",
          refreshToken: "test-refresh-token",
          expiresIn: "3600",
        }),
      });

      const result = await signIn("test@example.com", "password123");

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("signInWithPassword"),
        expect.objectContaining({ method: "POST" }),
      );
      expect(result.idToken).toBe("test-id-token");
    });

    it("throws on auth failure", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({
          error: { code: 400, message: "INVALID_PASSWORD", errors: [] },
        }),
      });

      await expect(signIn("test@example.com", "wrong")).rejects.toThrow(
        "INVALID_PASSWORD",
      );
    });
  });

  describe("signUp", () => {
    it("calls the signUp endpoint", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          idToken: "new-id-token",
          refreshToken: "new-refresh-token",
          expiresIn: "3600",
        }),
      });

      const result = await signUp("new@example.com", "Password1");

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("signUp"),
        expect.objectContaining({ method: "POST" }),
      );
      expect(result.idToken).toBe("new-id-token");
    });
  });

  describe("forgotPassword", () => {
    it("calls the sendOobCode endpoint", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      });

      await forgotPassword("test@example.com");

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("sendOobCode"),
        expect.objectContaining({ method: "POST" }),
      );
    });
  });
});
