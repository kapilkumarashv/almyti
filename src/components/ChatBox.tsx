import React, { useState, useRef, useEffect } from 'react';
import styles from './ChatBox.module.css';
import Message from './Message';
import { Message as MessageType, GoogleTokens, ShopifyCredentials, MicrosoftTokens } from '@/lib/types';

interface ChatBoxProps {
  googleTokens: GoogleTokens | null;
  shopifyConfig: ShopifyCredentials | null;
  microsoftTokens: MicrosoftTokens | null;
  // ✅ ADDED: Accept token as prop
  telegramToken: string | null;
}

const ChatBox: React.FC<ChatBoxProps> = ({ 
  googleTokens, 
  shopifyConfig, 
  microsoftTokens, 
  telegramToken // ✅ Destructure it here
}) => {
  const [messages, setMessages] = useState<MessageType[]>([
    {
      id: '1',
      role: 'assistant',
      content: 'Hello! I\'m your AI assistant. I can help you with:\n- Show my latest emails (Gmail/Outlook)\n- Fetch Drive & OneDrive files\n- Get Shopify orders\n- Manage Telegram Groups & Messages\n- Show Teams messages\n\nWhat would you like to do?',
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMessage: MessageType = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      // ❌ REMOVED: const telegramToken = localStorage.getItem(...)
      // We now use the `telegramToken` prop passed from the parent.

      const response = await fetch('/api/agent/query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          query: input,
          googleTokens,
          shopifyConfig,
          microsoftTokens,
          telegramToken // ✅ Pass the prop value
        })
      });

      const data = await response.json();

      const assistantMessage: MessageType = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.message || 'I received your request.',
        timestamp: new Date(),
        data: data.data
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage: MessageType = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Sorry, I encountered an error processing your request. Please make sure the required service is connected.',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className={styles.chatBox}>
      <div className={styles.messagesContainer}>
        {messages.map(message => (
          <Message key={message.id} message={message} />
        ))}
        {loading && (
          <div className={styles.loadingIndicator}>
            <div className={styles.loadingDot}></div>
            <div className={styles.loadingDot}></div>
            <div className={styles.loadingDot}></div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className={styles.inputContainer}>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Ask me anything..."
          className={styles.input}
          disabled={loading}
        />
        <button
          onClick={handleSend}
          disabled={!input.trim() || loading}
          className={styles.sendButton}
        >
          Send
        </button>
      </div>
    </div>
  );
};

export default ChatBox;