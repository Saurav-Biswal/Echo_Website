import 'server-only';
import nodemailer from 'nodemailer';
import { sendPrivacyNotification } from '@/lib/privacy-notification-core.mjs';

type NotificationMessage = { to: string; from: string; subject: string; text: string };
type SmtpConfig = { host: string; port: number; secure: boolean; user: string; password: string };

export async function notifyPrivacyRequest({ subject, submissionId, submittedAt }: {
  subject: string;
  submissionId: string;
  submittedAt: string;
}) {
  const smtpConfig = {
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    secure: process.env.SMTP_SECURE,
    user: process.env.SMTP_USER,
    password: process.env.SMTP_APP_PASSWORD,
    recipient: process.env.PRIVACY_NOTIFICATION_TO,
  };

  return sendPrivacyNotification({
    smtpConfig,
    subject,
    submissionId,
    submittedAt,
    siteUrl: process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
    send: async ({ config, message }: { config: SmtpConfig; message: NotificationMessage }) => {
      const transporter = nodemailer.createTransport({
        host: config.host,
        port: config.port,
        secure: config.secure,
        auth: { user: config.user, pass: config.password },
      });
      try {
        const result = await transporter.sendMail(message);
        return { accepted: result.accepted, messageId: result.messageId };
      } finally {
        transporter.close();
      }
    },
  });
}
