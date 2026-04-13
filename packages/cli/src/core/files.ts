import { promises as fs } from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { logger } from "./logger.js";
import { CliError } from "./errors.js";

export async function readTextOrNull(filePath: string): Promise<string | null> {
  try {
    return await fs.readFile(filePath, "utf8");
  } catch (err) {
    if (isNotFound(err)) return null;
    throw err;
  }
}

export async function writeIfChanged(filePath: string, contents: string): Promise<boolean> {
  const existing = await readTextOrNull(filePath);
  if (existing !== null && hash(existing) === hash(contents)) {
    logger.debug(`unchanged: ${filePath}`);
    return false;
  }
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, contents, "utf8");
  logger.success(
    existing === null ? `created ${filePath}` : `updated ${filePath}`,
  );
  return true;
}

export async function writeBinary(filePath: string, data: Uint8Array): Promise<void> {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, data);
}

export async function appendLinesIfMissing(filePath: string, lines: string[]): Promise<void> {
  const existing = (await readTextOrNull(filePath)) ?? "";
  const existingLines = new Set(existing.split(/\r?\n/).map((l) => l.trim()));
  const missing = lines.filter((l) => !existingLines.has(l.trim()));
  if (missing.length === 0) return;
  const suffix = existing.endsWith("\n") || existing.length === 0 ? "" : "\n";
  await fs.writeFile(filePath, existing + suffix + missing.join("\n") + "\n", "utf8");
  logger.success(`updated ${filePath} (appended ${missing.length} line(s))`);
}

export function replaceOnce(content: string, needle: string, replacement: string): string {
  const idx = content.indexOf(needle);
  if (idx === -1) {
    throw new CliError(`Could not find literal in file to replace: ${needle}`);
  }
  if (content.indexOf(needle, idx + needle.length) !== -1) {
    throw new CliError(
      `Literal appears more than once in file, refusing to replace ambiguously: ${needle}`,
    );
  }
  return content.slice(0, idx) + replacement + content.slice(idx + needle.length);
}

function hash(s: string): string {
  return crypto.createHash("sha256").update(s).digest("hex");
}

function isNotFound(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code: string }).code === "ENOENT"
  );
}
