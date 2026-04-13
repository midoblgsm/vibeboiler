import ora from "ora";
import { ExpoProvider } from "../providers/expo.js";
import { VAULT_KEYS } from "../core/secrets.js";
import { logger } from "../core/logger.js";
import {
  type CommandContext,
  ensureToken,
  confirmStep,
  persist,
  ensureInput,
} from "./shared.js";

export async function runExpo(ctx: CommandContext): Promise<void> {
  logger.step("Expo / EAS setup");
  const accountName = await ensureInput(
    "Expo account (owner) name:",
    ctx.state.expo.owner,
  );
  const slug = await ensureInput(
    "Expo project slug:",
    ctx.state.expo.slug ?? ctx.state.project.slug,
  );
  const displayName = await ensureInput(
    "Expo display name:",
    ctx.state.project.displayName,
    { default: slug },
  );

  const token = await ensureToken(
    ctx.vault,
    VAULT_KEYS.EXPO_TOKEN,
    "Expo access token (https://expo.dev/settings/access-tokens):",
  );

  const proceed = await confirmStep(
    `Create or reuse EAS project '${accountName}/${slug}'?`,
    ctx.flags,
  );
  if (!proceed) return;

  const expo = new ExpoProvider({ token });
  const spin = ora("Ensuring EAS project").start();
  try {
    const project = await expo.ensureProject(accountName, slug, displayName);
    ctx.state.expo.projectId = project.projectId;
    ctx.state.expo.owner = project.owner;
    ctx.state.expo.slug = project.slug;
    spin.succeed(`EAS project ready: ${project.projectId}`);
  } catch (err) {
    spin.fail("Expo setup failed");
    throw err;
  }
  await persist(ctx);
}
