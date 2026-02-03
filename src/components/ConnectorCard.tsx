import React, { useState } from 'react';
import styles from './ConnectorCard.module.css';

interface ConnectorCardProps {
  title: string;
  description: string;
  connected: boolean;
  onConnect: () => void;
  icon?: string;
  requiresInput?: boolean;
  serviceType?: 'shopify' | 'telegram' | 'default';
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
        <div className={styles.info} style={{ minWidth: 0 }}> {/* minWidth: 0 allows flex children to shrink/wrap */}
          <h3 
            className={styles.title} 
            style={{ 
              whiteSpace: 'normal', 
              wordWrap: 'break-word', 
              overflowWrap: 'anywhere',
              lineHeight: '1.2' 
            }}
          >
            {title}
          </h3>
          <p 
            className={styles.description} 
            style={{ 
              whiteSpace: 'normal', 
              wordWrap: 'break-word', 
              overflowWrap: 'anywhere',
              fontSize: '0.85rem',
              lineHeight: '1.4',
              marginTop: '4px'
            }}
          >
            {description}
          </p>
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
          
          {/* SHOPIFY INPUTS */}
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

          {/* TELEGRAM INPUTS */}
          {serviceType === 'telegram' && (
            <input
              type="password"
              placeholder="Telegram Bot Token"
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