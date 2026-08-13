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

  async getCurrentUser(token?: string): Promise<any> {
    const headers = token ? { Authorization: `Bearer ${token}` } : undefined;
    return api.get("/auth/me", { headers });
  },

  async logout(): Promise<any> {
    return api.post("/auth/logout", {});
  },

  async refreshAccessToken(refreshToken: string): Promise<any> {
    return api.post("/auth/refresh", { refresh_token: refreshToken });
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

  async sendVerification(token?: string): Promise<any> {
    const headers = token ? { Authorization: `Bearer ${token}` } : undefined;
    return api.post("/auth/send-verification", {}, { headers });
  }
};
