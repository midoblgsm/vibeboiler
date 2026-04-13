import chalk from "chalk";
import { logger } from "../core/logger.js";
import { askMultiselect, askInput } from "../core/prompts.js";
import { TargetSchema, type Target } from "../core/config.js";
import { persist, type CommandContext, confirmStep } from "./shared.js";
import { runFirebase } from "./firebase.js";
import { runNeon } from "./neon.js";
import { runExpo } from "./expo.js";
import { runApple } from "./apple.js";
import { runGithubRepo } from "./github.js";
import { runSecrets } from "./secrets.js";
import { runLocalFileWrites } from "./files.js";

export interface InitOptions {
  skip?: Set<Target>;
  only?: Set<Target>;
}

export async function runInit(ctx: CommandContext): Promise<void> {
  await preflight();
  await collectIdentity(ctx);
  const targets = await chooseTargets(ctx);
  ctx.state.targets = targets;
  await persist(ctx);

  const enabled = (t: Target) => targets.includes(t);

  if (enabled("web") || enabled("mobile")) {
    await runFirebase(ctx);
    await runNeon(ctx);
  }

  if (enabled("mobile")) {
    await runExpo(ctx);
  }

  if (enabled("apple")) {
    await runApple(ctx);
  }

  await runLocalFileWrites(ctx);

  const pushRepo = await confirmStep(
    "Create a GitHub repository from this template now?",
    ctx.flags,
  );
  if (pushRepo) await runGithubRepo(ctx);

  if (ctx.state.github.owner && ctx.state.github.repo) {
    await runSecrets(ctx);
  } else {
    logger.warn(
      "Skipping secret push: no GitHub repo recorded. Run `vibeboiler github` and `vibeboiler secrets` later.",
    );
  }

  printChecklist(ctx);
}

async function preflight(): Promise<void> {
  const major = Number(process.versions.node.split(".")[0] ?? "0");
  if (major < 20) {
    throw new Error(`Node >= 20 required (got ${process.versions.node})`);
  }
}

async function collectIdentity(ctx: CommandContext): Promise<void> {
  const p = ctx.state.project;
  if (!p.id) {
    p.id = await askInput("Project ID (lowercase, dashes; used for Firebase + Neon):", {
      validate: (v) =>
        /^[a-z][a-z0-9-]{3,28}[a-z0-9]$/.test(v) ? true : "6–30 chars, lowercase + dashes",
    });
  }
  if (!p.slug) {
    p.slug = await askInput("Slug (for Expo / package.json):", {
      default: p.id,
    });
  }
  if (!p.displayName) {
    p.displayName = await askInput("Display name:", { default: p.slug ?? p.id });
  }
  if (!p.bundleId) {
    p.bundleId = await askInput("iOS bundle identifier:", {
      default: `com.example.${p.slug?.replace(/-/g, "")}`,
    });
  }
  if (!p.androidPackage) {
    p.androidPackage = await askInput("Android package name:", {
      default: p.bundleId,
    });
  }
  if (!p.region) {
    p.region = await askInput("Neon region id:", { default: "aws-us-east-2" });
  }
}

async function chooseTargets(ctx: CommandContext): Promise<Target[]> {
  const skip = parseTargetList(ctx.flags.skip);
  const only = parseTargetList(ctx.flags.only);
  if (only.size > 0) return [...only];
  const defaults: Target[] = ctx.state.targets.length
    ? ctx.state.targets
    : ["web", "mobile", "apple"];
  const picked = await askMultiselect<Target>(
    "Which targets to bootstrap?",
    [
      { name: "Web app (Firebase + Neon + GitHub)", value: "web", checked: defaults.includes("web") },
      { name: "Mobile app (Expo + EAS)", value: "mobile", checked: defaults.includes("mobile") },
      { name: "Apple App ID registration", value: "apple", checked: defaults.includes("apple") },
    ],
  );
  return picked.filter((t) => !skip.has(t));
}

function parseTargetList(csv: string | undefined): Set<Target> {
  const out = new Set<Target>();
  if (!csv) return out;
  for (const part of csv.split(",")) {
    const trimmed = part.trim();
    const parsed = TargetSchema.safeParse(trimmed);
    if (parsed.success) out.add(parsed.data);
  }
  return out;
}

function printChecklist(ctx: CommandContext): void {
  const lines: string[] = [
    "",
    chalk.bold("Manual steps the CLI cannot automate (v1):"),
    "  - Link a Billing Account to the Firebase/GCP project (Blaze plan).",
    "  - Enable Email/Password in Firebase Auth if you want it on by default.",
    "  - App Store Connect: create the App record + fill App Information.",
    "  - Google Play Console: create the Android app and upload a first AAB manually.",
    "  - First local EAS build (`eas build --platform ios --local`) before CI builds work.",
    "  - Invite teammates in Firebase, Neon, Expo, GitHub.",
  ];
  if (ctx.state.github.owner && ctx.state.github.repo) {
    lines.push(
      `  - Push initial commit to https://github.com/${ctx.state.github.owner}/${ctx.state.github.repo}.`,
    );
  }
  for (const l of lines) logger.plain(l);
}
