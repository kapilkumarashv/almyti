export interface ShopifyConfig {
  apiKey: string;
  apiSecret: string;
  storeUrl: string;
  accessToken: string;
}

export function getShopifyConfig(): ShopifyConfig {
  return {
    apiKey: process.env.SHOPIFY_API_KEY || '',
    apiSecret: process.env.SHOPIFY_API_SECRET || '',
    storeUrl: process.env.SHOPIFY_STORE_URL || '',
    accessToken: process.env.SHOPIFY_ACCESS_TOKEN || '',
  };
}

export function validateShopifyConfig(config: ShopifyConfig): boolean {
  return !!(config.storeUrl && config.accessToken);
}
