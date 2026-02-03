import { NextApiRequest, NextApiResponse } from 'next';
// ✅ Relative imports for stability
import { processQuery, getAuthClient } from '../../../lib/agent/processor';
import { getEmails } from '../../../lib/google/gmail';
import { getLatestFiles } from '../../../lib/google/drive';
import { getLatestOrders, testShopifyConnection, ShopifyConfig } from '../../../lib/shopify/api';
import { getRecentTeamsMessages, getTeamsChannels } from '../../../lib/microsoft/teams';
import { generateSummary } from '../../../lib/ai/client';
import { ShopifyCredentials, MicrosoftTokens } from '../../../lib/types';

/* ----------------- Extend AgentResponse ----------------- */
export interface AIIntentParameters {
  limit?: number;
  search?: string;
  date?: string;
  time?: string;
  subject?: string;
  body?: string;
  filter?: string;

  // Sheets & Notes & Docs & Word & Excel
  title?: string;
  
  // Sheets / Excel
  spreadsheetId?: string;
  sheetName?: string;
  range?: string;
  values?: string[][];

  // Docs / Word
  documentId?: string;
  content?: string;
  text?: string;
  findText?: string;
  replaceText?: string;

  // Classroom Parameters
  courseName?: string;
  studentName?: string;
  name?: string; 
  section?: string;
  room?: string;
  description?: string;

  // Telegram Parameters
  chatId?: string;
  action?: string;
  userId?: number;
  messageId?: number;

  // ✅ YouTube Parameters
  query?: string;
  channelId?: string;
  channelName?: string;

  // ✅ Forms Parameters
  formId?: string;
}

export interface AgentResponseExtended {
  action:
    | 'fetch_emails'
    | 'fetch_files'
    | 'fetch_orders'
    | 'fetch_teams_messages'
    | 'fetch_teams_channels'
    | 'create_meet'
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
    | 'fetch_courses'
    | 'create_course'
    | 'fetch_assignments'
    | 'fetch_students'
    // MICROSOFT ACTIONS
    | 'fetch_outlook_emails'
    | 'send_outlook_email'
    | 'create_outlook_event'
    | 'fetch_onedrive_files'
    | 'create_word_doc'
    | 'read_word_doc'
    | 'create_excel_sheet'
    | 'read_excel_sheet'
    | 'update_excel_sheet'
    // TELEGRAM ACTIONS
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
  data?: any;
  parameters?: AIIntentParameters;
}

interface QueryRequestBody {
  query: string;
  shopifyConfig?: ShopifyCredentials;
  microsoftTokens?: MicrosoftTokens;
  telegramToken?: string;
}

