import { describe, it, expect } from "vitest";
import sodium from "libsodium-wrappers";
import { encryptForGithub } from "../core/sealedBox.js";

describe("encryptForGithub", () => {
  it("produces a base64 sealed box that round-trips with the matching secret key", async () => {
    await sodium.ready;
    const kp = sodium.crypto_box_keypair();
    const publicB64 = sodium.to_base64(kp.publicKey, sodium.base64_variants.ORIGINAL);
    const plaintext = "super-secret-token-12345";

    const encrypted = await encryptForGithub(plaintext, publicB64);

    const cipher = sodium.from_base64(encrypted, sodium.base64_variants.ORIGINAL);
    const opened = sodium.crypto_box_seal_open(cipher, kp.publicKey, kp.privateKey);
    expect(sodium.to_string(opened)).toBe(plaintext);
  });

  it("produces different ciphertexts for the same plaintext (non-deterministic)", async () => {
    await sodium.ready;
    const kp = sodium.crypto_box_keypair();
    const publicB64 = sodium.to_base64(kp.publicKey, sodium.base64_variants.ORIGINAL);
    const a = await encryptForGithub("foo", publicB64);
    const b = await encryptForGithub("foo", publicB64);
    expect(a).not.toBe(b);
  });
});
