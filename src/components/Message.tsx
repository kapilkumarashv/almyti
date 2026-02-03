'use client';

import React, { useEffect, useState } from 'react';
import styles from './Message.module.css';
import { 
  Message as MessageType, 
  GmailEmail, 
  DriveFile, 
  ShopifyOrder, 
  TeamsMessage, 
  TeamsChannel,
  TelegramMessage,
  OutlookEmail,
  OneDriveFile,
  KeepNote,
  ClassroomCourse,
  ClassroomAssignment,
  ClassroomStudent,
  SheetRow,
  // ✅ NEW IMPORTS
  YouTubeVideo,
  YouTubeChannel,
  GoogleForm,
  FormResponse
} from '@/lib/types';

interface MessageProps {
  message: MessageType;
}

/* =================================================================================
   TYPE GUARDS (Check what kind of data we received)
   ================================================================================= */

function isGmailEmailArray(data: unknown): data is GmailEmail[] {
  return Array.isArray(data) && data.length > 0 && 'snippet' in data[0] && 'threadId' in data[0];
}

function isDriveFileArray(data: unknown): data is DriveFile[] {
  return Array.isArray(data) && data.length > 0 && 'mimeType' in data[0] && 'webViewLink' in data[0];
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

function isTelegramMessageArray(data: unknown): data is TelegramMessage[] {
  return Array.isArray(data) && data.length > 0 && 'message_id' in data[0] && 'chat' in data[0];
}

function isOutlookEmailArray(data: unknown): data is OutlookEmail[] {
  return Array.isArray(data) && data.length > 0 && 'bodyPreview' in data[0] && 'receivedDateTime' in data[0];
}

function isOneDriveFileArray(data: unknown): data is OneDriveFile[] {
  return Array.isArray(data) && data.length > 0 && 'webUrl' in data[0] && 'createdDateTime' in data[0];
}

function isKeepNoteArray(data: unknown): data is KeepNote[] {
  return Array.isArray(data) && data.length > 0 && 'textContent' in data[0] && 'title' in data[0];
}

function isClassroomCourseArray(data: unknown): data is ClassroomCourse[] {
  return Array.isArray(data) && data.length > 0 && 'enrollmentCode' in data[0];
}

function isClassroomAssignmentArray(data: unknown): data is ClassroomAssignment[] {
  return Array.isArray(data) && data.length > 0 && 'courseId' in data[0] && 'dueDate' in data[0];
}

function isClassroomStudentArray(data: unknown): data is ClassroomStudent[] {
  return Array.isArray(data) && data.length > 0 && 'profile' in data[0] && 'userId' in data[0];
}

function isSheetRowArray(data: unknown): data is SheetRow[] {
  // Checks for Excel/Google Sheet rows
  return Array.isArray(data) && data.length > 0 && 'values' in data[0];
}

/* --- ✅ NEW TYPE GUARDS --- */

function isYouTubeVideoArray(data: unknown): data is YouTubeVideo[] {
  return Array.isArray(data) && data.length > 0 && 'videoUrl' in data[0] && 'thumbnailUrl' in data[0];
}

function isYouTubeChannelArray(data: unknown): data is YouTubeChannel[] {
  return Array.isArray(data) && data.length > 0 && 'subscriberCount' in data[0] && 'viewCount' in data[0];
}

function isGoogleFormArray(data: unknown): data is GoogleForm[] {
  return Array.isArray(data) && data.length > 0 && 'responderUri' in data[0] && 'formId' in data[0];
}

function isFormResponseArray(data: unknown): data is FormResponse[] {
  return Array.isArray(data) && data.length > 0 && 'responseId' in data[0] && 'answers' in data[0];
}

/* =================================================================================
   COMPONENT
   ================================================================================= */

const Message: React.FC<MessageProps> = ({ message }) => {
  const [time, setTime] = useState<string>('');

  useEffect(() => {
    setTime(new Date(message.timestamp).toLocaleTimeString());
  }, [message.timestamp]);

  const renderData = () => {
    if (!message.data) return null;

    /* ---------------- GOOGLE INTEGRATIONS ---------------- */

    // Gmail
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

    // Drive
    if (isDriveFileArray(message.data)) {
      return (
        <div className={styles.dataContainer}>
          {message.data.map((file) => (
            <div key={file.id} className={styles.dataItem}>
              <div className={styles.dataItemTitle}>{file.name}</div>
              <div className={styles.dataItemMeta}>Type: {file.mimeType}</div>
              {file.webViewLink && (
                <a href={file.webViewLink} target="_blank" rel="noopener noreferrer" className={styles.link}>
                  Open in Drive
                </a>
              )}
            </div>
          ))}
        </div>
      );
    }

    // Google Keep
    if (isKeepNoteArray(message.data)) {
      return (
        <div className={styles.dataContainer}>
          {message.data.map((note) => (
            <div key={note.id} className={styles.dataItem} style={{ borderLeft: '4px solid #fbbc04' }}>
              <div className={styles.dataItemTitle}>{note.title || '(No Title)'}</div>
              <div className={styles.dataItemSnippet} style={{ whiteSpace: 'pre-wrap' }}>
                {note.textContent}
              </div>
              {note.url && (
                <a href={note.url} target="_blank" rel="noopener noreferrer" className={styles.link}>Open Note</a>
              )}
            </div>
          ))}
        </div>
      );
    }

    // Classroom Courses
    if (isClassroomCourseArray(message.data)) {
      return (
        <div className={styles.dataContainer}>
          {message.data.map((course) => (
            <div key={course.id} className={styles.dataItem}>
              <div className={styles.dataItemTitle}>{course.name}</div>
              <div className={styles.dataItemMeta}>Section: {course.section || 'N/A'}</div>
              <div className={styles.dataItemMeta}>Code: <strong>{course.enrollmentCode}</strong></div>
              {course.alternateLink && (
                <a href={course.alternateLink} target="_blank" rel="noopener noreferrer" className={styles.link}>Go to Class</a>
              )}
            </div>
          ))}
        </div>
      );
    }

    // Classroom Assignments
    if (isClassroomAssignmentArray(message.data)) {
      return (
        <div className={styles.dataContainer}>
          {message.data.map((hw) => (
            <div key={hw.id} className={styles.dataItem}>
              <div className={styles.dataItemTitle}>{hw.title}</div>
              <div className={styles.dataItemMeta}>
                Due: {hw.dueDate ? `${hw.dueDate.day}/${hw.dueDate.month}/${hw.dueDate.year}` : 'No due date'}
              </div>
              {hw.alternateLink && (
                <a href={hw.alternateLink} target="_blank" rel="noopener noreferrer" className={styles.link}>View Assignment</a>
              )}
            </div>
          ))}
        </div>
      );
    }

    /* ---------------- MICROSOFT INTEGRATIONS ---------------- */

    // Outlook Emails
    if (isOutlookEmailArray(message.data)) {
      return (
        <div className={styles.dataContainer}>
          {message.data.map((email) => (
            <div key={email.id} className={styles.dataItem}>
              <div className={styles.dataItemTitle}>{email.subject}</div>
              <div className={styles.dataItemMeta}>From: {email.sender.emailAddress.name}</div>
              <div className={styles.dataItemSnippet}>{email.bodyPreview}</div>
              <div className={styles.dataItemDate}>
                {new Date(email.receivedDateTime).toLocaleString()}
              </div>
              {email.webLink && (
                <a href={email.webLink} target="_blank" rel="noopener noreferrer" className={styles.link}>Open in Outlook</a>
              )}
            </div>
          ))}
        </div>
      );
    }

    // OneDrive Files
    if (isOneDriveFileArray(message.data)) {
      return (
        <div className={styles.dataContainer}>
          {message.data.map((file) => (
            <div key={file.id} className={styles.dataItem}>
              <div className={styles.dataItemTitle}>{file.name}</div>
              <div className={styles.dataItemMeta}>Size: {(file.size / 1024).toFixed(1)} KB</div>
              <div className={styles.dataItemDate}>
                Modified: {new Date(file.lastModifiedDateTime).toLocaleString()}
              </div>
              {file.webUrl && (
                <a href={file.webUrl} target="_blank" rel="noopener noreferrer" className={styles.link}>Open in OneDrive</a>
              )}
            </div>
          ))}
        </div>
      );
    }

    // Excel & Sheets Data (Rows)
    if (isSheetRowArray(message.data)) {
      return (
        <div className={styles.dataContainer}>
          <div className={styles.dataItem} style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <tbody>
                {message.data.map((row, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #eee' }}>
                    {row.values.map((cell, j) => (
                      <td key={j} style={{ padding: '6px', borderRight: '1px solid #eee' }}>
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      );
    }

    // Teams Messages
    if (isTeamsMessageArray(message.data)) {
      return (
        <div className={styles.dataContainer}>
          {message.data.map((msg) => (
            <div key={msg.id} className={styles.dataItem}>
              <div className={styles.dataItemTitle}>{msg.subject || 'Teams Message'}</div>
              <div className={styles.dataItemMeta}>From: {msg.from.displayName}</div>
              <div className={styles.dataItemSnippet}>{msg.body}</div>
              <a href={msg.webUrl} target="_blank" rel="noopener noreferrer" className={styles.link}>View in Teams</a>
            </div>
          ))}
        </div>
      );
    }

    /* ---------------- OTHER INTEGRATIONS ---------------- */

    // Shopify
    if (isShopifyOrderArray(message.data)) {
      return (
        <div className={styles.dataContainer}>
          {message.data.map((order) => (
            <div key={order.id} className={styles.dataItem}>
              <div className={styles.dataItemTitle}>Order #{order.order_number}</div>
              <div className={styles.dataItemMeta}>Total: ${order.total_price}</div>
              <div className={styles.dataItemMeta}>Status: {order.financial_status}</div>
            </div>
          ))}
        </div>
      );
    }

    // Telegram
    if (isTelegramMessageArray(message.data)) {
      return (
        <div className={styles.dataContainer}>
          {message.data.map((msg) => (
            <div key={msg.message_id} className={styles.dataItem}>
              <div className={styles.dataItemTitle}>
                {msg.chat.title || msg.chat.username || 'Private Chat'}
              </div>
              <div className={styles.dataItemMeta}>
                From: {msg.from?.first_name}
              </div>
              <div className={styles.dataItemSnippet}>{msg.text}</div>
              <div className={styles.dataItemDate}>
                {new Date(msg.date * 1000).toLocaleString()}
              </div>
            </div>
          ))}
        </div>
      );
    }

    /* ---------------- ✅ YOUTUBE INTEGRATION ---------------- */

    // YouTube Videos
    if (isYouTubeVideoArray(message.data)) {
      return (
        <div className={styles.dataContainer}>
          {message.data.map((video) => (
            <div key={video.id} className={styles.dataItem}>
              <img 
                src={video.thumbnailUrl} 
                alt={video.title} 
                style={{ width: '100%', borderRadius: '8px', marginBottom: '8px' }} 
              />
              <div className={styles.dataItemTitle}>{video.title}</div>
              <div className={styles.dataItemMeta}>{video.channelTitle} • {new Date(video.publishTime).toLocaleDateString()}</div>
              <a href={video.videoUrl} target="_blank" rel="noopener noreferrer" className={styles.link}>
                Watch Video
              </a>
            </div>
          ))}
        </div>
      );
    }

    // YouTube Channels
    if (isYouTubeChannelArray(message.data)) {
      return (
        <div className={styles.dataContainer}>
          {message.data.map((channel) => (
            <div key={channel.id} className={styles.dataItem} style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <img 
                src={channel.thumbnailUrl} 
                alt={channel.title} 
                style={{ width: '50px', height: '50px', borderRadius: '50%' }} 
              />
              <div>
                <div className={styles.dataItemTitle}>{channel.title}</div>
                <div className={styles.dataItemMeta}>
                  👥 {parseInt(channel.subscriberCount).toLocaleString()} Subs • 👁 {parseInt(channel.viewCount).toLocaleString()} Views
                </div>
              </div>
            </div>
          ))}
        </div>
      );
    }

    /* ---------------- ✅ GOOGLE FORMS INTEGRATION ---------------- */

    // Google Forms (Created Form)
/* src/components/Message.tsx */

// Find the "Google Forms (Created Form)" block and replace it with this:

    if (isGoogleFormArray(message.data)) {
      return (
        <div className={styles.dataContainer}>
          {message.data.map((form) => (
            <div key={form.formId} className={styles.dataItem} style={{ borderLeft: '4px solid #7248B9' }}>
              {/* ✅ FIX: Changed form.info.title to form.title */}
              <div className={styles.dataItemTitle}>{form.title}</div>
              <div className={styles.dataItemMeta}>ID: {form.formId}</div>
              <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
                <a href={form.responderUri} target="_blank" rel="noopener noreferrer" className={styles.link}>
                  Fill Form
                </a>
                {form.formUri && (
                  <a href={form.formUri} target="_blank" rel="noopener noreferrer" className={styles.link}>
                    Edit Form
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      );
    }

    // Form Responses
    if (isFormResponseArray(message.data)) {
      return (
        <div className={styles.dataContainer}>
           <div className={styles.dataItem}>
             <div className={styles.dataItemTitle}>Form Responses ({message.data.length})</div>
             <ul style={{ paddingLeft: '20px', fontSize: '0.9rem', color: '#666' }}>
               {message.data.map((resp, i) => (
                 <li key={resp.responseId} style={{ marginBottom: '8px' }}>
                   <strong>Submission {i + 1}</strong> ({new Date(resp.lastSubmittedTime).toLocaleDateString()})
                   <br />
                   {resp.respondentEmail && <span>By: {resp.respondentEmail}</span>}
                 </li>
               ))}
             </ul>
           </div>
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
      <div className={styles.messageTime}>{time}</div>
    </div>
  );
};

export default Message;