
// lib/api.ts
// const API_BASE_URL = 'https://sigme-backend-fkde.vercel.app/api';
const API_BASE_URL = 'http://localhost:3000/api';

/**
 * Core fetch wrapper - uses cookies for auth (NO tokens)
 */
async function apiFetch<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  console.log(' API Debug - Endpoint:', endpoint);
  
  const url = `${API_BASE_URL}/${endpoint}`;
  
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  console.log(' API Debug - Request URL:', url);

  try {
    const response = await fetch(url, {
      ...options,
      credentials: 'include', //  Send cookies with every request
      headers,
    });

    console.log(' API Debug - Response status:', response.status);

    // Handle 401 - session expired
    if (response.status === 401) {
      console.error(' API Debug - 401 Unauthorized, redirecting to login');
      window.location.href = '/login';
      throw new Error('Unauthorized');
    }

    const data = await response.json();
    console.log(' API Debug - Response data:', data);

    if (!response.ok) {
      throw new Error(data.error || data.message || `HTTP ${response.status}`);
    }

    return data;
  } catch (error) {
    console.error(' API Debug - Fetch error:', error);
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
      const data = await apiFetch('auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });

      return data;
    },

    async signup(email: string, password: string, fullName: string) {
      const data = await apiFetch('auth/signup', {
        method: 'POST',
        body: JSON.stringify({ email, password, fullName }),
      });

      return data;
    },

    async me() {
      return apiFetch('auth/me');
    },

    async logout() {
      // Clear session via API call
      try {
        await apiFetch('auth/logout', { method: 'POST' });
      } catch (e) {
        // Ignore errors
      }
      window.location.href = '/login';
    },
  },

  // Websites
  websites: {
    async create(websiteData: {
      name: string;
      url: string;
      description?: string; 
    }) {
      console.log(' websites.create - Input:', websiteData);
      return apiFetch('websites', {
        method: 'POST',
        body: JSON.stringify(websiteData),
      });
    },

    async list() {
      return apiFetch('websites');
    },

    async get(websiteId: string) {
      return apiFetch(`websites/${websiteId}`);
    },

    async update(websiteId: string, updates: {
      name?: string;
      url?: string;
      description?: string; 
      status?: 'active' | 'paused' | 'deleted';
    }) {
      return apiFetch(`websites/${websiteId}`, {
        method: 'PATCH',
        body: JSON.stringify(updates),
      });
    },

    async delete(websiteId: string) {
      return apiFetch(`websites/${websiteId}`, {
        method: 'DELETE',
      });
    },
  },

  // Subscribers
   // Add this to your existing api.ts file in the api object

// Inside your api object, add the subscribers section:

