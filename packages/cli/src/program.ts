import { Command } from "commander";
import { logger, setVerbose } from "./core/logger.js";
import { loadCommandContext, type GlobalFlags } from "./commands/shared.js";
import { runInit } from "./commands/init.js";
import { runFirebase } from "./commands/firebase.js";
import { runNeon } from "./commands/neon.js";
import { runExpo } from "./commands/expo.js";
import { runApple } from "./commands/apple.js";
import { runGithubRepo } from "./commands/github.js";
import { runSecrets } from "./commands/secrets.js";
import { runDoctor } from "./commands/doctor.js";
import { runLocalFileWrites } from "./commands/files.js";

export function buildProgram(): Command {
  const program = new Command("vibeboiler");
  program
    .version("0.1.0")
    .description("Setup wizard for the vibeboiler template");

  const withGlobalFlags = (cmd: Command): Command =>
    cmd
      .option("-y, --yes", "skip confirmation prompts")
      .option("--state <path>", "override state.json path")
      .option("--dry-run", "do not mutate state on disk")
      .option("--verbose", "verbose logging")
      .option("--skip <list>", "comma-separated targets to skip")
      .option("--only <list>", "comma-separated targets to run exclusively")
      .option("--config <path>", "path to a config file with defaults");

  const registerRun = (
    cmd: Command,
    runner: (ctx: Awaited<ReturnType<typeof loadCommandContext>>) => Promise<void>,
  ): Command =>
    cmd.action(async (flags: GlobalFlags) => {
      try {
        if (flags.verbose) setVerbose(true);
        const ctx = await loadCommandContext(process.cwd(), flags);
        await runner(ctx);
      } catch (err) {
        logger.error((err as Error).message);
        process.exitCode = 1;
      }
    });

  registerRun(
    withGlobalFlags(program.command("init").description("Run the full setup wizard")),
    runInit,
  );
  registerRun(
    withGlobalFlags(program.command("firebase").description("Firebase + GCP only")),
    runFirebase,
  );
  registerRun(withGlobalFlags(program.command("neon").description("Neon DB only")), runNeon);
  registerRun(
    withGlobalFlags(program.command("github").description("GitHub repo only")),
    runGithubRepo,
  );
  registerRun(
    withGlobalFlags(program.command("expo").description("Expo / EAS only")),
    runExpo,
  );
  registerRun(
    withGlobalFlags(program.command("apple").description("Apple Bundle ID registration only")),
    runApple,
  );
  registerRun(
    withGlobalFlags(program.command("secrets").description("Push GitHub Actions secrets")),
    runSecrets,
  );
  registerRun(
    withGlobalFlags(
      program.command("files").description("Write local config files (.env, .firebaserc, app.config.ts, eas.json)"),
    ),
    runLocalFileWrites,
  );
  registerRun(
    withGlobalFlags(program.command("doctor").description("Read-only diagnostics")),
    runDoctor,
  );

  return program;
}
