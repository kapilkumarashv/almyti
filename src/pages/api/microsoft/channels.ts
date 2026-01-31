import { NextApiRequest, NextApiResponse } from 'next';
import { getTeamsChannels } from '@/lib/microsoft/teams';
import { MicrosoftTokens, TeamsChannel } from '@/lib/types';

interface ChannelsRequestBody {
  tokens: MicrosoftTokens;
}

interface ChannelsResponse {
  channels?: TeamsChannel[];
  error?: string;
  details?: string;
}

export default async function handler(
  req: NextApiRequest, 
  res: NextApiResponse<ChannelsResponse>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { tokens } = req.body as ChannelsRequestBody;

    if (!tokens) {
      return res.status(400).json({ error: 'Missing authentication tokens' });
    }

    const channels = await getTeamsChannels(tokens.access_token, 10);

    res.status(200).json({ channels });
  } catch (error) {
    console.error('Error fetching Teams channels:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ 
      error: 'Failed to fetch Teams channels',
      details: errorMessage 
    });
  }
}