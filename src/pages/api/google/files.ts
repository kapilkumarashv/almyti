import { NextApiRequest, NextApiResponse } from 'next';
import { setCredentials } from '@/lib/google/oauth';
import { getLatestFiles } from '@/lib/google/drive';
import { GoogleTokens, DriveFile } from '@/lib/types';

interface FilesRequestBody {
  tokens: GoogleTokens;
}

interface FilesResponse {
  files?: DriveFile[];
  error?: string;
  details?: string;
}

export default async function handler(
  req: NextApiRequest, 
  res: NextApiResponse<FilesResponse>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { tokens } = req.body as FilesRequestBody;

    if (!tokens) {
      return res.status(400).json({ error: 'Missing authentication tokens' });
    }

    const auth = setCredentials(tokens);
    const files = await getLatestFiles(auth, 10);

    res.status(200).json({ files });
  } catch (error) {
    console.error('Error fetching files:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ 
      error: 'Failed to fetch files',
      details: errorMessage
    });
  }
}