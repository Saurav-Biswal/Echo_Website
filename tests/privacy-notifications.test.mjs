import test from 'node:test';
import assert from 'node:assert/strict';
import {
  PRIVACY_NOTIFICATION_RECIPIENT,
  buildPrivacyNotification,
  persistFormAndNotify,
  sendPrivacyNotification,
} from '../lib/privacy-notification-core.mjs';

const common = {
  submissionId: 'row-123',
  submittedAt: '2026-10-09T10:00:00.000Z',
  siteUrl: 'https://echo.example',
};
const smtpConfig = {
  host: 'smtp.gmail.com', port: '465', secure: 'true',
  user: 'echowithss@gmail.com', password: 'test-only-password',
  recipient: 'echowithss@gmail.com',
};

test('notification contains only request type, row reference, time and privacy page link', () => {
  const mail = buildPrivacyNotification({ ...common, subject: 'Privacy rights request' });
  assert.equal(mail.to, 'echowithss@gmail.com');
  assert.match(mail.text, /Request type: Privacy rights request/);
  assert.match(mail.text, /Submission ID: row-123/);
  assert.match(mail.text, /Submitted at: 2026-10-09T10:00:00\.000Z/);
  assert.match(mail.text, /https:\/\/echo\.example\/privacy-requests/);
  assert.doesNotMatch(mail.text, /email address|message contents|secret data/i);
  assert.equal(mail.from, undefined);
});

test('missing SMTP configuration is reported without attempting to send', async () => {
  const required = Object.keys(smtpConfig);
  for (const missing of required) {
    const config = { ...smtpConfig, [missing]: undefined };
    let sent = false;
    const result = await sendPrivacyNotification({
      ...common,
      subject: 'Privacy grievance',
      smtpConfig: config,
      send: async () => { sent = true; },
    });
    assert.equal(result.ok, false, missing);
    assert.equal(result.reason, 'configuration_missing', missing);
    assert.equal(result[`${missing === 'password' ? 'password' : missing}Present`], false, missing);
    assert.equal(sent, false, missing);
  }
});

test('server-only Nodemailer adapter reads SMTP variables and never exposes them publicly', async () => {
  const { readFile } = await import('node:fs/promises');
  const adapter = await readFile(new URL('../lib/privacy-notifications.ts', import.meta.url), 'utf8');
  const example = await readFile(new URL('../.env.example', import.meta.url), 'utf8');
  assert.match(adapter, /import 'server-only'/);
  assert.match(adapter, /from 'nodemailer'/);
  for (const variable of ['SMTP_HOST','SMTP_PORT','SMTP_SECURE','SMTP_USER','SMTP_APP_PASSWORD','PRIVACY_NOTIFICATION_TO']) {
    assert.match(adapter, new RegExp(`process\\.env\\.${variable}`));
  }
  assert.doesNotMatch(adapter, /NEXT_PUBLIC_(?:SMTP|PRIVACY_NOTIFICATION)/);
  for (const [line, value] of [
    ['SMTP_HOST', 'smtp.gmail.com'], ['SMTP_PORT', '465'], ['SMTP_SECURE', 'true'],
    ['SMTP_USER', 'echowithss@gmail.com'], ['SMTP_APP_PASSWORD', ''],
    ['PRIVACY_NOTIFICATION_TO', 'echowithss@gmail.com'],
  ]) {
    assert.ok(example.split(/\r?\n/).includes(`${line}=${value}`));
  }
  assert.doesNotMatch(example, /RESEND_(?:API_KEY|FROM_EMAIL)/);
});

test('SMTP success requires acceptance by the fixed recipient', async () => {
  let call;
  const result = await sendPrivacyNotification({
    ...common,
    subject: 'Privacy rights request',
    smtpConfig,
    send: async payload => {
      call = payload;
      return { accepted: ['echowithss@gmail.com'], rejected: [], messageId: 'smtp-message-id' };
    },
  });
  assert.equal(result.ok, true);
  assert.equal(result.smtpAccepted, true);
  assert.equal(call.config.host, 'smtp.gmail.com');
  assert.equal(call.config.port, 465);
  assert.equal(call.config.secure, true);
  assert.equal(call.message.to, PRIVACY_NOTIFICATION_RECIPIENT);
  assert.equal(call.message.from, 'echowithss@gmail.com');
  assert.match(call.message.text, /Submission ID: row-123/);
  assert.doesNotMatch(call.message.text, /test-only-password/);
});

test('SMTP failures return safe diagnostics without including credentials or error text', async () => {
  const smtpError = Object.assign(new Error('private message with password'), { code: 'ECONNECTION', responseCode: 421 });
  const result = await sendPrivacyNotification({
    ...common,
    subject: 'Privacy grievance',
    smtpConfig,
    send: async () => { throw smtpError; },
  });
  assert.deepEqual(result, {
    ok: false, reason: 'smtp_exception', errorName: 'Error', errorCode: 'ECONNECTION', responseCode: 421,
  });
  assert.equal(JSON.stringify(result).includes('password'), false);
});

test('privacy and grievance requests route only to the fixed recipient', async () => {
  const sent = [];
  for (const subject of ['Privacy rights request', 'Privacy grievance', 'Privacy / account deletion']) {
    const result = await sendPrivacyNotification({
      ...common,
      subject,
      smtpConfig,
      send: async payload => { sent.push(payload); return { accepted: [PRIVACY_NOTIFICATION_RECIPIENT] }; },
    });
    assert.equal(result.ok, true);
  }
  assert.equal(sent.length, 3);
  assert.deepEqual(sent.map(payload => payload.message.to), Array(3).fill(PRIVACY_NOTIFICATION_RECIPIENT));

  let called = false;
  const restricted = await sendPrivacyNotification({
    ...common,
    subject: 'Privacy grievance',
    smtpConfig: { ...smtpConfig, recipient: 'attacker@example.com' },
    send: async () => { called = true; },
  });
  assert.equal(restricted.ok, false);
  assert.equal(restricted.reason, 'configuration_invalid');
  assert.equal(called, false);

  const general = await sendPrivacyNotification({
    ...common, subject: 'General', smtpConfig, send: async () => { called = true; },
  });
  assert.deepEqual(general, { ok: true, skipped: true });
  assert.equal(called, false);
});

test('SMTP failure preserves the saved request and does not repeat the database insert', async () => {
  const inserted = [];
  let notifyCount = 0;
  const result = await persistFormAndNotify({
    kind: 'contact',
    record: { subject: 'Privacy grievance', consent_at: common.submittedAt },
    submissionId: common.submissionId,
    submittedAt: common.submittedAt,
    insert: async row => { inserted.push(row); return { error: null }; },
    notify: async () => { notifyCount += 1; return { ok: false, reason: 'smtp_exception', errorCode: 'ECONNECTION' }; },
  });
  assert.equal(result.stored, true);
  assert.equal(result.notification, 'failed');
  assert.equal(inserted.length, 1);
  assert.equal(inserted[0].id, common.submissionId);
  assert.equal(notifyCount, 1);
});

test('database failure prevents notification', async () => {
  let notified = false;
  const result = await persistFormAndNotify({
    kind: 'contact',
    record: { subject: 'Privacy rights request' },
    submissionId: common.submissionId,
    submittedAt: common.submittedAt,
    insert: async () => ({ error: { code: 'XX000' } }),
    notify: async () => { notified = true; return { ok: true, smtpAccepted: true }; },
  });
  assert.equal(result.stored, false);
  assert.equal(notified, false);
});
