// Simple mailer guard utility
// Usage: const mailer = require('../common/mailer'); await mailer.sendEmail(to, subject, body, options)

const util = require('util');

async function sendEmail(to, subject, body, options = {}) {
  const enabled = process.env.EMAIL_SENDING_ENABLED === 'true';
  if (!enabled) {
    console.log(`[MAILER BLOCKED] EMAIL_SENDING_ENABLED!=true — not sending email to ${to}. Subject: ${subject}`);
    // Optionally record blocked attempt somewhere safe (audit_log) — left as no-op.
    return { blocked: true };
  }

  // Fallback: no concrete sender configured in this repo. If you wire a provider,
  // implement provider logic here (nodemailer, sendgrid, SES, etc.)
  console.log(`[MAILER PASS-THROUGH] EMAIL_SENDING_ENABLED=true — implement provider to send email to ${to}`);
  // Example: call provider.send(...) and return its result.
  return { sent: false, info: 'no-provider-implemented' };
}

module.exports = { sendEmail };
