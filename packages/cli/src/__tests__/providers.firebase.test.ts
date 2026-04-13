import { describe, it, expect } from "vitest";
import { FirebaseProvider } from "../providers/firebase.js";

function mkFetch(handler: (url: string, init: RequestInit) => { status: number; body: unknown }) {
  return async (url: string, init: RequestInit = {}) => {
    const { status, body } = handler(url, init);
    return new Response(JSON.stringify(body), {
      status,
      headers: { "Content-Type": "application/json" },
    }) as unknown as Response;
  };
}

describe("FirebaseProvider.addWebApp", () => {
  it("reuses an existing web app matched by displayName", async () => {
    const calls: Array<{ url: string; method: string }> = [];
    const fetchImpl = mkFetch((url, init) => {
      const method = (init.method ?? "GET").toUpperCase();
      calls.push({ url, method });
      if (url.endsWith("/v1beta1/projects/my-proj/webApps") && method === "GET") {
        return {
          status: 200,
          body: {
            apps: [{ name: "projects/my-proj/webApps/app1", displayName: "my-proj" }],
          },
        };
      }
      if (url.endsWith("/v1beta1/projects/my-proj/webApps/app1/config")) {
        return {
          status: 200,
          body: {
            projectId: "my-proj",
            appId: "1:1:web:app1",
            apiKey: "api",
            authDomain: "my-proj.firebaseapp.com",
            storageBucket: "my-proj.appspot.com",
            messagingSenderId: "42",
          },
        };
      }
      throw new Error(`unexpected ${method} ${url}`);
    });
    const fb = new FirebaseProvider({
      accessToken: "tok",
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    const cfg = await fb.addWebApp("my-proj", "my-proj");
    expect(cfg.apiKey).toBe("api");
    expect(cfg.appId).toBe("1:1:web:app1");
    expect(calls.some((c) => c.method === "POST")).toBe(false);
  });

  it("creates a new web app when list is empty", async () => {
    const calls: Array<{ url: string; method: string }> = [];
    const fetchImpl = mkFetch((url, init) => {
      const method = (init.method ?? "GET").toUpperCase();
      calls.push({ url, method });
      if (url.endsWith("/v1beta1/projects/my-proj/webApps") && method === "GET") {
        return { status: 200, body: { apps: [] } };
      }
      if (url.endsWith("/v1beta1/projects/my-proj/webApps") && method === "POST") {
        return { status: 200, body: { name: "projects/my-proj/webApps/appX" } };
      }
      if (url.endsWith("/v1beta1/projects/my-proj/webApps/appX/config")) {
        return {
          status: 200,
          body: {
            projectId: "my-proj",
            appId: "1:1:web:appX",
            apiKey: "api2",
            authDomain: "my-proj.firebaseapp.com",
            storageBucket: "my-proj.appspot.com",
            messagingSenderId: "42",
          },
        };
      }
      throw new Error(`unexpected ${method} ${url}`);
    });
    const fb = new FirebaseProvider({
      accessToken: "tok",
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    const cfg = await fb.addWebApp("my-proj", "my-proj");
    expect(cfg.apiKey).toBe("api2");
    expect(calls.some((c) => c.method === "POST")).toBe(true);
  });
});
