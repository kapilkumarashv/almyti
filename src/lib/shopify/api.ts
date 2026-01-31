import axios from 'axios';
import { ShopifyOrder } from '../types';
import { ShopifyConfig as AuthShopifyConfig } from './auth'; // optional: if using auth.ts for types

/* -------------------- ShopifyConfig -------------------- */
export interface ShopifyConfig {
  apiKey: string;
  apiSecret: string;
  storeUrl: string;
  accessToken: string;
}

/* -------------------- Date Filter -------------------- */
export interface ShopifyDateFilter {
  created_at_min?: string; // ISO string
  created_at_max?: string; // ISO string
}

/* -------------------- Get Latest Orders -------------------- */
export async function getLatestOrders(
  config: ShopifyConfig,
  limit: number = 10,
  dateFilter?: ShopifyDateFilter
): Promise<ShopifyOrder[]> {
  // Shopify max limit per request is 250
  limit = Math.min(limit, 250);

  const url = `https://${config.storeUrl}/admin/api/2024-01/orders.json`;

  try {
    const params: any = {
      limit,
      status: 'any',
      order: 'created_at desc',
      ...dateFilter, // optional date filter
    };

    const response = await axios.get(url, {
      headers: {
        'X-Shopify-Access-Token': config.accessToken,
        'Content-Type': 'application/json',
      },
      params,
    });

    return Array.isArray(response.data.orders) ? response.data.orders : [];
  } catch (err: any) {
    console.error('Shopify API error (getLatestOrders):', err.response?.data || err.message);
    throw new Error('Failed to fetch Shopify orders. Check your store URL and access token.');
  }
}

/* -------------------- Get Order Count -------------------- */
export async function getOrderCount(config: ShopifyConfig): Promise<number> {
  const url = `https://${config.storeUrl}/admin/api/2024-01/orders/count.json`;

  try {
    const response = await axios.get(url, {
      headers: {
        'X-Shopify-Access-Token': config.accessToken,
        'Content-Type': 'application/json',
      },
    });

    return typeof response.data.count === 'number' ? response.data.count : 0;
  } catch (err: any) {
    console.error('Shopify API error (getOrderCount):', err.response?.data || err.message);
    throw new Error('Failed to fetch Shopify order count. Check your store URL and access token.');
  }
}

/* -------------------- Check Connection -------------------- */
export async function testShopifyConnection(config: ShopifyConfig): Promise<boolean> {
  try {
    await getOrderCount(config); // simple test call
    return true;
  } catch {
    return false;
  }
}
