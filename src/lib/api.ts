
// lib/api.ts
export const API_BASE_URL =
  (import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000') + '/api'

// export const API_BASE_URL =
//   process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000'

/**
 * Token Manager - Handles localStorage token operations
 */
const TOKEN_KEY = 'access_token';

export const tokenManager = {
  get(): string | null {
    const token = localStorage.getItem(TOKEN_KEY);
    // console.log(' [tokenManager.get] Token:', token ? `${token.substring(0, 30)}...` : 'NULL');
    return token;
  },

  set(token: string): void {
    // console.log(' [tokenManager.set] Saving token:', token.substring(0, 30) + '...');
    localStorage.setItem(TOKEN_KEY, token);
    
    // Verify it was saved
    const saved = localStorage.getItem(TOKEN_KEY);
    // console.log(' [tokenManager.set] Verification:', saved ? 'SUCCESS' : 'FAILED');
  },

  remove(): void {
    // console.log(' [tokenManager.remove] Clearing token');
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem('user');
  },

  exists(): boolean {
    const exists = !!this.get();
    // console.log(' [tokenManager.exists]:', exists);
    return exists;
  }
};

/**
 * Core fetch wrapper with TOKEN authentication
 */
export async function apiFetch<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  // console.log(' [apiFetch] Starting request to:', endpoint);
  
  // Get token
  const token = tokenManager.get();
  // console.log(' [apiFetch] Token retrieved:', token ? 'YES' : 'NO');
  
  if (!token) {
    console.error(' [apiFetch] CRITICAL: No token found in localStorage!');
    // console.log(' [apiFetch] LocalStorage keys:', Object.keys(localStorage));
    // console.log(' [apiFetch] LocalStorage access_token:', localStorage.getItem('access_token'));
  }
  
  const url = `${API_BASE_URL}/${endpoint}`;
  
  // Build headers
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  // Add Authorization header if token exists
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
    // console.log(' [apiFetch] Authorization header SET:', `Bearer ${token.substring(0, 30)}...`);
  } else {
    console.error(' [apiFetch] Authorization header NOT SET - no token!');
  }

  // Merge with custom headers
  const finalHeaders = {
    ...headers,
    ...(options.headers || {}),
  };

  // console.log(' [apiFetch] Final headers:', {
  //   'Content-Type': finalHeaders['Content-Type'],
  //   'Authorization': finalHeaders['Authorization'] ? 'Bearer [REDACTED]' : 'MISSING',
  // });

  // console.log(' [apiFetch] Request URL:', url);
  // console.log(' [apiFetch] Request method:', options.method || 'GET');

  try {
    const response = await fetch(url, {
      ...options,
      headers: finalHeaders,
    });

    // console.log(' [apiFetch] Response status:', response.status);

    // Handle 401 - token expired or invalid
    if (response.status === 401) {
      console.error(' [apiFetch] 401 Unauthorized - clearing token and redirecting');
      tokenManager.remove();
      
      // Only redirect if not already on login page
      if (!window.location.pathname.includes('/login')) {
        // console.log(' [apiFetch] Redirecting to /login');
        window.location.href = '/login';
      }
      
      throw new Error('Unauthorized');
    }

    // Check if response is JSON
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      const text = await response.text();
      console.error(' [apiFetch] Non-JSON response:', text.substring(0, 200));
      throw new Error('Server returned non-JSON response');
    }

    const data = await response.json();
    // console.log(' [apiFetch] Response data received:', data.success !== undefined ? `success: ${data.success}` : 'no success field');

    if (!response.ok) {
      throw new Error(data.error || data.message || `HTTP ${response.status}`);
    }

    return data;
  } catch (error: any) {
    console.error(' [apiFetch] Error:', error.message);
    throw error;
  }
}

/**
 * API Methods
 */
