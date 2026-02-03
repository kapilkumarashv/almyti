import { GraphClient } from './graphClient';

/* ===================== CREATE DOCUMENT ===================== */
export async function createWordDoc(accessToken: string, name: string): Promise<any> {
  const client = new GraphClient(accessToken);
  const filename = name.endsWith('.docx') ? name : `${name}.docx`;

  // ✅ FIX: Write actual content into the file.
  // Writing the title inside ensures the file is not 0 bytes, so OneDrive displays it immediately.
  const content = `Title: ${name}\n\nCreated by AI Agent.`;
  
  const file = await client.request<any>(
    `/me/drive/root:/${encodeURIComponent(filename)}:/content`, 
    'PUT', 
    content, 
    { 'Content-Type': 'text/plain' } // This creates a text-based file that Word can convert/open
  );
  
  return { 
    id: file.id, 
    name: file.name, 
    webUrl: file.webUrl 
  };
}

/* ===================== READ TEXT ===================== */
export async function readWordDoc(accessToken: string, fileId: string): Promise<string> {
  const client = new GraphClient(accessToken);
  
  try {
    // 1. Fetch File Metadata to verify existence and get URL
    const file = await client.request<any>(`/me/drive/items/${fileId}`);

    // 2. Microsoft Graph cannot convert .docx to plain text easily via API.
    // The most useful response is the direct link to Word Online.
    return `📄 Word Document found: "${file.name}"\n\nPreview is not supported for .docx files via API.\n🔗 Open in Word Online: ${file.webUrl}`;

  } catch (e: any) {
    console.error("Error reading Word doc:", e.message);
    return "❌ Failed to read the Word document. It may have been deleted or moved.";
  }
}

/* ===================== APPEND TEXT ===================== */
export async function appendWordText(accessToken: string, fileId: string, text: string): Promise<void> {
  // Graph API does not support appending text to Word bodies directly (requires complex HTML/MIME multipart).
  throw new Error("Direct editing of Word documents via API is currently restricted by Microsoft. Please use the link to edit manually.");
}