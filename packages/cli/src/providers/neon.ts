import { createHttp, type Http } from "../core/http.js";
import { logger } from "../core/logger.js";

export interface NeonProject {
  id: string;
  name: string;
  connectionUri: string;
}

export interface NeonProviderOptions {
  apiKey: string;
  fetchImpl?: typeof fetch;
}

interface NeonListResponse {
  projects: Array<{ id: string; name: string }>;
}

interface NeonCreateResponse {
  project: { id: string; name: string };
  connection_uris?: Array<{ connection_uri: string }>;
}

interface NeonConnectionUriResponse {
  uri: string;
}

export class NeonProvider {
  private readonly http: Http;

  constructor(opts: NeonProviderOptions) {
    this.http = createHttp({
      baseUrl: "https://console.neon.tech/api/v2",
      headers: { Authorization: `Bearer ${opts.apiKey}` },
      fetchImpl: opts.fetchImpl,
      provider: "neon",
    });
  }

  async ensureProject(name: string, regionId = "aws-us-east-2"): Promise<NeonProject> {
    const existing = await this.findProjectByName(name);
    if (existing) {
      const connectionUri = await this.getConnectionUri(existing.id);
      logger.debug(`Neon project ${existing.id} reused`);
      return { id: existing.id, name: existing.name, connectionUri };
    }
    const created = await this.http.post<NeonCreateResponse>(
      "/projects",
      { project: { name, region_id: regionId, pg_version: 16 } },
    );
    const connectionUri =
      created.connection_uris?.[0]?.connection_uri ??
      (await this.getConnectionUri(created.project.id));
    return {
      id: created.project.id,
      name: created.project.name,
      connectionUri,
    };
  }

  async findProjectByName(name: string): Promise<{ id: string; name: string } | null> {
    const res = await this.http.get<NeonListResponse>("/projects", {
      query: { search: name },
    });
    return res.projects.find((p) => p.name === name) ?? null;
  }

  async getConnectionUri(
    projectId: string,
    opts: { database?: string; role?: string; pooled?: boolean } = {},
  ): Promise<string> {
    const res = await this.http.get<NeonConnectionUriResponse>(
      `/projects/${projectId}/connection_uri`,
      {
        query: {
          database_name: opts.database ?? "neondb",
          role_name: opts.role ?? "neondb_owner",
          pooled: opts.pooled === false ? "false" : "true",
        },
      },
    );
    return res.uri;
  }
}
