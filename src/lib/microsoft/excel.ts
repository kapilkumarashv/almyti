import { GraphClient } from './graphClient';
import { ExcelWorksheet, ExcelRow } from '../types';

/* ===================== CREATE WORKBOOK ===================== */
export async function createExcelWorkbook(accessToken: string, name: string): Promise<any> {
  const client = new GraphClient(accessToken);
  
  // Ensure name ends in .xlsx
  const filename = name.endsWith('.xlsx') ? name : `${name}.xlsx`;

  // 1. Upload an empty file to create it
  // Using the "content" endpoint with an empty body creates a blank file
  const file = await client.request<any>(`/me/drive/root:/${filename}:/content`, 'PUT', {});
  
  return {
    id: file.id,
    name: file.name,
    webUrl: file.webUrl
  };
}

/* ===================== READ WORKSHEET ===================== */
export async function readExcelWorksheet(accessToken: string, fileId: string): Promise<ExcelRow[]> {
  const client = new GraphClient(accessToken);

  try {
    // Get the used range from the active worksheet
    const data = await client.request<any>(`/me/drive/items/${fileId}/workbook/worksheets/Active/usedRange`);
    
    if (!data.values) return [];

    return data.values.map((row: any[]) => ({ values: row }));
  } catch (error) {
    console.error('Error reading Excel sheet:', error);
    return [];
  }
}

/* ===================== APPEND ROW ===================== */
export async function appendExcelRow(accessToken: string, fileId: string, values: any[]): Promise<void> {
  const client = new GraphClient(accessToken);

  // We append to the "Active" worksheet. 
  // We need to determine where to add. A simple way is to get the used range and add below.
  // OR use table logic if a table exists.
  
  // For simplicity: We will just write to a new row at the bottom of the used range.
  // Note: Microsoft Graph Excel API is strict. It's often easier to treat it as a Table.
  // BUT to keep it generic, we will just try to update a specific range or look for a table.
  
  // STRATEGY: Get Used Range -> Calculate Next Row -> Update
  // This is complex. Let's use the simplest robust method: Tables.
  // Check if a table exists, if not create one, then add row.
  
  try {
    // 1. List Tables
    const tables = await client.request<{ value: any[] }>(`/me/drive/items/${fileId}/workbook/worksheets/Active/tables`);
    
    let tableId = '';

    if (tables.value.length === 0) {
      // Create a table if none exists (Auto-detect size)
      const table = await client.request<any>(`/me/drive/items/${fileId}/workbook/worksheets/Active/tables/add`, 'POST', {
        address: 'A1:C1', // Minimal start
        hasHeaders: true
      });
      tableId = table.id;
    } else {
      tableId = tables.value[0].id;
    }

    // 2. Add Row to Table
    await client.request(`/me/drive/items/${fileId}/workbook/tables/${tableId}/rows`, 'POST', {
      values: [values] // Must be array of arrays
    });

  } catch (error) {
    console.error('Error appending to Excel:', error);
    throw new Error('Failed to update Excel file. Ensure it is a valid .xlsx file.');
  }
}