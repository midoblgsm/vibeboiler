import sodium from "libsodium-wrappers";

/**
 * Encrypt a plaintext secret for GitHub Actions using the repository's
 * libsodium sealed-box public key. Returns a base64 string suitable for the
 * `encrypted_value` field of `PUT /repos/{o}/{r}/actions/secrets/{name}`.
 */
export async function encryptForGithub(
  plaintext: string,
  base64PublicKey: string,
): Promise<string> {
  await sodium.ready;
  const publicKey = sodium.from_base64(
    base64PublicKey,
    sodium.base64_variants.ORIGINAL,
  );
  const message = sodium.from_string(plaintext);
  const sealed = sodium.crypto_box_seal(message, publicKey);
  return sodium.to_base64(sealed, sodium.base64_variants.ORIGINAL);
}
