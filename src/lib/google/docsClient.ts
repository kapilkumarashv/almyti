import { google } from 'googleapis';
import { setCredentials } from './oauth';

/* ===================================================== */
/* ===================== CLIENT ========================= */
/* ===================================================== */

async function getDocsClient() {
  const auth = await setCredentials();
  return google.docs({ version: 'v1', auth });
}

/* ===================================================== */
/* ===================== TYPES ========================== */
/* ===================================================== */

export interface CreateDocOptions {
  title: string;
}

export interface ReadDocOptions {
  documentId: string;
}

export interface AppendDocOptions {
  documentId: string;
  text: string;
}

export interface ReplaceDocOptions {
  documentId: string;
  findText: string;
  replaceText: string;
}

export interface DeleteContentOptions {
  documentId: string;
  startIndex: number;
  endIndex: number;
}

/* ===================================================== */
/* ===================== CREATE DOC ===================== */
/* ===================================================== */

export async function createGoogleDoc({
  title,
}: CreateDocOptions): Promise<{
  documentId: string;
  title: string;
}> {
  const docs = await getDocsClient();

  const res = await docs.documents.create({
    requestBody: { title },
  });

  return {
    documentId: res.data.documentId || '',
    title: res.data.title || '',
  };
}

/* ===================================================== */
/* ===================== READ DOC ======================= */
/* ===================================================== */
/**
 * Reads full text content of a Google Doc
 */
export async function readGoogleDoc({
  documentId,
}: ReadDocOptions): Promise<string> {
  const docs = await getDocsClient();

  const res = await docs.documents.get({ documentId });

  const content = res.data.body?.content ?? [];
  let text = '';

  for (const item of content) {
    if (!item.paragraph) continue;

    for (const el of item.paragraph.elements ?? []) {
      if (el.textRun?.content) {
        text += el.textRun.content;
      }
    }
  }

  return text.trim();
}

/* ===================================================== */
/* ===================== APPEND TEXT ==================== */
/* ===================================================== */
/**
 * Appends text at the end of the document
 */
export async function appendToGoogleDoc({
  documentId,
  text,
}: AppendDocOptions): Promise<void> {
  const docs = await getDocsClient();

  await docs.documents.batchUpdate({
    documentId,
    requestBody: {
      requests: [
        {
          insertText: {
            endOfSegmentLocation: {},
            text: `\n${text}`,
          },
        },
      ],
    },
  });
}

/* ===================================================== */
/* ===================== REPLACE TEXT =================== */
/* ===================================================== */
/**
 * Find and replace text across entire document
 */
export async function replaceTextInGoogleDoc({
  documentId,
  findText,
  replaceText,
}: ReplaceDocOptions): Promise<void> {
  const docs = await getDocsClient();

  await docs.documents.batchUpdate({
    documentId,
    requestBody: {
      requests: [
        {
          replaceAllText: {
            containsText: {
              text: findText,
              matchCase: false,
            },
            replaceText,
          },
        },
      ],
    },
  });
}

/* ===================================================== */
/* ===================== DELETE CONTENT ================= */
/* ===================================================== */
/**
 * Deletes content using index range
 * (advanced usage – indices come from document structure)
 */
export async function deleteGoogleDocContent({
  documentId,
  startIndex,
  endIndex,
}: DeleteContentOptions): Promise<void> {
  const docs = await getDocsClient();

  await docs.documents.batchUpdate({
    documentId,
    requestBody: {
      requests: [
        {
          deleteContentRange: {
            range: {
              startIndex,
              endIndex,
            },
          },
        },
      ],
    },
  });
}

/* ===================================================== */
/* ===================== CLEAR DOC ====================== */
/* ===================================================== */
/**
 * Clears entire document content
 */
export async function clearGoogleDoc(documentId: string): Promise<void> {
  const docs = await getDocsClient();

  const res = await docs.documents.get({ documentId });
  const endIndex = res.data.body?.content?.slice(-1)[0]?.endIndex;

  if (!endIndex || endIndex <= 1) return;

  await docs.documents.batchUpdate({
    documentId,
    requestBody: {
      requests: [
        {
          deleteContentRange: {
            range: {
              startIndex: 1,
              endIndex: endIndex - 1,
            },
          },
        },
      ],
    },
  });
}
