import {
  AgentResponse,
  AIIntent,
  GmailEmail,
  GoogleTokens,
  GMeetEvent,
  ShopifyCredentials,
  ShopifyOrder,
  SheetRow,
  CreateSheetParams,
} from '../types';
import {
  createGoogleDoc,
  readGoogleDoc,
  appendToGoogleDoc,
  replaceTextInGoogleDoc,
  clearGoogleDoc,
} from '../google/docsClient';

import { createSpreadsheet, readSheet, updateSheet } from '../google/sheets';
import { parseUserIntent } from '../ai/client';
import { getEmails, answerFromEmails, sendEmail } from '../google/gmail';
import { getLatestFiles } from '../google/drive';
import { getLatestOrders } from '../shopify/api';
import { createGMeet, deleteCalendarEvent, updateCalendarEvent } from '../google/gmeet';
import { getOAuth2Client } from '../google/oauth';
import fs from 'fs';
import path from 'path';

/* ===================================================== */
/* ===================== TIME UTILS ===================== */
/* ===================================================== */
function normalizeTimeTo24h(time: string): string {
  const t = time.trim().toLowerCase();
  if (/^\d{1,2}:\d{2}$/.test(t)) return t;

  const match = t.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)$/);
  if (!match) throw new Error(`Invalid time format: ${time}`);

  let hour = parseInt(match[1], 10);
  const minute = match[2] ? parseInt(match[2], 10) : 0;
  const period = match[3];
  if (period === 'pm' && hour !== 12) hour += 12;
  if (period === 'am' && hour === 12) hour = 0;
  return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
}

function isoToHM(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  return `${d.getHours().toString().padStart(2, '0')}:${d
    .getMinutes()
    .toString()
    .padStart(2, '0')}`;
}

function displayTimeFromISO(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  return d
    .toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true })
    .toLowerCase();
}

function findMatchingMeets(meets: GMeetEvent[], time?: string): GMeetEvent[] {
  if (!meets.length) return [];
  if (!time) return [meets[meets.length - 1]];

  let normalized: string;
  try {
    normalized = normalizeTimeTo24h(time);
  } catch {
    return [];
  }
  return meets.filter((m) => isoToHM(m.start) === normalized);
}

/* ===================================================== */
/* ===================== TOKEN STORE ==================== */
/* ===================================================== */
function loadTokens(): GoogleTokens | null {
  try {
    const file = path.join(process.cwd(), 'google_tokens.json');
    if (fs.existsSync(file)) return JSON.parse(fs.readFileSync(file, 'utf-8'));
    return null;
  } catch {
    return null;
  }
}

function saveTokens(tokens: GoogleTokens) {
  const file = path.join(process.cwd(), 'google_tokens.json');
  fs.writeFileSync(file, JSON.stringify(tokens, null, 2));
}

/* ===================================================== */
/* ===================== AUTH CLIENT ==================== */
/* ===================================================== */
export async function getAuthClient() {
  const oauth2 = getOAuth2Client();
  const tokens = loadTokens();

  if (!tokens?.refresh_token) throw new Error('No Google refresh token found');
  oauth2.setCredentials(tokens);

  if (!tokens.access_token || !tokens.expiry_date || tokens.expiry_date <= Date.now()) {
    try {
      const refreshed = await oauth2.refreshAccessToken();
      oauth2.setCredentials(refreshed.credentials);
      saveTokens(refreshed.credentials as GoogleTokens);
    } catch (err) {
      console.error('Failed to refresh Google token:', err);
      throw new Error('Google authentication failed.');
    }
  }
  return oauth2;
}

/* ===================================================== */
/* ===================== CONTEXT ======================== */
/* ===================================================== */
let createdMeets: GMeetEvent[] = [];

