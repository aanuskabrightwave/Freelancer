import { api } from "@/lib/api";

export const freelancerService = {
  // 1. Profile CRUD
  async getProfile(): Promise<any> {
    return api.get("/freelancer/profile");
  },

  async createProfile(data: any): Promise<any> {
    return api.post("/freelancer/profile", data);
  },

  async updateProfile(data: any): Promise<any> {
    return api.patch("/freelancer/profile", data);
  },

  async setSkills(skillIds: number[]): Promise<any> {
    return api.post("/freelancer/profile/skills", { skill_ids: skillIds });
  },

  // 2. File Upload
  async uploadFile(file: File, subfolder: string = "profiles"): Promise<{ file_url: string }> {
    const formData = new FormData();
    formData.append("file", file);
    return api.post(`/freelancer/profile/upload?subfolder=${subfolder}`, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
  },

  // 3. Equipment CRUD
  async getEquipment(): Promise<any[]> {
    return api.get("/freelancer/profile/equipment");
  },

  async addEquipment(data: { equipment_type: string; brand: string; model: string; description?: string }): Promise<any> {
    return api.post("/freelancer/profile/equipment", data);
  },

  async updateEquipment(id: number, data: { equipment_type: string; brand: string; model: string; description?: string }): Promise<any> {
    return api.put(`/freelancer/profile/equipment/${id}`, data);
  },

  async deleteEquipment(id: number): Promise<void> {
    return api.delete(`/freelancer/profile/equipment/${id}`);
  },

  // 4. Portfolio CRUD
  async getPortfolio(): Promise<any[]> {
    return api.get("/freelancer/profile/portfolio");
  },

  async addPortfolio(data: {
    title: string;
    description?: string;
    media_type: string;
    media_url: string;
    thumbnail_url?: string;
    category: string;
    project_date?: string;
    is_featured?: boolean;
  }): Promise<any> {
    return api.post("/freelancer/profile/portfolio", data);
  },

  async updatePortfolio(
    id: number,
    data: {
      title: string;
      description?: string;
      media_type: string;
      media_url: string;
      thumbnail_url?: string;
      category: string;
      project_date?: string;
      is_featured?: boolean;
    }
  ): Promise<any> {
    return api.put(`/freelancer/profile/portfolio/${id}`, data);
  },

  async deletePortfolio(id: number): Promise<void> {
    return api.delete(`/freelancer/profile/portfolio/${id}`);
  },

  async toggleFeaturedPortfolio(id: number): Promise<any> {
    return api.patch(`/freelancer/profile/portfolio/${id}/featured`, {});
  },

  // 5. Global Skills
  async getSkillsList(): Promise<any[]> {
    return api.get("/skills");
  },

  // 6. Public Directory / Visitors
  async listFreelancers(filters?: { page?: number; page_size?: number; profession?: string; city?: string }): Promise<any[]> {
    const stringParams: Record<string, string> = {};
    if (filters) {
      Object.entries(filters).forEach(([key, val]) => {
        if (val !== undefined && val !== null) {
          stringParams[key] = String(val);
        }
      });
    }
    return api.get("/freelancers", { params: stringParams });
  },

  async getFreelancerById(id: string | number): Promise<any> {
    return api.get(`/freelancers/${id}`);
  }
};
