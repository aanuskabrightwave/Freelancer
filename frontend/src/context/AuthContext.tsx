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

  // Helper to manage cookies client-side
  const setCookie = (name: string, value: string, days: number) => {
    const expires = new Date(Date.now() + days * 864e5).toUTCString();
    document.cookie = `${name}=${value}; expires=${expires}; path=/; SameSite=Lax; Secure`;
  };

  const deleteCookie = (name: string) => {
    document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
  };

  // Helper to clear local storage and cookie tokens
  const clearTokens = () => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    deleteCookie("accessToken");
    deleteCookie("refreshToken");
    setUser(null);
  };

  // Restore session on mount
  useEffect(() => {
    async function restoreSession() {
      const accessToken = localStorage.getItem("accessToken");
      const refreshToken = localStorage.getItem("refreshToken");

      if (!accessToken && !refreshToken) {
        setIsLoading(false);
        return;
      }

      try {
        // Try fetching user profile with current access token
        if (accessToken) {
          // Sync access token to cookie in case it was cleared/missing
          setCookie("accessToken", accessToken, 1);
          const profile = await authService.getCurrentUser();
          setUser(profile);
        } else {
          throw new Error("No access token, need refresh");
        }
      } catch (err) {
        // Access token is invalid or expired, try to refresh
        if (refreshToken) {
          try {
            const data = await authService.refreshAccessToken(refreshToken);
            localStorage.setItem("accessToken", data.access_token);
            setCookie("accessToken", data.access_token, 1);
            const profile = await authService.getCurrentUser();
            setUser(profile);
          } catch (refreshErr) {
            // Refresh token also expired/invalid
            clearTokens();
          }
        } else {
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
      localStorage.setItem("accessToken", data.access_token);
      localStorage.setItem("refreshToken", data.refresh_token);
      setCookie("accessToken", data.access_token, 1);
      setCookie("refreshToken", data.refresh_token, 7);
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
