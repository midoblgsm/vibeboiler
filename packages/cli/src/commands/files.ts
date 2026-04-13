import path from "node:path";
import ora from "ora";
import {
  readTextOrNull,
  writeIfChanged,
  writeBinary,
  appendLinesIfMissing,
} from "../core/files.js";
import { renderFirebaserc } from "../templates/firebaserc.js";
import { renderEnvFile } from "../templates/envTemplate.js";
import { patchAppConfig } from "../templates/appConfig.js";
import { patchEasJson } from "../templates/easJson.js";
import { VAULT_KEYS } from "../core/secrets.js";
import { logger } from "../core/logger.js";
import { CliError } from "../core/errors.js";
import type { CommandContext } from "./shared.js";

export async function runLocalFileWrites(ctx: CommandContext): Promise<void> {
  logger.step("Writing local configuration files");
  const spin = ora("Writing files").start();
  try {
    const root = ctx.cwd;
    const fb = ctx.state.firebase;
    if (!fb.projectId) throw new CliError("firebase.projectId missing; run `vibeboiler firebase` first");

    // .firebaserc
    await writeIfChanged(
      path.join(root, ".firebaserc"),
      renderFirebaserc(fb.projectId),
    );

    // .env
    const envBody = renderEnvFile({
      firebase: {
        projectId: fb.projectId,
        apiKey: fb.web.apiKey ?? "",
        authDomain: fb.web.authDomain ?? `${fb.projectId}.firebaseapp.com`,
        storageBucket: fb.web.storageBucket ?? `${fb.projectId}.appspot.com`,
        messagingSenderId: fb.web.messagingSenderId ?? "",
        appId: fb.web.appId ?? "",
      },
      neonConnectionUri: ctx.vault.get(VAULT_KEYS.NEON_CONNECTION_URI),
    });
    await writeIfChanged(path.join(root, ".env"), envBody);

    // Service account JSON (if we have it)
    const saJson = ctx.vault.get(VAULT_KEYS.FIREBASE_SERVICE_ACCOUNT_JSON);
    if (saJson) {
      await writeIfChanged(
        path.join(root, ".vibeboiler", "service-account.json"),
        saJson,
      );
    }

    // apps/mobile/app.config.ts (only patch fields we have)
    const appCfgPath = path.join(root, "apps/mobile/app.config.ts");
    const existingAppCfg = await readTextOrNull(appCfgPath);
    if (existingAppCfg) {
      const patched = patchAppConfig(existingAppCfg, {
        displayName: ctx.state.project.displayName,
        slug: ctx.state.project.slug,
        bundleId: ctx.state.project.bundleId,
        androidPackage: ctx.state.project.androidPackage,
        easProjectId: ctx.state.expo.projectId,
        expoOwner: ctx.state.expo.owner,
        firebaseApiKey: fb.web.apiKey,
      });
      await writeIfChanged(appCfgPath, patched);
    }

    // apps/mobile/eas.json
    const easPath = path.join(root, "apps/mobile/eas.json");
    const easSource = await readTextOrNull(easPath);
    if (easSource && (ctx.state.apple.ascAppId || ctx.state.apple.bundleIdRecordId)) {
      const patched = patchEasJson(easSource, {
        ascAppId: ctx.state.apple.ascAppId,
      });
      await writeIfChanged(easPath, patched);
    }

    // iOS + Android Firebase plist/json — decoded from state if available
    if (fb.ios.appId && ctx.state.firebase.ios.appId) {
      // Config file contents are cached in vault, not state. Skip if absent.
      const iosCfg = ctx.vault.get("firebase.iosConfigFile");
      if (iosCfg) {
        await writeBinary(
          path.join(root, "apps/mobile/GoogleService-Info.plist"),
          Buffer.from(iosCfg, "base64"),
        );
      }
    }
    if (fb.android.appId) {
      const androidCfg = ctx.vault.get("firebase.androidConfigFile");
      if (androidCfg) {
        await writeBinary(
          path.join(root, "apps/mobile/google-services.json"),
          Buffer.from(androidCfg, "base64"),
        );
      }
    }

    // .gitignore — make sure .vibeboiler/ is ignored
    await appendLinesIfMissing(path.join(root, ".gitignore"), [
      "",
      "# Vibeboiler CLI state",
      ".vibeboiler/",
    ]);

    spin.succeed("Local files written");
  } catch (err) {
    spin.fail("Local file writes failed");
    throw err;
  }
}
