import { api } from "@/lib/api";

export interface RegisterUserData {
  full_name: string;
  email: string;
  phone: string;
  password: string;
  role: "CLIENT" | "FREELANCER";
}

export interface LoginCredentials {
  identifier: string; // Email or phone
  password: string;
}

export const authService = {
  async register(userData: RegisterUserData): Promise<any> {
    return api.post("/auth/register", userData);
  },

  async login(credentials: LoginCredentials): Promise<any> {
    return api.post("/auth/login", credentials);
  },

  async getCurrentUser(): Promise<any> {
    return api.get("/auth/me");
  },

  async logout(): Promise<any> {
    return api.post("/auth/logout", {});
  },

  async refreshAccessToken(): Promise<any> {
    return api.post("/auth/refresh", {});
  },

  async forgotPassword(email: string): Promise<any> {
    return api.post("/auth/forgot-password", { email });
  },

  async resetPassword(resetData: any): Promise<any> {
    return api.post("/auth/reset-password", resetData);
  },

  async verifyEmail(token: string): Promise<any> {
    return api.post("/auth/verify-email", { token });
  },

  async sendVerification(): Promise<any> {
    return api.post("/auth/send-verification", {});
  }
};
