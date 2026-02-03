import OpenAI from 'openai';
import { AIIntent } from '../types';

/* -------------------- Normalize Sheet Values -------------------- */
function normalizeSheetValues(values: unknown): string[][] {
  if (!Array.isArray(values)) return [];
  return values.map((row) =>
    Array.isArray(row) ? row.map((cell) => (cell == null ? '' : String(cell))) : []
  );
}

/* -------------------- OpenAI Client -------------------- */
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || '',
});

/* -------------------- System Prompt -------------------- */
const SYSTEM_PROMPT = `
You are an intent extraction engine for real user actions.

CORE RULES (VERY STRICT):
- Extract ONLY what the user explicitly asks for.
- NEVER guess or invent missing information.
- NEVER copy the full user query into "search".
- Do NOT invent dates, senders, subjects, recipients, or links.
- Always respond with valid JSON ONLY in the specified format.
- If a field is not explicitly mentioned, omit it entirely from parameters.

🧠 CONTEXT RULES:
- If the user refers to previously created data using phrases like "this meet", "that meeting", "previous meeting", set "usesContext": true.
- Do NOT invent the meeting link or details yourself.

MICROSOFT TEAMS RULES:
- fetch_teams_messages: Get recent Teams messages.
- fetch_teams_channels: List Teams channels.
- Use "search" or "filter" only if explicitly mentioned.

MICROSOFT OUTLOOK RULES (MAIL & CALENDAR):
- fetch_outlook_emails: User explicitly asks for "Outlook emails" or "Microsoft emails".
- send_outlook_email: User explicitly asks to send an email via "Outlook".
- create_outlook_event: User asks to schedule a meeting/event in "Outlook" or "Microsoft Calendar".
  - Extract "subject", "date", "time".

MICROSOFT FILES RULES (ONEDRIVE, WORD, EXCEL):
- fetch_onedrive_files: User asks to list "OneDrive" files.
- create_word_doc: User asks to create a "Word" document. Extract "title".
- read_word_doc: User asks to read/view a "Word" document. Extract "title".
- create_excel_sheet: User asks to create an "Excel" sheet/workbook. Extract "title".
- read_excel_sheet: User asks to read an "Excel" sheet. Extract "title".
- update_excel_sheet: User asks to update/add rows to an "Excel" sheet. Extract "title" and "values".

TELEGRAM BOT RULES:
- fetch_telegram_updates: User asks to check, read, or get new Telegram messages/updates.
- send_telegram_message: User asks to send a message via Telegram.
  - Extract "chatId" (this might be a username like "@channel" or a number).
  - Extract "text" (the message content).
- manage_telegram_group: User asks to perform admin actions (kick, pin, promote, set title).
  - Extract "chatId".
  - Extract "action" (kick, pin, promote, title).
  - Extract "userId" (if kicking/promoting) or "messageId" (if pinning).
  - If action is "title", extract the new title text into "value".

YOUTUBE RULES:
- search_youtube: User asks to find, search, or look for videos. Extract "query".
- get_channel_stats: User asks for channel info, subscribers, or view count. Extract "channelName" or "channelId".

GOOGLE FORMS RULES:
- create_form: User asks to create a new form. Extract "title".
- fetch_form_responses: User asks for responses. Extract "title" (if user gives a name) OR "formId" (if context implies it).

EMAIL RULES (GMAIL):
- fetch_emails: only if user explicitly asks to read emails (default to Gmail if "Outlook" not specified).
- send_email: only if user explicitly asks to send emails (default to Gmail).
- Include "date" ONLY if explicitly mentioned.
- Use "search" only if sender, subject, or keyword is mentioned.

GOOGLE CLASSROOM RULES:
- fetch_courses: User asks to list classes, courses, or classrooms.
- create_course: User asks to create a new class/course. Extract "name" (or "title"), "section", "description", "room".
- fetch_assignments: User asks for assignments, homework, or classwork.
  - Extract "courseName" if user specifies a class (e.g., "assignments for Math").
- fetch_students: User asks for students, roster, or people in a class.
  - Extract "courseName" if specified.
  - Extract "studentName" if looking for a specific person.

GOOGLE DOCS RULES:
- create_doc: only if user explicitly asks to create a Google Doc.
- read_doc: only if user asks to read/view a document. Extract "title" (filename) or "documentId".
- append_doc: only if user asks to add content to an existing document. Extract "title" (filename) or "documentId".
- replace_doc: only if user asks to replace specific text. Extract "title" (filename) or "documentId".
- clear_doc: only if user asks to clear the document. Extract "title" (filename) or "documentId".
- NEVER invent documentId, title, or content.
- If documentId is missing, check if "title" is provided.
- Do NOT summarize or rewrite document content unless explicitly asked.

GOOGLE KEEP (NOTES) RULES:
- fetch_notes: only if user asks to see, list, or find notes.
- create_note: only if user asks to create, add, or make a new note.
- Extract "title" and "content" if provided.
- If no title is given, omit it (backend will handle defaults).

GOOGLE MEET RULES:
- create_meet: only if user wants to create a Google Meet.
- delete_meet: only if user wants to cancel/delete a meeting.
- update_meet: only if user wants to reschedule an existing meeting.
- Extract date and/or time exactly as the user says it.
- date → YYYY-MM-DD
- time → natural language time (e.g. "5pm", "6:30 pm", "17:00")
- If no date or time is mentioned for create/update, omit them.
- Do NOT invent participants, meeting link, or description.
- If action is delete_meet or update_meet and no date/time is given, rely on context (last created meeting).

GOOGLE SHEETS RULES:
- create_sheet: only if user explicitly asks to create a spreadsheet.
- read_sheet: only if user asks to read/view sheet data. Extract "title" (filename) or "spreadsheetId".
- update_sheet: only if user asks to modify/update existing sheet values. Extract "title" (filename) or "spreadsheetId".
- NEVER invent spreadsheetId, range, or values.
- If spreadsheetId is missing, check if "title" is provided.
- Do NOT guess sheet names, columns, or cell ranges.

GENERAL RULES:
- If no actionable intent, use action "none".
- If user asks what you can do, use action "help".

Available actions:
- fetch_emails
- send_email
- fetch_files
- fetch_orders
- fetch_teams_messages
- fetch_teams_channels
- fetch_outlook_emails
- send_outlook_email
- create_outlook_event
- fetch_onedrive_files
- create_word_doc
- read_word_doc
- create_excel_sheet
- read_excel_sheet
- update_excel_sheet
- fetch_telegram_updates
- send_telegram_message
- manage_telegram_group
- search_youtube
- get_channel_stats
- create_form
- fetch_form_responses
- create_meet
- delete_meet
- update_meet
- create_sheet
- read_sheet
- update_sheet
- create_doc
- read_doc
- append_doc
- replace_doc
- clear_doc
- fetch_notes
- create_note
- fetch_courses
- create_course
- fetch_assignments
- fetch_students
- help
- none


RESPONSE FORMAT (JSON ONLY):

{
  "action": "fetch_emails" | "send_email" | "fetch_files" | "fetch_orders"
           | "fetch_teams_messages" | "fetch_teams_channels"
           | "fetch_outlook_emails" | "send_outlook_email" | "create_outlook_event"
           | "fetch_onedrive_files" | "create_word_doc" | "read_word_doc"
           | "create_excel_sheet" | "read_excel_sheet" | "update_excel_sheet"
           | "fetch_telegram_updates" | "send_telegram_message" | "manage_telegram_group"
           | "search_youtube" | "get_channel_stats"
           | "create_form" | "fetch_form_responses"
           | "create_meet" | "delete_meet" | "update_meet"
           | "create_sheet" | "read_sheet" | "update_sheet"
           | "create_doc" | "read_doc" | "append_doc" | "replace_doc" | "clear_doc"
           | "fetch_notes" | "create_note"
           | "fetch_courses" | "create_course" | "fetch_assignments" | "fetch_students"
           | "help" | "none",
  "usesContext": boolean,
  "parameters": {
    "limit": number,
    "search": "optional gmail search query",
    "filter": "optional filter string",
    "date": "optional date in YYYY-MM-DD",
    "time": "optional natural language time",
    "to": "recipient email address",
    "subject": "email subject or meeting title",
    "body": "email body or meeting description",

    // Telegram
    "chatId": "Telegram chat ID or username",
    "action": "kick, pin, promote, title",
    "userId": "Telegram user ID",
    "messageId": "Telegram message ID",
    "value": "The new title for the group",
    
    // YouTube
    "query": "video search query",
    "channelName": "name of youtube channel",
    "channelId": "id of youtube channel",

    // Forms
    "formId": "id of the google form (ONLY if explicitly provided)",

    // Docs, Sheets & Notes & Forms
    "title": "filename, spreadsheet title, note title or form title",
    "sheetName": "optional sheet name",
    "spreadsheetId": "existing spreadsheet id (optional if title is given)",
    "documentId": "google document id (optional if title is given)",
    
    // Classroom
    "courseName": "name of the course/class for lookups",
    "studentName": "name of the student to find",
    "name": "name for creating a course",
    "section": "course section",
    "room": "room number",
    "description": "course description",

    // Sheet Data
    "range": "Sheet1!A1:C10",
    "values": [["row1col1", "row1col2"]],

    // Doc Content
    "content": "text to write (for docs or notes)",
    "text": "text to append",
    "findText": "text to find",
    "replaceText": "replacement text"
  },
  "naturalResponse": "short, friendly explanation"
}
`;

