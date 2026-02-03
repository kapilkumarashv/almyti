import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import fs from 'fs';
import path from 'path';
import { GoogleTokens } from '../types';

/* -------------------- SCOPES -------------------- */
const SCOPES = [
  // Gmail
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.send',

  // Drive (read/write for Sheets access)
  'https://www.googleapis.com/auth/drive',
  'https://www.googleapis.com/auth/spreadsheets',

  // Calendar (REQUIRED for Google Meet)
  'https://www.googleapis.com/auth/calendar',
  'https://www.googleapis.com/auth/documents',

  // Google Classroom
  'https://www.googleapis.com/auth/classroom.courses',            // Create/List courses
  'https://www.googleapis.com/auth/classroom.rosters',            // List students/teachers
  'https://www.googleapis.com/auth/classroom.coursework.students', // Manage assignments
  'https://www.googleapis.com/auth/classroom.profile.emails',     // View student emails/names
  'https://www.googleapis.com/auth/classroom.profile.photos',      // View student profiles

  // ✅ YouTube (Added)
  'https://www.googleapis.com/auth/youtube.readonly',             // Search videos & view channel stats

  // ✅ Google Forms (Added)
  'https://www.googleapis.com/auth/forms.body',                   // Create & edit forms
  'https://www.googleapis.com/auth/forms.responses.readonly'      // Read form responses
];

/* -------------------- TOKEN FILE PATH -------------------- */
const TOKEN_PATH = path.join(process.cwd(), 'google_tokens.json');

/* -------------------- CREATE CLIENT -------------------- */
export function getOAuth2Client(): OAuth2Client {
  return new OAuth2Client(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );
}

/* -------------------- GENERATE AUTH URL -------------------- */
export function getAuthUrl(): string {
  const oauth2Client = getOAuth2Client();
  return oauth2Client.generateAuthUrl({
    access_type: 'offline', // ensures refresh token
    scope: SCOPES,
    prompt: 'consent',      // forces refresh token even if already granted
  });
}

/* -------------------- EXCHANGE CODE FOR TOKENS -------------------- */
export async function getTokensFromCode(code: string): Promise<GoogleTokens> {
  const oauth2Client = getOAuth2Client();
  const { tokens } = await oauth2Client.getToken(code);

  const tokenObj: GoogleTokens = {
    access_token: tokens.access_token || '',
    refresh_token: tokens.refresh_token || '',
    expiry_date: tokens.expiry_date || 0,
    scope: tokens.scope || SCOPES.join(' '),
    token_type: tokens.token_type || 'Bearer',
  };

  // Save tokens to file for future use
  fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokenObj, null, 2));
  console.log('✅ Tokens saved to google_tokens.json');

  return tokenObj;
}

/* -------------------- LOAD TOKENS -------------------- */
export function loadTokens(): GoogleTokens | null {
  if (fs.existsSync(TOKEN_PATH)) {
    return JSON.parse(fs.readFileSync(TOKEN_PATH, 'utf-8'));
  }
  return null;
}

/* -------------------- SET CREDENTIALS & AUTO REFRESH -------------------- */
export async function setCredentials(): Promise<OAuth2Client> {
  const oauth2Client = getOAuth2Client();
  const tokens = loadTokens();
  if (!tokens?.refresh_token) {
    throw new Error('No refresh token found! Generate one using getTokensFromCode()');
  }

  oauth2Client.setCredentials(tokens);

  // Auto-refresh access token if expired
  const now = Date.now();
  if (!tokens.access_token || !tokens.expiry_date || tokens.expiry_date <= now) {
    const newToken = await oauth2Client.refreshAccessToken();
    oauth2Client.setCredentials(newToken.credentials);
    fs.writeFileSync(TOKEN_PATH, JSON.stringify(newToken.credentials, null, 2));
    console.log('🔄 Access token refreshed automatically');
  }

  // Optional listener for token changes
  oauth2Client.on('tokens', (newTokens) => {
    if (newTokens.refresh_token) {
      console.log('🔑 New refresh token:', newTokens.refresh_token);
    }
    if (newTokens.access_token) {
      console.log('🔑 New access token:', newTokens.access_token);
    }
  });

  return oauth2Client;
}

/* -------------------- GET CURRENT USER PROFILE -------------------- */
export async function getUserProfile(auth: OAuth2Client) {
  const gmail = google.gmail({ version: 'v1', auth });
  const profile = await gmail.users.getProfile({ userId: 'me' });
  return profile.data;
}