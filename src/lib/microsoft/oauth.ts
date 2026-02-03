import { ConfidentialClientApplication } from '@azure/msal-node';
import fs from 'fs';
import path from 'path';
import { MicrosoftTokens } from '../types';

/* -------------------- CONFIGURATION -------------------- */
const MS_CLIENT_ID = process.env.MICROSOFT_CLIENT_ID || '';
const MS_CLIENT_SECRET = process.env.MICROSOFT_CLIENT_SECRET || '';
const MS_REDIRECT_URI = process.env.MICROSOFT_REDIRECT_URI || '';
// "common" allows BOTH personal (Outlook/Hotmail) and Work/School accounts
const MS_AUTHORITY = 'https://login.microsoftonline.com/common'; 

const TOKEN_PATH = path.join(process.cwd(), 'microsoft_tokens.json');

const msalConfig = {
  auth: {
    clientId: MS_CLIENT_ID,
    authority: MS_AUTHORITY,
    clientSecret: MS_CLIENT_SECRET,
  },
};

const cca = new ConfidentialClientApplication(msalConfig);

// ✅ FIX: Added Scopes for Excel, Word, OneDrive, and Teams
const SCOPES = [
  // User Profile
  'User.Read', 
  
  // Outlook (Mail)
  'Mail.Read', 
  'Mail.Send', 
  'Calendars.ReadWrite',
  // OneDrive / Excel / Word (Files)
  'Files.ReadWrite', // <--- Critical: Allows reading/writing files in OneDrive (needed for Excel & Word too)

  // Teams
  'Team.ReadBasic.All',      // <--- List joined Teams
  'Channel.ReadBasic.All',   // <--- List Channels
  'ChannelMessage.Read.All', // <--- Read Channel Messages
  'Chat.Read',               // <--- Read Personal Chats
  
  // Auth
  'offline_access' 
];

/* -------------------- GET AUTH URL -------------------- */
export async function getAuthUrl(): Promise<string> {
  const authCodeUrlParameters = {
    scopes: SCOPES,
    redirectUri: MS_REDIRECT_URI,
    // ✅ CRITICAL: Forces account selection so you can choose your Personal account
    prompt: 'select_account', 
  };

  return await cca.getAuthCodeUrl(authCodeUrlParameters);
}

/* -------------------- GET TOKENS FROM CODE -------------------- */
export async function getTokensFromCode(code: string): Promise<MicrosoftTokens> {
  const tokenRequest = {
    code,
    scopes: SCOPES,
    redirectUri: MS_REDIRECT_URI,
  };

  const response = await cca.acquireTokenByCode(tokenRequest);
  
  const tokens: MicrosoftTokens = {
    access_token: response.accessToken,
    // ✅ Capture the refresh token (now available thanks to 'offline_access')
    refresh_token: '', 
    expires_on: response.expiresOn ? response.expiresOn.getTime() : Date.now() + 3600 * 1000,
    scope: response.scopes.join(' '),
  };

  // Save to file
  fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens, null, 2));
  console.log('✅ Microsoft tokens saved.');

  return tokens;
}

/* -------------------- LOAD TOKENS -------------------- */
export function loadMSTokens(): MicrosoftTokens | null {
  if (fs.existsSync(TOKEN_PATH)) {
    return JSON.parse(fs.readFileSync(TOKEN_PATH, 'utf-8'));
  }
  return null;
}