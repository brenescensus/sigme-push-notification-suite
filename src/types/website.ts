/**
 * Website Types for Sigme Multi-Website Management
 * 
 * Each website is an isolated entity with its own:
 * - Subscribers
 * - VAPID keys
 * - Service worker configuration
 * - Notification history
 * - Analytics
 */

export interface Website {
  id: string;
  name: string;
  url: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  
  // Statistics
  subscriberCount: number;
  notificationsSent: number;
  
  // Keys and configuration
  vapidPublicKey: string;
  vapidPrivateKey: string;
  apiToken: string;
  
  // Status
  status: "active" | "pending" | "inactive";
  isVerified: boolean;
  
  // Owner reference (for multi-tenant support)
  ownerId: string;
}

export interface WebsiteFormData {
  name: string;
  url: string;
  description?: string;
}

// Mock data for development - would come from database in production
export const mockWebsites: Website[] = [
  {
    id: "ws_1",
    name: "Main Website",
    url: "https://example.com",
    description: "Primary marketing website",
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-20T12:00:00Z",
    subscriberCount: 15420,
    notificationsSent: 89350,
    vapidPublicKey: "BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U",
    vapidPrivateKey: "UUxI4O8-FbRouAF3NJ3dR6xOFGt5Xa5Vz8Z2F3Y4A5s",
    apiToken: "sigme_ws1_live_abc123def456ghi789jkl012",
    status: "active",
    isVerified: true,
    ownerId: "user_1",
  },
  {
    id: "ws_2",
    name: "E-commerce Store",
    url: "https://shop.example.com",
    description: "Online store for product notifications",
    createdAt: "2024-01-10T00:00:00Z",
    updatedAt: "2024-01-18T14:30:00Z",
    subscriberCount: 8940,
    notificationsSent: 52800,
    vapidPublicKey: "BNz3VdR4qXxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8Y",
    vapidPrivateKey: "VVyJ5P9-GcSouBG4OK4eS7yPGu6Ya6Wz9Z3G4Y5B6t",
    apiToken: "sigme_ws2_live_xyz789abc456def123ghi012",
    status: "active",
    isVerified: true,
    ownerId: "user_1",
  },
  {
    id: "ws_3",
    name: "Blog",
    url: "https://blog.example.com",
    description: "Content blog with subscriber notifications",
    createdAt: "2024-01-15T00:00:00Z",
    updatedAt: "2024-01-19T10:15:00Z",
    subscriberCount: 532,
    notificationsSent: 2150,
    vapidPublicKey: "COa4WeS5rYyJlw70zWjFvjCJb-Jc0-TlwNfBuB4MGhEaltAaKkThOgdlkCKvClr4rCVZJICSGMYq6Olq9U",
    vapidPrivateKey: "WWzK6Q0-HdTpvCH5PL5fT8zQHv7Zb7Xa0a4H5Z6C7u",
    apiToken: "sigme_ws3_live_mno345pqr678stu901vwx234",
    status: "pending",
    isVerified: false,
    ownerId: "user_1",
  },
];
