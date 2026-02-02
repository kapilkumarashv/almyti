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
  KeepNote,
  ClassroomCourse,
  ClassroomAssignment,
  ClassroomStudent,
  MicrosoftTokens // ✅ ADDED: Import Microsoft Tokens type
} from '../types';
/* --- ✅ TELEGRAM CLIENT (NEW) --- */
import { 
  getTelegramUpdates, 
  sendTelegramMessage, 
  kickChatMember, 
  pinChatMessage, 
  setChatTitle 
} from '../telegram/client';
/* --- EXISTING GOOGLE IMPORTS --- */
import {
  createGoogleDoc,
  readGoogleDoc,
  appendToGoogleDoc,
  replaceTextInGoogleDoc,
  clearGoogleDoc,
} from '../google/docsClient';

import { createSpreadsheet, readSheet, updateSheet } from '../google/sheets';
import { listKeepNotes, createKeepNote } from '../google/keep';
import { 
  listCourses, 
  listAssignments, 
  listStudents, 
  createCourse, 
  findCourseByName 
} from '../google/classroom';

import { parseUserIntent } from '../ai/client';
import { getEmails, answerFromEmails, sendEmail } from '../google/gmail';
import { getLatestFiles, findFileByName } from '../google/drive';
import { getLatestOrders } from '../shopify/api';
import { createGMeet, deleteCalendarEvent, updateCalendarEvent } from '../google/gmeet';
import { getOAuth2Client } from '../google/oauth';

/* --- ✅ NEW MICROSOFT IMPORTS --- */
import { getOutlookEmails, sendOutlookEmail, createOutlookEvent } from '../microsoft/outlook';
import { listOneDriveFiles, findOneDriveFileByName } from '../microsoft/onedrive';
import { createWordDoc, readWordDoc } from '../microsoft/word';
import { createExcelWorkbook, readExcelWorksheet, appendExcelRow } from '../microsoft/excel';

import fs from 'fs';
import path from 'path';

