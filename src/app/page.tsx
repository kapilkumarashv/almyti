'use client';

import { useState, useEffect } from 'react';
import ChatBox from '@/components/ChatBox';
import ConnectorCard from '@/components/ConnectorCard';
import styles from './page.module.css';
import { GoogleTokens, ShopifyCredentials, MicrosoftTokens } from '@/lib/types';

export default function Home() {
  const [googleTokens, setGoogleTokens] = useState<GoogleTokens | null>(null);
  const [shopifyConfig, setShopifyConfig] = useState<ShopifyCredentials | null>(null);
  const [microsoftTokens, setMicrosoftTokens] = useState<MicrosoftTokens | null>(null);
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState<string>('');

  useEffect(() => {
    // Check for OAuth callbacks in URL
    const urlParams = new URLSearchParams(window.location.search);
    const googleTokensParam = urlParams.get('google_tokens');
    const microsoftTokensParam = urlParams.get('microsoft_tokens');
    const error = urlParams.get('error');

    // Handle Google Tokens
    if (googleTokensParam) {
      try {
        const tokens = JSON.parse(decodeURIComponent(googleTokensParam)) as GoogleTokens;
        setGoogleTokens(tokens);
        showNotification('Google connected successfully!');
      } catch (err) {
        console.error('Error parsing Google tokens:', err);
        showNotification('Failed to connect Google');
      }
    }

    // Handle Microsoft Tokens
    if (microsoftTokensParam) {
      try {
        const tokens = JSON.parse(decodeURIComponent(microsoftTokensParam)) as MicrosoftTokens;
        setMicrosoftTokens(tokens);
        showNotification('Microsoft Teams connected successfully!');
      } catch (err) {
        console.error('Error parsing Microsoft tokens:', err);
        showNotification('Failed to connect Microsoft Teams');
      }
    }

    // Handle Errors
    if (error) {
      showNotification('Authentication failed');
    }

    // Clean URL if tokens or errors were present
    if (googleTokensParam || microsoftTokensParam || error) {
      window.history.replaceState({}, '', '/');
    }
  }, []);

  const showNotification = (message: string) => {
    setNotification(message);
    setTimeout(() => setNotification(''), 3000);
  };

  /* ----------------- HANDLERS ----------------- */

  const handleGoogleConnect = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/google/auth');
      const data = await response.json();
      window.location.href = data.url;
    } catch (error) {
      console.error('Error connecting Google:', error);
      showNotification('Failed to initiate Google connection');
      setLoading(false);
    }
  };

  const handleShopifyConnect = async (data: { storeUrl: string; accessToken: string }) => {
    setLoading(true);
    try {
      const response = await fetch('/api/shopify/connect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });

      const result = await response.json();
      
      if (response.ok && result.config) {
        setShopifyConfig(result.config);
        showNotification('Shopify connected successfully!');
      } else {
        showNotification(result.error || 'Failed to connect Shopify');
      }
    } catch (error) {
      console.error('Error connecting Shopify:', error);
      showNotification('Failed to connect Shopify');
    } finally {
      setLoading(false);
    }
  };

  const handleMicrosoftConnect = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/microsoft/auth');
      const data = await response.json();
      window.location.href = data.url;
    } catch (error) {
      console.error('Error connecting Microsoft:', error);
      showNotification('Failed to initiate Microsoft connection');
      setLoading(false);
    }
  };

  /* ----------------- RENDER ----------------- */

  return (
    <div className={styles.container}>
      {notification && (
        <div className={styles.notification}>
          {notification}
        </div>
      )}

      <header className={styles.header}>
        <h1 className={styles.title}>🤖 AI Agent Dashboard</h1>
        <p className={styles.subtitle}>Connect your services and let AI help you</p>
      </header>

      <div className={styles.content}>
        <aside className={styles.sidebar}>
          <h2 className={styles.sidebarTitle}>Connected Services</h2>
          <div className={styles.connectors}>
            
            {/* Google Card */}
            <ConnectorCard
              title="Google"
              description="Access Gmail, Drive, Docs & Sheets"
              icon="📧"
              connected={!!googleTokens}
              onConnect={handleGoogleConnect}
            />

            {/* Shopify Card */}
            <ConnectorCard
              title="Shopify"
              description="Manage your store and orders"
              icon="🛍️"
              connected={!!shopifyConfig}
              onConnect={() => {}}
              requiresInput={true}
              onInputSubmit={handleShopifyConnect}
            />

            {/* Microsoft Card */}
            <ConnectorCard
              title="Microsoft Teams"
              description="Access Teams messages and channels"
              icon="💬"
              connected={!!microsoftTokens}
              onConnect={handleMicrosoftConnect}
            />

          </div>
        </aside>

        <main className={styles.main}>
          <ChatBox 
            googleTokens={googleTokens}
            shopifyConfig={shopifyConfig}
            microsoftTokens={microsoftTokens}
          />
        </main>
      </div>
    </div>
  );
}