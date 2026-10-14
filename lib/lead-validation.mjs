/** @param {Record<string, unknown>} data @param {string} consentAt */
export function validateLeadPayload(data, consentAt) {
  const kind = data.kind;
  const email = typeof data.email === 'string' ? data.email.trim().toLowerCase() : '';
  if (!['waitlist', 'contact'].includes(String(kind)) || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, error: 'Enter a valid email address and try again.' };
  }
  if (data.consent !== 'yes') return { ok: false, error: 'Please confirm how Echo may use this information.' };
  const name = typeof data.name === 'string' ? data.name.trim().slice(0, 100) : '';
  if (kind === 'waitlist') {
    return { ok: true, kind, email, record: { email, name: name || null, use_case: typeof data.useCase === 'string' ? data.useCase.trim().slice(0, 600) || null : null, consent_at: consentAt } };
  }
  const subjects = new Set(['General', 'Product feedback', 'Bug report', 'Partnership', 'Business / accelerator inquiry', 'Privacy / account deletion', 'Privacy rights request', 'Privacy grievance']);
  if (typeof data.subject !== 'string' || !subjects.has(data.subject) || typeof data.message !== 'string' || !data.message.trim() || data.message.length > 3000) {
    return { ok: false, error: 'Please add a topic and a message (up to 3,000 characters).' };
  }
  return { ok: true, kind, email, record: { email, name: name || null, subject: data.subject, message: data.message.trim(), consent_at: consentAt } };
}
