import { NextApiRequest, NextApiResponse } from 'next';
import { getRecentTeamsMessages } from '@/lib/microsoft/teams';
import { MicrosoftTokens, TeamsMessage } from '@/lib/types';

interface MessagesRequestBody {
  tokens: MicrosoftTokens;
}

interface MessagesResponse {
  messages?: TeamsMessage[];
  error?: string;
  details?: string;
}

export default async function handler(
  req: NextApiRequest, 
  res: NextApiResponse<MessagesResponse>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { tokens } = req.body as MessagesRequestBody;

    if (!tokens) {
      return res.status(400).json({ error: 'Missing authentication tokens' });
    }

    const messages = await getRecentTeamsMessages(tokens.access_token, 10);

    res.status(200).json({ messages });
  } catch (error) {
    console.error('Error fetching Teams messages:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ 
      error: 'Failed to fetch Teams messages',
      details: errorMessage 
    });
  }
}