/* -------------------- Intent Parsing -------------------- */
async function parseUserIntent(query: string): Promise<AIIntent> {
  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      temperature: 0,
      max_tokens: 500,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: query },
      ],
    });

    let text = completion.choices[0].message.content?.trim() || '';
    text = text.replace(/```json/g, '').replace(/```/g, '');

    const parsed = JSON.parse(text);
    
    // Normalize limit safely if present
    if (parsed?.parameters?.limit) {
      parsed.parameters.limit = Math.min(parsed.parameters.limit, 200);
    }

    // Normalize sheet values if present
    if (parsed?.parameters?.values) {
      parsed.parameters.values = normalizeSheetValues(parsed.parameters.values);
    }

    // Ensure 'name' exists for create_course to satisfy TypeScript & Runtime
    if (parsed.action === 'create_course') {
      if (!parsed.parameters) parsed.parameters = {};
      if (!parsed.parameters.name && !parsed.parameters.title) {
         parsed.parameters.name = 'New Classroom';
      } else if (parsed.parameters.title && !parsed.parameters.name) {
         // Map title to name if the AI got confused
         parsed.parameters.name = parsed.parameters.title;
      }
    }

    return {
      action: parsed.action ?? 'none',
      usesContext: parsed.usesContext === true,
      parameters: parsed.parameters ?? {},
      naturalResponse: parsed.naturalResponse ?? 'Okay.',
    } as AIIntent;
  } catch (error) {
    console.error('AI parsing error:', error);
    return fallbackParsing(query);
  }
}

