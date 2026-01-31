import { google } from 'googleapis';
import { setCredentials } from './oauth';
import { GMeetEvent } from '../types';

export interface GMeetOptions {
  subject?: string;
  body?: string;
  start?: string; // ISO datetime
  end?: string;   // ISO datetime
}

/* ===================== Utilities ===================== */

function isValidDate(value?: string): boolean {
  if (!value) return false;
  return !isNaN(new Date(value).getTime());
}

function toISO(date: Date): string {
  return date.toISOString();
}

/* ===================== Create Google Meet ===================== */
export async function createGMeet(options: GMeetOptions): Promise<GMeetEvent> {
  const { subject, body, start, end } = options;

  // ✅ SAFE START TIME
  const safeStart = isValidDate(start)
    ? new Date(start!)
    : new Date();

  // ✅ SAFE END TIME (default 30 min)
  let safeEnd = isValidDate(end)
    ? new Date(end!)
    : new Date(safeStart.getTime() + 30 * 60 * 1000);

  // 🛡️ Ensure end is AFTER start
  if (safeEnd <= safeStart) {
    safeEnd = new Date(safeStart.getTime() + 30 * 60 * 1000);
  }

  const auth = await setCredentials();
  const calendar = google.calendar({ version: 'v3', auth });

  const event = {
    summary: subject ?? 'Google Meet',
    description: body,
    start: { dateTime: toISO(safeStart) },
    end: { dateTime: toISO(safeEnd) },
    conferenceData: {
      createRequest: {
        requestId: `meet-${safeStart.getTime()}`, // 🛡️ stable & unique
      },
    },
  };

  const response = await calendar.events.insert({
    calendarId: 'primary',
    requestBody: event,
    conferenceDataVersion: 1,
  });

  const meetLink =
    response.data.conferenceData?.entryPoints?.find(
      (ep) => ep.entryPointType === 'video'
    )?.uri ?? '';

  return {
    eventId: response.data.id ?? undefined,
    meetLink,
    start: toISO(safeStart),
    end: toISO(safeEnd),
    summary: event.summary,
    description: body,
  };
}

/* ===================== Fetch Upcoming Events ===================== */
export async function fetchCalendarEvents(
  startDate?: string,
  endDate?: string
): Promise<GMeetEvent[]> {
  const auth = await setCredentials();
  const calendar = google.calendar({ version: 'v3', auth });

  const now = new Date();

  const start = isValidDate(startDate) ? new Date(startDate!) : now;
  const end = isValidDate(endDate)
    ? new Date(endDate!)
    : new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const response = await calendar.events.list({
    calendarId: 'primary',
    timeMin: toISO(start),
    timeMax: toISO(end),
    singleEvents: true,
    orderBy: 'startTime',
  });

  return (response.data.items ?? []).map((ev) => ({
    eventId: ev.id ?? undefined,
    summary: ev.summary ?? undefined,
    start: ev.start?.dateTime ?? '',
    end: ev.end?.dateTime ?? '',
    meetLink:
      ev.conferenceData?.entryPoints?.find(
        (ep) => ep.entryPointType === 'video'
      )?.uri ?? '',
    description: ev.description ?? undefined,
  }));
}

/* ===================== Delete / Cancel Event ===================== */
export async function deleteCalendarEvent(eventId: string): Promise<string> {
  if (!eventId) throw new Error('Missing eventId');

  const auth = await setCredentials();
  const calendar = google.calendar({ version: 'v3', auth });

  await calendar.events.delete({
    calendarId: 'primary',
    eventId,
  });

  return 'Event deleted successfully.';
}

/* ===================== Update / Reschedule Event ===================== */
export async function updateCalendarEvent(
  eventId: string,
  newStart: string,
  newEnd?: string
): Promise<GMeetEvent> {
  if (!eventId) throw new Error('Missing eventId');
  if (!isValidDate(newStart)) throw new Error('Invalid start time');

  const safeStart = new Date(newStart);

  let safeEnd = isValidDate(newEnd)
    ? new Date(newEnd!)
    : new Date(safeStart.getTime() + 30 * 60 * 1000);

  // 🛡️ End must be after start
  if (safeEnd <= safeStart) {
    safeEnd = new Date(safeStart.getTime() + 30 * 60 * 1000);
  }

  const auth = await setCredentials();
  const calendar = google.calendar({ version: 'v3', auth });

  const updatedEvent = await calendar.events.patch({
    calendarId: 'primary',
    eventId,
    requestBody: {
      start: { dateTime: toISO(safeStart) },
      end: { dateTime: toISO(safeEnd) },
    },
  });

  const meetLink =
    updatedEvent.data.conferenceData?.entryPoints?.find(
      (ep) => ep.entryPointType === 'video'
    )?.uri ?? '';

  return {
    eventId: updatedEvent.data.id ?? undefined,
    summary: updatedEvent.data.summary ?? undefined,
    start: updatedEvent.data.start?.dateTime ?? toISO(safeStart),
    end: updatedEvent.data.end?.dateTime ?? toISO(safeEnd),
    description: updatedEvent.data.description ?? undefined,
    meetLink,
  };
}
