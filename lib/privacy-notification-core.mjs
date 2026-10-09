export const PRIVACY_NOTIFICATION_RECIPIENT = 'echowithss@gmail.com';
export const PRIVACY_NOTIFICATION_SUBJECTS = new Set(['Privacy / account deletion', 'Privacy rights request', 'Privacy grievance']);

export function buildPrivacyNotification({ subject, submissionId, submittedAt, siteUrl }) {
  if (!PRIVACY_NOTIFICATION_SUBJECTS.has(subject)) return null;

  let privacyUrl;
  try {
    const base = new globalThis.URL(siteUrl);
    if (!['http:', 'https:'].includes(base.protocol)) return null;
    privacyUrl = new globalThis.URL('/privacy-requests', base).toString();
  } catch {
    return null;
  }

  return {
    to: PRIVACY_NOTIFICATION_RECIPIENT,
    subject: `Echo ${subject.toLowerCase()}`,
    text: [
      'A privacy-related form submission was saved by the Echo website.',
      `Request type: ${subject}`,
      `Submission ID: ${submissionId}`,
      `Submitted at: ${submittedAt}`,
      `Privacy request page: ${privacyUrl}`,
      '',
      'This automated alert does not confirm human review or completion.',
    ].join('\n'),
  };
}

export function validateSmtpConfiguration(config = {}) {
  const status = {
    hostPresent: Boolean(config.host),
    portPresent: Boolean(config.port),
    securePresent: config.secure !== undefined && config.secure !== '',
    userPresent: Boolean(config.user),
    passwordPresent: Boolean(config.password),
    recipientPresent: Boolean(config.recipient),
  };
  if (Object.values(status).some(present => !present)) {
    return { ok: false, reason: 'configuration_missing', ...status };
  }

  const port = Number(config.port);
  const secure = config.secure === true || config.secure === 'true';
  if (!Number.isInteger(port) || port < 1 || port > 65535 || typeof config.host !== 'string' ||
      typeof config.user !== 'string' || typeof config.password !== 'string' ||
      config.recipient !== PRIVACY_NOTIFICATION_RECIPIENT ||
      (config.secure !== true && config.secure !== false && config.secure !== 'true' && config.secure !== 'false')) {
    return { ok: false, reason: 'configuration_invalid', ...status };
  }

  return {
    ok: true,
    config: { host: config.host, port, secure, user: config.user, password: config.password },
  };
}

export async function sendPrivacyNotification({ smtpConfig, subject, submissionId, submittedAt, siteUrl, send }) {
  const message = buildPrivacyNotification({ subject, submissionId, submittedAt, siteUrl });
  if (!message) return { ok: true, skipped: true };

  const checked = validateSmtpConfiguration(smtpConfig);
  if (!checked.ok) return checked;

  try {
    const result = await send({
      config: checked.config,
      message: { ...message, from: checked.config.user },
    });
    if (result?.error) {
      return {
        ok: false,
        reason: 'smtp_error',
        errorName: typeof result.error.name === 'string' ? result.error.name.slice(0, 80) : undefined,
        errorCode: typeof result.error.code === 'string' ? result.error.code.slice(0, 40) : undefined,
        responseCode: Number.isInteger(result.error.responseCode) ? result.error.responseCode : undefined,
      };
    }
    const accepted = Array.isArray(result?.accepted) && result.accepted.some(address =>
      (typeof address === 'string' ? address : address?.address)?.toLowerCase() === PRIVACY_NOTIFICATION_RECIPIENT,
    );
    if (!accepted) return { ok: false, reason: 'smtp_recipient_not_accepted' };
    return { ok: true, smtpAccepted: true, messageId: typeof result.messageId === 'string' ? result.messageId : undefined };
  } catch (error) {
    return {
      ok: false,
      reason: 'smtp_exception',
      errorName: error instanceof Error ? error.name.slice(0, 80) : 'UnknownError',
      errorCode: error && typeof error === 'object' && 'code' in error && typeof error.code === 'string'
        ? error.code.slice(0, 40)
        : undefined,
      responseCode: error && typeof error === 'object' && 'responseCode' in error && Number.isInteger(error.responseCode)
        ? error.responseCode
        : undefined,
    };
  }
}

export async function persistFormAndNotify({ kind, record, submissionId, submittedAt, insert, notify }) {
  let result;
  try {
    result = await insert({ ...record, id: submissionId });
  } catch {
    return { stored: false, databaseFailure: true };
  }
  if (result?.error) return { stored: false, error: result.error };

  if (kind !== 'contact' || !PRIVACY_NOTIFICATION_SUBJECTS.has(record.subject)) {
    return { stored: true, notification: 'not_required', submissionId };
  }

  let notification;
  try {
    notification = await notify({ subject: record.subject, submissionId, submittedAt });
  } catch (error) {
    notification = { ok: false, reason: 'smtp_exception', errorName: error instanceof Error ? error.name.slice(0, 80) : 'UnknownError' };
  }
  return {
    stored: true,
    notification: notification?.ok && notification.smtpAccepted ? 'accepted' : 'failed',
    notificationFailure: notification?.ok ? undefined : {
      reason: notification?.reason || 'unknown_failure',
      errorName: notification?.errorName,
      errorCode: notification?.errorCode,
      responseCode: notification?.responseCode,
      hostPresent: notification?.hostPresent,
      portPresent: notification?.portPresent,
      securePresent: notification?.securePresent,
      userPresent: notification?.userPresent,
      passwordPresent: notification?.passwordPresent,
      recipientPresent: notification?.recipientPresent,
    },
    submissionId,
  };
}
