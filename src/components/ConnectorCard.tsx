import React, { useState } from 'react';
import styles from './ConnectorCard.module.css';

interface ConnectorCardProps {
  title: string;
  description: string;
  connected: boolean;
  onConnect: () => void;
  icon?: string;
  requiresInput?: boolean;
  // ✅ ADDED: Type to distinguish between services
  serviceType?: 'shopify' | 'telegram' | 'default';
  // ✅ UPDATED: Callback now accepts generic data
  onInputSubmit?: (data: any) => Promise<void>;
}

const ConnectorCard: React.FC<ConnectorCardProps> = ({
  title,
  description,
  connected,
  onConnect,
  icon,
  requiresInput,
  serviceType = 'default',
  onInputSubmit
}) => {
  const [showInput, setShowInput] = useState(false);
  const [loading, setLoading] = useState(false);

  // Shopify State
  const [storeUrl, setStoreUrl] = useState('');
  const [accessToken, setAccessToken] = useState('');

  // Telegram State
  const [botToken, setBotToken] = useState('');

  const handleConnect = () => {
    if (requiresInput && !connected) {
      setShowInput(true);
    } else {
      onConnect();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    if (onInputSubmit) {
      if (serviceType === 'shopify') {
        await onInputSubmit({ storeUrl, accessToken });
      } else if (serviceType === 'telegram') {
        await onInputSubmit({ botToken });
      }
    }
    
    setLoading(false);
    setShowInput(false);
  };

  return (
    <div className={`${styles.card} ${connected ? styles.connected : ''}`}>
      <div className={styles.header}>
        {icon && <div className={styles.icon}>{icon}</div>}
        <div className={styles.info}>
          <h3 className={styles.title}>{title}</h3>
          <p className={styles.description}>{description}</p>
        </div>
      </div>

      {!showInput ? (
        <button
          className={`${styles.button} ${connected ? styles.buttonConnected : ''}`}
          onClick={handleConnect}
          disabled={connected}
        >
          {connected ? '✓ Connected' : 'Connect'}
        </button>
      ) : (
        <form onSubmit={handleSubmit} className={styles.form}>
          
          {/* ✅ SHOPIFY INPUTS */}
          {serviceType === 'shopify' && (
            <>
              <input
                type="text"
                placeholder="Store URL (e.g., mystore.myshopify.com)"
                value={storeUrl}
                onChange={(e) => setStoreUrl(e.target.value)}
                className={styles.input}
                required
              />
              <input
                type="password"
                placeholder="Shopify Access Token"
                value={accessToken}
                onChange={(e) => setAccessToken(e.target.value)}
                className={styles.input}
                required
              />
            </>
          )}

          {/* ✅ TELEGRAM INPUTS */}
          {serviceType === 'telegram' && (
            <input
              type="password"
              placeholder="Telegram Bot Token (from @BotFather)"
              value={botToken}
              onChange={(e) => setBotToken(e.target.value)}
              className={styles.input}
              required
            />
          )}

          <div className={styles.formButtons}>
            <button
              type="button"
              onClick={() => setShowInput(false)}
              className={styles.cancelButton}
            >
              Cancel
            </button>
            <button
              type="submit"
              className={styles.submitButton}
              disabled={loading}
            >
              {loading ? 'Connecting...' : 'Submit'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
};

export default ConnectorCard;