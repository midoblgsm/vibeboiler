import { createHttp, type Http } from "../core/http.js";
import { HttpError } from "../core/errors.js";
import { encryptForGithub } from "../core/sealedBox.js";
import { logger } from "../core/logger.js";

export interface GithubProviderOptions {
  token: string;
  fetchImpl?: typeof fetch;
}

export interface RepoRef {
  owner: string;
  repo: string;
}

interface PublicKeyResponse {
  key_id: string;
  key: string;
}

export class GithubProvider {
  private readonly http: Http;

  constructor(opts: GithubProviderOptions) {
    this.http = createHttp({
      baseUrl: "https://api.github.com",
      headers: {
        Authorization: `Bearer ${opts.token}`,
        "X-GitHub-Api-Version": "2022-11-28",
        Accept: "application/vnd.github+json",
      },
      fetchImpl: opts.fetchImpl,
      provider: "github",
    });
  }

  async ensureRepoFromTemplate(
    target: RepoRef,
    template: RepoRef,
    opts: { private?: boolean; description?: string } = {},
  ): Promise<RepoRef> {
    try {
      await this.http.get(`/repos/${target.owner}/${target.repo}`);
      logger.debug(`Repo ${target.owner}/${target.repo} already exists`);
      return target;
    } catch (err) {
      if (!(err instanceof HttpError) || err.status !== 404) throw err;
    }
    await this.http.post(
      `/repos/${template.owner}/${template.repo}/generate`,
      {
        owner: target.owner,
        name: target.repo,
        description: opts.description ?? "Bootstrapped from vibeboiler",
        private: opts.private ?? true,
        include_all_branches: false,
      },
      { acceptStatuses: [201, 202] },
    );
    return target;
  }

  async getActionsPublicKey(ref: RepoRef): Promise<PublicKeyResponse> {
    return this.http.get<PublicKeyResponse>(
      `/repos/${ref.owner}/${ref.repo}/actions/secrets/public-key`,
    );
  }

  async putActionsSecret(ref: RepoRef, name: string, value: string): Promise<void> {
    const pk = await this.getActionsPublicKey(ref);
    const encrypted_value = await encryptForGithub(value, pk.key);
    await this.http.put(
      `/repos/${ref.owner}/${ref.repo}/actions/secrets/${name}`,
      { encrypted_value, key_id: pk.key_id },
      { acceptStatuses: [201, 204] },
    );
  }

  async putAllSecrets(ref: RepoRef, secrets: Record<string, string>): Promise<string[]> {
    const pk = await this.getActionsPublicKey(ref);
    const pushed: string[] = [];
    for (const [name, value] of Object.entries(secrets)) {
      if (value === undefined || value === null || value === "") {
        logger.warn(`Skipping secret ${name}: empty value`);
        continue;
      }
      const encrypted_value = await encryptForGithub(value, pk.key);
      await this.http.put(
        `/repos/${ref.owner}/${ref.repo}/actions/secrets/${name}`,
        { encrypted_value, key_id: pk.key_id },
        { acceptStatuses: [201, 204] },
      );
      pushed.push(name);
    }
    return pushed;
  }
}
