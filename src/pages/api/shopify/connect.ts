// pages/api/shopify/connect.ts
import { NextApiRequest, NextApiResponse } from "next";
import axios from "axios";

interface ShopifyConnectResponse {
  success?: boolean;
  message?: string;
  config?: { storeUrl: string; accessToken: string };
  error?: string;
  details?: any;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ShopifyConnectResponse>
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { storeUrl, accessToken } = req.body;

    // --- Basic validation ---
    if (!storeUrl || !accessToken) {
      return res.status(400).json({ error: "Missing store URL or access token" });
    }

    if (!storeUrl.endsWith(".myshopify.com")) {
      return res.status(400).json({ error: "Invalid store URL format" });
    }

    if (!accessToken.startsWith("shpat_")) {
      return res.status(400).json({
        error: "Invalid access token",
        details: "Use Shopify Admin API token (starts with shpat_)",
      });
    }

    // --- Real Shopify verification ---
    const url = `https://${storeUrl}/admin/api/2024-01/shop.json`;
    try {
      const response = await axios.get(url, {
        headers: {
          "X-Shopify-Access-Token": accessToken,
          "Content-Type": "application/json",
        },
      });

      return res.status(200).json({
        success: true,
        message: "Shopify connected successfully",
        config: { storeUrl, accessToken },
      });
    } catch (err: any) {
      console.error("Shopify API verification failed:", err.response?.status, err.response?.data);

      // Provide more informative errors
      let details = err.response?.data || err.message;
      let status = err.response?.status;

      if (status === 401) {
        details = "Unauthorized: token is invalid or missing required scopes.";
      } else if (status === 404) {
        details = "Shop not found: check store URL.";
      } else if (status === 403) {
        details = "Forbidden: token does not have sufficient permissions.";
      }

      return res.status(400).json({
        error: "Failed to connect Shopify",
        details,
      });
    }
  } catch (error: any) {
    console.error("Unexpected Shopify connect error:", error);
    return res.status(500).json({
      error: "Internal server error",
      details: error instanceof Error ? error.message : error,
    });
  }
}
