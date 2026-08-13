import { api } from "@/lib/api";

export interface WorkspaceFile {
  id: number;
  workspace_id: number;
  uploaded_by_user_id: number;
  file_category: string;
  original_name: string;
  stored_name: string;
  file_url: string;
  mime_type?: string;
  file_size?: number;
  description?: string;
  created_at: string;
}

export interface WorkspaceLink {
  id: number;
  workspace_id: number;
  created_by_user_id: number;
  label: string;
  url: string;
  link_type: string;
  created_at: string;
}

export interface WorkspaceEvent {
  id: number;
  workspace_id: number;
  event_type: string;
  actor_user_id?: number;
  title: string;
  description?: string;
  created_at: string;
}

export interface MessageResponse {
  id: number;
  conversation_id: number;
  sender_id: number;
  content?: string;
  message_text?: string;
  message_type: string;
  reply_to_message_id?: number;
  is_edited: boolean;
  is_deleted: boolean;
  is_system: boolean;
  created_at: string;
  attachments?: any[];
}

export interface DeliveryResponse {
  id: number;
  booking_id: number;
  workspace_id: number;
  delivery_type: string;
  version: number;
  title: string;
  message?: string;
  status: string;
  submitted_by_user_id: number;
  submitted_at: string;
  approved_at?: string;
  created_at: string;
  delivery_files?: any[];
}

export interface RevisionRequestResponse {
  id: number;
  booking_id: number;
  delivery_id: number;
  requested_by_user_id: number;
  title: string;
  description: string;
  status: string;
  created_at: string;
  resolved_at?: string;
  comments?: any[];
}

export const workspaceService = {
  async getWorkspace(bookingId: number | string): Promise<any> {
    return api.get(`/bookings/${bookingId}/workspace`);
  },

  async getFiles(bookingId: number | string, category?: string): Promise<WorkspaceFile[]> {
    return api.get(`/bookings/${bookingId}/files`, { params: category ? { category } : {} });
  },

  async uploadFile(bookingId: number | string, file: File, category: string, description?: string): Promise<WorkspaceFile> {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("category", category);
    if (description) {
      formData.append("description", description);
    }
    return api.post(`/bookings/${bookingId}/files`, formData, {
      headers: { "Content-Type": "multipart/form-data" }
    });
  },

  async shareLink(bookingId: number | string, label: string, url: string): Promise<WorkspaceLink> {
    return api.post(`/bookings/${bookingId}/links`, { label, url });
  },

  async getLinks(bookingId: number | string): Promise<WorkspaceLink[]> {
    return api.get(`/bookings/${bookingId}/links`);
  },

  async deleteFile(bookingId: number | string, fileId: number): Promise<void> {
    return api.delete(`/bookings/${bookingId}/files/${fileId}`);
  },

  async getTimeline(bookingId: number | string): Promise<WorkspaceEvent[]> {
    return api.get(`/bookings/${bookingId}/timeline`);
  },

  async getMessages(bookingId: number | string, params?: { limit?: number; offset?: number; search?: string }): Promise<MessageResponse[]> {
    const queryParams: Record<string, string> = {};
    if (params) {
      if (params.limit !== undefined) queryParams.limit = String(params.limit);
      if (params.offset !== undefined) queryParams.offset = String(params.offset);
      if (params.search !== undefined) queryParams.search = params.search;
    }
    return api.get(`/bookings/${bookingId}/messages`, { params: queryParams });
  },

  async sendMessage(bookingId: number | string, content: string, replyToMessageId?: number, fileIds?: number[]): Promise<MessageResponse> {
    return api.post(`/bookings/${bookingId}/messages`, {
      content,
      reply_to_message_id: replyToMessageId,
      file_ids: fileIds
    });
  },

  async editMessage(messageId: number, content: string): Promise<MessageResponse> {
    return api.patch(`/messages/${messageId}`, { content });
  },

  async deleteMessage(messageId: number): Promise<MessageResponse> {
    return api.delete(`/messages/${messageId}`);
  },

  async markMessagesAsRead(bookingId: number | string): Promise<void> {
    return api.post(`/bookings/${bookingId}/messages/read`, {});
  },

  async getUnreadCount(bookingId: number | string): Promise<{ unread_count: number }> {
    return api.get(`/bookings/${bookingId}/messages/unread`);
  },

  async getDeliveries(bookingId: number | string): Promise<DeliveryResponse[]> {
    return api.get(`/bookings/${bookingId}/deliveries`);
  },

  async submitDelivery(bookingId: number | string, data: { delivery_type: string; title: string; message?: string; file_ids: number[] }): Promise<DeliveryResponse> {
    return api.post(`/freelancer/bookings/${bookingId}/deliveries`, data);
  },

  async requestRevision(deliveryId: number, data: { title: string; description: string }): Promise<RevisionRequestResponse> {
    return api.post(`/client/deliveries/${deliveryId}/revision`, data);
  },

  async getRevisions(bookingId: number | string): Promise<RevisionRequestResponse[]> {
    return api.get(`/bookings/${bookingId}/revisions`);
  },

  async startRevisionWork(revisionId: number): Promise<RevisionRequestResponse> {
    return api.post(`/freelancer/revisions/${revisionId}/start`, {});
  },

  async addRevisionComment(revisionId: number, timestampSeconds: number | null, comment: string): Promise<any> {
    return api.post(`/revisions/${revisionId}/comments`, {
      timestamp_seconds: timestampSeconds,
      comment
    });
  },

  async getRevisionComments(revisionId: number): Promise<any[]> {
    return api.get(`/revisions/${revisionId}/comments`);
  }
};
