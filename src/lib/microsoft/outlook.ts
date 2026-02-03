import { GraphClient } from './graphClient';
import { OutlookEmail, OutlookEvent } from '../types';

/* ===================== OUTLOOK MAIL ===================== */

export async function getOutlookEmails(accessToken: string, limit: number = 10, search?: string): Promise<OutlookEmail[]> {
  const client = new GraphClient(accessToken);
  
  // Basic filtering
  let endpoint = '/me/messages?$select=id,subject,bodyPreview,sender,receivedDateTime,webLink&$top=' + limit;
  
  if (search) {
    // Note: $search cannot be combined with some other OData params easily in basic tier,
    // but works for simple queries.
    endpoint += `&$search="${search}"`;
  }

  try {
    const data = await client.request<{ value: any[] }>(endpoint);
    return data.value.map(email => ({
      id: email.id,
      subject: email.subject || 'No Subject',
      bodyPreview: email.bodyPreview || '',
      sender: {
        emailAddress: {
          name: email.sender?.emailAddress?.name || 'Unknown',
          address: email.sender?.emailAddress?.address || '',
        }
      },
      toRecipients: (email.toRecipients || []).map((r: any) => ({
        emailAddress: {
          name: r.emailAddress?.name,
          address: r.emailAddress?.address
        }
      })),
      receivedDateTime: email.receivedDateTime,
      webLink: email.webLink
    }));
  } catch (error) {
    console.error('Error fetching Outlook emails:', error);
    return [];
  }
}

export async function sendOutlookEmail(accessToken: string, to: string, subject: string, body: string): Promise<void> {
  const client = new GraphClient(accessToken);
  
  const emailData = {
    message: {
      subject: subject,
      body: {
        contentType: 'Text',
        content: body
      },
      toRecipients: [
        {
          emailAddress: {
            address: to
          }
        }
      ]
    },
    saveToSentItems: 'true'
  };

  await client.request('/me/sendMail', 'POST', emailData);
}

/* ===================== OUTLOOK CALENDAR ===================== */

export async function getOutlookEvents(accessToken: string, limit: number = 5): Promise<OutlookEvent[]> {
  const client = new GraphClient(accessToken);
  // Sort by start time
  const endpoint = `/me/events?$select=id,subject,start,end,location,webLink&$orderby=start/dateTime desc&$top=${limit}`;
  
  try {
    const data = await client.request<{ value: any[] }>(endpoint);
    return data.value.map(evt => ({
      id: evt.id,
      subject: evt.subject || 'No Subject',
      body: { contentType: 'text', content: evt.bodyPreview || '' },
      start: evt.start,
      end: evt.end,
      location: evt.location || { displayName: '' },
      webLink: evt.webLink
    }));
  } catch (error) {
    console.error('Error fetching Outlook events:', error);
    return [];
  }
}

// ✅ UPDATED: Now accepts 'timeZone' to ensure events appear at the correct local time
export async function createOutlookEvent(
  accessToken: string, 
  subject: string, 
  startDateTime: string, // Format: "YYYY-MM-DDTHH:MM:ss" (No 'Z')
  endDateTime: string,   // Format: "YYYY-MM-DDTHH:MM:ss" (No 'Z')
  timeZone: string = 'India Standard Time' // ✅ Default to IST
): Promise<OutlookEvent> {
  const client = new GraphClient(accessToken);

  const eventData = {
    subject: subject,
    start: {
      dateTime: startDateTime,
      timeZone: timeZone // Use local time
    },
    end: {
      dateTime: endDateTime,
      timeZone: timeZone // Use local time
    }
  };

  const res = await client.request<any>('/me/events', 'POST', eventData);
  
  return {
    id: res.id,
    subject: res.subject,
    body: { contentType: 'text', content: '' },
    start: res.start,
    end: res.end,
    location: res.location,
    webLink: res.webLink
  };
}

export async function deleteOutlookEvent(accessToken: string, eventId: string): Promise<void> {
  const client = new GraphClient(accessToken);
  await client.request(`/me/events/${eventId}`, 'DELETE');
}