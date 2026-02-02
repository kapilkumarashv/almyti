import { google } from 'googleapis';
import { setCredentials } from './oauth';

/* ===================================================== */
/* ===================== TYPES ========================== */
/* ===================================================== */

export interface CreateSheetOptions {
  title: string;              // Spreadsheet name
  sheetName?: string;         // Optional first sheet name
}

export interface ReadSheetOptions {
  spreadsheetId: string;
  range: string;              // e.g. "Sheet1!A1:D10"
}

export interface UpdateSheetOptions {
  spreadsheetId: string;
  range: string;              // e.g. "Sheet1!B2"
  values: (string | number)[][]; // 2D array
}

/* ===================================================== */
/* ===================== CLIENT ========================= */
/* ===================================================== */

async function getSheetsClient() {
  const auth = await setCredentials();
  return google.sheets({ version: 'v4', auth });
}

/* ===================================================== */
/* ===================== CREATE SHEET =================== */
/* ===================================================== */

export async function createSpreadsheet({
  title,
  sheetName,
}: CreateSheetOptions): Promise<{
  spreadsheetId: string;
  spreadsheetUrl: string;
}> {
  const sheets = await getSheetsClient();

  const res = await sheets.spreadsheets.create({
    requestBody: {
      properties: { title },
      sheets: sheetName
        ? [
            {
              properties: { title: sheetName },
            },
          ]
        : undefined,
    },
  });

  return {
    spreadsheetId: res.data.spreadsheetId || '',
    spreadsheetUrl: res.data.spreadsheetUrl || '',
  };
}

/* ===================================================== */
/* ===================== READ SHEET ===================== */
/* ===================================================== */

export async function readSheet({
  spreadsheetId,
  range,
}: ReadSheetOptions): Promise<any[][]> {
  const sheets = await getSheetsClient();

  try {
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range,
    });

    return res.data.values ?? [];
  } catch (error) {
    console.error(`Error reading sheet (ID: ${spreadsheetId}, Range: ${range}):`, error);
    throw new Error('Failed to read Google Sheet data.');
  }
}

/* ===================================================== */
/* ===================== UPDATE SHEET =================== */
/* ===================================================== */

export async function updateSheet({
  spreadsheetId,
  range,
  values,
}: UpdateSheetOptions): Promise<void> {
  const sheets = await getSheetsClient();

  try {
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values,
      },
    });
  } catch (error) {
    console.error(`Error updating sheet (ID: ${spreadsheetId}, Range: ${range}):`, error);
    throw new Error('Failed to update Google Sheet.');
  }
}