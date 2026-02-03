/* ===================================================== */
/* ===================== CHAT ========================= */
/* ===================================================== */

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  data?:
    | GmailEmail[]
    | DriveFile[]
    | ShopifyOrder[]
    | GMeetEvent[]
    | SheetRow[]
    | CreatedSheet
    | GoogleDoc
    | GoogleDocContent
    | TeamsMessage[]
    | TeamsChannel[]
    | KeepNote[]
    | ClassroomCourse[]
    | ClassroomAssignment[]
    | ClassroomStudent[]
    | OutlookEmail[]
    | OutlookEvent[]
    | OneDriveFile[]
    | TelegramMessage[]
    // ✅ NEW TYPES
    | YouTubeVideo[]
    | YouTubeChannel[]
    | GoogleForm[]
    | FormResponse[]
    | any; 
}
/* ===================================================== */
/* ===================== YOUTUBE ====================== */
/* ===================================================== */

export interface YouTubeVideo {
  id: string;
  title: string;
  description: string;
  thumbnailUrl: string;
  channelTitle: string;
  publishTime: string;
  videoUrl: string;
}

export interface YouTubeChannel {
  id: string;
  title: string;
  description: string;
  customUrl?: string;
  subscriberCount: string;
  viewCount: string;
  videoCount: string;
  thumbnailUrl: string;
}

/* ===================================================== */
/* ===================== GOOGLE FORMS ================= */
/* ===================================================== */

/* src/lib/types/index.ts */

// Replace the GoogleForm interface with this:
export interface GoogleForm {
  formId: string;
  title: string;
  documentTitle: string;
  responderUri: string;
  revisionId: string;
  formUri?: string; // ✅ Added this property
}
export interface FormQuestionAnswer {
  questionId: string;
  textAnswers: string[];
}

export interface FormResponse {
  responseId: string;
  createTime: string;
  lastSubmittedTime: string;
  answers: FormQuestionAnswer[];
  respondentEmail?: string;
}
/* ===================================================== */
/* ===================== GMAIL ======================== */
/* ===================================================== */

export interface GmailEmail {
  id: string;
  threadId: string;
  subject: string;
  from: string;
  snippet: string;
  date: string;
}

/* ===================================================== */
/* ===================== GOOGLE MEET / CALENDAR ======= */
/* ===================================================== */

export interface GMeetEvent {
  eventId?: string;
  meetLink: string;
  start: string;
  end: string;
  summary?: string;
  description?: string;
}

/* ===================================================== */
/* ===================== DRIVE ======================== */
/* ===================================================== */

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime: string;
  size?: string;
  webViewLink?: string;
}

/* ===================================================== */
/* ===================== GOOGLE KEEP (NOTES) ========== */
/* ===================================================== */

export interface KeepNote {
  id: string;
  title: string;
  textContent: string;
  url?: string;
}

export interface CreateKeepNoteParams {
  title?: string;
  content?: string;
}

/* ===================================================== */
/* ===================== GOOGLE CLASSROOM ============= */
/* ===================================================== */

export interface ClassroomCourse {
  id: string;
  name: string;
  section?: string;
  descriptionHeading?: string;
  room?: string;
  enrollmentCode?: string;
  alternateLink?: string;
  courseState?: string;
}

export interface ClassroomAssignment {
  id: string;
  courseId: string;
  title: string;
  description?: string;
  dueDate?: { year: number; month: number; day: number };
  dueTime?: { hours: number; minutes: number };
  alternateLink?: string;
  state?: string;
}

export interface ClassroomStudent {
  courseId: string;
  userId: string;
  profile: {
    id: string;
    name: {
      fullName: string;
      givenName: string;
      familyName: string;
    };
    emailAddress: string;
  };
}

export interface CreateCourseParams {
  name: string;
  section?: string;
  description?: string;
  room?: string;
}

export interface FetchCoursesParams {
  limit?: number;
  status?: string; 
}

export interface FetchAssignmentsParams {
  courseId?: string;
  courseName?: string; 
  limit?: number;
}

export interface FetchStudentsParams {
  courseId?: string;
  courseName?: string; 
  studentName?: string; 
}

/* ===================================================== */
/* ===================== GOOGLE SHEETS ================ */
/* ===================================================== */

export interface CreatedSheet {
  spreadsheetId: string;
  spreadsheetUrl: string;
}

