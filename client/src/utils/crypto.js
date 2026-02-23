/**
 * SSF key generation utility.
 *
 * Generates a real RSA-256 key pair in the browser using the Web Crypto API
 * via the jose library. The private key is exported as PKCS8 PEM (for signing
 * on the server), and the public key is exported as JWK (to host at a JWKS endpoint).
 *
 * Mirrors the approach from the SSF-Transmitter hackathon (crypto.ts).
 * CRITICAL: extractable must be true so the browser allows PEM export.
 */
import * as jose from 'jose';

export async function generateKeyPair() {
  const kid = crypto.randomUUID();

  const { privateKey, publicKey } = await jose.generateKeyPair('RS256', {
    extractable: true,
  });

  // Export private key as PKCS8 PEM — sent to server at transmit time only
  const privatePem = await jose.exportPKCS8(privateKey);

  // Export public key as JWK — hosted publicly for Okta to verify signatures
  const publicJwk = await jose.exportJWK(publicKey);
  publicJwk.kid = kid;
  publicJwk.use = 'sig';
  publicJwk.alg = 'RS256';

  return { privatePem, publicJwk, kid };
}
