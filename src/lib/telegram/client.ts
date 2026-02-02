import 'isomorphic-fetch';
import { TelegramMessage, TelegramUpdate, TelegramUser } from '../types';

const BASE_URL = 'https://api.telegram.org/bot';

/* ===================== HELPER: API CALLER ===================== */
/**
 * Generic helper to make requests to the Telegram Bot API
 */
async function telegramRequest<T>(token: string, method: string, body?: any): Promise<T> {
  if (!token) throw new Error('Telegram Bot Token is missing.');

  const url = `${BASE_URL}${token}/${method}`;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body || {})
  });

  const data = await response.json();
  
  if (!data.ok) {
    throw new Error(`Telegram API Error: ${data.description}`);
  }
  
  return data.result as T;
}

/* ===================== CONNECT / VERIFY ===================== */
/**
 * Verify the token is valid by fetching the Bot's details.
 * Used when the user clicks "Connect" in the UI.
 */
export async function getMe(token: string): Promise<TelegramUser> {
  return await telegramRequest<TelegramUser>(token, 'getMe');
}

/* ===================== FETCH MESSAGES ===================== */
/**
 * Fetches recent messages sent to the bot.
 */
export async function getTelegramUpdates(token: string, limit: number = 5): Promise<TelegramMessage[]> {
  try {
    // allowed_updates=['message'] ensures we only get text messages, not typing status/etc.
    const updates = await telegramRequest<TelegramUpdate[]>(token, 'getUpdates', {
      limit: limit,
      allowed_updates: ['message']
    });

    // Extract the message objects from the updates and filter out non-text ones
    return updates
      .filter(u => u.message && u.message.text)
      .map(u => u.message as TelegramMessage)
      .reverse(); // Return newest first
  } catch (error) {
    console.error('Error fetching Telegram updates:', error);
    return [];
  }
}

/* ===================== SEND MESSAGE ===================== */
/**
 * Sends a text message to a specific Chat ID.
 */
export async function sendTelegramMessage(token: string, chatId: string | number, text: string): Promise<TelegramMessage> {
  return await telegramRequest<TelegramMessage>(token, 'sendMessage', {
    chat_id: chatId,
    text: text,
    parse_mode: 'Markdown' // Allows bold/italic text
  });
}

/* ===================== GROUP MANAGEMENT ===================== */
/**
 * Kicks a user from a group. Bot must be Admin.
 */
export async function kickChatMember(token: string, chatId: string | number, userId: number): Promise<boolean> {
  return await telegramRequest<boolean>(token, 'banChatMember', {
    chat_id: chatId,
    user_id: userId
  });
}

/**
 * Pins a specific message in a group. Bot must be Admin.
 */
export async function pinChatMessage(token: string, chatId: string | number, messageId: number): Promise<boolean> {
  return await telegramRequest<boolean>(token, 'pinChatMessage', {
    chat_id: chatId,
    message_id: messageId
  });
}

/**
 * Changes the title of a group. Bot must be Admin.
 */
export async function setChatTitle(token: string, chatId: string | number, title: string): Promise<boolean> {
  return await telegramRequest<boolean>(token, 'setChatTitle', {
    chat_id: chatId,
    title: title
  });
}