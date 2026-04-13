import { promises as fs } from "node:fs";
import path from "node:path";
import { WizardStateSchema, type WizardState, emptyState } from "./config.js";

export const DEFAULT_STATE_DIR = ".vibeboiler";
export const DEFAULT_STATE_FILE = "state.json";

export function resolveStatePath(cwd: string, override?: string): string {
  if (override) return path.resolve(cwd, override);
  return path.resolve(cwd, DEFAULT_STATE_DIR, DEFAULT_STATE_FILE);
}

export async function loadState(statePath: string): Promise<WizardState> {
  try {
    const raw = await fs.readFile(statePath, "utf8");
    const parsed = JSON.parse(raw);
    return WizardStateSchema.parse(parsed);
  } catch (err: unknown) {
    if (isNotFound(err)) return emptyState();
    throw err;
  }
}

export async function saveState(statePath: string, state: WizardState): Promise<void> {
  state.updatedAt = new Date().toISOString();
  await fs.mkdir(path.dirname(statePath), { recursive: true });
  await fs.writeFile(statePath, JSON.stringify(state, null, 2) + "\n", "utf8");
}

export function markStep(state: WizardState, step: string): void {
  state.steps[step] = true;
}

export function isStepDone(state: WizardState, step: string): boolean {
  return Boolean(state.steps[step]);
}

function isNotFound(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code: string }).code === "ENOENT"
  );
}
