/**
 * SSF key generation and signing utilities.
 *
 * All cryptographic operations happen in the browser via the Web Crypto API
 * (wrapped by jose). The private key never leaves the browser — only the
 * signed compact JWT is sent to the server for forwarding to Okta.
 */
import * as jose from 'jose';

/**
 * Generates a real RSA-2048 key pair for SSF signing.
 * Returns privatePem (PKCS8), publicJwk (for JWKS hosting), and kid (UUID).
 */
export async function generateKeyPair() {
  const kid = crypto.randomUUID();

  const { privateKey, publicKey } = await jose.generateKeyPair('RS256', {
    extractable: true,
  });

  const privatePem = await jose.exportPKCS8(privateKey);
  const publicJwk = await jose.exportJWK(publicKey);
  publicJwk.kid = kid;
  publicJwk.use = 'sig';
  publicJwk.alg = 'RS256';

  return { privatePem, publicJwk, kid };
}

/**
 * Signs a Security Event Token (SET) as a compact JWT (RS256) entirely
 * in the browser. The private key is never transmitted — only the resulting
 * signed JWT string is sent to the server.
 *
 * @param {object} payload - JWT claims (iss, iat, jti, aud, events)
 * @param {string} kid     - Key ID matching the hosted JWKS
 * @param {string} privatePem - PKCS8 PEM private key
 * @returns {Promise<string>} Compact JWT: header.payload.signature
 */
export async function signSecurityEventToken({ payload, kid, privatePem }) {
  const privateKey = await jose.importPKCS8(privatePem, 'RS256');
  const encoder = new TextEncoder();

  const signedJwt = await new jose.CompactSign(encoder.encode(JSON.stringify(payload)))
    .setProtectedHeader({ alg: 'RS256', kid, typ: 'secevent+jwt' })
    .sign(privateKey);

  return signedJwt;
}
