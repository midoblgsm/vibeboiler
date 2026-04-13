import path from "node:path";
import { promises as fs } from "node:fs";
import { logger } from "../core/logger.js";
import { readTextOrNull } from "../core/files.js";
import { REQUIRED_SECRETS, collectSecretValues } from "./secrets.js";
import type { CommandContext } from "./shared.js";

/**
 * Read-only diagnostics: report which state / local files / secrets are
 * populated, and cross-check the REQUIRED_SECRETS map against the secret
 * names actually referenced in .github/workflows/*.yml.
 */
export async function runDoctor(ctx: CommandContext): Promise<void> {
  logger.step("Doctor — diagnostics");

  const filesToCheck = [
    ".firebaserc",
    ".env",
    "apps/mobile/app.config.ts",
    "apps/mobile/eas.json",
    ".vibeboiler/state.json",
    ".vibeboiler/service-account.json",
  ];
  for (const rel of filesToCheck) {
    const abs = path.resolve(ctx.cwd, rel);
    const exists = (await readTextOrNull(abs)) !== null;
    logger.plain(`${exists ? "\u2713" : "\u2717"} ${rel}`);
  }

  const { values, missing } = collectSecretValues(ctx);
  logger.plain("");
  logger.plain(`Secrets ready: ${Object.keys(values).length}/${Object.keys(REQUIRED_SECRETS).length}`);
  if (missing.length) logger.warn(`Missing: ${missing.join(", ")}`);

  const workflowSecrets = await scanWorkflowSecrets(ctx.cwd);
  // GITHUB_TOKEN is auto-provided by GitHub Actions; not something the CLI sets.
  const BUILTINS = new Set(["GITHUB_TOKEN"]);
  const unknown = [...workflowSecrets].filter(
    (s) => !(s in REQUIRED_SECRETS) && !BUILTINS.has(s),
  );
  if (unknown.length) {
    logger.warn(
      `Workflows reference secrets not in REQUIRED_SECRETS: ${unknown.join(", ")}`,
    );
  } else {
    logger.success("All secrets referenced by workflows are in the CLI's required-set");
  }
}

async function scanWorkflowSecrets(cwd: string): Promise<Set<string>> {
  const dir = path.resolve(cwd, ".github/workflows");
  const found = new Set<string>();
  let entries: string[];
  try {
    entries = await fs.readdir(dir);
  } catch {
    return found;
  }
  const re = /secrets\.([A-Z_][A-Z0-9_]*)/g;
  for (const f of entries) {
    if (!/\.ya?ml$/.test(f)) continue;
    const text = await readTextOrNull(path.join(dir, f));
    if (!text) continue;
    for (const m of text.matchAll(re)) found.add(m[1]);
  }
  return found;
}
