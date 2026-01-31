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

EMAIL RULES:
- fetch_emails: only if user explicitly asks to read emails.
- send_email: only if user explicitly asks to send emails.
- Include "date" ONLY if explicitly mentioned.
- Use "search" only if sender, subject, or keyword is mentioned.

GOOGLE DOCS RULES:
- create_doc: only if user explicitly asks to create a Google Doc.
- read_doc: only if user asks to read/view a document.
- append_doc: only if user asks to add content to an existing document.
- replace_doc: only if user asks to replace specific text.
- clear_doc: only if user asks to clear the document.
- NEVER invent documentId, title, or content.
- If documentId is missing, omit it and rely on context.
- Do NOT summarize or rewrite document content unless explicitly asked.

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
- read_sheet: only if user asks to read/view sheet data.
- update_sheet: only if user asks to modify/update existing sheet values.
- NEVER invent spreadsheetId, range, or values.
- If spreadsheetId or range is missing, omit it and rely on context.
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
- help
- none


RESPONSE FORMAT (JSON ONLY):

{
  "action": "fetch_emails" | "send_email" | "fetch_files" | "fetch_orders"
           | "fetch_teams_messages" | "fetch_teams_channels"
           | "create_meet" | "delete_meet" | "update_meet"
           | "create_sheet" | "read_sheet" | "update_sheet"
           | "create_doc" | "read_doc" | "append_doc" | "replace_doc" | "clear_doc"
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

    // Sheets
    "title": "spreadsheet title",
    "sheetName": "optional sheet name",
    "spreadsheetId": "existing spreadsheet id",
    "range": "Sheet1!A1:C10",
    "values": [["row1col1", "row1col2"]],

    // Docs
    "documentId": "google document id",
    "content": "text to write",
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

  // Microsoft Teams (New)
  if (q.includes('teams') || q.includes('message') || q.includes('chat')) {
    if (q.includes('channel')) {
      return {
        action: 'fetch_teams_channels',
        parameters: { limit: 10 },
        naturalResponse: 'Fetching your Teams channels...'
      };
    }
    // Default to messages if "teams" or "chat" is mentioned
    return {
      action: 'fetch_teams_messages',
      parameters: { limit: 5 },
      naturalResponse: 'Fetching your latest Teams messages...'
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

  // Default help
  return {
    action: 'help',
    usesContext: false,
    parameters: {},
    naturalResponse: 'I can help with Gmail, Drive, Shopify, Google Meet, Google Sheets, and Microsoft Teams.',
  };
}

/* -------------------- Generate Summary -------------------- */
async function generateSummary(
  data: unknown[],
  query: string,
  dataType: 'emails' | 'files' | 'orders' | 'teams_messages' | 'teams_channels'
): Promise<string> {
  try {
    let dataLabel: string = dataType;
    if (dataType === 'teams_messages') dataLabel = 'Teams Messages';
    if (dataType === 'teams_channels') dataLabel = 'Teams Channels';

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
    return completion.choices[0].message.content ?? `Found ${data.length} ${dataType}.`;
  } catch (error) {
    console.error('AI summary error:', error);
    return `Found ${data.length} ${dataType}.`;
  }
}

export { parseUserIntent, generateSummary };