/* ----------------- API Handler ----------------- */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<AgentResponseExtended | { error: string; details?: string }>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { query, shopifyConfig, microsoftTokens, telegramToken } = req.body as QueryRequestBody;

    if (!query) {
      return res.status(400).json({ error: 'Missing query' });
    }

    // Determine AI intent & Execute Core Logic (Processor)
    const response = (await processQuery(query, shopifyConfig, microsoftTokens, telegramToken)) as AgentResponseExtended;

    // Ensure parameters exist
    const params: AIIntentParameters = response.parameters || { limit: 5, search: '' };

    /* =================================================================================
       GOOGLE INTEGRATIONS
       ================================================================================= */

    /* ----------------- FETCH EMAILS (GMAIL) ----------------- */
    if (response.action === 'fetch_emails') {
      try {
        if (!response.data) {
          const emails = await getEmails({
            search: params.search,
            date: params.date,
            limit: params.limit,
          });
          response.data = emails;
        }
        const summary = await generateSummary(response.data, query, 'emails');
        response.message = summary;
      } catch (err) {
        console.error('Error fetching Gmail emails:', err);
        response.message = '⚠️ Failed to fetch emails. Please connect your Google account.';
      }
    }

    /* ----------------- FETCH FILES (DRIVE) ----------------- */
    if (response.action === 'fetch_files') {
      try {
        if (!response.data) {
          const auth = await getAuthClient();
          const files = await getLatestFiles(auth, params.limit || 5);
          response.data = files;
        }
        const summary = await generateSummary(response.data, query, 'files');
        response.message = summary;
      } catch (err) {
        console.error('Error fetching Drive files:', err);
        response.message = '⚠️ Failed to fetch files. Please connect your Google account.';
      }
    }

    /* ----------------- FETCH NOTES (KEEP) ----------------- */
    if (response.action === 'fetch_notes') {
      try {
        if (response.data && Array.isArray(response.data)) {
          const summary = await generateSummary(response.data, query, 'notes');
          response.message = summary;
        }
      } catch (err) { console.error('Error summarizing Keep notes:', err); }
    }

    /* ----------------- GOOGLE CLASSROOM ----------------- */
    if (response.action === 'fetch_courses') {
      try { if (response.data) response.message = await generateSummary(response.data, query, 'courses'); } catch (e) {}
    }
    if (response.action === 'fetch_assignments') {
      try { if (response.data) response.message = await generateSummary(response.data, query, 'assignments'); } catch (e) {}
    }
    if (response.action === 'fetch_students') {
      try { if (response.data) response.message = await generateSummary(response.data, query, 'students'); } catch (e) {}
    }

    /* ----------------- YOUTUBE ----------------- */
    if (response.action === 'search_youtube') {
      try { if (response.data) response.message = await generateSummary(response.data, query, 'youtube_videos'); } catch (e) {}
    }
    if (response.action === 'get_channel_stats') {
      try { if (response.data) response.message = await generateSummary(response.data, query, 'youtube_stats'); } catch (e) {}
    }

    /* ----------------- GOOGLE FORMS ----------------- */
    if (response.action === 'fetch_form_responses') {
      try { if (response.data) response.message = await generateSummary(response.data, query, 'form_responses'); } catch (e) {}
    }
    // Note: 'create_form' usually has a specific success message from processor, so we might skip summary unless we want AI to rephrase it.

    /* =================================================================================
       MICROSOFT INTEGRATIONS
       ================================================================================= */

    /* ----------------- OUTLOOK MAIL ----------------- */
    if (response.action === 'fetch_outlook_emails') {
      try {
        if (response.data && Array.isArray(response.data)) {
          const summary = await generateSummary(response.data, query, 'outlook_emails');
          response.message = summary;
        }
      } catch (err) { console.error('Error summarizing Outlook emails:', err); }
    }

    /* ----------------- ONEDRIVE FILES ----------------- */
    if (response.action === 'fetch_onedrive_files') {
      try {
        if (response.data && Array.isArray(response.data)) {
          const summary = await generateSummary(response.data, query, 'onedrive_files');
          response.message = summary;
        }
      } catch (err) { console.error('Error summarizing OneDrive files:', err); }
    }

    /* ----------------- EXCEL ----------------- */
    if (response.action === 'read_excel_sheet') {
      try {
        if (response.data) {
          const summary = await generateSummary(response.data, query, 'excel_sheet');
          response.message = summary;
        }
      } catch (err) { console.error('Error summarizing Excel data:', err); }
    }

    /* ----------------- TEAMS (Manual Fetch Fallback) ----------------- */
    if (response.action === 'fetch_teams_messages') {
      if (!microsoftTokens) {
        response.message = '❌ Please connect your Microsoft Teams account first.';
      } else {
        try {
          if (!response.data) {
             const messages = await getRecentTeamsMessages(
               microsoftTokens.access_token,
               params.limit || 5
             );
             response.data = messages;
          }
          const summary = await generateSummary(response.data, query, 'teams_messages');
          response.message = summary;
        } catch (err) {
          console.error('Error fetching Teams messages:', err);
          response.message = '⚠️ Failed to fetch Teams messages.';
        }
      }
    }

    if (response.action === 'fetch_teams_channels') {
      if (!microsoftTokens) {
        response.message = '❌ Please connect your Microsoft Teams account first.';
      } else {
        try {
          if (!response.data) {
             const channels = await getTeamsChannels(
               microsoftTokens.access_token,
               params.limit || 10
             );
             response.data = channels;
          }
          const summary = await generateSummary(response.data, query, 'teams_channels');
          response.message = summary;
        } catch (err) {
          console.error('Error fetching Teams channels:', err);
          response.message = '⚠️ Failed to fetch Teams channels.';
        }
      }
    }

    /* =================================================================================
       ✅ TELEGRAM INTEGRATION (NEW)
       ================================================================================= */
    if (response.action === 'fetch_telegram_updates') {
      try {
        if (response.data && Array.isArray(response.data)) {
          const summary = await generateSummary(response.data, query, 'telegram_messages');
          response.message = summary;
        }
      } catch (err) { console.error('Error summarizing Telegram messages:', err); }
    }

    /* =================================================================================
       SHOPIFY
       ================================================================================= */
    if (response.action === 'fetch_orders') {
      if (!shopifyConfig) {
        response.message = '❌ Please connect your Shopify store first to access orders.';
      } else {
        try {
          if (!response.data) {
             const isConnected = await testShopifyConnection(shopifyConfig);
             if (!isConnected) {
               response.message = '❌ Cannot connect to Shopify. Check store URL and token.';
             } else {
                const config: ShopifyConfig = {
                  apiKey: shopifyConfig.apiKey || '',
                  apiSecret: shopifyConfig.apiSecret || '',
                  storeUrl: shopifyConfig.storeUrl,
                  accessToken: shopifyConfig.accessToken,
                };
                
                const dateFilter = params.date
                  ? {
                      created_at_min: `${params.date}T00:00:00Z`,
                      created_at_max: `${params.date}T23:59:59Z`,
                    }
                  : undefined;
                
                response.data = await getLatestOrders(config, params.limit || 5, dateFilter);
             }
          }

          if (response.data) {
            const summary = await generateSummary(response.data, query, 'orders');
            response.message = summary;
          }
        } catch (err) {
          console.error('Shopify fetch error:', err);
          response.message = '❌ Failed to fetch Shopify orders.';
        }
      }
    }

    /* ----------------- CREATE MEET ----------------- */
    if (response.action === 'create_meet' || response.action === 'create_outlook_event') {
      // Message is already set by processor
    }

    /* ----------------- DEFAULT / HELP ----------------- */
    return res.status(200).json(response);
    
  } catch (error) {
    console.error('Error processing query:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return res.status(500).json({
      error: 'Failed to process query',
      details: errorMessage,
    });
  }
}