/* -------------------- Fallback Parsing -------------------- */
function fallbackParsing(query: string): AIIntent {
  const q = query.toLowerCase();

  const usesContext =
    q.includes('this meet') ||
    q.includes('that meet') ||
    q.includes('that link') ||
    q.includes('previous meeting') ||
    q.includes('the meeting');

  /* -------------------- TELEGRAM FALLBACKS -------------------- */
  if (q.includes('telegram')) {
    if (q.includes('send') || q.includes('tell') || q.includes('reply')) {
      return {
        action: 'send_telegram_message',
        parameters: {},
        naturalResponse: 'Who should I message on Telegram?'
      };
    }
    if (q.includes('kick') || q.includes('ban') || q.includes('pin')) {
      return {
        action: 'manage_telegram_group',
        parameters: {},
        naturalResponse: 'I can manage the group. What is the action?'
      };
    }
    // Default: Check updates
    return {
      action: 'fetch_telegram_updates',
      parameters: { limit: 5 },
      naturalResponse: 'Checking for new Telegram messages...'
    };
  }

  /* -------------------- YOUTUBE FALLBACKS -------------------- */
  if (q.includes('youtube')) {
    if (q.includes('channel') || q.includes('subscribers') || q.includes('stats')) {
      return {
        action: 'get_channel_stats',
        parameters: {},
        naturalResponse: 'I can get channel stats. Which channel?'
      };
    }
    return {
      action: 'search_youtube',
      parameters: { limit: 5 },
      naturalResponse: 'Searching YouTube...'
    };
  }

  /* -------------------- GOOGLE FORMS FALLBACKS -------------------- */
  if (q.includes('form') && (q.includes('google') || q.includes('create') || q.includes('response'))) {
    if (q.includes('create') || q.includes('new')) {
      return {
        action: 'create_form',
        parameters: { title: 'Untitled Form' },
        naturalResponse: 'Creating a new Google Form.'
      };
    }
    if (q.includes('response') || q.includes('answer')) {
      return {
        action: 'fetch_form_responses',
        parameters: {},
        naturalResponse: 'Fetching form responses.'
      };
    }
  }

  /* -------------------- MICROSOFT FALLBACKS -------------------- */
  
  // Outlook
  if (q.includes('outlook')) {
      if (q.includes('email') || q.includes('mail')) {
          if (q.includes('send')) {
              return { action: 'send_outlook_email', parameters: {}, naturalResponse: 'Who should I email via Outlook?' };
          }
          return { action: 'fetch_outlook_emails', parameters: { limit: 5 }, naturalResponse: 'Checking your Outlook emails.' };
      }
      if (q.includes('calendar') || q.includes('event') || q.includes('meeting')) {
          return { action: 'create_outlook_event', parameters: {}, naturalResponse: 'I can schedule that in Outlook. What time?' };
      }
  }

  // Word
  if (q.includes('word') && (q.includes('doc') || q.includes('file'))) {
      if (q.includes('create') || q.includes('new')) {
          return { action: 'create_word_doc', parameters: {}, naturalResponse: 'Creating a new Word document.' };
      }
      if (q.includes('read') || q.includes('view')) {
          return { action: 'read_word_doc', parameters: {}, naturalResponse: 'Reading the Word document.' };
      }
  }

  // Excel
  if (q.includes('excel')) {
      if (q.includes('create') || q.includes('new')) {
          return { action: 'create_excel_sheet', parameters: {}, naturalResponse: 'Creating a new Excel workbook.' };
      }
      if (q.includes('update') || q.includes('add')) {
          return { action: 'update_excel_sheet', parameters: {}, naturalResponse: 'Updating the Excel sheet.' };
      }
      return { action: 'read_excel_sheet', parameters: {}, naturalResponse: 'Reading the Excel sheet.' };
  }

  // OneDrive
  if (q.includes('onedrive')) {
      return { action: 'fetch_onedrive_files', parameters: { limit: 5 }, naturalResponse: 'Fetching OneDrive files.' };
  }


  /* -------------------- EXISTING FALLBACKS -------------------- */

  // Microsoft Teams
  if (q.includes('teams') || q.includes('message') || q.includes('chat')) {
    if (q.includes('channel')) {
      return {
        action: 'fetch_teams_channels',
        parameters: { limit: 10 },
        naturalResponse: 'Fetching your Teams channels...'
      };
    }
    return {
      action: 'fetch_teams_messages',
      parameters: { limit: 5 },
      naturalResponse: 'Fetching your latest Teams messages...'
    };
  }

  // Google Classroom (Fallback)
  if (q.includes('classroom') || q.includes('class') || q.includes('course') || q.includes('assignment') || q.includes('student')) {
    if (q.includes('create') || q.includes('new')) {
       return {
         action: 'create_course',
         parameters: { name: 'New Classroom' },
         naturalResponse: 'I can create a new Google Classroom for you. What should I name it?'
       };
    }
    if (q.includes('assignment') || q.includes('homework')) {
       return {
         action: 'fetch_assignments',
         parameters: { limit: 10 },
         naturalResponse: 'Fetching your latest assignments.'
       };
    }
    if (q.includes('student') || q.includes('people')) {
       return {
         action: 'fetch_students',
         parameters: {},
         naturalResponse: 'Fetching students from your class.'
       };
    }
    // Default to listing courses
    return {
       action: 'fetch_courses',
       parameters: { limit: 10 },
       naturalResponse: 'Fetching your Google Classrooms.'
    };
  }

  // Gmail
  if (q.includes('send') && q.includes('email')) {
    return {
      action: 'send_email',
      usesContext,
      parameters: {},
      naturalResponse: 'Who should I send the email to?',
    };
  }
  if (q.includes('email') || q.includes('gmail')) {
    return {
      action: 'fetch_emails',
      usesContext: false,
      parameters: { limit: 50 },
      naturalResponse: 'Fetching your recent emails.',
    };
  }

  // Drive
  if (q.includes('drive') || q.includes('file')) {
    return {
      action: 'fetch_files',
      usesContext: false,
      parameters: { limit: 50 },
      naturalResponse: 'Fetching your Drive files.',
    };
  }

  // Shopify
  if (q.includes('order') || q.includes('shopify')) {
    return {
      action: 'fetch_orders',
      usesContext: false,
      parameters: { limit: 50 },
      naturalResponse: 'Fetching your Shopify orders.',
    };
  }

  // Google Meet
  if (q.includes('meet')) {
    if (q.includes('delete') || q.includes('cancel')) {
      return {
        action: 'delete_meet',
        usesContext,
        parameters: {},
        naturalResponse: 'I can delete the last created Google Meet for you.',
      };
    }
    if (q.includes('update') || q.includes('reschedule') || q.includes('move')) {
      return {
        action: 'update_meet',
        usesContext,
        parameters: {},
        naturalResponse: 'I can reschedule the last created Google Meet. Please provide new date and/or time.',
      };
    }
    return {
      action: 'create_meet',
      usesContext,
      parameters: {},
      naturalResponse: 'I can create a Google Meet. Please provide a date and time if needed.',
    };
  }

  // Google Sheets
  if (q.includes('sheet') || q.includes('spreadsheet') || q.includes('google sheet')) {
    if (q.includes('create') || q.includes('new')) {
      return {
        action: 'create_sheet',
        usesContext: false,
        parameters: {},
        naturalResponse: 'I can create a new Google Sheet for you.',
      };
    }
    if (q.includes('read') || q.includes('view') || q.includes('show')) {
      return {
        action: 'read_sheet',
        usesContext: true,
        parameters: {},
        naturalResponse: 'I can read data from the sheet.',
      };
    }
    if (q.includes('update') || q.includes('edit') || q.includes('change')) {
      return {
        action: 'update_sheet',
        usesContext: true,
        parameters: {},
        naturalResponse: 'I can update values in the sheet.',
      };
    }
  }

  // Google Docs
  if (q.includes('doc') || q.includes('document')) {
    if (q.includes('create') || q.includes('new')) {
      return {
        action: 'create_doc',
        usesContext: false,
        parameters: {},
        naturalResponse: 'I can create a new Google Doc for you.',
      };
    }
    if (q.includes('read') || q.includes('view') || q.includes('open')) {
      return {
        action: 'read_doc',
        usesContext: true,
        parameters: {},
        naturalResponse: 'I can read the document content.',
      };
    }
    if (q.includes('append') || q.includes('add')) {
      return {
        action: 'append_doc',
        usesContext: true,
        parameters: {},
        naturalResponse: 'I can add content to the document.',
      };
    }
    if (q.includes('replace')) {
      return {
        action: 'replace_doc',
        usesContext: true,
        parameters: {},
        naturalResponse: 'I can replace text in the document.',
      };
    }
    if (q.includes('clear')) {
      return {
        action: 'clear_doc',
        usesContext: true,
        parameters: {},
        naturalResponse: 'I can clear the document.',
      };
    }
  }

  // Google Keep (Notes)
  if (q.includes('note') || q.includes('keep') || q.includes('list')) {
    if (q.includes('create') || q.includes('new') || q.includes('add')) {
      return {
        action: 'create_note',
        usesContext: false,
        parameters: {},
        naturalResponse: 'I can create a new note in Google Keep.',
      };
    }
    return {
      action: 'fetch_notes',
      usesContext: false,
      parameters: { limit: 10 },
      naturalResponse: 'Fetching your latest notes from Google Keep.',
    };
  }

  // Default help
  return {
    action: 'help',
    usesContext: false,
    parameters: {},
    naturalResponse: 'I can help with Gmail, Drive, Classroom, Shopify, Google Meet, Sheets, Docs, Keep, Teams, Telegram, YouTube and Forms.',
  };
}

