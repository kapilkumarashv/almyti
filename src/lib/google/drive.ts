import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { DriveFile } from '../types';

export async function getLatestFiles(auth: OAuth2Client, maxResults: number = 10): Promise<DriveFile[]> {
  const drive = google.drive({ version: 'v3', auth });
  
  const response = await drive.files.list({
    pageSize: maxResults,
    fields: 'files(id, name, mimeType, modifiedTime, size, webViewLink)',
    orderBy: 'modifiedTime desc'
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