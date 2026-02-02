import { google } from 'googleapis';
import { setCredentials } from './oauth';
import { KeepNote } from '../types';

/* ===================== HELPERS ===================== */

// Helper to extract plain text from Keep's complex body structure
function getTextBody(note: any): string {
  // Case 1: Standard text note
  if (note.body?.text?.text) {
    return note.body.text.text;
  }
  
  // Case 2: List note (Checkboxes)
  if (note.body?.list) {
    return note.body.list.listItems
      .map((item: any) => (item.checked ? '[x] ' : '[ ] ') + (item.text?.text || ''))
      .join('\n');
  }

  return '';
}

/* ===================== LIST NOTES ===================== */

export async function listKeepNotes(maxResults: number = 10): Promise<KeepNote[]> {
  const auth = await setCredentials();
  const keep = google.keep({ version: 'v1', auth });

  try {
    const res = await keep.notes.list({
      pageSize: maxResults,
      filter: 'trashed=false' // Exclude deleted notes
    });

    const notes = res.data.notes || [];

    return notes.map((note: any): KeepNote => ({
      id: note.name || '', // Keep API uses 'name' as the ID (e.g. "notes/12345")
      title: note.title || 'Untitled Note',
      textContent: getTextBody(note),
      // Construct a direct link to the note
      url: `https://keep.google.com/u/0/#NOTE/${note.name?.replace('notes/', '')}`
    }));

  } catch (error) {
    console.error('Error fetching Keep notes:', error);
    return [];
  }
}

/* ===================== CREATE NOTE ===================== */

export async function createKeepNote(title: string, content: string): Promise<KeepNote> {
  const auth = await setCredentials();
  const keep = google.keep({ version: 'v1', auth });

  try {
    const res = await keep.notes.create({
      requestBody: {
        title,
        body: {
          text: {
            text: content
          }
        }
      }
    });

    const note = res.data;

    return {
      id: note.name || '',
      title: note.title || title,
      textContent: getTextBody(note),
      url: `https://keep.google.com/u/0/#NOTE/${note.name?.replace('notes/', '')}`
    };

  } catch (error) {
    console.error('Error creating Keep note:', error);
    throw new Error('Failed to create note in Google Keep.');
  }
}