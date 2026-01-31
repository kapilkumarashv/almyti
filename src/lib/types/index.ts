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
    | TeamsChannel[];
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
/* ===================== GOOGLE SHEETS ================ */
/* ===================================================== */

/** Returned when a new spreadsheet is created */
export interface CreatedSheet {
  spreadsheetId: string;
  spreadsheetUrl: string;
}

/** One row read from a sheet */
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
  range?: string;
}

export interface UpdateSheetParams {
  spreadsheetId?: string;
  range?: string;
  values?: string[][];
}

/* ===================================================== */
/* ===================== GOOGLE DOCS ================== */
/* ===================================================== */

/** Basic document metadata */
export interface GoogleDoc {
  documentId: string;
  title: string;
  url?: string;
}

/** Full document content (plain text) */
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
}

export interface AppendDocParams {
  documentId?: string;
  text?: string;
}

export interface ReplaceDocParams {
  documentId?: string;
  findText?: string;
  replaceText?: string;
}

export interface ClearDocParams {
  documentId?: string;
}

/* ===================================================== */
/* ===================== MICROSOFT / TEAMS ============ */
/* ===================================================== */

export interface MicrosoftTokens {
  access_token: string;
  refresh_token?: string;
  expires_on?: number;
  scope?: string;
}

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
/* ===================== CONNECTION STATUS =========== */
/* ===================================================== */
export interface ServiceConnection {
  google: boolean;
  shopify: boolean;
  microsoft: boolean;
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
      action: 'fetch_teams_messages' | 'fetch_teams_channels';
      parameters: FetchTeamsParams;
      naturalResponse: string;
    })
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
    | 'fetch_teams_messages'
    | 'fetch_teams_channels'
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
    | TeamsChannel[];
}