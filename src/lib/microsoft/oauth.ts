import { ConfidentialClientApplication, AuthorizationUrlRequest, AuthorizationCodeRequest } from '@azure/msal-node';
import { MicrosoftTokens } from '../types';

const SCOPES = [
  'User.Read',
  'Chat.Read',
  'Channel.ReadBasic.All',
  'ChannelMessage.Read.All',
  'Team.ReadBasic.All'
];

const msalConfig = {
  auth: {
    clientId: process.env.MICROSOFT_CLIENT_ID || '',
    authority: `https://login.microsoftonline.com/${process.env.MICROSOFT_TENANT_ID || 'common'}`,
    clientSecret: process.env.MICROSOFT_CLIENT_SECRET || ''
  }
};

export function getMsalClient() {
  return new ConfidentialClientApplication(msalConfig);
}

export async function getAuthUrl(): Promise<string> {
  const msalClient = getMsalClient();
  
  const authCodeUrlParameters: AuthorizationUrlRequest = {
    scopes: SCOPES,
    redirectUri: process.env.MICROSOFT_REDIRECT_URI || 'http://localhost:3000/api/microsoft/callback',
    responseMode: 'query'
  };

  const authUrl = await msalClient.getAuthCodeUrl(authCodeUrlParameters);
  return authUrl;
}

export async function getTokensFromCode(code: string): Promise<MicrosoftTokens> {
  const msalClient = getMsalClient();
  
  const tokenRequest: AuthorizationCodeRequest = {
    code,
    scopes: SCOPES,
    redirectUri: process.env.MICROSOFT_REDIRECT_URI || 'http://localhost:3000/api/microsoft/callback'
  };

  const response = await msalClient.acquireTokenByCode(tokenRequest);
  
  return {
    access_token: response.accessToken,
    refresh_token: response.refreshToken,
    expires_on: response.expiresOn ? response.expiresOn.getTime() : undefined,
    scope: response.scopes?.join(' ')
  };
}

export function getAccessToken(tokens: MicrosoftTokens): string {
  return tokens.access_token;
}