/* ===================================================== */
/* ===================== MAIN AGENT ===================== */
/* ===================================================== */
export async function processQuery(
  query: string,
  shopifyConfig?: ShopifyCredentials
): Promise<AgentResponse> {
  try {
    const intent: AIIntent = await parseUserIntent(query);

    /* ---------------- GOOGLE AUTH ---------------- */
    await getAuthClient();

    /* ================= FETCH EMAILS ================= */
    if (intent.action === 'fetch_emails') {
      const emails: GmailEmail[] = await getEmails({
        search: intent.parameters?.search,
        date: intent.parameters?.date,
        limit: intent.parameters?.limit ?? 50,
      });

      const answer =
        emails.length === 0
          ? 'No matching emails found.'
          : await answerFromEmails(emails, query, intent.parameters?.date);

      return {
        action: 'fetch_emails',
        message: `✅ Found ${emails.length} emails. ${answer}`,
        data: emails,
      };
    }
    if (intent.action === 'create_doc') {
  const { title } = intent.parameters ?? {};

  if (!title) {
    return {
      action: 'create_doc',
      message: 'Please provide a title for the Google Doc.',
    };
  }

  const doc = await createGoogleDoc({ title });

  return {
    action: 'create_doc',
    message: `✅ Google Doc created successfully!\n📄 ${doc.title}`,
    data: doc,
  };
}

if (intent.action === 'read_doc') {
  const { documentId } = intent.parameters ?? {};

  if (!documentId) {
    return {
      action: 'read_doc',
      message: 'Please provide the Google Doc ID.',
    };
  }

  const content = await readGoogleDoc({ documentId });

  return {
    action: 'read_doc',
    message: '✅ Document content fetched successfully.',
    data: {
      documentId,
      content,
    },
  };
}

if (intent.action === 'append_doc') {
  const { documentId, text } = intent.parameters ?? {};

  if (!documentId || !text) {
    return {
      action: 'append_doc',
      message: 'Please provide document ID and text to append.',
    };
  }

  await appendToGoogleDoc({ documentId, text });

  return {
    action: 'append_doc',
    message: '✅ Text appended to Google Doc.',
  };
}

if (intent.action === 'replace_doc') {
  const { documentId, findText, replaceText } = intent.parameters ?? {};

  if (!documentId || !findText || replaceText === undefined) {
    return {
      action: 'replace_doc',
      message: 'Please provide document ID, text to find, and replacement text.',
    };
  }

  await replaceTextInGoogleDoc({ documentId, findText, replaceText });

  return {
    action: 'replace_doc',
    message: '✅ Text replaced successfully.',
  };
}

if (intent.action === 'clear_doc') {
  const { documentId } = intent.parameters ?? {};

  if (!documentId) {
    return {
      action: 'clear_doc',
      message: 'Please provide the Google Doc ID.',
    };
  }

  await clearGoogleDoc(documentId);

  return {
    action: 'clear_doc',
    message: '✅ Google Doc cleared successfully.',
  };
}

    /* ================= SEND EMAIL ================= */
    if (intent.action === 'send_email') {
      if (!intent.parameters?.to)
        return { action: 'send_email', message: 'Who should I send the email to?' };

      let body = intent.parameters.body ?? '';
      if (/meet|meeting/i.test(query) && createdMeets.length) {
        const last = createdMeets[createdMeets.length - 1];
        body += `\n\n📅 Google Meet\n🔗 ${last.meetLink}\n🕒 ${displayTimeFromISO(last.start)} – ${displayTimeFromISO(last.end)}`;
      }

      await sendEmail({
        to: intent.parameters.to,
        subject: intent.parameters.subject ?? 'Meeting Details',
        body,
      });
      return { action: 'send_email', message: '✅ Email sent.' };
    }

    /* ================= CREATE MEET ================= */
    if (intent.action === 'create_meet') {
      const { date, time, subject, body } = intent.parameters ?? {};
      if (!time)
        return { action: 'create_meet', message: '🕒 Please tell me the meeting time (e.g. 5pm)' };

      const meetingDate = date ?? new Date().toISOString().split('T')[0];
      const safeTime = normalizeTimeTo24h(time);
      const startISO = new Date(`${meetingDate}T${safeTime}:00`).toISOString();
      const endISO = new Date(new Date(startISO).getTime() + 30 * 60 * 1000).toISOString();

      const gmeet = await createGMeet({ subject: subject ?? 'Google Meet', body, start: startISO, end: endISO });
      createdMeets.push({
        eventId: gmeet.eventId,
        meetLink: gmeet.meetLink,
        start: gmeet.start,
        end: gmeet.end,
        summary: gmeet.summary,
        description: gmeet.description,
      });

      return {
        action: 'create_meet',
        message: `✅ Google Meet created!\n🔗 ${gmeet.meetLink}\n🕒 ${displayTimeFromISO(gmeet.start)}`,
        data: gmeet,
      };
    }

    /* ================= DELETE MEET ================= */
    if (intent.action === 'delete_meet') {
      const matches = findMatchingMeets(createdMeets, intent.parameters?.time);
      if (!matches.length)
        return {
          action: 'delete_meet',
          message: `No meeting found${intent.parameters?.time ? ` at ${intent.parameters.time}` : ''}.`,
        };

      const target = matches[0];
      if (!target.eventId) return { action: 'delete_meet', message: 'Cannot delete this meeting.' };

      await deleteCalendarEvent(target.eventId);
      createdMeets = createdMeets.filter((m) => m !== target);
      return { action: 'delete_meet', message: '✅ Meeting deleted.' };
    }

    /* ================= UPDATE MEET ================= */
    if (intent.action === 'update_meet') {
      const matches = findMatchingMeets(createdMeets, intent.parameters?.time);
      if (!matches.length)
        return {
          action: 'update_meet',
          message: `No meeting found${intent.parameters?.time ? ` at ${intent.parameters.time}` : ''}.`,
        };

      const target = matches[0];
      if (!target.eventId) return { action: 'update_meet', message: 'Cannot reschedule this meeting.' };

      const baseDate = intent.parameters?.date ?? target.start.split('T')[0];
      const safeTime = intent.parameters?.time ? normalizeTimeTo24h(intent.parameters.time) : isoToHM(target.start);
      const newStart = new Date(`${baseDate}T${safeTime}:00`).toISOString();
      const newEnd = new Date(new Date(newStart).getTime() + 30 * 60 * 1000).toISOString();

      await updateCalendarEvent(target.eventId, newStart, newEnd);
      target.start = newStart;
      target.end = newEnd;

      return { action: 'update_meet', message: `✅ Meeting rescheduled to ${displayTimeFromISO(newStart)}` };
    }

    /* ================= FETCH SHOPIFY ORDERS ================= */
    if (intent.action === 'fetch_orders') {
      if (!shopifyConfig?.storeUrl || !shopifyConfig?.accessToken)
        return { action: 'fetch_orders', message: '❌ Shopify is not connected. Please connect your store first.' };

      try {
        const orders: ShopifyOrder[] = await getLatestOrders(
          { apiKey: '', apiSecret: '', storeUrl: shopifyConfig.storeUrl, accessToken: shopifyConfig.accessToken },
          intent.parameters?.limit ?? 5
        );
        return { action: 'fetch_orders', message: `✅ Found ${orders.length} Shopify orders.`, data: orders };
      } catch (err: any) {
        console.error('Shopify fetch error:', err.response?.data || err.message);
        return { action: 'fetch_orders', message: '❌ Failed to fetch Shopify orders. Please check your credentials.' };
      }
    }

    /* ================= CREATE GOOGLE SHEET ================= */
    if (intent.action === 'create_sheet') {
      const { title, sheetName } = intent.parameters ?? {};

      if (!title) {
        return {
          action: 'create_sheet',
          message: 'Please provide a name for the Google Sheet.',
        };
      }

      const sheet = await createSpreadsheet({ title, sheetName });

      return {
        action: 'create_sheet',
        message: `✅ Google Sheet created successfully!\n📄 ${sheet.spreadsheetUrl}`,
        data: sheet,
      };
    }

    /* ================= READ GOOGLE SHEET ================= */
    if (intent.action === 'read_sheet') {
      const { spreadsheetId, range } = intent.parameters ?? {};

      if (!spreadsheetId || !range) {
        return {
          action: 'read_sheet',
          message: 'Please provide spreadsheet ID and range to read.',
        };
      }

      const rawData = await readSheet({ spreadsheetId, range });
      const rows: SheetRow[] = rawData.map((row: any[]) => ({ values: row }));

      return {
        action: 'read_sheet',
        message: `✅ Read ${rows.length} rows from Google Sheet.`,
        data: rows,
      };
    }

    /* ================= UPDATE GOOGLE SHEET ================= */
    if (intent.action === 'update_sheet') {
      const { spreadsheetId, range, values } = intent.parameters ?? {};

      if (!spreadsheetId || !range || !values) {
        return {
          action: 'update_sheet',
          message: 'Please provide spreadsheet ID, range, and values to update.',
        };
      }

      await updateSheet({ spreadsheetId, range, values });

      return {
        action: 'update_sheet',
        message: '✅ Google Sheet updated successfully.',
      };
    }

    /* ================= FETCH DRIVE FILES ================= */
    if (intent.action === 'fetch_files') {
      try {
        const auth = await getAuthClient();
        const files = await getLatestFiles(auth, intent.parameters?.limit ?? 5);
        return { action: 'fetch_files', message: `✅ Fetched ${files.length} files from Drive.`, data: files };
      } catch (err) {
        console.error('Drive fetch error:', err);
        return { action: 'fetch_files', message: '⚠️ Failed to fetch files. Please connect your Google account.' };
      }
    }

    /* ================= DEFAULT HELP ================= */
    return { action: intent.action, message: intent.naturalResponse };
  } catch (err) {
    console.error(err);
    return { action: 'help', message: 'I can help with Gmail, Drive, Shopify, Google Meet, and Google Sheets actions.' };
  }
}
