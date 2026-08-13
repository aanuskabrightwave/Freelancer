"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import Container from "@/components/ui/Container";

export default function RegisterPage() {
  const router = useRouter();
  const { register, login } = useAuth();

  // Step 1: Role Selection, Step 2: Form
  const [step, setStep] = useState<1 | 2>(1);
  const [role, setRole] = useState<"CLIENT" | "FREELANCER" | null>(null);

  // Form Fields
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
  });

  // Errors & States
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [apiError, setApiError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleRoleSelect = (selectedRole: "CLIENT" | "FREELANCER") => {
    setRole(selectedRole);
    setStep(2);
    setErrors({});
    setApiError(null);
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    // Full name validation
    if (formData.fullName.trim().length < 2) {
      newErrors.fullName = "Full name must be at least 2 characters.";
    } else if (formData.fullName.trim().length > 100) {
      newErrors.fullName = "Full name cannot exceed 100 characters.";
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      newErrors.email = "Please enter a valid email address.";
    }

    // Phone validation
    const cleanPhone = formData.phone.replace(/[\s\-\(\)]/g, "");
    if (!formData.phone) {
      newErrors.phone = "Phone number is required.";
    } else if (!/^\+?[0-9]{7,15}$/.test(cleanPhone)) {
      newErrors.phone = "Enter a valid phone number (7-15 digits).";
    }

    // Password validation
    const password = formData.password;
    if (password.length < 8) {
      newErrors.password = "Password must be at least 8 characters.";
    } else {
      if (!/[A-Z]/.test(password)) {
        newErrors.password = "Password must contain at least one uppercase letter.";
      }
      if (!/[a-z]/.test(password)) {
        newErrors.password = "Password must contain at least one lowercase letter.";
      }
      if (!/[0-9]/.test(password)) {
        newErrors.password = "Password must contain at least one number.";
      }
    }

    // Confirm password validation
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match.";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!role) return;

    setApiError(null);
    if (!validateForm()) return;

    setIsLoading(true);

    try {
      // 1. Call Register
      await register({
        full_name: formData.fullName.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        password: formData.password,
        role: role,
      });

      // 2. Automatically log in after registration
      await login({
        identifier: formData.email.trim(),
        password: formData.password,
      });
    } catch (err: any) {
      setApiError(err.message || "Something went wrong during registration.");
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col flex-grow justify-center bg-slate-950 py-12 px-4 text-slate-100">
      <Container size="sm">
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-8 shadow-2xl backdrop-blur-xl">
          {step === 1 ? (
            <div className="space-y-8 text-center animate-fade-in">
              <div>
                <h2 className="text-3xl font-extrabold tracking-tight text-white">
                  Create your account
                </h2>
                <p className="mt-3 text-slate-400">
                  How do you want to use the platform?
                </p>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 mt-8">
                <button
                  type="button"
                  onClick={() => handleRoleSelect("CLIENT")}
                  className="flex flex-col items-center justify-between text-left p-6 rounded-xl border border-slate-800 bg-slate-900/50 hover:border-blue-500 hover:bg-blue-950/20 transition-all group cursor-pointer"
                >
                  <div className="text-4xl mb-4 group-hover:scale-110 transition-transform">💼</div>
                  <div>
                    <h3 className="font-bold text-lg text-white group-hover:text-blue-400 transition-colors">
                      Client
                    </h3>
                    <p className="text-sm text-slate-400 mt-2">
                      Hire photographers, videographers and editors
                    </p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => handleRoleSelect("FREELANCER")}
                  className="flex flex-col items-center justify-between text-left p-6 rounded-xl border border-slate-800 bg-slate-900/50 hover:border-purple-500 hover:bg-purple-950/20 transition-all group cursor-pointer"
                >
                  <div className="text-4xl mb-4 group-hover:scale-110 transition-transform">📷</div>
                  <div>
                    <h3 className="font-bold text-lg text-white group-hover:text-purple-400 transition-colors">
                      Freelancer
                    </h3>
                    <p className="text-sm text-slate-400 mt-2">
                      Showcase your work and find projects
                    </p>
                  </div>
                </button>
              </div>

              <div className="text-sm text-slate-400 pt-4">
                Already have an account?{" "}
                <Link href="/login" className="text-blue-400 hover:underline">
                  Log In
                </Link>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex items-center gap-2 mb-2">
                <button
                  onClick={() => setStep(1)}
                  className="text-slate-400 hover:text-white text-sm flex items-center gap-1"
                >
                  ← Back
                </button>
                <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700 capitalize ml-auto">
                  Signing up as {role?.toLowerCase()}
                </span>
              </div>

              <div>
                <h2 className="text-2xl font-bold text-white">Enter your details</h2>
                <p className="text-sm text-slate-400 mt-1">
                  Complete the fields below to set up your profile.
                </p>
              </div>

              {apiError && (
                <div className="bg-red-950/30 border border-red-900/50 text-red-400 p-4 rounded-lg text-sm">
                  {apiError}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-300 mb-1">
                    Full Name
                  </label>
                  <input
                    type="text"
                    name="fullName"
                    value={formData.fullName}
                    onChange={handleChange}
                    className="w-full px-4 py-2.5 rounded-lg bg-slate-950 border border-slate-800 text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all text-sm"
                    placeholder="Enter your full name"
                    required
                  />
                  {errors.fullName && (
                    <span className="text-xs text-red-500 mt-1 block">{errors.fullName}</span>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-300 mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    className="w-full px-4 py-2.5 rounded-lg bg-slate-950 border border-slate-800 text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all text-sm"
                    placeholder="example@domain.com"
                    required
                  />
                  {errors.email && (
                    <span className="text-xs text-red-500 mt-1 block">{errors.email}</span>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-300 mb-1">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    className="w-full px-4 py-2.5 rounded-lg bg-slate-950 border border-slate-800 text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all text-sm"
                    placeholder="+91 98765 43210"
                    required
                  />
                  {errors.phone && (
                    <span className="text-xs text-red-500 mt-1 block">{errors.phone}</span>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-300 mb-1">
                    Password
                  </label>
                  <input
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    className="w-full px-4 py-2.5 rounded-lg bg-slate-950 border border-slate-800 text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all text-sm"
                    placeholder="••••••••"
                    required
                  />
                  {errors.password && (
                    <span className="text-xs text-red-500 mt-1 block">{errors.password}</span>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-300 mb-1">
                    Confirm Password
                  </label>
                  <input
                    type="password"
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    className="w-full px-4 py-2.5 rounded-lg bg-slate-950 border border-slate-800 text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all text-sm"
                    placeholder="••••••••"
                    required
                  />
                  {errors.confirmPassword && (
                    <span className="text-xs text-red-500 mt-1 block">{errors.confirmPassword}</span>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold transition-colors flex items-center justify-center gap-2 mt-6 cursor-pointer disabled:bg-blue-800 disabled:text-slate-400 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <>
                      <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Creating Account...
                    </>
                  ) : (
                    "Create Account"
                  )}
                </button>
              </form>
            </div>
          )}
        </div>
      </Container>
    </div>
  );
}
