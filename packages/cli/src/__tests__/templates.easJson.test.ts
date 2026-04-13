import { describe, it, expect } from "vitest";
import { patchEasJson } from "../templates/easJson.js";

const FIXTURE = JSON.stringify(
  {
    cli: { version: ">= 13.0.0" },
    submit: {
      production: {
        ios: { appleId: "old@example.com", ascAppId: "0000", appleTeamId: "OLD" },
        android: { track: "internal" },
      },
    },
  },
  null,
  2,
);

describe("patchEasJson", () => {
  it("updates ios submit fields and leaves android untouched", () => {
    const patched = patchEasJson(FIXTURE, {
      appleId: "new@example.com",
      ascAppId: "9999",
      appleTeamId: "NEW",
    });
    const parsed = JSON.parse(patched);
    expect(parsed.submit.production.ios.appleId).toBe("new@example.com");
    expect(parsed.submit.production.ios.ascAppId).toBe("9999");
    expect(parsed.submit.production.ios.appleTeamId).toBe("NEW");
    expect(parsed.submit.production.android.track).toBe("internal");
  });

  it("skips undefined fields", () => {
    const patched = patchEasJson(FIXTURE, { ascAppId: "9999" });
    const parsed = JSON.parse(patched);
    expect(parsed.submit.production.ios.appleId).toBe("old@example.com");
    expect(parsed.submit.production.ios.ascAppId).toBe("9999");
  });
});
