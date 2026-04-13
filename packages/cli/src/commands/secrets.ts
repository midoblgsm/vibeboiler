import ora from "ora";
import { GithubProvider } from "../providers/github.js";
import { VAULT_KEYS } from "../core/secrets.js";
import { logger } from "../core/logger.js";
import { CliError } from "../core/errors.js";
import { type CommandContext, ensureToken, confirmStep, persist } from "./shared.js";

/**
 * Map of GitHub Actions Secret name → source field. Used both by this command
 * and by `doctor` to cross-check against .github/workflows/*.yml.
 */
export const REQUIRED_SECRETS = {
  FIREBASE_SERVICE_ACCOUNT: "vault:firebase.serviceAccountJson",
  FIREBASE_API_KEY: "state:firebase.web.apiKey",
  FIREBASE_AUTH_DOMAIN: "state:firebase.web.authDomain",
  FIREBASE_PROJECT_ID: "state:firebase.projectId",
  FIREBASE_STORAGE_BUCKET: "state:firebase.web.storageBucket",
  FIREBASE_MESSAGING_SENDER_ID: "state:firebase.web.messagingSenderId",
  FIREBASE_APP_ID: "state:firebase.web.appId",
  NEON_DATABASE_URL: "vault:neon.connectionUri",
  EXPO_TOKEN: "vault:expo.token",
  EAS_PROJECT_ID: "state:expo.projectId",
  IOS_BUNDLE_IDENTIFIER: "state:project.bundleId",
  APPLE_ID: "prompt:apple.appleId",
  APPLE_TEAM_ID: "prompt:apple.teamId",
  ASC_APP_ID: "state:apple.ascAppId",
  APPLE_APP_SPECIFIC_PASSWORD: "vault:apple.appSpecificPassword",
  ANDROID_PACKAGE_NAME: "state:project.androidPackage",
  GOOGLE_PLAY_SERVICE_ACCOUNT_KEY: "vault:play.serviceAccountJson",
} as const;

export type RequiredSecretName = keyof typeof REQUIRED_SECRETS;

/**
 * Collect available secret values from state + vault. Missing values are
 * returned under `missing[]` so the caller can warn rather than explode.
 */
export function collectSecretValues(
  ctx: CommandContext,
): { values: Record<string, string>; missing: string[] } {
  const values: Record<string, string> = {};
  const missing: string[] = [];
  const state = ctx.state;
  const vault = ctx.vault;

  const add = (name: RequiredSecretName, value: string | undefined): void => {
    if (value && value.length > 0) values[name] = value;
    else missing.push(name);
  };

  add("FIREBASE_SERVICE_ACCOUNT", vault.get(VAULT_KEYS.FIREBASE_SERVICE_ACCOUNT_JSON));
  add("FIREBASE_API_KEY", state.firebase.web.apiKey);
  add("FIREBASE_AUTH_DOMAIN", state.firebase.web.authDomain);
  add("FIREBASE_PROJECT_ID", state.firebase.projectId);
  add("FIREBASE_STORAGE_BUCKET", state.firebase.web.storageBucket);
  add("FIREBASE_MESSAGING_SENDER_ID", state.firebase.web.messagingSenderId);
  add("FIREBASE_APP_ID", state.firebase.web.appId);
  add("NEON_DATABASE_URL", vault.get(VAULT_KEYS.NEON_CONNECTION_URI));
  add("EXPO_TOKEN", vault.get(VAULT_KEYS.EXPO_TOKEN));
  add("EAS_PROJECT_ID", state.expo.projectId);
  add("IOS_BUNDLE_IDENTIFIER", state.project.bundleId);
  add("APPLE_TEAM_ID", state.apple.ascAppId ? state.apple.ascAppId : undefined);
  add("ASC_APP_ID", state.apple.ascAppId);
  add("APPLE_APP_SPECIFIC_PASSWORD", vault.get(VAULT_KEYS.APPLE_APP_SPECIFIC_PASSWORD));
  add("ANDROID_PACKAGE_NAME", state.project.androidPackage);
  add("GOOGLE_PLAY_SERVICE_ACCOUNT_KEY", vault.get(VAULT_KEYS.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON));

  return { values, missing };
}

export async function runSecrets(ctx: CommandContext): Promise<void> {
  logger.step("Push GitHub Actions secrets");
  if (!ctx.state.github.owner || !ctx.state.github.repo) {
    throw new CliError(
      "GitHub repo not yet set in state; run `vibeboiler github` first or complete `init`.",
    );
  }
  const token = await ensureToken(
    ctx.vault,
    VAULT_KEYS.GITHUB_TOKEN,
    "GitHub PAT (Secrets RW):",
  );

  const { values, missing } = collectSecretValues(ctx);
  if (missing.length) {
    logger.warn(`Skipping (no value yet): ${missing.join(", ")}`);
  }
  if (Object.keys(values).length === 0) {
    logger.warn("No secrets to push.");
    return;
  }

  const proceed = await confirmStep(
    `Push ${Object.keys(values).length} secret(s) to ${ctx.state.github.owner}/${ctx.state.github.repo}?`,
    ctx.flags,
  );
  if (!proceed) return;

  const gh = new GithubProvider({ token });
  const spin = ora("Encrypting and uploading secrets").start();
  try {
    const pushed = await gh.putAllSecrets(
      { owner: ctx.state.github.owner, repo: ctx.state.github.repo },
      values,
    );
    ctx.state.github.secretsPushed = [
      ...new Set([...(ctx.state.github.secretsPushed ?? []), ...pushed]),
    ];
    spin.succeed(`Pushed ${pushed.length} secret(s)`);
  } catch (err) {
    spin.fail("Secret push failed");
    throw err;
  }
  await persist(ctx);
}
