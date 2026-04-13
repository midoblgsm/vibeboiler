import { createHttp, type Http } from "../core/http.js";
import { CliError } from "../core/errors.js";
import { logger } from "../core/logger.js";

export interface ExpoProject {
  projectId: string;
  owner: string;
  slug: string;
}

export interface ExpoProviderOptions {
  token: string;
  fetchImpl?: typeof fetch;
}

export class ExpoProvider {
  private readonly http: Http;

  constructor(opts: ExpoProviderOptions) {
    this.http = createHttp({
      baseUrl: "https://api.expo.dev",
      headers: {
        Authorization: `Bearer ${opts.token}`,
      },
      fetchImpl: opts.fetchImpl,
      provider: "expo",
    });
  }

  async ensureProject(accountName: string, slug: string, displayName: string): Promise<ExpoProject> {
    const existing = await this.findProjectBySlug(accountName, slug);
    if (existing) {
      logger.debug(`Expo project ${accountName}/${slug} reused (id=${existing})`);
      return { projectId: existing, owner: accountName, slug };
    }
    const accountId = await this.getAccountId(accountName);
    const createdId = await this.createProject(accountId, slug, displayName);
    return { projectId: createdId, owner: accountName, slug };
  }

  private async getAccountId(accountName: string): Promise<string> {
    const data = await this.graphql<{ meActor: { accounts: Array<{ id: string; name: string }> } }>(
      `query AccountIds { meActor { accounts { id name } } }`,
    );
    const found = data.meActor.accounts.find((a) => a.name === accountName);
    if (!found) {
      throw new CliError(
        `Expo account '${accountName}' not found. Available: ${data.meActor.accounts
          .map((a) => a.name)
          .join(", ")}`,
      );
    }
    return found.id;
  }

  private async findProjectBySlug(accountName: string, slug: string): Promise<string | null> {
    const data = await this.graphql<{
      account: { byName: { apps: { edges: Array<{ node: { id: string; slug: string } }> } } };
    }>(
      `query FindApp($name: String!) {
         account { byName(accountName: $name) { apps(limit: 100, offset: 0) { edges { node { id slug } } } } }
       }`,
      { name: accountName },
    );
    const edge = data.account.byName.apps.edges.find((e) => e.node.slug === slug);
    return edge?.node.id ?? null;
  }

  private async createProject(accountId: string, slug: string, displayName: string): Promise<string> {
    const data = await this.graphql<{
      app: { createApp: { id: string } };
    }>(
      `mutation CreateApp($accountId: ID!, $slug: String!, $displayName: String!) {
         app { createApp(appInput: { accountId: $accountId, projectName: $slug, displayName: $displayName, privacy: HIDDEN }) { id } }
       }`,
      { accountId, slug, displayName },
    );
    return data.app.createApp.id;
  }

  private async graphql<T>(query: string, variables: Record<string, unknown> = {}): Promise<T> {
    const res = await this.http.post<{ data?: T; errors?: Array<{ message: string }> }>(
      "/graphql",
      { query, variables },
    );
    if (res.errors && res.errors.length) {
      throw new CliError(`Expo GraphQL error: ${res.errors.map((e) => e.message).join("; ")}`);
    }
    if (!res.data) throw new CliError("Expo GraphQL returned no data");
    return res.data;
  }
}
