import ora from "ora";
import { GithubProvider } from "../providers/github.js";
import { VAULT_KEYS } from "../core/secrets.js";
import { logger } from "../core/logger.js";
import { type CommandContext, ensureToken, confirmStep, persist, ensureInput } from "./shared.js";

const DEFAULT_TEMPLATE = { owner: "midoblgsm", repo: "vibeboiler" };

export async function runGithubRepo(ctx: CommandContext): Promise<void> {
  logger.step("GitHub repository setup");
  const owner = await ensureInput("GitHub owner (user or org):", ctx.state.github.owner);
  const repo = await ensureInput(
    "GitHub repo name:",
    ctx.state.github.repo ?? ctx.state.project.slug,
  );
  const templateOwner = await ensureInput(
    "Template owner:",
    DEFAULT_TEMPLATE.owner,
    { default: DEFAULT_TEMPLATE.owner },
  );
  const templateRepo = await ensureInput(
    "Template repo:",
    DEFAULT_TEMPLATE.repo,
    { default: DEFAULT_TEMPLATE.repo },
  );

  const token = await ensureToken(
    ctx.vault,
    VAULT_KEYS.GITHUB_TOKEN,
    "GitHub PAT (Administration+Actions+Secrets+Contents RW):",
  );

  const proceed = await confirmStep(
    `Create '${owner}/${repo}' from template '${templateOwner}/${templateRepo}' if missing?`,
    ctx.flags,
  );
  if (!proceed) return;

  const gh = new GithubProvider({ token });
  const spin = ora(`Ensuring ${owner}/${repo}`).start();
  try {
    await gh.ensureRepoFromTemplate(
      { owner, repo },
      { owner: templateOwner, repo: templateRepo },
      { private: true },
    );
    ctx.state.github.owner = owner;
    ctx.state.github.repo = repo;
    spin.succeed(`GitHub repo ready: ${owner}/${repo}`);
  } catch (err) {
    spin.fail("GitHub repo setup failed");
    throw err;
  }
  await persist(ctx);
}
