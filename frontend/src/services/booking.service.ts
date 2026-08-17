import { api } from "@/lib/api";

export interface BookingCreatePayload {
  service_id: number;
  service_package_id: number;
  scheduled_date?: string;
  booking_date?: string;
  start_time?: string;
  end_time?: string;
  venue_name?: string;
  location_city?: string;
  location_state?: string;
  venue_address?: string;
  notes?: string;
  requirements_answers?: Record<string, any>;
}

export const bookingService = {
  // Shared view endpoints
  async getBookings(filters?: any): Promise<any[]> {
    return api.get("/bookings", { params: filters });
  },

  async getBookingDetails(id: number | string): Promise<any> {
    return api.get(`/bookings/${id}`);
  },

  // Client operations
  async createBooking(data: BookingCreatePayload): Promise<any> {
    return api.post("/client/bookings", data);
  },

  async getClientBookings(): Promise<any[]> {
    return api.get("/client/bookings");
  },

  async completeBooking(id: number | string): Promise<any> {
    return api.post(`/client/bookings/${id}/complete`, {});
  },

  async clientCancelBooking(id: number | string, reason: string): Promise<any> {
    return api.post(`/client/bookings/${id}/cancel`, { reason });
  },

  // Freelancer operations
  async getFreelancerBookings(): Promise<any[]> {
    return api.get("/freelancer/bookings");
  },

  async acceptBooking(id: number | string): Promise<any> {
    return api.post(`/freelancer/bookings/${id}/accept`, {});
  },

  async rejectBooking(id: number | string, reason?: string): Promise<any> {
    return api.post(`/freelancer/bookings/${id}/reject`, { reason });
  },

  async startBooking(id: number | string): Promise<any> {
    return api.post(`/freelancer/bookings/${id}/start`, {});
  },

  async markDeliveryPending(id: number | string): Promise<any> {
    return api.post(`/freelancer/bookings/${id}/mark-delivery-pending`, {});
  },

  async freelancerCancelBooking(id: number | string, reason: string): Promise<any> {
    return api.post(`/freelancer/bookings/${id}/cancel`, { reason });
  },

  // Rescheduling operations
  async getPendingReschedule(id: number | string): Promise<any> {
    return api.get(`/bookings/${id}/reschedule/pending`);
  },

  async requestReschedule(
    id: number | string,
    data: { new_date: string; new_start_time: string; new_end_time: string; reason?: string }
  ): Promise<any> {
    return api.post(`/bookings/${id}/reschedule`, data);
  },

  async respondReschedule(
    id: number | string,
    requestId: number,
    accept: boolean
  ): Promise<any> {
    const route = accept ? "accept" : "reject";
    return api.post(`/bookings/${id}/reschedule/${requestId}/${route}`, {});
  },

  // Legacy fallback
  async updateBookingStatus(id: number | string, status: string): Promise<any> {
    return api.put(`/bookings/${id}/status`, { status });
  },

  // Quote & Two-Stage approvals
  async sendQuote(id: number | string, proposed_amount: number, deposit_amount: number): Promise<any> {
    return api.post(`/bookings/${id}/quote`, { proposed_amount, deposit_amount });
  },

  async acceptQuote(id: number | string): Promise<any> {
    return api.post(`/bookings/${id}/accept-quote`, {});
  },

  async approvePreview(id: number | string): Promise<any> {
    return api.post(`/bookings/${id}/approve-preview`, {});
  },

  async approveFinalDelivery(id: number | string): Promise<any> {
    return api.post(`/bookings/${id}/approve-final`, {});
  },

  async openDispute(id: number | string, reason: string, description: string): Promise<any> {
    return api.post(`/bookings/${id}/disputes`, { reason, description });
  }
};
