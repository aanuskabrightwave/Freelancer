import { api } from "@/lib/api";

export interface WeeklyScheduleItem {
  day_of_week: string;
  is_available: boolean;
  start_time: string;
  end_time: string;
}

export interface OverrideCreatePayload {
  date: string;
  start_time?: string;
  end_time?: string;
  availability_type: "AVAILABLE" | "UNAVAILABLE" | "BLOCKED";
  note?: string;
}

export const availabilityService = {
  async getFreelancerAvailability(): Promise<any> {
    return api.get("/freelancer/availability");
  },

  async updateWeeklyAvailability(schedules: WeeklyScheduleItem[]): Promise<any[]> {
    return api.put("/freelancer/availability/weekly", { schedules });
  },

  async createOverride(data: OverrideCreatePayload): Promise<any> {
    return api.post("/freelancer/availability/override", data);
  },

  async deleteOverride(id: number): Promise<any> {
    return api.delete(`/freelancer/availability/override/${id}`);
  },

  async checkPublicAvailability(
    freelancerId: number,
    date: string,
    startTime?: string,
    endTime?: string
  ): Promise<{ date: string; available: boolean }> {
    const params: Record<string, string> = { date };
    if (startTime) params["start_time"] = startTime;
    if (endTime) params["end_time"] = endTime;
    return api.get<{ date: string; available: boolean }>(`/freelancers/${freelancerId}/availability`, { params });
  }
};
