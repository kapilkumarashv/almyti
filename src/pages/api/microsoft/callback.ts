import { NextApiRequest, NextApiResponse } from 'next';
import { getTokensFromCode } from '@/lib/microsoft/oauth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { code } = req.query;

  if (!code || typeof code !== 'string') {
    return res.redirect('/?error=missing_code');
  }

  try {
    const tokens = await getTokensFromCode(code);
    
    // In production, store tokens securely (database, encrypted session, etc.)
    // For demo, we'll pass them back to the client
    const tokensString = encodeURIComponent(JSON.stringify(tokens));
    res.redirect(`/?microsoft_tokens=${tokensString}`);
  } catch (error) {
    console.error('Error exchanging code for tokens:', error);
    res.redirect('/?error=auth_failed');
  }
}