export interface SheetRow {
  rowNumber?: number;
  values: string[];
}

export interface CreateSheetParams {
  title?: string;
  sheetName?: string;
}

export interface ReadSheetParams {
  spreadsheetId?: string;
  title?: string;
  range?: string;
}

export interface UpdateSheetParams {
  spreadsheetId?: string;
  title?: string;
  range?: string;
  values?: string[][];
}

/* ===================================================== */
/* ===================== GOOGLE DOCS ================== */
/* ===================================================== */

export interface GoogleDoc {
  documentId: string;
  title: string;
  url?: string;
}

export interface GoogleDocContent {
  documentId: string;
  title?: string;
  content: string;
}

export interface CreateDocParams {
  title?: string;
  content?: string;
}

export interface ReadDocParams {
  documentId?: string;
  title?: string;
}

export interface AppendDocParams {
  documentId?: string;
  title?: string;
  text?: string;
}

export interface ReplaceDocParams {
  documentId?: string;
  title?: string;
  findText?: string;
  replaceText?: string;
}

export interface ClearDocParams {
  documentId?: string;
  title?: string;
}

/* ===================================================== */
/* ===================== MICROSOFT ==================== */
/* ===================================================== */

export interface MicrosoftTokens {
  access_token: string;
  refresh_token?: string;
  expires_on?: number;
  scope?: string;
}

// OUTLOOK MAIL
export interface OutlookEmail {
  id: string;
  subject: string;
  bodyPreview: string;
  sender: {
    emailAddress: {
      name: string;
      address: string;
    };
  };
  toRecipients: {
    emailAddress: {
      name: string;
      address: string;
    };
  }[];
  receivedDateTime: string;
  webLink: string;
}

// OUTLOOK CALENDAR
export interface OutlookEvent {
  id: string;
  subject: string;
  body: {
    contentType: string;
    content: string;
  };
  start: {
    dateTime: string;
    timeZone: string;
  };
  end: {
    dateTime: string;
    timeZone: string;
  };
  location: {
    displayName: string;
  };
  webLink: string;
}

// ONEDRIVE FILES
export interface OneDriveFile {
  id: string;
  name: string;
  webUrl: string;
  size: number;
  createdDateTime: string;
  lastModifiedDateTime: string;
  file?: {
    mimeType: string;
  };
  folder?: {
    childCount: number;
  };
}

// EXCEL
export interface ExcelWorksheet {
  id: string;
  name: string;
  position: number;
  visibility: string;
}

export interface ExcelRow {
  values: (string | number | boolean | null)[];
}

// TEAMS
export interface TeamsMessage {
  id: string;
  subject: string | null;
  body: string;
  from: {
    displayName: string;
    email: string;
  };
  createdDateTime: string;
  webUrl?: string;
}

export interface TeamsChannel {
  id: string;
  displayName: string;
  description: string | null;
  membershipType: string;
  webUrl: string;
}

export interface FetchTeamsParams {
  limit?: number;
  search?: string;
  filter?: string;
}

/* ===================================================== */
/* ===================== SHOPIFY ===================== */
/* ===================================================== */

export interface ShopifyOrder {
  id: number;
  order_number: number;
  customer: {
    first_name: string;
    last_name: string;
    email: string;
  };
  total_price: string;
  created_at: string;
  financial_status: string;
  fulfillment_status: string | null;
}

export interface ShopifyConfig {
  apiKey: string;
  apiSecret: string;
  storeUrl: string;
  accessToken: string;
}

export type ShopifyCredentials = ShopifyConfig;

export interface FetchOrderParams {
  limit?: number;
  status?: string;
  created_at_min?: string;
  created_at_max?: string;
}

/* ===================================================== */
/* ===================== TELEGRAM (NEW) =============== */
/* ===================================================== */

export interface TelegramUser {
  id: number;
  is_bot: boolean;
  first_name: string;
  username?: string;
}

export interface TelegramChat {
  id: number;
  type: 'private' | 'group' | 'supergroup' | 'channel';
  title?: string;
  username?: string;
}

export interface TelegramMessage {
  message_id: number;
  from?: TelegramUser;
  chat: TelegramChat;
  date: number;
  text?: string;
}

export interface TelegramUpdate {
  update_id: number;
  message?: TelegramMessage;
}

export interface SendTelegramParams {
  chatId?: string; // Can be ID or @username
  text?: string;
  replyToMessageId?: number;
}

