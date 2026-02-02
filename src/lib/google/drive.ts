import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { DriveFile } from '../types';

/* ===================== LIST FILES ===================== */
export async function getLatestFiles(auth: OAuth2Client, limit: number = 10): Promise<DriveFile[]> {
  const drive = google.drive({ version: 'v3', auth });
  
  const response = await drive.files.list({
    pageSize: limit,
    fields: 'files(id, name, mimeType, modifiedTime, size, webViewLink)',
    orderBy: 'modifiedTime desc',
    q: "trashed = false" // ✅ Filter out deleted files
  });

  const files = response.data.files || [];
  
  return files.map(file => ({
    id: file.id || '',
    name: file.name || 'Untitled',
    mimeType: file.mimeType || '',
    modifiedTime: file.modifiedTime || '',
    size: file.size || undefined,
    webViewLink: file.webViewLink || undefined
  }));
}

/* ===================== SEARCH FILE BY NAME ===================== */
export async function findFileByName(auth: OAuth2Client, name: string, mimeType?: string): Promise<DriveFile | null> {
  const drive = google.drive({ version: 'v3', auth });

  // Build query: exact name match + not deleted + optional mimeType
  let query = `name = '${name}' and trashed = false`;
  if (mimeType) {
    query += ` and mimeType = '${mimeType}'`;
  }

  try {
    const res = await drive.files.list({
      q: query,
      fields: 'files(id, name, mimeType, webViewLink)',
      pageSize: 1 // We only need the first match
    });

    const file = res.data.files?.[0];
    if (!file) return null;

    return {
      id: file.id || '',
      name: file.name || '',
      mimeType: file.mimeType || '',
      modifiedTime: '', // Not needed for ID resolution
      webViewLink: file.webViewLink || undefined
    };
  } catch (error) {
    console.error('Error searching file:', error);
    return null;
  }
}