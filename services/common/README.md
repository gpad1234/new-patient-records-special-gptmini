Mailer guard

This repository does not include a configured email provider. To prevent accidental emails during development or while migrating, use the `mailer` utility and control sending with the `EMAIL_SENDING_ENABLED` environment variable.

Usage:

- Import and call:

  const mailer = require('./common/mailer');
  await mailer.sendEmail('user@example.com', 'Subject', 'Body text');

- By default emails are blocked. To allow sending (only after wiring a provider), set:

  export EMAIL_SENDING_ENABLED=true

Implementation note:
- Implement provider integration (nodemailer / SendGrid / SES) inside `mailer.js` when ready.
