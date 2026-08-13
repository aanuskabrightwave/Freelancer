import { api } from "@/lib/api";

export const messageService = {
  async createConversation(freelancerId: number): Promise<any> {
    return api.post("/messages/conversations", { freelancer_id: freelancerId });
  },

  async getConversations(): Promise<any[]> {
    return api.get("/messages/conversations");
  },

  async getConversationMessages(conversationId: number): Promise<any[]> {
    return api.get(`/messages/conversations/${conversationId}/messages`);
  },

  async sendMessage(conversationId: number, messageText: string): Promise<any> {
    return api.post(`/messages/conversations/${conversationId}`, { message_text: messageText });
  }
};
