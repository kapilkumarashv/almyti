import { 
  Client, 
  AuthenticationProvider,
  AuthenticationProviderOptions 
} from '@microsoft/microsoft-graph-client';
import 'isomorphic-fetch'; // Required for Node.js
import { TeamsMessage, TeamsChannel } from '../types';

/* -------------------- AUTH PROVIDER -------------------- */
// Strict implementation of the AuthProvider interface
class SimpleTokenProvider implements AuthenticationProvider {
  private accessToken: string;

  constructor(accessToken: string) {
    this.accessToken = accessToken;
  }

  // The Graph Client calls this method to get the token for every request
  public async getAccessToken(options?: AuthenticationProviderOptions): Promise<string> {
    return this.accessToken;
  }
}

/* -------------------- INITIALIZE CLIENT -------------------- */
export function getGraphClient(accessToken: string): Client {
  if (!accessToken || accessToken.trim() === '') {
    throw new Error('Access token is missing or empty. Cannot initialize Graph Client.');
  }

  // ✅ FIX: Use initWithMiddleware with the strict class implementation
  // This is the most reliable method for Node.js environments
  const client = Client.initWithMiddleware({
    authProvider: new SimpleTokenProvider(accessToken),
  });

  return client;
}

/* -------------------- GET MESSAGES -------------------- */
export async function getRecentTeamsMessages(accessToken: string, limit: number = 5): Promise<TeamsMessage[]> {
  const client = getGraphClient(accessToken);
  
  try {
    // 1. Get joined teams
    // "top(5)" ensures we don't fetch too many if the user is in 100 teams
    const teamsResponse = await client
      .api('/me/joinedTeams')
      .select('id,displayName')
      .top(5)
      .get();
    
    const teams = teamsResponse.value || [];
    
    if (teams.length === 0) {
      console.log('No joined teams found. The user might be on a personal account.');
      return [];
    }

    const allMessages: TeamsMessage[] = [];

    // 2. Iterate (Limit to first 2 teams for speed)
    for (const team of teams.slice(0, 2)) {
      try {
        const channelsResponse = await client
          .api(`/teams/${team.id}/channels`)
          .select('id,displayName')
          .get();
        
        const channels = channelsResponse.value || [];

        // Check first 2 channels
        for (const channel of channels.slice(0, 2)) {
          try {
            const messagesResponse = await client
              .api(`/teams/${team.id}/channels/${channel.id}/messages`)
              .top(5)
              .get();
            
            const messages = messagesResponse.value || [];
            
            for (const message of messages) {
              if (allMessages.length >= limit) break;
              if (message.deletedDateTime) continue; // Skip deleted

              allMessages.push({
                id: message.id,
                subject: message.subject || null,
                body: message.body?.content ? stripHtml(message.body.content) : 'No content',
                from: {
                  displayName: message.from?.user?.displayName || 'Unknown User',
                  email: message.from?.user?.userPrincipalName || 'No Email'
                },
                createdDateTime: message.createdDateTime,
                webUrl: message.webUrl
              });
            }
          } catch (err) {
            // Suppress channel errors (common in shared channels)
          }
          if (allMessages.length >= limit) break;
        }
      } catch (err) {
        // Suppress team errors
      }
      if (allMessages.length >= limit) break;
    }

    return allMessages.slice(0, limit);
  } catch (error: any) {
    console.error('❌ Error fetching Teams messages:', error.message);
    // Return empty array so the Agent says "No messages found" instead of crashing
    return [];
  }
}

/* -------------------- GET CHANNELS -------------------- */
export async function getTeamsChannels(accessToken: string, limit: number = 10): Promise<TeamsChannel[]> {
  const client = getGraphClient(accessToken);
  
  try {
    const teamsResponse = await client
      .api('/me/joinedTeams')
      .select('id,displayName')
      .get();
    
    const teams = teamsResponse.value || [];
    const allChannels: TeamsChannel[] = [];

    for (const team of teams) {
      try {
        const channelsResponse = await client
          .api(`/teams/${team.id}/channels`)
          .get();
        
        const channels = channelsResponse.value || [];
        
        for (const channel of channels) {
          if (allChannels.length >= limit) break;
          
          allChannels.push({
            id: channel.id,
            displayName: `${team.displayName} > ${channel.displayName}`,
            description: channel.description || null,
            membershipType: channel.membershipType || 'standard',
            webUrl: channel.webUrl
          });
        }
      } catch (err) {
        // Continue to next team
      }
      if (allChannels.length >= limit) break;
    }

    return allChannels;
  } catch (error: any) {
    console.error('❌ Error fetching Teams channels:', error.message);
    return [];
  }
}

/* -------------------- UTILS -------------------- */
function stripHtml(html: string): string {
  if (!html) return '';
  return html
    .replace(/<[^>]*>/g, ' ') // Remove tags
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')     // Collapse whitespace
    .trim()
    .substring(0, 200);
}