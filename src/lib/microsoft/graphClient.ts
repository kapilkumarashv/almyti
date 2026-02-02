import 'isomorphic-fetch';

export class GraphClient {
  private accessToken: string;

  constructor(accessToken: string) {
    if (!accessToken) throw new Error('GraphClient: Access token is missing.');
    this.accessToken = accessToken;
  }

  /**
   * Generic fetch wrapper for Microsoft Graph API
   * Handles Headers, Base URL, and Basic Error Parsing
   */
  async request<T>(endpoint: string, method: string = 'GET', body?: any): Promise<T> {
    const url = `https://graph.microsoft.com/v1.0${endpoint}`;
    
    const headers: HeadersInit = {
      'Authorization': `Bearer ${this.accessToken}`,
      'Content-Type': 'application/json',
    };

    const options: RequestInit = {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    };

    const response = await fetch(url, options);

    // Handle empty responses (like 204 No Content)
    if (response.status === 204) {
      return {} as T;
    }

    const contentType = response.headers.get('content-type');
    let data;

    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    } else {
      // Handle raw text responses
      data = await response.text();
    }

    if (!response.ok) {
      const errorMsg = typeof data === 'object' && data.error 
        ? JSON.stringify(data.error) 
        : String(data);
      console.error(`❌ Graph API Error [${method} ${endpoint}]:`, errorMsg);
      throw new Error(`Microsoft API Error: ${response.status} ${response.statusText}`);
    }

    return data as T;
  }
}