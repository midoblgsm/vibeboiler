import ora from "ora";
import { FirebaseProvider, FIREBASE_SERVICES } from "../providers/firebase.js";
import { GcpProvider, DEPLOYER_ROLES } from "../providers/gcp.js";
import { logger } from "../core/logger.js";
import { VAULT_KEYS } from "../core/secrets.js";
import {
  type CommandContext,
  ensureToken,
  confirmStep,
  persist,
  ensureInput,
} from "./shared.js";

export async function runFirebase(ctx: CommandContext): Promise<void> {
  logger.step("Firebase / GCP setup");

  const projectId = await ensureInput(
    "Firebase / GCP project ID (lowercase, dashes):",
    ctx.state.project.id,
  );
  const displayName = await ensureInput(
    "Display name:",
    ctx.state.project.displayName,
    { default: projectId },
  );
  ctx.state.project.id = projectId;
  ctx.state.project.displayName = displayName;

  const token = await ensureToken(
    ctx.vault,
    VAULT_KEYS.GCP_TOKEN,
    "Google OAuth access token (scopes: cloud-platform + firebase). Paste:",
  );

  const proceed = await confirmStep(
    `Create/link GCP project '${projectId}' and enable Firebase services?`,
    ctx.flags,
  );
  if (!proceed) return;

  const fb = new FirebaseProvider({ accessToken: token });
  const gcp = new GcpProvider({ accessToken: token });

  const spin = ora(`Ensuring GCP project ${projectId}`).start();
  try {
    await fb.ensureGcpProject(projectId, displayName);
    spin.text = "Enabling Firebase on project";
    await fb.addFirebaseToProject(projectId);
    spin.text = "Enabling services";
    const enabled = await fb.enableServices(projectId, FIREBASE_SERVICES);
    ctx.state.firebase.servicesEnabled = enabled;
    spin.text = "Creating Firestore default DB";
    const created = await fb.ensureFirestoreDefaultDb(projectId);
    ctx.state.firebase.firestoreCreated = ctx.state.firebase.firestoreCreated || created;
    ctx.state.firebase.projectId = projectId;
    spin.text = "Adding web app";
    const web = await fb.addWebApp(projectId, displayName);
    ctx.state.firebase.web = {
      appId: web.appId,
      apiKey: web.apiKey,
      authDomain: web.authDomain,
      storageBucket: web.storageBucket,
      messagingSenderId: web.messagingSenderId,
    };
    if (ctx.state.project.bundleId) {
      spin.text = "Adding iOS app";
      const ios = await fb.addIosApp(projectId, ctx.state.project.bundleId);
      ctx.state.firebase.ios = { appId: ios.appId };
    }
    if (ctx.state.project.androidPackage) {
      spin.text = "Adding Android app";
      const android = await fb.addAndroidApp(projectId, ctx.state.project.androidPackage);
      ctx.state.firebase.android = { appId: android.appId };
    }
    spin.text = "Creating GitHub Actions deployer service account";
    const { email } = await gcp.ensureDeployerServiceAccount(projectId);
    ctx.state.gcp.serviceAccountEmail = email;
    const granted = await gcp.grantDeployerRoles(projectId, email, DEPLOYER_ROLES);
    ctx.state.gcp.rolesGranted = [
      ...new Set([...(ctx.state.gcp.rolesGranted ?? []), ...granted]),
    ];
    spin.text = "Generating service account key";
    const keyJson = await gcp.createServiceAccountKey(projectId, email);
    ctx.vault.set(VAULT_KEYS.FIREBASE_SERVICE_ACCOUNT_JSON, keyJson);
    spin.succeed("Firebase + GCP bootstrap complete");
  } catch (err) {
    spin.fail("Firebase / GCP setup failed");
    throw err;
  }
  await persist(ctx);
}
