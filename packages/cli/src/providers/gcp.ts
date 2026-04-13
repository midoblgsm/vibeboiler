import { execa } from "execa";
import { createHttp, type Http } from "../core/http.js";
import { HttpError, CliError } from "../core/errors.js";
import { logger } from "../core/logger.js";
import { detectGcloud } from "../core/which.js";

export const DEPLOYER_ROLES = [
  "roles/firebase.admin",
  "roles/firebasehosting.admin",
  "roles/cloudfunctions.developer",
  "roles/iam.serviceAccountUser",
  "roles/artifactregistry.writer",
  "roles/cloudbuild.builds.editor",
] as const;

export interface GcpProviderOptions {
  accessToken: string;
  fetchImpl?: typeof fetch;
}

export class GcpProvider {
  private readonly iam: Http;
  private readonly crm: Http;

  constructor(opts: GcpProviderOptions) {
    const headers = { Authorization: `Bearer ${opts.accessToken}` };
    this.iam = createHttp({
      baseUrl: "https://iam.googleapis.com",
      headers,
      fetchImpl: opts.fetchImpl,
      provider: "gcp-iam",
    });
    this.crm = createHttp({
      baseUrl: "https://cloudresourcemanager.googleapis.com",
      headers,
      fetchImpl: opts.fetchImpl,
      provider: "gcp-crm",
    });
  }

  async ensureDeployerServiceAccount(
    projectId: string,
    accountId = "github-actions-deployer",
  ): Promise<{ email: string }> {
    const email = `${accountId}@${projectId}.iam.gserviceaccount.com`;
    try {
      await this.iam.get(`/v1/projects/${projectId}/serviceAccounts/${email}`);
      logger.debug(`Service account ${email} already exists`);
      return { email };
    } catch (err) {
      if (!(err instanceof HttpError) || err.status !== 404) throw err;
    }
    await this.iam.post(`/v1/projects/${projectId}/serviceAccounts`, {
      accountId,
      serviceAccount: { displayName: "GitHub Actions Deployer" },
    });
    return { email };
  }

  async grantDeployerRoles(
    projectId: string,
    email: string,
    roles: readonly string[] = DEPLOYER_ROLES,
  ): Promise<string[]> {
    const member = `serviceAccount:${email}`;
    const { policy } = await this.crm.post<{ policy: IamPolicy }>(
      `/v1/projects/${projectId}:getIamPolicy`,
      { options: { requestedPolicyVersion: 3 } },
    );
    const bindings = policy.bindings ?? [];
    const granted: string[] = [];
    for (const role of roles) {
      let binding = bindings.find((b) => b.role === role);
      if (!binding) {
        binding = { role, members: [] };
        bindings.push(binding);
      }
      if (!binding.members.includes(member)) {
        binding.members.push(member);
        granted.push(role);
      }
    }
    if (granted.length === 0) return [];
    await this.crm.post(`/v1/projects/${projectId}:setIamPolicy`, {
      policy: { ...policy, bindings },
    });
    return granted;
  }

  /**
   * Create a JSON service-account key. Returns the parsed key JSON (the
   * private key envelope ready to be shipped as FIREBASE_SERVICE_ACCOUNT).
   * Falls back to `gcloud` if the REST call returns 403 due to the
   * `iam.disableServiceAccountKeyCreation` org policy.
   */
  async createServiceAccountKey(
    projectId: string,
    email: string,
    opts: { preferGcloud?: boolean } = {},
  ): Promise<string> {
    if (opts.preferGcloud && (await detectGcloud())) {
      return this.createKeyViaGcloud(email);
    }
    try {
      const resp = await this.iam.post<{ privateKeyData: string }>(
        `/v1/projects/${projectId}/serviceAccounts/${email}/keys`,
        { keyAlgorithm: "KEY_ALG_RSA_2048", privateKeyType: "TYPE_GOOGLE_CREDENTIALS_FILE" },
      );
      const json = Buffer.from(resp.privateKeyData, "base64").toString("utf8");
      return json;
    } catch (err) {
      if (err instanceof HttpError && err.status === 403 && (await detectGcloud())) {
        logger.warn(
          "Key creation over REST blocked by org policy; falling back to local gcloud.",
        );
        return this.createKeyViaGcloud(email);
      }
      throw err;
    }
  }

  private async createKeyViaGcloud(email: string): Promise<string> {
    const { stdout } = await execa("gcloud", [
      "iam",
      "service-accounts",
      "keys",
      "create",
      "-",
      "--iam-account",
      email,
      "--format",
      "json",
    ]);
    if (!stdout) throw new CliError("gcloud returned empty service account key output");
    return stdout;
  }
}

interface IamPolicy {
  bindings?: Array<{ role: string; members: string[] }>;
  etag?: string;
  version?: number;
}
