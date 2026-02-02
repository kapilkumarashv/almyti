import { GraphClient } from './graphClient';
import { OneDriveFile } from '../types';

/* ===================== LIST FILES ===================== */
export async function listOneDriveFiles(accessToken: string, limit: number = 10): Promise<OneDriveFile[]> {
  const client = new GraphClient(accessToken);
  
  try {
    // Fetch files from root directory
    const data = await client.request<{ value: any[] }>(`/me/drive/root/children?$top=${limit}&$select=id,name,webUrl,lastModifiedDateTime,file,folder`);
    
    return data.value.map(item => ({
      id: item.id,
      name: item.name,
      webUrl: item.webUrl,
      size: item.size || 0,
      createdDateTime: item.createdDateTime,
      lastModifiedDateTime: item.lastModifiedDateTime,
      file: item.file,   // if present, it's a file
      folder: item.folder // if present, it's a folder
    }));
  } catch (error) {
    console.error('Error listing OneDrive files:', error);
    return [];
  }
}

/* ===================== FIND FILE BY NAME ===================== */
export async function findOneDriveFileByName(accessToken: string, name: string): Promise<OneDriveFile | null> {
  const client = new GraphClient(accessToken);
  
  // Clean the name (remove extension if user added it, though search usually handles it)
  const cleanName = name.replace(/\.(docx|xlsx)$/i, '');

  try {
    // 1. Search for the file
    // The search endpoint is powerful: /me/drive/root/search(q='filename')
    const data = await client.request<{ value: any[] }>(`/me/drive/root/search(q='${cleanName}')?$top=5`);
    
    if (!data.value || data.value.length === 0) return null;

    // 2. Filter for exact match (or very close)
    // Preference: Exact match > Starts with > Includes
    const exact = data.value.find(f => f.name.toLowerCase() === name.toLowerCase() || f.name.toLowerCase().startsWith(name.toLowerCase()));
    
    if (!exact) return null;

    return {
      id: exact.id,
      name: exact.name,
      webUrl: exact.webUrl,
      size: exact.size || 0,
      createdDateTime: exact.createdDateTime,
      lastModifiedDateTime: exact.lastModifiedDateTime,
      file: exact.file,
      folder: exact.folder
    };
  } catch (error) {
    console.error('Error finding OneDrive file:', error);
    return null;
  }
}