import { describe, it, expect } from "vitest";
import { renderEnvFile } from "../templates/envTemplate.js";

describe("renderEnvFile", () => {
  it("renders all required keys from .env.example", () => {
    const out = renderEnvFile({
      firebase: {
        projectId: "my-proj",
        apiKey: "key",
        authDomain: "my-proj.firebaseapp.com",
        storageBucket: "my-proj.appspot.com",
        messagingSenderId: "12345",
        appId: "1:12345:web:abc",
      },
      neonConnectionUri: "postgresql://u:p@host/db?sslmode=require",
    });
    expect(out).toContain("VITE_FIREBASE_API_KEY=key");
    expect(out).toContain("VITE_FIREBASE_PROJECT_ID=my-proj");
    expect(out).toContain("VITE_FIREBASE_APP_ID=1:12345:web:abc");
    expect(out).toContain("FIREBASE_API_KEY=key");
    expect(out).toContain("NEON_DATABASE_URL=postgresql://u:p@host/db?sslmode=require");
    expect(out).toContain("GOOGLE_APPLICATION_CREDENTIALS=./.vibeboiler/service-account.json");
    expect(out).toContain("EXPO_PUBLIC_FIREBASE_API_KEY=key");
  });
});
