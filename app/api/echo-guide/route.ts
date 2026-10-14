import { requestGroqCompletion, validateAiRequest } from '@/lib/echo-guide-ai.mjs';
import { isSameOriginGuideRequest, readConsentCookie, verifyConsentToken } from '@/lib/echo-guide-security.mjs';

export const runtime = 'nodejs';
export const maxDuration = 9;

const MAX_BODY_BYTES = 12_000;

function json(body: Record<string, unknown>, status = 200) {
  return Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } });
}

async function readBoundedBody(request: Request) {
  const declaredLength = Number(request.headers.get('content-length') || 0);
  if (declaredLength > MAX_BODY_BYTES) return { tooLarge: true as const };

  const reader = request.body?.getReader();
  if (!reader) return { text: '' };
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > MAX_BODY_BYTES) {
      await reader.cancel();
      return { tooLarge: true as const };
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return { text: new TextDecoder().decode(bytes) };
}

export async function POST(request: Request) {
  if (!isSameOriginGuideRequest(request, 'x-echo-guide-request')) {
    return json({ error: 'This request could not be accepted.' }, 403);
  }
  const consentSecret = process.env.ECHO_GUIDE_CONSENT_SECRET;
  const consentToken = readConsentCookie(request.headers.get('cookie') || '');
  if (!verifyConsentToken(consentToken, consentSecret)) {
    return json({ error: 'Please opt in before using Groq AI.' }, 403);
  }

  const body = await readBoundedBody(request).catch(() => null);
  if (!body) return json({ error: 'The request could not be read.' }, 400);
  if ('tooLarge' in body) return json({ error: 'This message is too large.' }, 413);

  let payload: unknown;
  try {
    payload = JSON.parse(body.text);
  } catch {
    return json({ error: 'Please check your message and try again.' }, 400);
  }

  const validated = validateAiRequest(payload);
  if (!validated.ok) {
    return json({ error: 'Please check your message and try again.' }, 400);
  }

  const result = await requestGroqCompletion({
    apiKey: process.env.GROQ_API_KEY,
    model: process.env.GROQ_MODEL || undefined,
    message: validated.message,
    history: validated.history,
  });

  if (!result.ok) {
    const status = result.reason === 'timeout' ? 504
      : result.reason === 'rate_limit' ? 429
        : result.reason === 'unavailable' ? 503 : 502;
    const error = result.reason === 'rate_limit' ? 'Groq is busy right now.'
      : result.reason === 'timeout' ? 'The AI reply took too long.'
        : result.reason === 'unavailable' ? 'Groq AI is not configured.'
          : 'Groq AI is unavailable right now.';
    return json({ error, reason: result.reason }, status);
  }

  return json({ text: result.text, model: result.model });
}
