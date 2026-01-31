import { NextApiRequest, NextApiResponse } from 'next';
import { getLatestOrders } from '@/lib/shopify/api';
import { ShopifyOrder, ShopifyCredentials } from '@/lib/types';

interface OrdersRequestBody {
  storeUrl: string;
  accessToken: string;
}

interface OrdersResponse {
  orders?: ShopifyOrder[];
  error?: string;
  details?: string;
}

export default async function handler(
  req: NextApiRequest, 
  res: NextApiResponse<OrdersResponse>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { storeUrl, accessToken } = req.body as OrdersRequestBody;

    if (!storeUrl || !accessToken) {
      return res.status(400).json({ error: 'Missing Shopify credentials' });
    }

    const config = {
      apiKey: '',
      apiSecret: '',
      storeUrl,
      accessToken
    };

    const orders = await getLatestOrders(config, 10);

    res.status(200).json({ orders });
  } catch (error) {
    console.error('Error fetching orders:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ 
      error: 'Failed to fetch orders',
      details: errorMessage
    });
  }
}