
// lib/api.ts
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
/**
 * Core fetch wrapper - uses cookies for auth (NO tokens)
 */
async function apiFetch<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  console.log(' API Debug - Endpoint:', endpoint);
  
  const url = `${API_BASE_URL}/api/${endpoint}`;
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
subscribers: {
  /**
   * Get all subscribers for a website
   */
  async getAll(websiteId: string) {
    try {
      const data = await apiFetch(`subscribers?website_id=${websiteId}`);
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
  async getById(subscriberId: string) {
    try {
      const data = await apiFetch(`subscribers/${subscriberId}`);
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
  async delete(subscriberId: string) {
    try {
      const data = await apiFetch(`subscribers/${subscriberId}`, {
        method: 'DELETE',
      });
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
  async sendTest(subscriberId: string, notification: {
    title: string;
    body: string;
    icon?: string;
    image?: string;
    url?: string;
  }) {
    try {
      const data = await apiFetch(`subscribers/${subscriberId}/test`, {
        method: 'POST',
        body: JSON.stringify(notification),
      });
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
  async updateStatus(subscriberId: string, status: 'active' | 'inactive' | 'unsubscribed') {
    try {
      const data = await apiFetch(`subscribers/${subscriberId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
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
  async getStats(websiteId: string) {
    try {
      const data = await apiFetch(`subscribers/stats?website_id=${websiteId}`);
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