subscribers: {
  /**
   * Get all subscribers for a website
   */
  getAll: async (websiteId: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/subscribers?website_id=${websiteId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return {
        success: true,
        subscribers: data.subscribers || [],
      };
    } catch (error: any) {
      console.error('Failed to fetch subscribers:', error);
      return {
        success: false,
        error: error.message || 'Failed to fetch subscribers',
        subscribers: [],
      };
    }
  },

  /**
   * Get a single subscriber by ID
   */
  getById: async (subscriberId: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/subscribers/${subscriberId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return {
        success: true,
        subscriber: data.subscriber,
      };
    } catch (error: any) {
      console.error('Failed to fetch subscriber:', error);
      return {
        success: false,
        error: error.message || 'Failed to fetch subscriber',
        subscriber: null,
      };
    }
  },

  /**
   * Delete a subscriber
   */
  delete: async (subscriberId: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/subscribers/${subscriberId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return {
        success: true,
        message: data.message || 'Subscriber deleted successfully',
      };
    } catch (error: any) {
      console.error('Failed to delete subscriber:', error);
      return {
        success: false,
        error: error.message || 'Failed to delete subscriber',
      };
    }
  },

  /**
   * Send a test notification to a subscriber
   */
  sendTest: async (subscriberId: string, notification: {
    title: string;
    body: string;
    icon?: string;
    image?: string;
    url?: string;
  }) => {
    try {
      const response = await fetch(`${API_BASE_URL}/subscribers/${subscriberId}/test`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(notification),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return {
        success: true,
        message: data.message || 'Test notification sent successfully',
      };
    } catch (error: any) {
      console.error('Failed to send test notification:', error);
      return {
        success: false,
        error: error.message || 'Failed to send test notification',
      };
    }
  },

  /**
   * Update subscriber status
   */
  updateStatus: async (subscriberId: string, status: 'active' | 'inactive' | 'unsubscribed') => {
    try {
      const response = await fetch(`${API_BASE_URL}/subscribers/${subscriberId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ status }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return {
        success: true,
        subscriber: data.subscriber,
      };
    } catch (error: any) {
      console.error('Failed to update subscriber status:', error);
      return {
        success: false,
        error: error.message || 'Failed to update subscriber status',
      };
    }
  },

  /**
   * Get subscriber statistics for a website
   */
  getStats: async (websiteId: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/subscribers/stats?website_id=${websiteId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return {
        success: true,
        stats: data.stats || {
          total: 0,
          active: 0,
          inactive: 0,
          unsubscribed: 0,
        },
      };
    } catch (error: any) {
      console.error('Failed to fetch subscriber stats:', error);
      return {
        success: false,
        error: error.message || 'Failed to fetch subscriber stats',
        stats: {
          total: 0,
          active: 0,
          inactive: 0,
          unsubscribed: 0,
        },
      };
    }
  },
},
  // subscribers: {
  //   async list(websiteId: string) {
  //     return apiFetch(`subscribers?websiteId=${websiteId}`);
  //   },

  //   async get(subscriberId: string) {
  //     return apiFetch(`subscribers/${subscriberId}`);
  //   },

  //   async delete(subscriberId: string) {
  //     return apiFetch(`subscribers/${subscriberId}`, {
  //       method: 'DELETE',
  //     });
  //   },
  // },

  // Campaigns
  campaigns: {
    async create(campaignData: {
      websiteId: string;
      name: string;
      title: string;
      body: string;
      clickUrl?: string;
      iconUrl?: string;
      imageUrl?: string;
      actions?: any;
      scheduledFor?: string;
      status?: 'draft' | 'scheduled' | 'sent' | 'failed';
    }) {
      return apiFetch('campaigns', {
        method: 'POST',
        body: JSON.stringify(campaignData),
      });
    },

    async list(websiteId?: string) {
      const query = websiteId ? `?websiteId=${websiteId}` : '';
      return apiFetch(`campaigns${query}`);
    },

    async get(campaignId: string) {
      return apiFetch(`campaigns/${campaignId}`);
    },

    async update(campaignId: string, updates: any) {
      return apiFetch(`campaigns/${campaignId}`, {
        method: 'PATCH',
        body: JSON.stringify(updates),
      });
    },

    async delete(campaignId: string) {
      return apiFetch(`campaigns/${campaignId}`, {
        method: 'DELETE',
      });
    },

    async send(campaignId: string) {
      return apiFetch(`campaigns/${campaignId}/send`, {
        method: 'POST',
      });
    },
  },


  // Notifications
  notifications: {
    async send(notificationData: {
      websiteId: string;
      title: string;
      body: string;
      url?: string;
      icon?: string;
      image?: string;
      badge?: string;
      targetSubscriberIds?: string[];
      campaignId?: string;
    }) {
      return apiFetch('notifications/send', {
        method: 'POST',
        body: JSON.stringify(notificationData),
      });
    },

    async list(websiteId?: string) {
      const query = websiteId ? `?websiteId=${websiteId}` : '';
      return apiFetch(`notifications${query}`);
    },

    async getStats(websiteId: string) {
      return apiFetch(`notifications/stats?websiteId=${websiteId}`);
    },
  },
};

export { apiFetch };