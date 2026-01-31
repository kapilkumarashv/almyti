import { NextApiRequest, NextApiResponse } from 'next';
import { setCredentials } from '@/lib/google/oauth';
import { getEmails, getLatestEmails } from '@/lib/google/gmail';
import { GoogleTokens, GmailEmail } from '@/lib/types';

interface EmailsRequestBody {
  tokens: GoogleTokens;
}

interface EmailsResponse {
  emails?: GmailEmail[];
  error?: string;
  details?: string;
}

export default async function handler(
  req: NextApiRequest, 
  res: NextApiResponse<EmailsResponse>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { tokens } = req.body as EmailsRequestBody;

    if (!tokens) {
      return res.status(400).json({ error: 'Missing authentication tokens' });
    }

    const auth = setCredentials(tokens);
    const emails = await getEmails(auth, {limit:20});

    res.status(200).json({ emails });
  } catch (error) {
    console.error('Error fetching emails:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ 
      error: 'Failed to fetch emails',
      details: errorMessage
    });
  }
}