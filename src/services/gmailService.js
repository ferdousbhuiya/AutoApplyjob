const { google } = require('googleapis');

const SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.compose',
  'https://www.googleapis.com/auth/gmail.send'
];

const JOB_SUBJECT_KEYWORDS = [
  'job', 'opportunity', 'position', 'hiring', 'recruiter', 'application', 'career'
];

function getOAuthClient() {
  return new google.auth.OAuth2(
    process.env.GMAIL_CLIENT_ID,
    process.env.GMAIL_CLIENT_SECRET,
    process.env.GMAIL_REDIRECT_URI
  );
}

function getAuthUrl() {
  const oAuth2Client = getOAuthClient();
  return oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: SCOPES
  });
}

async function getTokenFromCode(code) {
  const oAuth2Client = getOAuthClient();
  const { tokens } = await oAuth2Client.getToken(code);
  return tokens;
}

function getGmailClient(tokens) {
  const oAuth2Client = getOAuthClient();
  oAuth2Client.setCredentials(tokens);
  return google.gmail({ version: 'v1', auth: oAuth2Client });
}

function decodeBase64Url(data) {
  return Buffer.from(data, 'base64url').toString('utf-8');
}

function extractPlainTextBody(payload) {
  if (!payload) return '';

  if (payload.body?.data) {
    return decodeBase64Url(payload.body.data);
  }

  if (Array.isArray(payload.parts)) {
    const textPart = payload.parts.find((p) => p.mimeType === 'text/plain');
    if (textPart?.body?.data) {
      return decodeBase64Url(textPart.body.data);
    }
    const htmlPart = payload.parts.find((p) => p.mimeType === 'text/html');
    if (htmlPart?.body?.data) {
      return decodeBase64Url(htmlPart.body.data);
    }
    for (const part of payload.parts) {
      const nested = extractPlainTextBody(part);
      if (nested) return nested;
    }
  }

  return '';
}

function getHeader(headers, name) {
  const header = headers?.find((h) => h.name.toLowerCase() === name.toLowerCase());
  return header?.value || '';
}

async function fetchJobEmails(tokens) {
  const gmail = getGmailClient(tokens);

  const subjectQuery = JOB_SUBJECT_KEYWORDS.map((kw) => `subject:${kw}`).join(' OR ');
  const query = `is:unread (${subjectQuery})`;

  const listRes = await gmail.users.messages.list({
    userId: 'me',
    q: query,
    maxResults: 10
  });

  const messages = listRes.data.messages || [];

  const emails = [];
  for (const msg of messages) {
    const fullMessage = await gmail.users.messages.get({
      userId: 'me',
      id: msg.id,
      format: 'full'
    });

    const headers = fullMessage.data.payload?.headers || [];
    emails.push({
      email_id: msg.id,
      subject: getHeader(headers, 'Subject'),
      from: getHeader(headers, 'From'),
      body: extractPlainTextBody(fullMessage.data.payload)
    });
  }

  return emails;
}

function buildRawEmail({ to, subject, body }) {
  const messageParts = [
    `To: ${to}`,
    `Subject: ${subject}`,
    'Content-Type: text/plain; charset=utf-8',
    '',
    body
  ];
  const message = messageParts.join('\n');
  return Buffer.from(message).toString('base64url');
}

async function createDraft(tokens, to, subject, body) {
  const gmail = getGmailClient(tokens);
  const raw = buildRawEmail({ to, subject, body });

  const res = await gmail.users.drafts.create({
    userId: 'me',
    requestBody: {
      message: { raw }
    }
  });

  return res.data;
}

async function getUserEmail(tokens) {
  const gmail = getGmailClient(tokens);
  const res = await gmail.users.getProfile({ userId: 'me' });
  return res.data.emailAddress || null;
}

async function sendDraft(tokens, draftId) {
  const gmail = getGmailClient(tokens);
  const res = await gmail.users.drafts.send({
    userId: 'me',
    requestBody: { id: draftId }
  });
  return res.data;
}

module.exports = {
  getAuthUrl,
  getTokenFromCode,
  fetchJobEmails,
  createDraft,
  sendDraft,
  getUserEmail
};