/* -------------------- Generate Summary -------------------- */
async function generateSummary(
  data: unknown[],
  query: string,
  dataType: 
    | 'emails' 
    | 'files' 
    | 'orders' 
    | 'teams_messages' 
    | 'teams_channels' 
    | 'notes' 
    | 'courses' 
    | 'assignments' 
    | 'students'
    | 'outlook_emails'
    | 'outlook_event'
    | 'onedrive_files'
    | 'word_doc'
    | 'excel_sheet'
    | 'telegram_messages'
    // ✅ NEW TYPES
    | 'youtube_videos'
    | 'youtube_stats'
    | 'form_responses'
    | 'created_form'
): Promise<string> {
  try {
    let dataLabel: string = dataType;
    if (dataType === 'teams_messages') dataLabel = 'Teams Messages';
    if (dataType === 'teams_channels') dataLabel = 'Teams Channels';
    if (dataType === 'notes') dataLabel = 'Google Keep Notes';
    if (dataType === 'courses') dataLabel = 'Google Classrooms';
    if (dataType === 'assignments') dataLabel = 'Class assignments';
    if (dataType === 'students') dataLabel = 'Class students';
    if (dataType === 'outlook_emails') dataLabel = 'Outlook Emails';
    if (dataType === 'outlook_event') dataLabel = 'Calendar Event';
    if (dataType === 'onedrive_files') dataLabel = 'OneDrive Files';
    if (dataType === 'word_doc') dataLabel = 'Word Document Content';
    if (dataType === 'excel_sheet') dataLabel = 'Excel Data';
    if (dataType === 'telegram_messages') dataLabel = 'Telegram Messages';
    
    // ✅ NEW LABELS
    if (dataType === 'youtube_videos') dataLabel = 'YouTube Search Results';
    if (dataType === 'youtube_stats') dataLabel = 'YouTube Channel Statistics';
    if (dataType === 'form_responses') dataLabel = 'Google Form Responses';
    if (dataType === 'created_form') dataLabel = 'Created Google Form';

    const preview = JSON.stringify(data.slice(0, 3), null, 2);
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      temperature: 0.3,
      max_tokens: 250,
      messages: [
        {
          role: 'system',
          content: 'Summarize the provided data clearly. Do not invent information.',
        },
        {
          role: 'user',
          content: `User asked: "${query}"\n\nHere is the relevant data (${dataLabel}):\n${preview}\n\nGive a concise 2–3 sentence response.`,
        },
      ],
    });
    return completion.choices[0].message.content ?? `Found ${data.length} items.`;
  } catch (error) {
    console.error('AI summary error:', error);
    return `Found ${data.length} items.`;
  }
}

export { parseUserIntent, generateSummary };