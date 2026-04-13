import { describe, it, expect } from "vitest";
import { NeonProvider } from "../providers/neon.js";

interface RecordedCall {
  url: string;
  method: string;
}

function mkFetch(
  handlers: Array<{
    match: (url: string, method: string) => boolean;
    respond: (url: string, method: string) => { status: number; body: unknown };
  }>,
  recorded: RecordedCall[],
) {
  return async (url: string, init: RequestInit = {}) => {
    const method = (init.method ?? "GET").toUpperCase();
    recorded.push({ url, method });
    const h = handlers.find((x) => x.match(url, method));
    if (!h) throw new Error(`unexpected ${method} ${url}`);
    const { status, body } = h.respond(url, method);
    return new Response(JSON.stringify(body), {
      status,
      headers: { "Content-Type": "application/json" },
    }) as unknown as Response;
  };
}

describe("NeonProvider.ensureProject", () => {
  it("reuses an existing project matched by name", async () => {
    const recorded: RecordedCall[] = [];
    const fetchImpl = mkFetch(
      [
        {
          match: (url, m) => m === "GET" && url.includes("/projects?"),
          respond: () => ({
            status: 200,
            body: { projects: [{ id: "p1", name: "my-proj" }] },
          }),
        },
        {
          match: (url, m) => m === "GET" && url.includes("/projects/p1/connection_uri"),
          respond: () => ({
            status: 200,
            body: { uri: "postgresql://u:p@h/db" },
          }),
        },
      ],
      recorded,
    );
    const neon = new NeonProvider({
      apiKey: "nk",
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    const project = await neon.ensureProject("my-proj");
    expect(project.id).toBe("p1");
    expect(project.connectionUri).toBe("postgresql://u:p@h/db");
    expect(recorded.every((r) => r.method === "GET")).toBe(true);
  });

  it("creates a project when no match exists", async () => {
    const recorded: RecordedCall[] = [];
    const fetchImpl = mkFetch(
      [
        {
          match: (url, m) => m === "GET" && url.includes("/projects?"),
          respond: () => ({ status: 200, body: { projects: [] } }),
        },
        {
          match: (url, m) => m === "POST" && url.endsWith("/projects"),
          respond: () => ({
            status: 201,
            body: {
              project: { id: "pnew", name: "my-proj" },
              connection_uris: [{ connection_uri: "postgresql://u:p@h/newdb" }],
            },
          }),
        },
      ],
      recorded,
    );
    const neon = new NeonProvider({
      apiKey: "nk",
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    const project = await neon.ensureProject("my-proj");
    expect(project.id).toBe("pnew");
    expect(project.connectionUri).toBe("postgresql://u:p@h/newdb");
    expect(recorded.some((r) => r.method === "POST")).toBe(true);
  });
});
