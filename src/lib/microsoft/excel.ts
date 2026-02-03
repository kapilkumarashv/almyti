import { GraphClient } from './graphClient';
import { ExcelWorksheet, ExcelRow } from '../types';

/* ===================== CREATE WORKBOOK ===================== */
export async function createExcelWorkbook(accessToken: string, name: string): Promise<any> {
  const client = new GraphClient(accessToken);
  
  // Ensure name ends in .xlsx
  const filename = name.endsWith('.xlsx') ? name : `${name}.xlsx`;

  // ✅ FIX: Use PUT /content (Same as Word fix)
  // This forces the file to be created and visible immediately.
  // Note: It creates a 0-byte file initially. Excel Online will initialize it when you open it.
  
  const file = await client.request<any>(
    `/me/drive/root:/${encodeURIComponent(filename)}:/content`, 
    'PUT', 
    '', // Empty content
    { 'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }
  );
  
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
    // Attempt to read the used range (cells with data)
    const data = await client.request<any>(`/me/drive/items/${fileId}/workbook/worksheets/Active/usedRange`);
    
    if (!data.values) return [];

    // Map rows to our internal format
    return data.values.map((row: any[]) => ({ values: row }));

  } catch (error: any) {
    console.error('Error reading Excel sheet:', error.message);
    
    // Fallback: If "ItemNotFound" (Active worksheet missing), return empty.
    if (error.message.includes('ItemNotFound') || error.message.includes('ResourceNotFound')) {
      return [];
    }
    // If the file is 0-bytes (just created), the API might say it's invalid until opened once.
    if (error.message.includes('InvalidWorkbook')) {
      console.warn("Workbook appears empty or uninitialized.");
      return [];
    }
    throw new Error('Failed to read Excel file. It might be empty or corrupt.');
  }
}

/* ===================== APPEND ROW ===================== */
export async function appendExcelRow(accessToken: string, fileId: string, values: any[]): Promise<void> {
  const client = new GraphClient(accessToken);

  try {
    // 1. Try to list tables to see if we can append to a known structure
    let tables: { value: any[] };
    try {
      tables = await client.request<{ value: any[] }>(`/me/drive/items/${fileId}/workbook/worksheets/Active/tables`);
    } catch (e) {
      // If listing tables fails, the workbook might not be initialized.
      tables = { value: [] };
    }
    
    let tableId = '';

    if (!tables.value || tables.value.length === 0) {
      // 2. Create a table if none exists
      // Note: This might fail if the file is truly 0-bytes and hasn't been opened yet.
      // The API requires a valid Excel structure to add a table.
      
      const newTable = await client.request<any>(`/me/drive/items/${fileId}/workbook/worksheets/Active/tables/add`, 'POST', {
        address: 'A1:C1', 
        hasHeaders: true
      });
      tableId = newTable.id;
    } else {
      tableId = tables.value[0].id;
    }

    // 3. Add Row to Table
    await client.request(`/me/drive/items/${fileId}/workbook/tables/${tableId}/rows`, 'POST', {
      values: [values] 
    });

  } catch (error: any) {
    console.error('Error appending to Excel:', error.message);
    throw new Error('Failed to update Excel file. Ensure the file is a valid .xlsx and not open elsewhere.');
  }
}