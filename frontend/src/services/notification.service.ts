import { api } from "@/lib/api";

export interface NotificationItemData {
  id: number;
  user_id: number;
  notification_type: string;
  event_code: string;
  title: string;
  message: string;
  action_url?: string;
  entity_type?: string;
  entity_id?: number;
  is_read: boolean;
  read_at?: string;
  created_at: string;
}

export interface NotificationPreferencesData {
  id: number;
  user_id: number;
  in_app_enabled: boolean;
  email_enabled: boolean;
  project_updates_email: boolean;
  proposal_updates_email: boolean;
  booking_updates_email: boolean;
  message_email: boolean;
  payment_email: boolean;
  delivery_email: boolean;
  review_email: boolean;
  payout_email: boolean;
  created_at: string;
  updated_at: string;
}

export const notificationService = {
  async getNotifications(
    page: number = 1,
    pageSize: number = 15,
    unreadOnly: boolean = false,
    type?: string
  ): Promise<NotificationItemData[]> {
    const params: any = { page, page_size: pageSize, unread_only: unreadOnly };
    if (type) params.type = type;
    return api.get("/notifications", { params });
  },

  async getUnreadCount(): Promise<{ count: number }> {
    return api.get("/notifications/unread-count");
  },

  async markRead(id: number | string): Promise<NotificationItemData> {
    return api.post(`/notifications/${id}/read`, {});
  },

  async markAllRead(): Promise<void> {
    return api.post("/notifications/read-all", {});
  },

  async getPreferences(): Promise<NotificationPreferencesData> {
    return api.get("/notifications/preferences");
  },

  async updatePreferences(updates: Partial<NotificationPreferencesData>): Promise<NotificationPreferencesData> {
    return api.patch("/notifications/preferences", updates);
  }
};
