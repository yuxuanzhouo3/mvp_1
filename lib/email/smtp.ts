import nodemailer from 'nodemailer';

let transporter: nodemailer.Transporter | null = null;

function getSmtpConfig() {
  const host = (process.env.AUTH_EMAIL_SMTP_HOST || '').trim();
  const port = Number(process.env.AUTH_EMAIL_SMTP_PORT || 465);
  const user = (process.env.AUTH_EMAIL_SMTP_USER || '').trim();
  const pass = (process.env.AUTH_EMAIL_SMTP_PASS || '').trim();
  const from = (process.env.AUTH_EMAIL_FROM || user).trim();

  return {
    host,
    port,
    user,
    pass,
    from,
    secure: port === 465,
  };
}

export function isAuthEmailSmtpConfigured(): boolean {
  const cfg = getSmtpConfig();
  return !!(cfg.host && cfg.port && cfg.user && cfg.pass && cfg.from);
}

function getTransporter(): nodemailer.Transporter {
  if (transporter) return transporter;

  const cfg = getSmtpConfig();
  if (!cfg.host || !cfg.user || !cfg.pass || !cfg.from) {
    throw new Error('AUTH_EMAIL SMTP is not configured');
  }

  transporter = nodemailer.createTransport({
    host: cfg.host,
    port: cfg.port,
    secure: cfg.secure,
    auth: {
      user: cfg.user,
      pass: cfg.pass,
    },
  });

  return transporter;
}

export async function sendSmtpEmail(params: {
  to: string;
  subject: string;
  text: string;
  html: string;
}) {
  const cfg = getSmtpConfig();
  const client = getTransporter();

  return client.sendMail({
    from: cfg.from,
    to: params.to,
    subject: params.subject,
    text: params.text,
    html: params.html,
  });
}

