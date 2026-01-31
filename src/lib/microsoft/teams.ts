import { Client } from '@microsoft/microsoft-graph-client';
import { TeamsMessage, TeamsChannel } from '../types';

export function getGraphClient(accessToken: string): Client {
  return Client.init({
    authProvider: (done) => {
      done(null, accessToken);
    }
  });
}

export async function getRecentTeamsMessages(accessToken: string, limit: number = 10): Promise<TeamsMessage[]> {
  const client = getGraphClient(accessToken);
  
  try {
    // Get user's joined teams
    const teamsResponse = await client
      .api('/me/joinedTeams')
      .top(5)
      .get();
    
    const teams = teamsResponse.value || [];
    
    if (teams.length === 0) {
      return [];
    }

    const allMessages: TeamsMessage[] = [];

    // Get messages from first team's channels
    for (const team of teams.slice(0, 2)) {
      try {
        // Get channels for this team
        const channelsResponse = await client
          .api(`/teams/${team.id}/channels`)
          .get();
        
        const channels = channelsResponse.value || [];

        // Get messages from each channel
        for (const channel of channels.slice(0, 2)) {
          try {
            const messagesResponse = await client
              .api(`/teams/${team.id}/channels/${channel.id}/messages`)
              .top(5)
              .get();
            
            const messages = messagesResponse.value || [];
            
            for (const message of messages) {
              if (allMessages.length >= limit) break;
              
              allMessages.push({
                id: message.id,
                subject: message.subject || null,
                body: message.body?.content ? stripHtml(message.body.content) : 'No content',
                from: {
                  displayName: message.from?.user?.displayName || 'Unknown',
                  email: message.from?.user?.userPrincipalName || ''
                },
                createdDateTime: message.createdDateTime,
                webUrl: message.webUrl
              });
            }
          } catch (err) {
            console.error(`Error fetching messages from channel ${channel.id}:`, err);
          }
          
          if (allMessages.length >= limit) break;
        }
      } catch (err) {
        console.error(`Error fetching channels for team ${team.id}:`, err);
      }
      
      if (allMessages.length >= limit) break;
    }

    return allMessages.slice(0, limit);
  } catch (error) {
    console.error('Error fetching Teams messages:', error);
    throw new Error('Failed to fetch Teams messages');
  }
}

export async function getTeamsChannels(accessToken: string, limit: number = 10): Promise<TeamsChannel[]> {
  const client = getGraphClient(accessToken);
  
  try {
    // Get user's joined teams
    const teamsResponse = await client
      .api('/me/joinedTeams')
      .get();
    
    const teams = teamsResponse.value || [];
    
    const allChannels: TeamsChannel[] = [];

    // Get channels from each team
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
            displayName: channel.displayName,
            description: channel.description || null,
            membershipType: channel.membershipType || 'standard',
            webUrl: channel.webUrl
          });
        }
      } catch (err) {
        console.error(`Error fetching channels for team ${team.id}:`, err);
      }
      
      if (allChannels.length >= limit) break;
    }

    return allChannels;
  } catch (error) {
    console.error('Error fetching Teams channels:', error);
    throw new Error('Failed to fetch Teams channels');
  }
}

function stripHtml(html: string): string {
  // Remove HTML tags and get plain text
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .trim()
    .substring(0, 200);
}