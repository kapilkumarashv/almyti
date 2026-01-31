// pages/api/agent/query.ts
import { NextApiRequest, NextApiResponse } from 'next';
import { processQuery, getAuthClient } from '@/lib/agent/processor';
import { getEmails } from '@/lib/google/gmail';
import { getLatestFiles } from '@/lib/google/drive';
import { getLatestOrders, testShopifyConnection, ShopifyConfig } from '@/lib/shopify/api';
import { getRecentTeamsMessages, getTeamsChannels } from '@/lib/microsoft/teams'; // Ensure this file exists
import { generateSummary } from '@/lib/ai/client';
import { ShopifyCredentials, MicrosoftTokens } from '@/lib/types';

/* ----------------- Extend AgentResponse ----------------- */
export interface AIIntentParameters {
  limit?: number;
  search?: string;
  date?: string;
  time?: string;
  subject?: string;
  body?: string;
  filter?: string;

  // Sheets
  spreadsheetId?: string;
  sheetName?: string;
  range?: string;
  values?: string[][];

  // Docs
  documentId?: string;
  content?: string;
  text?: string;
  findText?: string;
  replaceText?: string;
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
    const { query, shopifyConfig, microsoftTokens } = req.body as QueryRequestBody;

    if (!query) {
      return res.status(400).json({ error: 'Missing query' });
    }

    // Determine AI intent
    const response = (await processQuery(query, shopifyConfig)) as AgentResponseExtended;

    // Ensure parameters exist
    const params: AIIntentParameters = response.parameters || { limit: 5, search: '' };

    /* ----------------- FETCH EMAILS ----------------- */
    if (response.action === 'fetch_emails') {
      try {
        const emails = await getEmails({
          search: params.search,
          date: params.date,
          limit: params.limit,
        });

        const summary = await generateSummary(emails, query, 'emails');
        response.data = emails;
        response.message = summary;
      } catch (err) {
        console.error('Error fetching Gmail emails:', err);
        response.message = '⚠️ Failed to fetch emails. Please connect your Google account.';
      }
    }

    /* ----------------- FETCH FILES ----------------- */
    if (response.action === 'fetch_files') {
      try {
        const auth = await getAuthClient();
        const files = await getLatestFiles(auth, params.limit || 5);
        const summary = await generateSummary(files, query, 'files');

        response.data = files;
        response.message = summary;
      } catch (err) {
        console.error('Error fetching Drive files:', err);
        response.message = '⚠️ Failed to fetch files. Please connect your Google account.';
      }
    }

    /* ----------------- FETCH ORDERS (SHOPIFY) ----------------- */
    if (response.action === 'fetch_orders') {
      if (!shopifyConfig) {
        response.message = '❌ Please connect your Shopify store first to access orders.';
      } else {
        try {
          // Check Shopify connection
          const isConnected = await testShopifyConnection(shopifyConfig);
          if (!isConnected) {
            response.message =
              '❌ Cannot connect to Shopify. Please check your store URL and access token.';
          } else {
            // Normalize Shopify config
            const config: ShopifyConfig = {
              apiKey: shopifyConfig.apiKey || '',
              apiSecret: shopifyConfig.apiSecret || '',
              storeUrl: shopifyConfig.storeUrl,
              accessToken: shopifyConfig.accessToken,
            };

            // Optional date filter for Shopify API
            const dateFilter = params.date
              ? {
                  created_at_min: `${params.date}T00:00:00Z`,
                  created_at_max: `${params.date}T23:59:59Z`,
                }
              : undefined;

            // Fetch orders
            const orders = await getLatestOrders(config, params.limit || 5, dateFilter);
            const summary = await generateSummary(orders, query, 'orders');

            response.data = orders;
            response.message = summary;
          }
        } catch (err) {
          console.error('Shopify fetch error:', err);
          response.message =
            '❌ Failed to fetch Shopify orders. Please check your credentials and connection.';
        }
      }
    }

    /* ----------------- MICROSOFT TEAMS MESSAGES ----------------- */
    if (response.action === 'fetch_teams_messages') {
      if (!microsoftTokens) {
        response.message = '❌ Please connect your Microsoft Teams account first.';
      } else {
        try {
          const messages = await getRecentTeamsMessages(
            microsoftTokens.access_token,
            params.limit || 5
          );
          // Ensure generateSummary handles 'teams_messages'
          const summary = await generateSummary(messages, query, 'teams_messages');
          
          response.data = messages;
          response.message = summary;
        } catch (err) {
          console.error('Error fetching Teams messages:', err);
          response.message = '⚠️ Failed to fetch Teams messages. Please reconnect your account.';
        }
      }
    }

    /* ----------------- MICROSOFT TEAMS CHANNELS ----------------- */
    if (response.action === 'fetch_teams_channels') {
      if (!microsoftTokens) {
        response.message = '❌ Please connect your Microsoft Teams account first.';
      } else {
        try {
          const channels = await getTeamsChannels(
            microsoftTokens.access_token,
            params.limit || 10
          );
          // Ensure generateSummary handles 'teams_channels'
          const summary = await generateSummary(channels, query, 'teams_channels');

          response.data = channels;
          response.message = summary;
        } catch (err) {
          console.error('Error fetching Teams channels:', err);
          response.message = '⚠️ Failed to fetch Teams channels. Please reconnect your account.';
        }
      }
    }

    /* ----------------- CREATE GOOGLE MEET ----------------- */
    if (response.action === 'create_meet') {
      response.message = response.message || '✅ Google Meet created successfully!';
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