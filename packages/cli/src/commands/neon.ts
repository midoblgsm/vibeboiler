import ora from "ora";
import { NeonProvider } from "../providers/neon.js";
import { VAULT_KEYS } from "../core/secrets.js";
import { logger } from "../core/logger.js";
import {
  type CommandContext,
  ensureToken,
  confirmStep,
  persist,
  ensureInput,
} from "./shared.js";

export async function runNeon(ctx: CommandContext): Promise<void> {
  logger.step("Neon Postgres setup");
  const name = await ensureInput("Neon project name:", ctx.state.project.id);
  const region = await ensureInput("Neon region id:", ctx.state.project.region, {
    default: "aws-us-east-2",
  });
  ctx.state.project.region = region;

  const key = await ensureToken(
    ctx.vault,
    VAULT_KEYS.NEON_API_KEY,
    "Neon API key (https://console.neon.tech/app/settings/api-keys):",
  );

  const proceed = await confirmStep(
    `Create or reuse Neon project '${name}' in ${region}?`,
    ctx.flags,
  );
  if (!proceed) return;

  const neon = new NeonProvider({ apiKey: key });
  const spin = ora("Ensuring Neon project").start();
  try {
    const project = await neon.ensureProject(name, region);
    ctx.state.neon.projectId = project.id;
    ctx.vault.set(VAULT_KEYS.NEON_CONNECTION_URI, project.connectionUri);
    spin.succeed(`Neon project ready: ${project.id}`);
  } catch (err) {
    spin.fail("Neon setup failed");
    throw err;
  }
  await persist(ctx);
}
