/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  env: {
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
    SHOPIFY_API_KEY: process.env.SHOPIFY_API_KEY,
    SHOPIFY_API_SECRET: process.env.SHOPIFY_API_SECRET,
    SHOPIFY_STORE_URL: process.env.SHOPIFY_STORE_URL,
    NEXTAUTH_URL: process.env.NEXTAUTH_URL || 'http://localhost:3000',
    ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
    MICROSOFT_CLIENT_ID: process.env.MICROSOFT_CLIENT_ID,
    MICROSOFT_CLIENT_SECRET: process.env.MICROSOFT_CLIENT_SECRET,
    MICROSOFT_REDIRECT_URI: process.env.MICROSOFT_REDIRECT_URI,
    MICROSOFT_TENANT_ID: process.env.MICROSOFT_TENANT_ID
  }
}

module.exports = nextConfig