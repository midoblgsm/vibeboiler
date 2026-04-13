import { SignJWT, importPKCS8 } from "jose";
import { createHttp, type Http } from "../core/http.js";
import { logger } from "../core/logger.js";

export interface AppleProviderOptions {
  issuerId: string;
  keyId: string;
  /** Raw PKCS#8 .p8 file contents (PEM). */
  privateKey: string;
  fetchImpl?: typeof fetch;
}

export interface BundleIdRecord {
  id: string;
  identifier: string;
}

/**
 * Mint an ES256 JWT for App Store Connect. Exp must be <= 20 min.
 */
async function mintAscJwt(issuerId: string, keyId: string, p8Pem: string): Promise<string> {
  const key = await importPKCS8(p8Pem, "ES256");
  return new SignJWT({})
    .setProtectedHeader({ alg: "ES256", kid: keyId, typ: "JWT" })
    .setIssuer(issuerId)
    .setIssuedAt()
    .setExpirationTime("19m")
    .setAudience("appstoreconnect-v1")
    .sign(key);
}

export class AppleProvider {
  private readonly opts: AppleProviderOptions;
  private cachedHttp: Http | null = null;
  private cachedAt = 0;

  constructor(opts: AppleProviderOptions) {
    this.opts = opts;
  }

  private async http(): Promise<Http> {
    const ttlMs = 15 * 60 * 1000;
    if (this.cachedHttp && Date.now() - this.cachedAt < ttlMs) return this.cachedHttp;
    const jwt = await mintAscJwt(this.opts.issuerId, this.opts.keyId, this.opts.privateKey);
    this.cachedHttp = createHttp({
      baseUrl: "https://api.appstoreconnect.apple.com",
      headers: { Authorization: `Bearer ${jwt}` },
      fetchImpl: this.opts.fetchImpl,
      provider: "apple",
    });
    this.cachedAt = Date.now();
    return this.cachedHttp;
  }

  async ensureBundleId(identifier: string, name: string): Promise<BundleIdRecord> {
    const http = await this.http();
    const list = await http.get<{
      data: Array<{ id: string; attributes: { identifier: string } }>;
    }>("/v1/bundleIds", { query: { "filter[identifier]": identifier, limit: 1 } });
    const existing = list.data.find((d) => d.attributes.identifier === identifier);
    if (existing) {
      logger.debug(`Apple Bundle ID ${identifier} already registered`);
      return { id: existing.id, identifier };
    }
    const created = await http.post<{ data: { id: string } }>("/v1/bundleIds", {
      data: {
        type: "bundleIds",
        attributes: { identifier, name, platform: "IOS" },
      },
    });
    return { id: created.data.id, identifier };
  }
}
