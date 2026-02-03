import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { GoogleForm, FormResponse } from '../types';

/* ===================== CREATE FORM ===================== */
export async function createForm(
  auth: OAuth2Client,
  title: string
): Promise<GoogleForm> {
  const forms = google.forms({ version: 'v1', auth });

  try {
    const response = await forms.forms.create({
      requestBody: {
        info: {
          title: title,
          documentTitle: title
        }
      }
    });

    const data = response.data;
    
    return {
    formId: data.formId || '',
    title: data.info?.title || 'Untitled Form',
    documentTitle: data.info?.documentTitle || 'Untitled Form',
    responderUri: data.responderUri || '',
    revisionId: data.revisionId || '',
    formUri: `https://docs.google.com/forms/d/${data.formId}/edit` // ✅ Added this line
  };
  } catch (error) {
    console.error('Error creating Google Form:', error);
    throw new Error('Failed to create Google Form.');
  }
}

/* ===================== GET FORM RESPONSES ===================== */
export async function getFormResponses(
  auth: OAuth2Client,
  formId: string
): Promise<FormResponse[]> {
  const forms = google.forms({ version: 'v1', auth });

  try {
    const response = await forms.forms.responses.list({
      formId: formId
    });

    const responses = response.data.responses || [];

    return responses.map((resp) => ({
      responseId: resp.responseId || '',
      createTime: resp.createTime || '',
      lastSubmittedTime: resp.lastSubmittedTime || '',
      respondentEmail: resp.respondentEmail || undefined,
      answers: Object.entries(resp.answers || {}).map(([questionId, answer]) => ({
        questionId: questionId,
        textAnswers: answer.textAnswers?.answers?.map(a => a.value || '') || []
      }))
    }));

  } catch (error) {
    console.error('Error fetching form responses:', error);
    throw new Error('Failed to fetch form responses. Check if the Form ID is correct.');
  }
}