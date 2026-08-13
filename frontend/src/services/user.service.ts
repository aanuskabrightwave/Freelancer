import { api } from "@/lib/api";

export const userService = {
  async getProfile(userId: string): Promise<any> {
    return api.get(`/users/${userId}`);
  },

  async updateProfile(userId: string, data: any): Promise<any> {
    return api.put(`/users/${userId}`, data);
  }
};
