import { createHttp, type Http } from "../core/http.js";
import { HttpError } from "../core/errors.js";
import { logger } from "../core/logger.js";

export interface FirebaseWebConfig {
  projectId: string;
  appId: string;
  apiKey: string;
  authDomain: string;
  storageBucket: string;
  messagingSenderId: string;
}

export interface FirebaseMobileAppConfig {
  appId: string;
  /** base64-encoded file contents (plist for iOS, json for Android) */
  configFileContents: string;
}

/**
 * The GCP + Firebase services we enable for the template. Matches what
 * `.github/workflows/*.yml` and `firebase.json` expect to exist.
 */
export const FIREBASE_SERVICES = [
  "firebase.googleapis.com",
  "firestore.googleapis.com",
  "firebasestorage.googleapis.com",
  "identitytoolkit.googleapis.com",
  "cloudfunctions.googleapis.com",
  "cloudbuild.googleapis.com",
  "artifactregistry.googleapis.com",
  "run.googleapis.com",
  "eventarc.googleapis.com",
  "iam.googleapis.com",
] as const;

export interface FirebaseProviderOptions {
  accessToken: string;
  fetchImpl?: typeof fetch;
}

export class FirebaseProvider {
  private readonly fb: Http;
  private readonly crm: Http;
  private readonly su: Http;
  private readonly fs: Http;

  constructor(opts: FirebaseProviderOptions) {
    const headers = { Authorization: `Bearer ${opts.accessToken}` };
    const common = { headers, fetchImpl: opts.fetchImpl, provider: "firebase" };
    this.fb = createHttp({ baseUrl: "https://firebase.googleapis.com", ...common });
    this.crm = createHttp({ baseUrl: "https://cloudresourcemanager.googleapis.com", ...common });
    this.su = createHttp({ baseUrl: "https://serviceusage.googleapis.com", ...common });
    this.fs = createHttp({ baseUrl: "https://firestore.googleapis.com", ...common });
  }

  async ensureGcpProject(projectId: string, displayName: string): Promise<void> {
    try {
      await this.crm.get(`/v1/projects/${projectId}`);
      logger.debug(`GCP project ${projectId} already exists`);
      return;
    } catch (err) {
      if (!(err instanceof HttpError) || err.status !== 404) throw err;
    }
    await this.crm.post("/v1/projects", { projectId, name: displayName });
  }

  async addFirebaseToProject(projectId: string): Promise<void> {
    try {
      await this.fb.get(`/v1beta1/projects/${projectId}`);
      logger.debug(`Firebase already enabled on ${projectId}`);
      return;
    } catch (err) {
      if (!(err instanceof HttpError) || err.status !== 404) throw err;
    }
    await this.fb.post(`/v1beta1/projects/${projectId}:addFirebase`, {});
  }

  async enableService(projectId: string, service: string): Promise<void> {
    await this.su.post(
      `/v1/projects/${projectId}/services/${service}:enable`,
      {},
      { acceptStatuses: [200, 201, 202] },
    );
  }

  async enableServices(projectId: string, services: readonly string[]): Promise<string[]> {
    const enabled: string[] = [];
    for (const s of services) {
      try {
        await this.enableService(projectId, s);
        enabled.push(s);
      } catch (err) {
        logger.warn(`Could not enable ${s}: ${(err as Error).message}`);
      }
    }
    return enabled;
  }

  async ensureFirestoreDefaultDb(projectId: string, locationId = "us-east1"): Promise<boolean> {
    try {
      await this.fs.get(`/v1/projects/${projectId}/databases/(default)`);
      return false;
    } catch (err) {
      if (!(err instanceof HttpError) || err.status !== 404) throw err;
    }
    await this.fs.post(
      `/v1/projects/${projectId}/databases`,
      { type: "FIRESTORE_NATIVE", locationId },
      { query: { databaseId: "(default)" } },
    );
    return true;
  }

  async addWebApp(projectId: string, displayName: string): Promise<FirebaseWebConfig> {
    const existing = await this.findWebApp(projectId, displayName);
    const appName = existing ?? (await this.createWebApp(projectId, displayName));
    const config = await this.fb.get<{
      projectId: string;
      appId: string;
      apiKey: string;
      authDomain: string;
      storageBucket: string;
      messagingSenderId: string;
    }>(`/v1beta1/${appName}/config`);
    return { ...config };
  }

  private async findWebApp(projectId: string, displayName: string): Promise<string | null> {
    const list = await this.fb.get<{ apps?: Array<{ name: string; displayName?: string }> }>(
      `/v1beta1/projects/${projectId}/webApps`,
    );
    const found = list.apps?.find((a) => a.displayName === displayName);
    return found?.name ?? null;
  }

  private async createWebApp(projectId: string, displayName: string): Promise<string> {
    const resp = await this.fb.post<{ name: string }>(
      `/v1beta1/projects/${projectId}/webApps`,
      { displayName },
    );
    return resp.name;
  }

  async addIosApp(projectId: string, bundleId: string): Promise<FirebaseMobileAppConfig> {
    const existing = await this.findIosApp(projectId, bundleId);
    const appName: string =
      existing ??
      (await this.fb
        .post<{ name: string }>(`/v1beta1/projects/${projectId}/iosApps`, { bundleId })
        .then((r) => r.name));
    const config = await this.fb.get<{ configFileContents: string }>(
      `/v1beta1/${appName}/config`,
    );
    const appId = appName.split("/").pop() ?? "";
    return { appId, configFileContents: config.configFileContents };
  }

  private async findIosApp(projectId: string, bundleId: string): Promise<string | null> {
    const list = await this.fb.get<{ apps?: Array<{ name: string; bundleId?: string }> }>(
      `/v1beta1/projects/${projectId}/iosApps`,
    );
    return list.apps?.find((a) => a.bundleId === bundleId)?.name ?? null;
  }

  async addAndroidApp(projectId: string, packageName: string): Promise<FirebaseMobileAppConfig> {
    const existing = await this.findAndroidApp(projectId, packageName);
    const appName: string =
      existing ??
      (await this.fb
        .post<{ name: string }>(`/v1beta1/projects/${projectId}/androidApps`, { packageName })
        .then((r) => r.name));
    const config = await this.fb.get<{ configFileContents: string }>(
      `/v1beta1/${appName}/config`,
    );
    const appId = appName.split("/").pop() ?? "";
    return { appId, configFileContents: config.configFileContents };
  }

  private async findAndroidApp(projectId: string, packageName: string): Promise<string | null> {
    const list = await this.fb.get<{ apps?: Array<{ name: string; packageName?: string }> }>(
      `/v1beta1/projects/${projectId}/androidApps`,
    );
    return list.apps?.find((a) => a.packageName === packageName)?.name ?? null;
  }
}
