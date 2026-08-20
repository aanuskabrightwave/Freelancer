"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

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
    <div className="min-h-screen flex bg-background text-text-main">
      {/* LEFT SIDE: Editorial/Brand Block (Hidden on mobile) */}
      <div className="hidden lg:flex lg:w-1/2 bg-dark text-text-on-dark flex-col justify-between p-16 relative overflow-hidden">
        {/* Abstract background accent */}
        <div className="absolute top-[-20%] left-[-20%] w-[80%] h-[80%] bg-primary/10 rounded-full blur-[120px] pointer-events-none"></div>
        
        {/* Brand/Logo header */}
        <div className="relative z-10">
          <Link href="/" className="font-semibold text-lg uppercase tracking-wider text-text-on-dark flex items-center gap-1.5">
            <span>Creative</span>
            <span className="w-1.5 h-1.5 bg-primary rounded-full"></span>
            <span>Market</span>
          </Link>
        </div>

        {/* Big Typographic message & quote */}
        <div className="space-y-6 relative z-10 max-w-md my-auto">
          <h2 className="text-4xl md:text-5xl font-semibold tracking-tight leading-[1.05] text-text-on-dark">
            Join the global creative network.
          </h2>
          <div className="pt-6 border-t border-white/10 space-y-2">
            <p className="text-sm italic text-text-on-dark/65 leading-relaxed">
              &ldquo;Being listed on CreativeMarket has connected me directly with agency clients looking for local videographers. No middleman, clear briefs, fast payout.&rdquo;
            </p>
            <p className="text-xs font-bold uppercase tracking-widest text-primary">
              — Demo Freelancer, Photographer
            </p>
          </div>
        </div>

        {/* Footer info */}
        <div className="relative z-10 text-xs text-text-on-dark/40">
          <p>&copy; {new Date().getFullYear()} CreativeMarket. All rights reserved.</p>
        </div>
      </div>

      {/* RIGHT SIDE: Minimal Form/Selection Block */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 sm:p-16 bg-background">
        <div className="w-full max-w-md space-y-8 cinematic-reveal">
          
          {step === 1 ? (
            <div className="space-y-8">
              <div className="space-y-2">
                <h2 className="text-3xl font-semibold tracking-tight text-text-main">
                  Create your account
                </h2>
                <p className="text-sm text-text-sub">
                  How do you want to use the platform?
                </p>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 mt-8">
                <button
                  type="button"
                  onClick={() => handleRoleSelect("CLIENT")}
                  className="flex flex-col justify-between text-left p-6 rounded-2xl border border-border-custom bg-surface hover:border-primary/50 hover:bg-surface-elevated transition-all group cursor-pointer shadow-sm"
                >
                  <div className="text-3xl mb-4 group-hover:scale-105 transition-transform">💼</div>
                  <div>
                    <h3 className="font-semibold text-base text-text-main group-hover:text-primary transition-colors">
                      Client
                    </h3>
                    <p className="text-xs text-text-sub mt-2 leading-relaxed">
                      Hire photographers, videographers and editors.
                    </p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => handleRoleSelect("FREELANCER")}
                  className="flex flex-col justify-between text-left p-6 rounded-2xl border border-border-custom bg-surface hover:border-primary/50 hover:bg-surface-elevated transition-all group cursor-pointer shadow-sm"
                >
                  <div className="text-3xl mb-4 group-hover:scale-105 transition-transform">📷</div>
                  <div>
                    <h3 className="font-semibold text-base text-text-main group-hover:text-primary transition-colors">
                      Freelancer
                    </h3>
                    <p className="text-xs text-text-sub mt-2 leading-relaxed">
                      Showcase your work and get booked directly.
                    </p>
                  </div>
                </button>
              </div>

              <div className="text-center text-xs text-text-sub pt-6 border-t border-border-custom/50">
                Already have an account?{" "}
                <Link href="/login" className="text-primary font-bold hover:underline">
                  Log In
                </Link>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setStep(1)}
                  className="text-text-muted hover:text-text-main text-xs font-semibold flex items-center gap-1 cursor-pointer"
                >
                  ← Back
                </button>
                <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-surface border border-border-custom text-text-sub font-bold capitalize ml-auto tracking-wider">
                  Signing up as {role?.toLowerCase()}
                </span>
              </div>

              <div className="space-y-2">
                <h2 className="text-2xl font-semibold tracking-tight text-text-main">Enter details</h2>
                <p className="text-sm text-text-sub">
                  Complete the fields below to set up your profile.
                </p>
              </div>

              {apiError && (
                <div className="bg-rose-50 border border-rose-200 text-rose-700 p-4 rounded-xl text-xs font-medium">
                  {apiError}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-[10px] text-text-sub font-bold uppercase tracking-wider mb-2">
                    Full Name
                  </label>
                  <input
                    type="text"
                    name="fullName"
                    value={formData.fullName}
                    onChange={handleChange}
                    className="w-full px-4 py-3 rounded-xl bg-surface border border-border-custom text-text-main placeholder-text-muted focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all text-xs"
                    placeholder="Enter your full name"
                    required
                  />
                  {errors.fullName && (
                    <span className="text-xs text-rose-600 mt-1.5 block font-semibold">{errors.fullName}</span>
                  )}
                </div>

                <div>
                  <label className="block text-[10px] text-text-sub font-bold uppercase tracking-wider mb-2">
                    Email Address
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    className="w-full px-4 py-3 rounded-xl bg-surface border border-border-custom text-text-main placeholder-text-muted focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all text-xs"
                    placeholder="example@domain.com"
                    required
                  />
                  {errors.email && (
                    <span className="text-xs text-rose-600 mt-1.5 block font-semibold">{errors.email}</span>
                  )}
                </div>

                <div>
                  <label className="block text-[10px] text-text-sub font-bold uppercase tracking-wider mb-2">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    className="w-full px-4 py-3 rounded-xl bg-surface border border-border-custom text-text-main placeholder-text-muted focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all text-xs"
                    placeholder="+91 98765 43210"
                    required
                  />
                  {errors.phone && (
                    <span className="text-xs text-rose-600 mt-1.5 block font-semibold">{errors.phone}</span>
                  )}
                </div>

                <div>
                  <label className="block text-[10px] text-text-sub font-bold uppercase tracking-wider mb-2">
                    Password
                  </label>
                  <input
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    className="w-full px-4 py-3 rounded-xl bg-surface border border-border-custom text-text-main placeholder-text-muted focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all text-xs"
                    placeholder="••••••••"
                    required
                  />
                  {errors.password && (
                    <span className="text-xs text-rose-600 mt-1.5 block font-semibold">{errors.password}</span>
                  )}
                </div>

                <div>
                  <label className="block text-[10px] text-text-sub font-bold uppercase tracking-wider mb-2">
                    Confirm Password
                  </label>
                  <input
                    type="password"
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    className="w-full px-4 py-3 rounded-xl bg-surface border border-border-custom text-text-main placeholder-text-muted focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all text-xs"
                    placeholder="••••••••"
                    required
                  />
                  {errors.confirmPassword && (
                    <span className="text-xs text-rose-600 mt-1.5 block font-semibold">{errors.confirmPassword}</span>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3.5 rounded-full bg-primary hover:bg-primary-hover text-text-on-dark text-xs font-bold transition-all flex items-center justify-center gap-2 mt-8 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <>
                      <svg className="animate-spin h-4 w-4 text-text-on-dark" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      <span>Creating Account...</span>
                    </>
                  ) : (
                    <span>Create Account</span>
                  )}
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
