import { api } from "@/lib/api";

export interface DeliverableCreateUpdate {
  label: string;
  value: string;
  sort_order?: number;
}

export interface PackageCreateUpdate {
  package_type: "BASIC" | "STANDARD" | "PREMIUM";
  name: string;
  description: string;
  price: number;
  delivery_time_days: number;
  revisions: number;
  deliverables?: DeliverableCreateUpdate[];
}

export interface ServiceMediaCreate {
  media_type: "IMAGE" | "VIDEO" | "EXTERNAL_VIDEO";
  media_url: string;
  thumbnail_url?: string;
  is_cover?: boolean;
}

export interface RequirementCreateUpdate {
  question: string;
  field_type: "TEXT" | "TEXTAREA" | "NUMBER" | "DATE" | "SELECT" | "BOOLEAN" | "FILE";
  is_required?: boolean;
  sort_order?: number;
}

export interface ServiceCreate {
  title: string;
  short_description: string;
  description: string;
  service_type: "ON_SITE" | "REMOTE" | "HYBRID";
  category_id?: number;
  subcategory_id?: number;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  service_radius_km?: number | null;
  travel_available?: boolean;
  travel_fee?: number | null;
}

export const marketplaceService = {
  // Public directory methods
  async listPublicServices(params: {
    page?: number;
    page_size?: number;
    category_id?: number;
    subcategory_id?: number;
    service_type?: string;
    city?: string;
    min_price?: number;
    max_price?: number;
  }): Promise<any[]> {
    const stringParams: Record<string, string> = {};
    Object.entries(params).forEach(([key, val]) => {
      if (val !== undefined && val !== null) {
        stringParams[key] = String(val);
      }
    });
    return api.get<any[]>("/services", { params: stringParams });
  },

  async getPublicService(id: string | number): Promise<any> {
    return api.get<any>(`/services/${id}`);
  },

  async getCategoriesMenu(): Promise<any[]> {
    return api.get<any[]>("/services/categories");
  },

  // Owner freelancer services dashboard CRUD
  async getMyServices(): Promise<any[]> {
    return api.get<any[]>("/freelancer/services");
  },

  async getMyServiceDetails(id: number): Promise<any> {
    return api.get<any>(`/freelancer/services/${id}`);
  },

  async createServiceDraft(data: ServiceCreate): Promise<any> {
    return api.post<any>("/freelancer/services", data);
  },

  async updateService(id: number, data: Partial<ServiceCreate>): Promise<any> {
    return api.patch<any>(`/freelancer/services/${id}`, data);
  },

  async deleteService(id: number): Promise<void> {
    return api.delete<void>(`/freelancer/services/${id}`);
  },

  // Service package management
  async addPackage(serviceId: number, data: PackageCreateUpdate): Promise<any> {
    return api.post<any>(`/freelancer/services/${serviceId}/packages`, data);
  },

  async updatePackage(serviceId: number, packageId: number, data: PackageCreateUpdate): Promise<any> {
    return api.patch<any>(`/freelancer/services/${serviceId}/packages/${packageId}`, data);
  },

  async deletePackage(serviceId: number, packageId: number): Promise<void> {
    return api.delete<void>(`/freelancer/services/${serviceId}/packages/${packageId}`);
  },

  // Service media management
  async addMedia(serviceId: number, data: ServiceMediaCreate): Promise<any> {
    return api.post<any>(`/freelancer/services/${serviceId}/media`, data);
  },

  async deleteMedia(serviceId: number, mediaId: number): Promise<void> {
    return api.delete<void>(`/freelancer/services/${serviceId}/media/${mediaId}`);
  },

  async setCoverMedia(serviceId: number, mediaId: number): Promise<any> {
    return api.patch<any>(`/freelancer/services/${serviceId}/media/${mediaId}/cover`, {});
  },

  // Service client requirements management
  async addRequirement(serviceId: number, data: RequirementCreateUpdate): Promise<any> {
    return api.post<any>(`/freelancer/services/${serviceId}/requirements`, data);
  },

  async updateRequirement(serviceId: number, requirementId: number, data: RequirementCreateUpdate): Promise<any> {
    return api.patch<any>(`/freelancer/services/${serviceId}/requirements/${requirementId}`, data);
  },

  async deleteRequirement(serviceId: number, requirementId: number): Promise<void> {
    return api.delete<void>(`/freelancer/services/${serviceId}/requirements/${requirementId}`);
  },

  // Listing publication status triggers
  async publishService(id: number): Promise<any> {
    return api.post<any>(`/freelancer/services/${id}/publish`, {});
  },

  async pauseService(id: number): Promise<any> {
    return api.post<any>(`/freelancer/services/${id}/pause`, {});
  }
};
