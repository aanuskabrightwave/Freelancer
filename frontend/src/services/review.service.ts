import { api } from "@/lib/api";

export interface ReviewPayload {
  overall_rating: number;
  quality_rating?: number;
  communication_rating?: number;
  professionalism_rating?: number;
  timeliness_rating?: number;
  value_rating?: number;
  title?: string;
  comment: string;
}

export const reviewService = {
  // Client CRUD
  async submitReview(bookingId: number | string, data: ReviewPayload): Promise<any> {
    return api.post(`/client/bookings/${bookingId}/review`, data);
  },

  async getClientReviews(): Promise<any[]> {
    return api.get("/client/reviews");
  },

  async editReview(id: number | string, data: Partial<ReviewPayload>): Promise<any> {
    return api.patch(`/client/reviews/${id}`, data);
  },

  async deleteReview(id: number | string): Promise<any> {
    return api.delete(`/client/reviews/${id}`);
  },

  // Freelancer dashboard & reply
  async getFreelancerReviews(): Promise<any[]> {
    return api.get("/freelancer/reviews");
  },

  async submitResponse(reviewId: number | string, response: string): Promise<any> {
    return api.post(`/freelancer/reviews/${reviewId}/response`, { response });
  },

  async editResponse(reviewId: number | string, response: string): Promise<any> {
    return api.patch(`/freelancer/reviews/${reviewId}/response`, { response });
  },

  // Public reviews retrieval
  async getPublicFreelancerReviews(
    freelancerId: number | string,
    params?: { page?: number; page_size?: number; rating?: number; sort?: string }
  ): Promise<any[]> {
    // Need to cast page and rating to string since apiFetch expects Record<string, string>
    const recordParams: Record<string, string> = {};
    if (params) {
      if (params.page !== undefined) recordParams.page = String(params.page);
      if (params.page_size !== undefined) recordParams.page_size = String(params.page_size);
      if (params.rating !== undefined) recordParams.rating = String(params.rating);
      if (params.sort) recordParams.sort = params.sort;
    }
    return api.get(`/freelancers/${freelancerId}/reviews`, { params: recordParams });
  },

  async getPublicServiceReviews(
    serviceId: number | string,
    params?: { page?: number; page_size?: number }
  ): Promise<any[]> {
    const recordParams: Record<string, string> = {};
    if (params) {
      if (params.page !== undefined) recordParams.page = String(params.page);
      if (params.page_size !== undefined) recordParams.page_size = String(params.page_size);
    }
    return api.get(`/services/${serviceId}/reviews`, { params: recordParams });
  },

  // Reporting
  async reportReview(reviewId: number | string, data: { reason: string; details?: string }): Promise<any> {
    return api.post(`/reviews/${reviewId}/report`, data);
  }
};
