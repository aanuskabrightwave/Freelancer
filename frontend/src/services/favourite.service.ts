import { api } from "@/lib/api";

export const favouriteService = {
  // Saved Freelancers
  async favoriteFreelancer(id: number | string): Promise<any> {
    return api.post(`/client/favourites/freelancers/${id}`, {});
  },

  async unfavoriteFreelancer(id: number | string): Promise<any> {
    return api.delete(`/client/favourites/freelancers/${id}`);
  },

  async getFavoriteFreelancers(): Promise<any[]> {
    return api.get("/client/favourites/freelancers");
  },

  // Saved Services
  async favoriteService(id: number | string): Promise<any> {
    return api.post(`/client/favourites/services/${id}`, {});
  },

  async unfavoriteService(id: number | string): Promise<any> {
    return api.delete(`/client/favourites/services/${id}`);
  },

  async getFavoriteServices(): Promise<any[]> {
    return api.get("/client/favourites/services");
  }
};
