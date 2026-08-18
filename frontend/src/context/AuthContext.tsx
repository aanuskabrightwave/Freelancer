"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useRouter } from "next/navigation";
import { authService, LoginCredentials, RegisterUserData } from "@/services/auth.service";
import { freelancerService } from "@/services/freelancer.service";

export interface UserType {
  id: number;
  full_name: string;
  email: string;
  phone: string;
  role: "CLIENT" | "FREELANCER" | "ADMIN";
  is_verified: boolean;
  is_active: boolean;
  login_id?: string;
  timezone?: string;
  created_at?: string;
  avatar_url?: string;
}

interface AuthContextType {
  user: UserType | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: LoginCredentials) => Promise<UserType>;
  register: (userData: RegisterUserData) => Promise<any>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserType | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const router = useRouter();


  // Helper to clear tokens state locally since cookies are handled by backend
  const clearTokens = () => {
    setUser(null);
  };

  // Restore session on mount
  useEffect(() => {
    async function restoreSession() {
      try {
        // Try fetching user profile, API uses HttpOnly cookie automatically
        const profile = await authService.getCurrentUser();
        setUser(profile);
      } catch (err) {
        // Access token is invalid or expired, try to refresh
        try {
          await authService.refreshAccessToken();
          const profile = await authService.getCurrentUser();
          setUser(profile);
        } catch (refreshErr) {
          // Refresh token also expired/invalid, or no cookies exist
          clearTokens();
        }
      } finally {
        setIsLoading(false);
      }
    }

    restoreSession();
  }, []);

  const login = async (credentials: LoginCredentials): Promise<UserType> => {
    setIsLoading(true);
    try {
      const data = await authService.login(credentials);
      // Cookies are automatically set by the backend response
      setUser(data.user);
      
      // Determine redirection based on role
      if (data.user.role === "CLIENT") {
        router.push("/client/dashboard");
      } else if (data.user.role === "FREELANCER") {
        try {
          const profile = await freelancerService.getProfile();
          if (profile && profile.is_profile_public) {
            router.push("/freelancer/dashboard");
          } else {
            router.push("/freelancer/onboarding");
          }
        } catch (err) {
          router.push("/freelancer/onboarding");
        }
      } else if (data.user.role === "ADMIN") {
        router.push("/admin/dashboard");
      }
      return data.user;
    } catch (err) {
      setIsLoading(false);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (userData: RegisterUserData): Promise<any> => {
    return authService.register(userData);
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      await authService.logout();
    } catch {
      // Ignore API logout errors during teardown
    } finally {
      clearTokens();
      setIsLoading(false);
      router.push("/login");
    }
  };

  const refreshUser = async () => {
    try {
      const profile = await authService.getCurrentUser();
      setUser(profile);
    } catch (err) {
      // If profile fetch fails, user session is invalid
      clearTokens();
      router.push("/login");
    }
  };

  const isAuthenticated = !!user;

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        isLoading,
        login,
        register,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
