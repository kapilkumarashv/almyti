'use client';

import React, { useEffect, useState } from 'react';
import styles from './Message.module.css';
import { 
  Message as MessageType, 
  GmailEmail, 
  DriveFile, 
  ShopifyOrder, 
  TeamsMessage, 
  TeamsChannel 
} from '@/lib/types';

interface MessageProps {
  message: MessageType;
}

/* ---------- TYPE GUARDS ---------- */
function isGmailEmailArray(data: unknown): data is GmailEmail[] {
  return Array.isArray(data) && data.length > 0 && 'snippet' in data[0];
}

function isDriveFileArray(data: unknown): data is DriveFile[] {
  return Array.isArray(data) && data.length > 0 && 'mimeType' in data[0];
}

function isShopifyOrderArray(data: unknown): data is ShopifyOrder[] {
  return Array.isArray(data) && data.length > 0 && 'order_number' in data[0];
}

function isTeamsMessageArray(data: unknown): data is TeamsMessage[] {
  return Array.isArray(data) && data.length > 0 && 'createdDateTime' in data[0] && 'from' in data[0];
}

function isTeamsChannelArray(data: unknown): data is TeamsChannel[] {
  return Array.isArray(data) && data.length > 0 && 'membershipType' in data[0] && 'displayName' in data[0];
}

/* ---------- COMPONENT ---------- */
const Message: React.FC<MessageProps> = ({ message }) => {
  const [time, setTime] = useState<string>('');

  // ✅ Fix hydration: render time only on client
  useEffect(() => {
    setTime(new Date(message.timestamp).toLocaleTimeString());
  }, [message.timestamp]);

  const renderData = () => {
    if (!message.data) return null;

    // Gmail emails
    if (isGmailEmailArray(message.data)) {
      return (
        <div className={styles.dataContainer}>
          {message.data.map((email) => (
            <div key={email.id} className={styles.dataItem}>
              <div className={styles.dataItemTitle}>{email.subject}</div>
              <div className={styles.dataItemMeta}>From: {email.from}</div>
              <div className={styles.dataItemSnippet}>{email.snippet}</div>
              <div className={styles.dataItemDate}>{email.date}</div>
            </div>
          ))}
        </div>
      );
    }

    // Drive files
    if (isDriveFileArray(message.data)) {
      return (
        <div className={styles.dataContainer}>
          {message.data.map((file) => (
            <div key={file.id} className={styles.dataItem}>
              <div className={styles.dataItemTitle}>{file.name}</div>
              <div className={styles.dataItemMeta}>Type: {file.mimeType}</div>
              <div className={styles.dataItemDate}>
                Modified: {new Date(file.modifiedTime).toLocaleString()}
              </div>
              {file.webViewLink && (
                <a
                  href={file.webViewLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.link}
                >
                  View File
                </a>
              )}
            </div>
          ))}
        </div>
      );
    }

    // Shopify orders
    if (isShopifyOrderArray(message.data)) {
      return (
        <div className={styles.dataContainer}>
          {message.data.map((order) => (
            <div key={order.id} className={styles.dataItem}>
              <div className={styles.dataItemTitle}>
                Order #{order.order_number}
              </div>
              <div className={styles.dataItemMeta}>
                Customer: {order.customer.first_name} {order.customer.last_name}
              </div>
              <div className={styles.dataItemMeta}>
                Total: ${order.total_price}
              </div>
              <div className={styles.dataItemMeta}>
                Status: {order.financial_status}
              </div>
              <div className={styles.dataItemDate}>
                {new Date(order.created_at).toLocaleString()}
              </div>
            </div>
          ))}
        </div>
      );
    }

    // Teams Messages
    if (isTeamsMessageArray(message.data)) {
      return (
        <div className={styles.dataContainer}>
          {message.data.map((msg) => (
            <div key={msg.id} className={styles.dataItem}>
              <div className={styles.dataItemTitle}>
                {msg.subject || 'Teams Message'}
              </div>
              <div className={styles.dataItemMeta}>
                From: {msg.from.displayName}
              </div>
              <div className={styles.dataItemSnippet}>{msg.body}</div>
              <div className={styles.dataItemDate}>
                {new Date(msg.createdDateTime).toLocaleString()}
              </div>
              {msg.webUrl && (
                <a 
                  href={msg.webUrl} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className={styles.link}
                >
                  View in Teams
                </a>
              )}
            </div>
          ))}
        </div>
      );
    }

    // Teams Channels
    if (isTeamsChannelArray(message.data)) {
      return (
        <div className={styles.dataContainer}>
          {message.data.map((channel) => (
            <div key={channel.id} className={styles.dataItem}>
              <div className={styles.dataItemTitle}>{channel.displayName}</div>
              <div className={styles.dataItemMeta}>
                Type: {channel.membershipType}
              </div>
              {channel.description && (
                <div className={styles.dataItemSnippet}>{channel.description}</div>
              )}
              <a 
                href={channel.webUrl} 
                target="_blank" 
                rel="noopener noreferrer" 
                className={styles.link}
              >
                Open Channel
              </a>
            </div>
          ))}
        </div>
      );
    }

    return null;
  };

  return (
    <div className={`${styles.message} ${styles[message.role]}`}>
      <div className={styles.messageContent}>
        <div className={styles.messageText}>{message.content}</div>
        {renderData()}
      </div>

      {/* ✅ Safe hydration */}
      <div className={styles.messageTime}>{time}</div>
    </div>
  );
};

export default Message;