import { google } from 'googleapis';
import OpenAI from 'openai';
import { GmailEmail } from '../types';
import { setCredentials } from './oauth';

/* ===================== Types ===================== */

export interface GetEmailsOptions {
  search?: string; // gmail keywords, sender, subject etc
  date?: string;   // YYYY-MM-DD
  limit?: number;  // max emails to return (AI-safe)
}

interface SendEmailOptions {
  to: string;
  subject: string;
  body: string;
}

/* ===================== Helpers ===================== */

function pad(n: number) {
  return n.toString().padStart(2, '0');
}

function buildDateQuery(date?: string): string {
  if (!date) return '';
  const d = new Date(date);
  const after = `${d.getFullYear()}/${pad(d.getMonth() + 1)}/${pad(d.getDate())}`;
  const next = new Date(d);
  next.setDate(d.getDate() + 1);
  const before = `${next.getFullYear()}/${pad(next.getMonth() + 1)}/${pad(next.getDate())}`;
  return `after:${after} before:${before}`;
}

/* ===================== Gmail: Fetch Emails ===================== */

export async function getEmails(options: GetEmailsOptions = {}): Promise<GmailEmail[]> {
  const auth = await setCredentials();
  const gmail = google.gmail({ version: 'v1', auth });

  // Default limit: 50, max: 200
  const limit = Math.min(options.limit ?? 50, 200);

  const qParts: string[] = [];
  if (options.search) qParts.push(options.search);
  const dateQuery = buildDateQuery(options.date);
  if (dateQuery) qParts.push(dateQuery);

  const q = qParts.join(' ').trim() || undefined;

  let pageToken: string | undefined;
  const messages: { id?: string | null }[] = [];

  do {
    const res = await gmail.users.messages.list({
      userId: 'me',
      q,
      maxResults: 100, // always fetch 100 per page
      pageToken,
    });

    if (res.data.messages) messages.push(...res.data.messages);
    pageToken = res.data.nextPageToken || undefined;
  } while (pageToken && messages.length < limit);

  if (messages.length === 0) return [];

  // Fetch only metadata
  const emails: GmailEmail[] = [];
  for (const msg of messages.slice(0, limit)) {
    if (!msg.id) continue;
    const res = await gmail.users.messages.get({
      userId: 'me',
      id: msg.id,
      format: 'metadata',
      metadataHeaders: ['From', 'Subject', 'Date'],
    });

    const headers = res.data.payload?.headers ?? [];
    const getHeader = (name: string) => headers.find(h => h.name === name)?.value || '';

    emails.push({
      id: res.data.id || '',
      threadId: res.data.threadId || '',
      from: getHeader('From'),
      subject: getHeader('Subject') || 'No subject',
      date: getHeader('Date'),
      snippet: res.data.snippet || '',
    });
  }

  // Date filtering (timezone-safe)
  const strictlyFiltered = options.date
    ? emails.filter(e => {
        try {
          // Convert email date to local YYYY-MM-DD format
          const emailDate = new Date(e.date).toLocaleDateString('en-CA'); // YYYY-MM-DD
          return emailDate === options.date;
        } catch {
          return false;
        }
      })
    : emails;

  return strictlyFiltered;
}

/* ===================== AI: Answer From Emails ===================== */

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

export async function answerFromEmails(
  emails: GmailEmail[],
  userQuestion: string,
  queryDate?: string // <-- new optional param
): Promise<string> {
  if (emails.length === 0) {
    return 'No emails matched your request.';
  }

  const compact = emails.map(e => ({
    from: e.from,
    subject: e.subject,
    snippet: e.snippet,
  }));

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    temperature: 0,
    max_tokens: 350,
    messages: [
      {
        role: 'system',
        content: `
You are an AI assistant that answers the user STRICTLY using the provided emails.
- Do NOT invent emails, dates, or senders.
- Only summarize or answer from the emails list.
- If information is missing, respond: "No relevant information found in the emails."
- Mention the DATE REQUESTED by the user, not the actual email headers.
- Be concise and clear.
        `,
      },
      {
        role: 'user',
        content: `
User question:
"${userQuestion}"

Requested date: ${queryDate ?? 'not specified'}

Emails provided (${emails.length} strictly matching the user's request):
${JSON.stringify(compact, null, 2)}
        `,
      },
    ],
  });

  return (
    completion.choices[0].message.content?.trim() ||
    'No relevant information found in the emails.'
  );
}


/* ===================== Gmail: Send Email ===================== */

export async function sendEmail({ to, subject, body }: SendEmailOptions): Promise<void> {
  const auth = await setCredentials();
  const gmail = google.gmail({ version: 'v1', auth });

  const raw = [
    `To: ${to}`,
    'Content-Type: text/plain; charset="UTF-8"',
    'MIME-Version: 1.0',
    `Subject: ${subject}`,
    '',
    body,
  ].join('\n');

  const encoded = Buffer.from(raw)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  await gmail.users.messages.send({
    userId: 'me',
    requestBody: { raw: encoded },
  });
}
