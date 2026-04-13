import { registerRedaction } from "./logger.js";

/**
 * In-memory TokenVault. Tokens and sensitive material never get persisted to
 * disk — they live only for the lifetime of the CLI process and are flushed
 * into GitHub Actions Secrets and local .env / service-account.json files.
 */
export class TokenVault {
  private readonly store = new Map<string, string>();

  set(key: string, value: string): void {
    this.store.set(key, value);
    registerRedaction(value);
  }

  get(key: string): string | undefined {
    return this.store.get(key);
  }

  require(key: string): string {
    const v = this.store.get(key);
    if (!v) throw new Error(`Token '${key}' is missing from the vault`);
    return v;
  }

  has(key: string): boolean {
    return this.store.has(key);
  }

  entries(): Array<[string, string]> {
    return [...this.store.entries()];
  }
}

export const VAULT_KEYS = {
  GCP_TOKEN: "gcp.accessToken",
  NEON_API_KEY: "neon.apiKey",
  NEON_CONNECTION_URI: "neon.connectionUri",
  GITHUB_TOKEN: "github.token",
  EXPO_TOKEN: "expo.token",
  APPLE_ISSUER_ID: "apple.issuerId",
  APPLE_KEY_ID: "apple.keyId",
  APPLE_P8: "apple.p8Contents",
  APPLE_APP_SPECIFIC_PASSWORD: "apple.appSpecificPassword",
  FIREBASE_SERVICE_ACCOUNT_JSON: "firebase.serviceAccountJson",
  GOOGLE_PLAY_SERVICE_ACCOUNT_JSON: "play.serviceAccountJson",
} as const;
