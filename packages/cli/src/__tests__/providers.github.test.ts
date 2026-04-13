import { describe, it, expect, beforeEach } from "vitest";
import sodium from "libsodium-wrappers";
import { GithubProvider } from "../providers/github.js";

/**
 * Minimal fetch mock — no MSW needed for this level of assertion. We capture
 * the outgoing requests and return canned responses for each URL pattern.
 */
interface RecordedCall {
  url: string;
  method: string;
  body: unknown;
  headers: Record<string, string>;
}

function makeMockFetch(handlers: Array<{
  match: (url: string, init: RequestInit) => boolean;
  respond: (url: string, init: RequestInit) => { status: number; body: unknown };
}>, recorded: RecordedCall[]) {
  return async (url: string, init: RequestInit = {}) => {
    recorded.push({
      url,
      method: (init.method ?? "GET").toUpperCase(),
      body: init.body ? JSON.parse(String(init.body)) : undefined,
      headers: (init.headers as Record<string, string>) ?? {},
    });
    const handler = handlers.find((h) => h.match(url, init));
    if (!handler) throw new Error(`Unexpected fetch: ${init.method} ${url}`);
    const { status, body } = handler.respond(url, init);
    // 204 forbids a body per the Response constructor spec.
    const hasBody = status !== 204 && status !== 205 && status !== 304;
    return new Response(hasBody ? JSON.stringify(body) : null, {
      status,
      headers: { "Content-Type": "application/json" },
    }) as unknown as Response;
  };
}

describe("GithubProvider", () => {
  let keyPair: { publicKey: Uint8Array; privateKey: Uint8Array };
  let publicB64: string;

  beforeEach(async () => {
    await sodium.ready;
    keyPair = sodium.crypto_box_keypair();
    publicB64 = sodium.to_base64(keyPair.publicKey, sodium.base64_variants.ORIGINAL);
  });

  it("encrypts secrets with the repo public key and PUTs them", async () => {
    const recorded: RecordedCall[] = [];
    const fetchImpl = makeMockFetch(
      [
        {
          match: (url, init) =>
            url.includes("/actions/secrets/public-key") && (init.method ?? "GET") === "GET",
          respond: () => ({ status: 200, body: { key_id: "KEYID1", key: publicB64 } }),
        },
        {
          match: (url, init) => url.includes("/actions/secrets/") && init.method === "PUT",
          respond: () => ({ status: 204, body: {} }),
        },
      ],
      recorded,
    );
    const gh = new GithubProvider({
      token: "ghp_test",
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    const pushed = await gh.putAllSecrets(
      { owner: "octo", repo: "demo" },
      { FOO: "value1", BAR: "value2" },
    );
    expect(pushed.sort()).toEqual(["BAR", "FOO"]);

    const puts = recorded.filter((c) => c.method === "PUT");
    expect(puts).toHaveLength(2);

    for (const put of puts) {
      const body = put.body as { encrypted_value: string; key_id: string };
      expect(body.key_id).toBe("KEYID1");
      expect(typeof body.encrypted_value).toBe("string");
      const cipher = sodium.from_base64(body.encrypted_value, sodium.base64_variants.ORIGINAL);
      const opened = sodium.crypto_box_seal_open(cipher, keyPair.publicKey, keyPair.privateKey);
      const plaintext = sodium.to_string(opened);
      expect(["value1", "value2"]).toContain(plaintext);
    }
  });

  it("skips creation when repo already exists", async () => {
    const recorded: RecordedCall[] = [];
    const fetchImpl = makeMockFetch(
      [
        {
          match: (url, init) =>
            url.endsWith("/repos/octo/demo") && (init.method ?? "GET") === "GET",
          respond: () => ({ status: 200, body: { name: "demo" } }),
        },
      ],
      recorded,
    );
    const gh = new GithubProvider({
      token: "ghp_test",
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    await gh.ensureRepoFromTemplate(
      { owner: "octo", repo: "demo" },
      { owner: "midoblgsm", repo: "vibeboiler" },
    );
    expect(recorded.every((c) => c.method === "GET")).toBe(true);
  });
});