export interface ManageTelegramGroupParams {
  chatId?: string;
  action?: 'kick' | 'pin' | 'unpin' | 'promote' | 'title';
  userId?: number; 
  messageId?: number;
  value?: string;
}

export interface TelegramConfig {
  botToken: string;
}

/* ===================================================== */
/* ===================== CONNECTION STATUS =========== */
/* ===================================================== */

export interface ServiceConnection {
  google: boolean;
  shopify: boolean;
  microsoft: boolean;
  telegram: boolean; // ✅ Added
}

/* ===================================================== */
/* ===================== AUTH ========================= */
/* ===================================================== */

export interface GoogleTokens {
  access_token: string;
  refresh_token?: string;
  expiry_date?: number;
}

/* ===================================================== */
/* ===================== AI PARAMS ==================== */
/* ===================================================== */

export interface FetchEmailParams {
  limit?: number;
  search?: string;
  filter?: string;
  date?: string;
}

export interface FetchFileParams {
  limit?: number;
  search?: string;
}

export interface SendEmailParams {
  to?: string;
  subject?: string;
  body?: string;
}

/* ===================================================== */
/* ===================== BASE INTENT ================== */
/* ===================================================== */

interface BaseIntent {
  usesContext?: boolean;
}

/* ===================================================== */
/* ===================== AI INTENT =================== */
/* ===================================================== */

export type AIIntent =
  | (BaseIntent & {
      action: 'fetch_emails';
      parameters: FetchEmailParams;
      naturalResponse: string;
    })
  | (BaseIntent & {
      action: 'send_email';
      parameters: SendEmailParams;
      naturalResponse: string;
    })
  | (BaseIntent & {
      action: 'fetch_files';
      parameters: FetchFileParams;
      naturalResponse: string;
    })
  | (BaseIntent & {
      action: 'fetch_orders';
      parameters: FetchOrderParams;
      naturalResponse: string;
    })
  | (BaseIntent & {
      action: 'create_meet' | 'update_meet' | 'delete_meet' | 'fetch_calendar';
      parameters: {
        subject?: string;
        body?: string;
        date?: string;
        time?: string;
      };
      naturalResponse: string;
    })
  | (BaseIntent & {
      action: 'create_sheet';
      parameters: CreateSheetParams;
      naturalResponse: string;
    })
  | (BaseIntent & {
      action: 'read_sheet';
      parameters: ReadSheetParams;
      naturalResponse: string;
    })
  | (BaseIntent & {
      action: 'update_sheet';
      parameters: UpdateSheetParams;
      naturalResponse: string;
    })
  | (BaseIntent & {
      action: 'create_doc';
      parameters: CreateDocParams;
      naturalResponse: string;
    })
  | (BaseIntent & {
      action: 'read_doc';
      parameters: ReadDocParams;
      naturalResponse: string;
    })
  | (BaseIntent & {
      action: 'append_doc';
      parameters: AppendDocParams;
      naturalResponse: string;
    })
  | (BaseIntent & {
      action: 'replace_doc';
      parameters: ReplaceDocParams;
      naturalResponse: string;
    })
  | (BaseIntent & {
      action: 'clear_doc';
      parameters: ClearDocParams;
      naturalResponse: string;
    })
  | (BaseIntent & {
      action: 'fetch_notes';
      parameters: { limit?: number };
      naturalResponse: string;
    })
  | (BaseIntent & {
      action: 'create_note';
      parameters: CreateKeepNoteParams;
      naturalResponse: string;
    })
  | (BaseIntent & {
      action: 'create_course';
      parameters: CreateCourseParams;
      naturalResponse: string;
    })
  | (BaseIntent & {
      action: 'fetch_courses';
      parameters: FetchCoursesParams;
      naturalResponse: string;
    })
  | (BaseIntent & {
      action: 'fetch_assignments';
      parameters: FetchAssignmentsParams;
      naturalResponse: string;
    })
  | (BaseIntent & {
      action: 'fetch_students';
      parameters: FetchStudentsParams;
      naturalResponse: string;
    })
  | (BaseIntent & {
      action: 'fetch_teams_messages' | 'fetch_teams_channels';
      parameters: FetchTeamsParams;
      naturalResponse: string;
    })
  // MICROSOFT INTENTS
  | (BaseIntent & {
      action: 'fetch_outlook_emails';
      parameters: { limit?: number; search?: string };
      naturalResponse: string;
    })
  | (BaseIntent & {
      action: 'send_outlook_email';
      parameters: { to?: string; subject?: string; body?: string };
      naturalResponse: string;
    })
  | (BaseIntent & {
      action: 'create_outlook_event';
      parameters: { subject?: string; date?: string; time?: string };
      naturalResponse: string;
    })
  | (BaseIntent & {
      action: 'fetch_onedrive_files';
      parameters: { limit?: number };
      naturalResponse: string;
    })
  | (BaseIntent & {
      action: 'create_word_doc' | 'read_word_doc' | 'create_excel_sheet' | 'read_excel_sheet' | 'update_excel_sheet';
      parameters: { title?: string; documentId?: string; spreadsheetId?: string; values?: any[][] };
      naturalResponse: string;
    })
  // TELEGRAM INTENTS
  | (BaseIntent & {
      action: 'fetch_telegram_updates';
      parameters: { limit?: number };
      naturalResponse: string;
    })
  | (BaseIntent & {
      action: 'send_telegram_message';
      parameters: SendTelegramParams;
      naturalResponse: string;
    })
  | (BaseIntent & {
      action: 'manage_telegram_group';
      parameters: ManageTelegramGroupParams;
      naturalResponse: string;
    })
  // ✅ YOUTUBE INTENTS
  | (BaseIntent & {
      action: 'search_youtube';
      parameters: { query?: string; limit?: number };
      naturalResponse: string;
    })
  | (BaseIntent & {
      action: 'get_channel_stats';
      parameters: { channelName?: string; channelId?: string };
      naturalResponse: string;
    })
  // ✅ GOOGLE FORMS INTENTS
  | (BaseIntent & {
      action: 'create_form';
      parameters: { title?: string };
      naturalResponse: string;
    })