export const api = {
  // Auth
  auth: {
    async login(email: string, password: string) {
      // console.log(' [api.auth.login] Starting login...');
      const data = await apiFetch('auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });

      // console.log(' [api.auth.login] Response:', {
      //   hasToken: !!data.token,
      //   hasSession: !!data.session,
      //   hasUser: !!data.user,
      // });

      // Save token to localStorage
      const token = data.token || data.session?.access_token;
      if (token) {
        tokenManager.set(token);
        // console.log(' [api.auth.login] Token saved');
        
        // Immediately verify
        const verified = tokenManager.get();
        if (verified) {
          // console.log(' [api.auth.login] Token verified in storage');
        } else {
          console.error(' [api.auth.login] Token NOT found after saving!');
        }
        
        if (data.user) {
          localStorage.setItem('user', JSON.stringify(data.user));
          // console.log(' [api.auth.login] User data saved');
        }
      } else {
        console.error(' [api.auth.login] No token in response!');
        console.error('Response keys:', Object.keys(data));
      }

      return data;
    },

    async signup(email: string, password: string, fullName: string) {
      // console.log(' [api.auth.signup] Starting signup...');
      const data = await apiFetch('auth/signup', {
        method: 'POST',
        body: JSON.stringify({ email, password, fullName }),
      });

      // console.log(' [api.auth.signup] Response:', {
      //   hasToken: !!data.token,
      //   hasSession: !!data.session,
      //   hasUser: !!data.user,
      // });

      // Save token to localStorage
      const token = data.token || data.session?.access_token;
      if (token) {
        tokenManager.set(token);
        // console.log(' [api.auth.signup] Token saved');
        
        // Immediately verify
        const verified = tokenManager.get();
        if (verified) {
          // console.log(' [api.auth.signup] Token verified in storage');
        } else {
          console.error(' [api.auth.signup] Token NOT found after saving!');
        }
        
        if (data.user) {
          localStorage.setItem('user', JSON.stringify(data.user));
          // console.log(' [api.auth.signup] User data saved');
        }
      } else {
        console.error(' [api.auth.signup] No token in response!');
        console.error('Response keys:', Object.keys(data));
      }

      return data;
    },

    async me() {
      // console.log(' [api.auth.me] Fetching current user...');
      return apiFetch('auth/me');
    },

    async logout() {
      // console.log(' [api.auth.logout] Logging out...');
      tokenManager.remove();
      
      try {
        await apiFetch('auth/logout', { method: 'POST' });
      } catch (e) {
        // console.log('Ignoring logout endpoint error');
      }
      
      window.location.href = '/login';
    },
  },

  // Websites
  websites: {
    async create(websiteData: {
      name: string;
      url: string;
      domain: string;
      description?: string;
    }) {
      // console.log('[api.websites.create] Creating website:', websiteData);
      return apiFetch('websites', {
        method: 'POST',
        body: JSON.stringify(websiteData),
      });
    },

    async list() {
      // console.log('[api.websites.list] Fetching websites...');
      const data = await apiFetch('websites');
      // console.log('[api.websites.list] Response:', {
      //   success: data.success,
      //   count: data.websites?.length || 0,
      // });
      return data;
    },

    async get(websiteId: string) {
      // console.log('[api.websites.get] Fetching website:', websiteId);
      return apiFetch(`websites/${websiteId}`);
    },

    async update(websiteId: string, updates: any) {
      // console.log('[api.websites.update] Updating website:', websiteId);
      return apiFetch(`websites/${websiteId}`, {
        method: 'PATCH',
        body: JSON.stringify(updates),
      });
    },

    async delete(websiteId: string) {
      // console.log('[api.websites.delete] Deleting website:', websiteId);
      return apiFetch(`websites/${websiteId}`, {
        method: 'DELETE',
      });
    },
  },

  // Subscribers
  subscribers: {
    async list(websiteId: string) {
      // console.log(' [api.subscribers.list] Fetching subscribers for:', websiteId);
      return apiFetch(`subscribers?websiteId=${websiteId}`);
    },

    async getAll(websiteId: string) {
      // console.log(' [api.subscribers.getAll] Getting all subscribers for:', websiteId);
      return this.list(websiteId);
    },

    async get(subscriberId: string) {
      // console.log(' [api.subscribers.get] Fetching subscriber:', subscriberId);
      return apiFetch(`subscribers/${subscriberId}`);
    },

    async delete(subscriberId: string) {
      // console.log(' [api.subscribers.delete] Deleting subscriber:', subscriberId);
      return apiFetch(`subscribers/${subscriberId}`, {
        method: 'DELETE',
      });
    },
  },

  // Campaigns
  campaigns: {
    async create(campaignData: any) {
      // console.log(' [api.campaigns.create] Creating campaign');
      return apiFetch('campaigns', {
        method: 'POST',
        body: JSON.stringify(campaignData),
      });
    },

    async list(websiteId?: string) {
      const query = websiteId ? `?websiteId=${websiteId}` : '';
      // console.log(' [api.campaigns.list] Fetching campaigns:', query);
      return apiFetch(`campaigns${query}`);
    },

    async get(campaignId: string) {
      // console.log(' [api.campaigns.get] Fetching campaign:', campaignId);
      return apiFetch(`campaigns/${campaignId}`);
    },

    async send(campaignId: string) {
      // console.log(' [api.campaigns.send] Sending campaign:', campaignId);
      return apiFetch(`campaigns/${campaignId}/send`, {
        method: 'POST',
      });
    },
  },

  // Notifications
  notifications: {
    async send(notificationData: any) {
      // console.log(' [api.notifications.send] Sending notification');
      return apiFetch('notifications/send', {
        method: 'POST',
        body: JSON.stringify(notificationData),
      });
    },

    async list(websiteId?: string) {
      const query = websiteId ? `?websiteId=${websiteId}` : '';
      // console.log(' [api.notifications.list] Fetching notifications:', query);
      return apiFetch(`notifications${query}`);
    },
  },
};

// Default export for backward compatibility
export default api;