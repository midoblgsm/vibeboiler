import { describe, it, expect } from "vitest";
import { patchAppConfig } from "../templates/appConfig.js";

const FIXTURE = `const IS_EAS_BUILD = process.env.EAS_BUILD === "true";

/** @type {import('expo/config').ExpoConfig} */
const config = {
  name: "VibeBoiler",
  slug: "vibeboiler",
  ios: {
    bundleIdentifier: "com.craftschoolship.vibeboiler",
  },
  android: {
    package: "com.craftschoolship.vibeboiler",
  },
  extra: {
    eas: {
      projectId: "6eededb8-59ad-480b-90b1-1527783cc5bd",
    },
    FIREBASE_API_KEY:
      process.env.EXPO_PUBLIC_FIREBASE_API_KEY || "AIzaSyCBAblPosEg7aLa1yjVI7tKX2ibXj77A1w",
  },
  owner: "craftschoolship",
};

export default { expo: config };
`;

describe("patchAppConfig", () => {
  it("replaces known literals in place", () => {
    const out = patchAppConfig(FIXTURE, {
      displayName: "Acme",
      slug: "acme",
      bundleId: "com.acme.app",
      androidPackage: "com.acme.app",
      easProjectId: "11111111-2222-3333-4444-555555555555",
      expoOwner: "acme-team",
      firebaseApiKey: "AIzaFakeKey",
    });
    expect(out).toContain(`name: "Acme"`);
    expect(out).toContain(`slug: "acme"`);
    expect(out).toContain(`bundleIdentifier: "com.acme.app"`);
    expect(out).toContain(`package: "com.acme.app"`);
    expect(out).toContain(`projectId: "11111111-2222-3333-4444-555555555555"`);
    expect(out).toContain(`owner: "acme-team"`);
    expect(out).toContain(`"AIzaFakeKey"`);
    expect(out).not.toContain("VibeBoiler");
    expect(out).not.toContain("craftschoolship");
  });

  it("throws if a literal isn't found (already patched)", () => {
    const patched = patchAppConfig(FIXTURE, { slug: "acme" });
    expect(() => patchAppConfig(patched, { slug: "other" })).toThrow();
  });

  it("leaves untouched fields alone when only some are provided", () => {
    const out = patchAppConfig(FIXTURE, { slug: "acme" });
    expect(out).toContain(`slug: "acme"`);
    expect(out).toContain(`name: "VibeBoiler"`); // untouched
  });
});