// ... inside export type AIIntent = ...

  | (BaseIntent & {
      action: 'fetch_form_responses';
      parameters: { 
        formId?: string; 
        title?: string; // ✅ ADD THIS LINE
      };
      naturalResponse: string;
    })

// ... rest of the file
  | (BaseIntent & {
      action: 'help' | 'none';
      parameters: {};
      naturalResponse: string;
    });
/* ===================================================== */
/* ===================== AGENT RESPONSE =============== */
/* ===================================================== */

export interface AgentResponse {
  action:
    | 'fetch_emails'
    | 'send_email'
    | 'fetch_files'
    | 'fetch_orders'
    | 'create_meet'
    | 'update_meet'
    | 'delete_meet'
    | 'fetch_calendar'
    | 'create_sheet'
    | 'read_sheet'
    | 'update_sheet'
    | 'create_doc'
    | 'read_doc'
    | 'append_doc'
    | 'replace_doc'
    | 'clear_doc'
    | 'fetch_notes'
    | 'create_note'
    | 'create_course'
    | 'fetch_courses'
    | 'fetch_assignments'
    | 'fetch_students'
    | 'fetch_teams_messages'
    | 'fetch_teams_channels'
    | 'fetch_outlook_emails'
    | 'send_outlook_email'
    | 'create_outlook_event'
    | 'fetch_onedrive_files'
    | 'create_word_doc'
    | 'read_word_doc'
    | 'create_excel_sheet'
    | 'read_excel_sheet'
    | 'update_excel_sheet'
    | 'fetch_telegram_updates'
    | 'send_telegram_message'
    | 'manage_telegram_group'
    // ✅ NEW ACTIONS
    | 'search_youtube'
    | 'get_channel_stats'
    | 'create_form'
    | 'fetch_form_responses'
    | 'help'
    | 'none';

  message: string;

  data?:
    | GmailEmail[]
    | DriveFile[]
    | ShopifyOrder[]
    | GMeetEvent
    | SheetRow[]
    | CreatedSheet
    | GoogleDoc
    | GoogleDocContent
    | TeamsMessage[]
    | TeamsChannel[]
    | KeepNote[]
    | ClassroomCourse[]
    | ClassroomAssignment[]
    | ClassroomStudent[]
    | OutlookEmail[]
    | OutlookEvent
    | OneDriveFile[]
    | TelegramMessage[]
    // ✅ NEW DATA TYPES
    | YouTubeVideo[]
    | YouTubeChannel[]
    | GoogleForm[]
    | FormResponse[]
    | any;
}