/* ===================================================== */
/* ===================== TIME UTILS ===================== */
/* ===================================================== */
// (Unchanged)
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
// (Unchanged)
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
// (Unchanged)
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
  shopifyConfig?: ShopifyCredentials,
  microsoftTokens?: MicrosoftTokens,
  telegramToken?: string // ✅ ADDED: Accept Telegram Token
): Promise<AgentResponse> {
  try {
    const intent: AIIntent = await parseUserIntent(query);
    const msToken = microsoftTokens?.access_token; // Helper for MS actions

    /* ---------------- GOOGLE AUTH ---------------- */
    const auth = await getAuthClient();

    /* =================================================================================
       HELPER: RESOLVE GOOGLE FILENAME TO ID
       ================================================================================= */
    async function resolveFileId(
      title?: string, 
      id?: string, 
      mimeType?: string
    ): Promise<{ id: string | null; name: string }> {
      if (id) return { id, name: 'File' };
      if (!title) return { id: null, name: '' };

      const file = await findFileByName(auth, title, mimeType);
      if (file) return { id: file.id, name: file.name };
      
      return { id: null, name: title };
    }

    /* =================================================================================
       ✅ HELPER: RESOLVE ONEDRIVE FILENAME TO ID (NEW)
       ================================================================================= */
    async function resolveOneDriveId(title?: string, id?: string): Promise<{ id: string | null; name: string }> {
      if (id) return { id, name: 'File' };
      if (!title) return { id: null, name: '' };
      if (!msToken) return { id: null, name: title }; 
      
      const file = await findOneDriveFileByName(msToken, title);
      if (file) return { id: file.id, name: file.name };
      return { id: null, name: title };
    }

    /* ============================================================================
       ✅ MICROSOFT OUTLOOK (MAIL & CALENDAR) - NEW LOGIC
       ============================================================================ */
    
    // 1. Fetch Outlook Emails
    if (intent.action === 'fetch_outlook_emails') {
      if (!msToken) return { action: 'fetch_outlook_emails', message: '❌ Please sign in with Microsoft first.' };
      const emails = await getOutlookEmails(msToken, intent.parameters?.limit ?? 5, intent.parameters?.search);
      return { 
        action: 'fetch_outlook_emails', 
        message: `✅ Found ${emails.length} Outlook emails.`, 
        data: emails 
      };
    }

    // 2. Send Outlook Email
    if (intent.action === 'send_outlook_email') {
      if (!msToken) return { action: 'send_outlook_email', message: '❌ Please sign in with Microsoft first.' };
      if (!intent.parameters?.to) return { action: 'send_outlook_email', message: 'Who should I email?' };
      
      await sendOutlookEmail(msToken, intent.parameters.to, intent.parameters.subject || 'No Subject', intent.parameters.body || '');
      return { action: 'send_outlook_email', message: '✅ Outlook email sent successfully.' };
    }

    // 3. Create Outlook Event
    if (intent.action === 'create_outlook_event') {
      if (!msToken) return { action: 'create_outlook_event', message: '❌ Please sign in with Microsoft first.' };
      
      const { date, time, subject } = intent.parameters ?? {};
      if (!time) return { action: 'create_outlook_event', message: '🕒 Please provide a time for the event.' };

      const meetingDate = date ?? new Date().toISOString().split('T')[0];
      const safeTime = normalizeTimeTo24h(time);
      const startISO = new Date(`${meetingDate}T${safeTime}:00`).toISOString();
      const endISO = new Date(new Date(startISO).getTime() + 30 * 60 * 1000).toISOString();

      const event = await createOutlookEvent(msToken, subject || 'Meeting', startISO, endISO);
      return { 
        action: 'create_outlook_event', 
        message: `✅ Outlook Calendar event created: "${event.subject}" at ${displayTimeFromISO(event.start.dateTime)}`,
        data: event 
      };
    }

    /* ============================================================================
       ✅ MICROSOFT FILES (ONEDRIVE, WORD, EXCEL) - NEW LOGIC
       ============================================================================ */

    // 1. Fetch OneDrive Files
    if (intent.action === 'fetch_onedrive_files') {
      if (!msToken) return { action: 'fetch_onedrive_files', message: '❌ Please sign in with Microsoft first.' };
      const files = await listOneDriveFiles(msToken, intent.parameters?.limit ?? 5);
      return { action: 'fetch_onedrive_files', message: `✅ Found ${files.length} OneDrive files.`, data: files };
    }

    // 2. Create Word Doc
    if (intent.action === 'create_word_doc') {
      if (!msToken) return { action: 'create_word_doc', message: '❌ Please sign in with Microsoft first.' };
      if (!intent.parameters?.title) return { action: 'create_word_doc', message: 'Please provide a title.' };
      
      const doc = await createWordDoc(msToken, intent.parameters.title);
      return { action: 'create_word_doc', message: `✅ Word document created: "${doc.name}"`, data: doc };
    }

    // 3. Read Word Doc
    if (intent.action === 'read_word_doc') {
      if (!msToken) return { action: 'read_word_doc', message: '❌ Please sign in with Microsoft first.' };
      const { title, documentId } = intent.parameters ?? {};
      
      const fileInfo = await resolveOneDriveId(title, documentId);
      if (!fileInfo.id) return { action: 'read_word_doc', message: `❌ Could not find Word doc "${fileInfo.name}".` };

      const content = await readWordDoc(msToken, fileInfo.id);
      return { action: 'read_word_doc', message: content || `✅ Opened "${fileInfo.name}". Content preview is limited for Word Online.` };
    }

    // 4. Create Excel Sheet
    if (intent.action === 'create_excel_sheet') {
      if (!msToken) return { action: 'create_excel_sheet', message: '❌ Please sign in with Microsoft first.' };
      if (!intent.parameters?.title) return { action: 'create_excel_sheet', message: 'Please provide a title.' };
      
      const sheet = await createExcelWorkbook(msToken, intent.parameters.title);
      return { action: 'create_excel_sheet', message: `✅ Excel workbook created: "${sheet.name}"`, data: sheet };
    }

    // 5. Read Excel Sheet
    if (intent.action === 'read_excel_sheet') {
      if (!msToken) return { action: 'read_excel_sheet', message: '❌ Please sign in with Microsoft first.' };
      const { title, spreadsheetId } = intent.parameters ?? {};
      
      const fileInfo = await resolveOneDriveId(title, spreadsheetId);
      if (!fileInfo.id) return { action: 'read_excel_sheet', message: `❌ Could not find Excel file "${fileInfo.name}".` };

      const rows = await readExcelWorksheet(msToken, fileInfo.id);
      return { 
        action: 'read_excel_sheet', 
        message: `✅ Read ${rows.length} rows from "${fileInfo.name}".`, 
        data: rows 
      };
    }

    // 6. Update Excel Sheet
    if (intent.action === 'update_excel_sheet') {
      if (!msToken) return { action: 'update_excel_sheet', message: '❌ Please sign in with Microsoft first.' };
      const { title, spreadsheetId, values } = intent.parameters ?? {};

      const fileInfo = await resolveOneDriveId(title, spreadsheetId);
      if (!fileInfo.id) return { action: 'update_excel_sheet', message: `❌ Could not find Excel file "${fileInfo.name}".` };
      
      if (!values || !Array.isArray(values[0])) {
         return { action: 'update_excel_sheet', message: 'Please provide values to append (row data).' };
      }

      await appendExcelRow(msToken, fileInfo.id, values[0]); // Append first row from values
      return { action: 'update_excel_sheet', message: `✅ Added row to "${fileInfo.name}".` };
    }

    /* ============================================================================
       EXISTING GOOGLE LOGIC (UNCHANGED)
       ============================================================================ */

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

    /* ================= GOOGLE DOCS (Create, Read, Update by Name) ================= */
    if (intent.action === 'create_doc') {
      const { title } = intent.parameters ?? {};
      if (!title) return { action: 'create_doc', message: 'Please provide a title.' };
      const doc = await createGoogleDoc({ title });
      return { action: 'create_doc', message: `✅ Doc created: ${doc.title}`, data: doc };
    }

    if (intent.action === 'read_doc') {
      const { documentId, title } = intent.parameters ?? {};
      const fileParams = await resolveFileId(title, documentId, 'application/vnd.google-apps.document');

      if (!fileParams.id) return { action: 'read_doc', message: `❌ Could not find doc "${fileParams.name}".` };
      const content = await readGoogleDoc({ documentId: fileParams.id });
      return { action: 'read_doc', message: `✅ Read content from "${fileParams.name}".`, data: { documentId: fileParams.id, content } };
    }

    if (intent.action === 'append_doc') {
      const { documentId, title, text } = intent.parameters ?? {};
      const fileParams = await resolveFileId(title, documentId, 'application/vnd.google-apps.document');

      if (!fileParams.id) return { action: 'append_doc', message: `❌ Could not find doc "${fileParams.name}".` };
      if (!text) return { action: 'append_doc', message: 'No text provided.' };

      await appendToGoogleDoc({ documentId: fileParams.id, text });
      return { action: 'append_doc', message: `✅ Added text to "${fileParams.name}".` };
    }

    if (intent.action === 'replace_doc') {
      const { documentId, title, findText, replaceText } = intent.parameters ?? {};
      const fileParams = await resolveFileId(title, documentId, 'application/vnd.google-apps.document');

      if (!fileParams.id) return { action: 'replace_doc', message: `❌ Could not find doc "${fileParams.name}".` };
      if (!findText || replaceText === undefined) return { action: 'replace_doc', message: 'Missing parameters.' };

      await replaceTextInGoogleDoc({ documentId: fileParams.id, findText, replaceText });
      return { action: 'replace_doc', message: '✅ Text replaced.' };
    }

    if (intent.action === 'clear_doc') {
      const { documentId, title } = intent.parameters ?? {};
      const fileParams = await resolveFileId(title, documentId, 'application/vnd.google-apps.document');

      if (!fileParams.id) return { action: 'clear_doc', message: `❌ Could not find doc "${fileParams.name}".` };
      await clearGoogleDoc(fileParams.id);
      return { action: 'clear_doc', message: `✅ Cleared content of "${fileParams.name}".` };
    }

    /* ================= GOOGLE KEEP (NOTES) ================= */
    if (intent.action === 'fetch_notes') {
      try {
        const notes = await listKeepNotes(intent.parameters?.limit ?? 10);
        return { action: 'fetch_notes', message: `✅ Found ${notes.length} notes.`, data: notes };
      } catch { return { action: 'fetch_notes', message: '❌ Failed to fetch notes.' }; }
    }

    if (intent.action === 'create_note') {
      const { title, content } = intent.parameters ?? {};
      try {
        const note = await createKeepNote(title || 'New Note', content || 'No content');
        return { action: 'create_note', message: `✅ Created note: "${note.title}"`, data: [note] };
      } catch { return { action: 'create_note', message: '❌ Failed to create note.' }; }
    }

    /* ================= GOOGLE CLASSROOM ================= */
    // 1. Fetch Courses
    if (intent.action === 'fetch_courses') {
      try {
        const courses = await listCourses(intent.parameters?.limit ?? 10);
        return {
          action: 'fetch_courses',
          message: `✅ Found ${courses.length} classrooms.`,
          data: courses
        };
      } catch (e) {
        console.error('Classroom error:', e);
        return { action: 'fetch_courses', message: '❌ Failed to fetch classrooms.' };
      }
    }

    // 2. Fetch Assignments
    if (intent.action === 'fetch_assignments') {
      try {
        let courseId = intent.parameters?.courseId;
        const courseName = intent.parameters?.courseName;

        if (!courseId && courseName) {
           const course = await findCourseByName(courseName);
           if (!course) {
             return { action: 'fetch_assignments', message: `❌ Could not find classroom named "${courseName}".` };
           }
           courseId = course.id;
        }

        if (!courseId) {
             return { action: 'fetch_assignments', message: '⚠️ Please specify which classroom/course to list assignments from.' };
        }

        const assignments = await listAssignments(courseId, intent.parameters?.limit ?? 10);
        return {
          action: 'fetch_assignments',
          message: `✅ Found ${assignments.length} assignments.`,
          data: assignments
        };
      } catch (e) {
        return { action: 'fetch_assignments', message: '❌ Failed to fetch assignments.' };
      }
    }

    // 3. Fetch Students
    if (intent.action === 'fetch_students') {
      try {
        let courseId = intent.parameters?.courseId;
        const courseName = intent.parameters?.courseName;

        if (!courseId && courseName) {
           const course = await findCourseByName(courseName);
           if (!course) return { action: 'fetch_students', message: `❌ Could not find classroom "${courseName}".` };
           courseId = course.id;
        }

        if (!courseId) return { action: 'fetch_students', message: '⚠️ Please specify a classroom name.' };

        const students = await listStudents(courseId);
        
        let filtered = students;
        if (intent.parameters?.studentName) {
             const search = intent.parameters.studentName.toLowerCase();
             filtered = students.filter(s => s.profile.name.fullName.toLowerCase().includes(search));
        }

        return {
          action: 'fetch_students',
          message: `✅ Found ${filtered.length} students in the class.`,
          data: filtered
        };
      } catch (e) {
        return { action: 'fetch_students', message: '❌ Failed to fetch students.' };
      }
    }

    // 4. Create Course
    if (intent.action === 'create_course') {
        const params: any = intent.parameters || {};
        const name = params.name || params.title;

        if (!name) return { action: 'create_course', message: 'Please provide a name for the classroom.' };

        try {
            const course = await createCourse({
                name,
                section: params.section,
                description: params.description,
                room: params.room
            });
            return {
                action: 'create_course',
                message: `✅ Created Classroom: "${course.name}" (Code: ${course.enrollmentCode})`,
                data: [course]
            };
        } catch (e) {
            return { action: 'create_course', message: '❌ Failed to create classroom.' };
        }
    }

    /* ================= SEND EMAIL (GMAIL) ================= */
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
      const { spreadsheetId, title, range } = intent.parameters ?? {};

      // ✅ Resolve ID from Title if needed
      const fileParams = await resolveFileId(title, spreadsheetId, 'application/vnd.google-apps.spreadsheet');
      
      if (!fileParams.id) {
        return {
          action: 'read_sheet',
          message: `❌ Could not find a spreadsheet named "${fileParams.name}".`,
        };
      }

      const finalRange = range || 'Sheet1!A1:E10';
      const rawData = await readSheet({ spreadsheetId: fileParams.id, range: finalRange });
      const rows: SheetRow[] = rawData.map((row: any[]) => ({ values: row }));

      return {
        action: 'read_sheet',
        message: `✅ Read ${rows.length} rows from "${fileParams.name}".`,
        data: rows,
      };
    }

    /* ================= UPDATE GOOGLE SHEET ================= */
    if (intent.action === 'update_sheet') {
      const { spreadsheetId, title, range, values } = intent.parameters ?? {};

      // ✅ Resolve ID from Title if needed
      const fileParams = await resolveFileId(title, spreadsheetId, 'application/vnd.google-apps.spreadsheet');

      if (!fileParams.id) {
        return {
          action: 'update_sheet',
          message: `❌ Could not find spreadsheet "${fileParams.name}".`,
        };
      }
      if (!range || !values) {
        return {
          action: 'update_sheet',
          message: 'Please provide the range and values to update.',
        };
      }

      await updateSheet({ spreadsheetId: fileParams.id, range, values });

      return {
        action: 'update_sheet',
        message: `✅ Updated "${fileParams.name}" successfully.`,
      };
    }
/* ============================================================================
       ✅ TELEGRAM BOT (NEW)
       ============================================================================ */
    
    // 1. Fetch Updates (Read Messages)
    if (intent.action === 'fetch_telegram_updates') {
      if (!telegramToken) return { action: 'fetch_telegram_updates', message: '❌ Please provide a Telegram Bot Token.' };
      
      const messages = await getTelegramUpdates(telegramToken, intent.parameters?.limit ?? 5);
      return { 
        action: 'fetch_telegram_updates', 
        message: `✅ Found ${messages.length} recent messages sent to the bot.`, 
        data: messages 
      };
    }

    // 2. Send Message
    if (intent.action === 'send_telegram_message') {
      if (!telegramToken) return { action: 'send_telegram_message', message: '❌ Please provide a Telegram Bot Token.' };
      
      const { chatId, text } = intent.parameters ?? {};
      if (!chatId || !text) return { action: 'send_telegram_message', message: 'I need a Chat ID (or @username) and a message text.' };

      await sendTelegramMessage(telegramToken, chatId, text);
      return { action: 'send_telegram_message', message: `✅ Sent to Telegram chat "${chatId}".` };
    }

    // 3. Manage Group
    if (intent.action === 'manage_telegram_group') {
      if (!telegramToken) return { action: 'manage_telegram_group', message: '❌ Please provide a Telegram Bot Token.' };
      
      const { chatId, action, userId, messageId, value } = intent.parameters ?? {};
      if (!chatId || !action) return { action: 'manage_telegram_group', message: 'Missing Chat ID or Action.' };

      let result = false;
      let msg = '';

      try {
        if (action === 'kick' && userId) {
           result = await kickChatMember(telegramToken, chatId, userId);
           msg = result ? `✅ User ${userId} kicked.` : '❌ Failed to kick user.';
        } 
        else if (action === 'pin' && messageId) {
           result = await pinChatMessage(telegramToken, chatId, messageId);
           msg = result ? '✅ Message pinned.' : '❌ Failed to pin message.';
        }
        else if (action === 'title' && value) {
           result = await setChatTitle(telegramToken, chatId, value);
           msg = result ? `✅ Title changed to "${value}".` : '❌ Failed to change title.';
        }
        else {
           msg = `⚠️ Action "${action}" is not fully supported or missing parameters.`;
        }
      } catch (e: any) {
        msg = `❌ Error: ${e.message}`;
      }

      return { action: 'manage_telegram_group', message: msg };
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
    // Updated Help Message
    return { action: 'help', message: 'I can help with Gmail, Outlook, OneDrive, Docs, Word, Excel, Keep, Classroom, Shopify, and Teams.' };
  }
}