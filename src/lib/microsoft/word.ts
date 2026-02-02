import { GraphClient } from './graphClient';

/* ===================== CREATE DOCUMENT ===================== */
export async function createWordDoc(accessToken: string, name: string): Promise<any> {
  const client = new GraphClient(accessToken);
  const filename = name.endsWith('.docx') ? name : `${name}.docx`;

  // Create empty file
  const file = await client.request<any>(`/me/drive/root:/${filename}:/content`, 'PUT', {});
  return { id: file.id, name: file.name, webUrl: file.webUrl };
}

/* ===================== READ TEXT ===================== */
export async function readWordDoc(accessToken: string, fileId: string): Promise<string> {
  const client = new GraphClient(accessToken);
  // Fetch raw text content only (preview)
  // Note: Microsoft doesn't give full doc body easily via Graph without conversion.
  // We can read the file stream or use the "preview" endpoint.
  // Workaround: We download the content as text.
  
  try {
    const response = await fetch(`https://graph.microsoft.com/v1.0/me/drive/items/${fileId}/content?format=text`, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
    });
    
    // Sometimes it downloads binary. For plain text reading, Graph is tricky.
    // Easier alternative: Just return the webURL for user to open.
    // BUT, let's try to get a preview if possible.
    return "Previewing text content via API is limited. Please use the link to view formatting.";
  } catch (e) {
    return "";
  }
}

/* ===================== APPEND TEXT ===================== */
export async function appendWordText(accessToken: string, fileId: string, text: string): Promise<void> {
  // Graph API does not support editing Word bodies directly easily yet (it's in beta/complex).
  // Strategy: We will inform the user.
  throw new Error("Direct editing of Word documents via API is currently restricted by Microsoft. Please use the link to edit manually.");
}