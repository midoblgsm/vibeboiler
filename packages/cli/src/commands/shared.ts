import path from "node:path";
import { TokenVault, VAULT_KEYS } from "../core/secrets.js";
import { askPassword, askInput, askConfirm } from "../core/prompts.js";
import { loadState, saveState, resolveStatePath } from "../core/state.js";
import type { WizardState } from "../core/config.js";
import { logger } from "../core/logger.js";
import { readTextOrNull } from "../core/files.js";

export interface GlobalFlags {
  yes?: boolean;
  state?: string;
  dryRun?: boolean;
  verbose?: boolean;
  skip?: string;
  only?: string;
  config?: string;
}

export interface CommandContext {
  cwd: string;
  statePath: string;
  state: WizardState;
  vault: TokenVault;
  flags: GlobalFlags;
}

export async function loadCommandContext(
  cwd: string,
  flags: GlobalFlags,
): Promise<CommandContext> {
  const statePath = resolveStatePath(cwd, flags.state);
  const state = await loadState(statePath);
  const vault = new TokenVault();
  await hydrateVaultFromEnv(vault);
  return { cwd, statePath, state, vault, flags };
}

export async function persist(ctx: CommandContext): Promise<void> {
  if (ctx.flags.dryRun) {
    logger.debug("dry-run: not writing state");
    return;
  }
  await saveState(ctx.statePath, ctx.state);
}

async function hydrateVaultFromEnv(vault: TokenVault): Promise<void> {
  const map: Array<[string, string]> = [
    ["VB_GCP_TOKEN", VAULT_KEYS.GCP_TOKEN],
    ["VB_NEON_KEY", VAULT_KEYS.NEON_API_KEY],
    ["VB_GH_TOKEN", VAULT_KEYS.GITHUB_TOKEN],
    ["VB_EXPO_TOKEN", VAULT_KEYS.EXPO_TOKEN],
    ["VB_ASC_ISSUER_ID", VAULT_KEYS.APPLE_ISSUER_ID],
    ["VB_ASC_KEY_ID", VAULT_KEYS.APPLE_KEY_ID],
    ["VB_APPLE_APP_SPECIFIC_PASSWORD", VAULT_KEYS.APPLE_APP_SPECIFIC_PASSWORD],
  ];
  for (const [envName, key] of map) {
    const v = process.env[envName];
    if (v) vault.set(key, v);
  }
  const p8Path = process.env.VB_ASC_P8_PATH;
  if (p8Path) {
    const contents = await readTextOrNull(path.resolve(p8Path));
    if (contents) vault.set(VAULT_KEYS.APPLE_P8, contents);
  }
}

export async function ensureToken(
  vault: TokenVault,
  key: string,
  promptMessage: string,
): Promise<string> {
  if (vault.has(key)) return vault.require(key);
  const val = await askPassword(promptMessage, {
    validate: (v) => (v.length > 0 ? true : "Required"),
  });
  vault.set(key, val);
  return val;
}

export async function ensureInput(
  prompt: string,
  current: string | undefined,
  opts: { default?: string; validate?: (v: string) => true | string } = {},
): Promise<string> {
  if (current) return current;
  return askInput(prompt, opts);
}

export async function confirmStep(
  message: string,
  flags: GlobalFlags,
  opts: { default?: boolean } = {},
): Promise<boolean> {
  return askConfirm(message, { default: opts.default ?? true, assumeYes: flags.yes });
}
