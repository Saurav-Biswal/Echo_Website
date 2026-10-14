import {
  consentCookie,
  createConsentToken,
  clearedConsentCookie,
  isSameOriginGuideRequest,
} from '@/lib/echo-guide-security.mjs';

export const runtime = 'nodejs';

function json(body: Record<string, string>, status = 200, cookie?: string) {
  const headers = new Headers({ 'Cache-Control': 'no-store' });
  if (cookie) headers.append('Set-Cookie', cookie);
  return Response.json(body, { status, headers });
}

function secureRequest(request: Request) {
  return new URL(request.url).protocol === 'https:';
}

export async function POST(request: Request) {
  if (!isSameOriginGuideRequest(request, 'x-echo-guide-request')
      || request.headers.get('x-echo-guide-consent') !== 'accepted') {
    return json({ error: 'This request could not be accepted.' }, 403);
  }
  const token = createConsentToken(process.env.ECHO_GUIDE_CONSENT_SECRET);
  if (!token) return json({ error: 'AI replies are not configured.' }, 503);
  return json({ ok: 'true' }, 200, consentCookie(token, secureRequest(request)));
}

export async function DELETE(request: Request) {
  if (!isSameOriginGuideRequest(request, 'x-echo-guide-request')) {
    return json({ error: 'This request could not be accepted.' }, 403);
  }
  return json({ ok: 'true' }, 200, clearedConsentCookie(secureRequest(request)));
}
