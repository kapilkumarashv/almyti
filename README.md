# AI Agent Fullstack Project

A complete Next.js fullstack application that connects to Google (Gmail, Drive) and Shopify APIs through an AI-powered chat interface.

## Features

- 🤖 **AI-Powered Chat Interface** - Natural language understanding with Claude AI
- 📧 **Gmail Integration** - Fetch and display latest emails with AI summaries
- 📁 **Google Drive Integration** - Browse recent files with intelligent responses
- 🛍️ **Shopify Integration** - View latest orders with AI-generated insights
- 🔐 **OAuth Authentication** - Secure Google OAuth flow
- 💅 **Modern UI** - Clean, responsive design with CSS modules
- ⚡ **Real-time Updates** - Live data fetching from APIs
- 🧠 **Smart Intent Detection** - AI understands complex queries like "show me emails from last week about invoices"

## Tech Stack

- **Frontend**: Next.js 14, React 18, TypeScript
- **Backend**: Next.js API Routes
- **APIs**: Google APIs (Gmail, Drive), Shopify Admin API
- **Styling**: CSS Modules (no Tailwind)
- **Authentication**: Google OAuth 2.0

## Prerequisites

Before running this project, you need to obtain:

### 1. Google OAuth Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable Gmail API and Google Drive API
4. Go to "Credentials" → "Create Credentials" → "OAuth client ID"
5. Application type: "Web application"
6. Authorized redirect URIs: `http://localhost:3000/api/google/callback`
7. Save your Client ID and Client Secret

### 2. Shopify Credentials

1. Go to your Shopify Admin panel
2. Navigate to Apps → "Develop apps"
3. Create a new app
4. Configure Admin API scopes: `read_orders`, `read_products`
5. Install the app to your store
6. Save your API Key, API Secret, and Access Token
7. Note your store URL (e.g., `yourstore.myshopify.com`)

### 3. AI API Key (Anthropic Claude)

1. Go to [Anthropic Console](https://console.anthropic.com/)
2. Create an account or sign in
3. Navigate to "API Keys"
4. Create a new API key
5. Copy the key (starts with `sk-ant-api03-...`)

**Alternative**: You can use OpenAI instead by modifying `src/lib/ai/client.ts`

## Installation

1. **Clone the repository**
```bash
git clone <your-repo-url>
cd ai-agent-fullstack
```

2. **Install dependencies**
```bash
npm install
```

3. **Set up environment variables**

Create a `.env.local` file in the root directory:

```bash
# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id_here
GOOGLE_CLIENT_SECRET=your_google_client_secret_here
GOOGLE_REDIRECT_URI=http://localhost:3000/api/google/callback

# Shopify (Optional - can be added via UI)
SHOPIFY_API_KEY=your_shopify_api_key
SHOPIFY_API_SECRET=your_shopify_api_secret
SHOPIFY_STORE_URL=yourstore.myshopify.com
SHOPIFY_ACCESS_TOKEN=your_access_token

# App
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=generate_a_random_secret_key

# AI API Key (Get from https://console.anthropic.com/)
ANTHROPIC_API_KEY=sk-ant-api03-your-key-here
```

4. **Run the development server**
```bash
npm run dev
```

5. **Open your browser**
Navigate to [http://localhost:3000](http://localhost:3000)

## Project Structure

```
ai-agent-fullstack/
├── src/
│   ├── app/
│   │   ├── layout.tsx          # Root layout
│   │   ├── page.tsx            # Main page
│   │   ├── page.module.css     # Page styles
│   │   └── globals.css         # Global styles
│   ├── components/
│   │   ├── ChatBox.tsx         # Chat interface
│   │   ├── ChatBox.module.css
│   │   ├── Message.tsx         # Message component
│   │   ├── Message.module.css
│   │   ├── ConnectorCard.tsx   # Service connector
│   │   └── ConnectorCard.module.css
│   ├── lib/
│   │   ├── google/
│   │   │   ├── oauth.ts        # Google OAuth logic
│   │   │   ├── gmail.ts        # Gmail API
│   │   │   └── drive.ts        # Drive API
│   │   ├── shopify/
│   │   │   ├── auth.ts         # Shopify auth
│   │   │   └── api.ts          # Shopify API
│   │   ├── agent/
│   │   │   └── processor.ts    # Query processor
│   │   └── types/
│   │       └── index.ts        # TypeScript types
│   └── pages/
│       └── api/
│           ├── google/
│           │   ├── auth.ts     # Initiate OAuth
│           │   ├── callback.ts # OAuth callback
│           │   ├── emails.ts   # Fetch emails
│           │   └── files.ts    # Fetch files
│           ├── shopify/
│           │   ├── connect.ts  # Connect Shopify
│           │   └── orders.ts   # Fetch orders
│           └── agent/
│               └── query.ts    # Process queries
├── package.json
├── tsconfig.json
├── next.config.js
└── README.md
```

## Usage

### Connecting Services

1. **Google Account**
   - Click "Connect" on the Google card
   - Sign in with your Google account
   - Grant permissions for Gmail and Drive
   - You'll be redirected back automatically

2. **Shopify Store**
   - Click "Connect" on the Shopify card
   - Enter your store URL (e.g., `mystore.myshopify.com`)
   - Enter your access token
   - Click "Submit"

### Using the Chat Interface

Once services are connected, you can ask questions in natural language:

- "Show my latest emails"
- "Get 10 recent files from Drive"
- "What are my Shopify orders from today?"
- "Find emails about invoices"
- "Show me my Drive documents"
- "How many orders do I have?"

**The AI will:**
- Understand your intent
- Fetch the relevant data
- Provide intelligent summaries
- Give you conversational responses

## API Routes

### Google APIs

- `GET /api/google/auth` - Get Google OAuth URL
- `GET /api/google/callback` - Handle OAuth callback
- `POST /api/google/emails` - Fetch emails (requires tokens)
- `POST /api/google/files` - Fetch Drive files (requires tokens)

### Shopify APIs

- `POST /api/shopify/connect` - Connect Shopify store
- `POST /api/shopify/orders` - Fetch orders

### Agent API

- `POST /api/agent/query` - Process natural language queries

## Security Notes

⚠️ **Important**: This is a demo application. For production use:

1. Store tokens securely (use encrypted database or secure session storage)
2. Implement proper token refresh logic
3. Add rate limiting to API routes
4. Use environment-specific configurations
5. Implement proper error handling and logging
6. Add user authentication and authorization
7. Use HTTPS in production

## Troubleshooting

### Google OAuth Issues

- Ensure redirect URI exactly matches in Google Console
- Check that Gmail and Drive APIs are enabled
- Verify credentials are correct in `.env.local`

### Shopify Connection Issues

- Confirm your access token has required scopes
- Verify store URL format (must include `.myshopify.com`)
- Check API version compatibility (uses 2024-01)

### General Issues

- Clear browser cache and cookies
- Check browser console for errors
- Verify all environment variables are set
- Ensure Node.js version is 18 or higher

## Building for Production

```bash
npm run build
npm start
```

## License

MIT

## Support

For issues and questions, please open an issue on GitHub.