import { createHmac, timingSafeEqual } from 'node:crypto';
import { Buffer } from 'node:buffer';
import { URL } from 'node:url';

export const ECHO_GUIDE_CONSENT_COOKIE = 'echo_guide_ai_consent';
export const ECHO_GUIDE_CONSENT_TTL_SECONDS = 15 * 60;
export const ECHO_GUIDE_DISCLOSURE_VERSION = 'groq-chat-v1';
const TOKEN_VERSION = 1;

function signingKey(secret) {
  if (typeof secret !== 'string' || Buffer.byteLength(secret, 'utf8') < 32) return null;
  return secret;
}

function sign(payload, secret) {
  return createHmac('sha256', secret).update(payload).digest('base64url');
}

export function createConsentToken(secret, now = Date.now()) {
  const key = signingKey(secret);
  if (!key) return null;
  const payload = Buffer.from(JSON.stringify({
    v: TOKEN_VERSION,
    disclosure: ECHO_GUIDE_DISCLOSURE_VERSION,
    iat: Math.floor(now / 1000),
    exp: Math.floor(now / 1000) + ECHO_GUIDE_CONSENT_TTL_SECONDS,
  })).toString('base64url');
  return `${payload}.${sign(payload, key)}`;
}

export function verifyConsentToken(token, secret, now = Date.now()) {
  const key = signingKey(secret);
  if (!key || typeof token !== 'string') return false;
  const [payload, signature, extra] = token.split('.');
  if (!payload || !signature || extra !== undefined) return false;
  const expected = Buffer.from(sign(payload, key));
  const received = Buffer.from(signature);
  if (expected.length !== received.length || !timingSafeEqual(expected, received)) return false;
  try {
    const claims = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    const nowSeconds = Math.floor(now / 1000);
    return claims?.v === TOKEN_VERSION
      && claims?.disclosure === ECHO_GUIDE_DISCLOSURE_VERSION
      && Number.isInteger(claims?.iat)
      && Number.isInteger(claims?.exp)
      && claims.iat <= nowSeconds
      && claims.exp > nowSeconds
      && claims.exp - claims.iat === ECHO_GUIDE_CONSENT_TTL_SECONDS;
  } catch {
    return false;
  }
}

export function readConsentCookie(cookieHeader = '') {
  const prefix = `${ECHO_GUIDE_CONSENT_COOKIE}=`;
  for (const part of cookieHeader.split(';')) {
    const cookie = part.trim();
    if (cookie.startsWith(prefix)) return cookie.slice(prefix.length);
  }
  return '';
}

export function isSameOriginGuideRequest(request, expectedHeader) {
  try {
    const requestUrl = new URL(request.url);
    const origin = request.headers.get('origin');
    if (!origin || origin !== requestUrl.origin) return false;
    if (request.headers.get('sec-fetch-site') === 'cross-site') return false;
    return request.headers.get(expectedHeader) === 'same-origin';
  } catch {
    return false;
  }
}

export function consentCookie(token, secure = false) {
  return `${ECHO_GUIDE_CONSENT_COOKIE}=${token}; Path=/api/echo-guide; Max-Age=${ECHO_GUIDE_CONSENT_TTL_SECONDS}; HttpOnly; SameSite=Strict${secure ? '; Secure' : ''}`;
}

export function clearedConsentCookie(secure = false) {
  return `${ECHO_GUIDE_CONSENT_COOKIE}=; Path=/api/echo-guide; Max-Age=0; HttpOnly; SameSite=Strict${secure ? '; Secure' : ''}`;
}
