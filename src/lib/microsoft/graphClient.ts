import 'isomorphic-fetch';

export class GraphClient {
  private accessToken: string;

  constructor(accessToken: string) {
    if (!accessToken) throw new Error('GraphClient: Access token is missing.');
    this.accessToken = accessToken;
  }

  /**
   * Generic fetch wrapper for Microsoft Graph API
   * @param endpoint - The API endpoint (e.g., '/me/drive/root/children')
   * @param method - HTTP Method (GET, POST, PUT, PATCH, DELETE)
   * @param body - The payload (JSON object OR raw string/buffer for file uploads)
   * @param customHeaders - Optional headers to override defaults (e.g., Content-Type for files)
   */
  async request<T>(
    endpoint: string, 
    method: string = 'GET', 
    body?: any, 
    customHeaders: Record<string, string> = {}
  ): Promise<T> {
    const url = `https://graph.microsoft.com/v1.0${endpoint}`;
    
    // Default headers
    const headers: Record<string, string> = {
      'Authorization': `Bearer ${this.accessToken}`,
      'Content-Type': 'application/json', // Default to JSON, can be overridden
      ...customHeaders
    };

    // Handle Body: If Content-Type is NOT JSON, pass body raw (for file uploads)
    let requestBody = body;
    if (headers['Content-Type'] === 'application/json' && body) {
      requestBody = JSON.stringify(body);
    }

    const options: RequestInit = {
      method,
      headers,
      body: requestBody,
    };

    try {
      const response = await fetch(url, options);

      // Handle empty responses (like 204 No Content)
      if (response.status === 204) {
        return {} as T;
      }

      const contentType = response.headers.get('content-type');
      let data;

      // Parse response based on content type
      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        data = await response.text();
      }

      // ❌ Error Handling
      if (!response.ok) {
        let errorMessage = `Microsoft API Error: ${response.status} ${response.statusText}`;

        // Try to extract the specific Graph API error message
        if (data && typeof data === 'object' && 'error' in data) {
          const errObj = (data as any).error;
          // Format: "Code: Message"
          errorMessage = `${errObj.code || 'Error'}: ${errObj.message || JSON.stringify(errObj)}`;
        } else if (typeof data === 'string') {
          errorMessage = data;
        }

        console.error(`❌ Graph API Error [${method} ${endpoint}]:`, errorMessage);
        throw new Error(errorMessage);
      }

      return data as T;
    } catch (error: any) {
      // Re-throw with clean message
      throw new Error(error.message || 'Network error occurred while contacting Microsoft Graph.');
    }
  }
}