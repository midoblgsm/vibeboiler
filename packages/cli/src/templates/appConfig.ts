import { replaceOnce } from "../core/files.js";

export interface AppConfigPatch {
  displayName?: string;
  slug?: string;
  bundleId?: string;
  androidPackage?: string;
  easProjectId?: string;
  expoOwner?: string;
  firebaseApiKey?: string;
}

/**
 * Apply anchored string replacements to apps/mobile/app.config.ts without
 * requiring a TypeScript AST. Each replacement asserts the old literal
 * appears exactly once — if the file has already been patched or diverged,
 * the caller will see a clear error and can resolve it manually.
 *
 * Skips any field the caller doesn't provide (useful for partial re-runs).
 */
export function patchAppConfig(source: string, patch: AppConfigPatch): string {
  let out = source;
  if (patch.displayName) {
    out = replaceOnce(out, `name: "VibeBoiler"`, `name: "${patch.displayName}"`);
  }
  if (patch.slug) {
    out = replaceOnce(out, `slug: "vibeboiler"`, `slug: "${patch.slug}"`);
  }
  if (patch.bundleId) {
    out = replaceOnce(
      out,
      `bundleIdentifier: "com.craftschoolship.vibeboiler"`,
      `bundleIdentifier: "${patch.bundleId}"`,
    );
  }
  if (patch.androidPackage) {
    out = replaceOnce(
      out,
      `package: "com.craftschoolship.vibeboiler"`,
      `package: "${patch.androidPackage}"`,
    );
  }
  if (patch.easProjectId) {
    out = replaceOnce(
      out,
      `projectId: "6eededb8-59ad-480b-90b1-1527783cc5bd"`,
      `projectId: "${patch.easProjectId}"`,
    );
  }
  if (patch.expoOwner) {
    out = replaceOnce(
      out,
      `owner: "craftschoolship"`,
      `owner: "${patch.expoOwner}"`,
    );
  }
  if (patch.firebaseApiKey) {
    out = replaceOnce(
      out,
      `"AIzaSyCBAblPosEg7aLa1yjVI7tKX2ibXj77A1w"`,
      `"${patch.firebaseApiKey}"`,
    );
  }
  return out;
}
