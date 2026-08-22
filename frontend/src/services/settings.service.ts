import { api } from "@/lib/api";

export interface ClientSettingsData {
  full_name: string;
  email: string;
  phone: string;
  is_active: boolean;
  role: string;
}

export interface FreelancerSettingsData {
  full_name: string;
  email: string;
  phone: string;
  is_active: boolean;
  role: string;
  is_profile_public: boolean;
  profile_completion_percentage: number;
  verification_status: string;
  payout_status: string;
  
  preferred_categories?: string;
  preferred_budget_min?: number;
  preferred_budget_max?: number;
  preferred_work_mode?: string;
  preferred_locations?: string;
  open_to_remote?: boolean;
}

export const settingsService = {
  async getSettings(): Promise<ClientSettingsData | FreelancerSettingsData> {
    return api.get("/settings");
  },

  async updateSettings(data: any): Promise<ClientSettingsData | FreelancerSettingsData> {
    return api.patch("/settings", data);
  },

  async changePassword(data: any): Promise<{ message: string }> {
    return api.post("/settings/change-password", data);
  },

  async deactivateAccount(): Promise<{ message: string }> {
    return api.post("/settings/deactivate", {});
  }
};
