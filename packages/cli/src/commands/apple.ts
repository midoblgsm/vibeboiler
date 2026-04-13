import path from "node:path";
import ora from "ora";
import { AppleProvider } from "../providers/apple.js";
import { VAULT_KEYS } from "../core/secrets.js";
import { logger } from "../core/logger.js";
import { askPassword, askInput } from "../core/prompts.js";
import { readTextOrNull } from "../core/files.js";
import { CliError } from "../core/errors.js";
import { type CommandContext, confirmStep, persist, ensureInput } from "./shared.js";

export async function runApple(ctx: CommandContext): Promise<void> {
  logger.step("Apple Developer / App Store Connect setup");
  const bundleId = await ensureInput(
    "iOS bundle identifier (e.g. com.example.app):",
    ctx.state.project.bundleId,
  );
  ctx.state.project.bundleId = bundleId;
  const displayName = await ensureInput(
    "Display name for the Bundle ID record:",
    ctx.state.project.displayName,
  );

  if (!ctx.vault.has(VAULT_KEYS.APPLE_ISSUER_ID)) {
    ctx.vault.set(
      VAULT_KEYS.APPLE_ISSUER_ID,
      await askInput(
        "App Store Connect Issuer ID (https://appstoreconnect.apple.com/access/integrations/api):",
      ),
    );
  }
  if (!ctx.vault.has(VAULT_KEYS.APPLE_KEY_ID)) {
    ctx.vault.set(VAULT_KEYS.APPLE_KEY_ID, await askInput("App Store Connect Key ID:"));
  }
  if (!ctx.vault.has(VAULT_KEYS.APPLE_P8)) {
    const p8Path = await askInput(
      "Path to AuthKey_<keyId>.p8 file:",
      { validate: (v) => (v.length > 0 ? true : "Required") },
    );
    const contents = await readTextOrNull(path.resolve(ctx.cwd, p8Path));
    if (!contents) throw new CliError(`Could not read .p8 file at ${p8Path}`);
    ctx.vault.set(VAULT_KEYS.APPLE_P8, contents);
  }
  if (!ctx.vault.has(VAULT_KEYS.APPLE_APP_SPECIFIC_PASSWORD)) {
    ctx.vault.set(
      VAULT_KEYS.APPLE_APP_SPECIFIC_PASSWORD,
      await askPassword(
        "Apple ID app-specific password (for EAS submit; create at https://appleid.apple.com/account/manage):",
      ),
    );
  }

  const proceed = await confirmStep(
    `Register Apple Bundle ID '${bundleId}'?`,
    ctx.flags,
  );
  if (!proceed) return;

  const apple = new AppleProvider({
    issuerId: ctx.vault.require(VAULT_KEYS.APPLE_ISSUER_ID),
    keyId: ctx.vault.require(VAULT_KEYS.APPLE_KEY_ID),
    privateKey: ctx.vault.require(VAULT_KEYS.APPLE_P8),
  });

  const spin = ora(`Registering Bundle ID ${bundleId}`).start();
  try {
    const record = await apple.ensureBundleId(bundleId, displayName);
    ctx.state.apple.bundleIdRecordId = record.id;
    spin.succeed(`Apple Bundle ID ready: ${record.id}`);
  } catch (err) {
    spin.fail("Apple setup failed");
    throw err;
  }
  await persist(ctx);
}
