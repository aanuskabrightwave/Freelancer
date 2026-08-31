import React, { useState, useEffect } from "react";
import { favouriteService } from "@/services/favourite.service";
import { useAuth } from "@/context/AuthContext";

interface FavouriteButtonProps {
  targetId: number | string;
  type: "freelancer" | "service";
  size?: "sm" | "md" | "lg";
  label?: string;
  onToggleSuccess?: (isSaved: boolean) => void;
}

export default function FavouriteButton({
  targetId,
  type,
  size = "md",
  label = "Save",
  onToggleSuccess,
}: FavouriteButtonProps) {
  const { user } = useAuth();
  const [isSaved, setIsSaved] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function checkSavedStatus() {
      if (!user || user.role !== "CLIENT") return;
      try {
        if (type === "freelancer") {
          const list = await favouriteService.getFavoriteFreelancers();
          const found = list.some((item) => String(item.freelancer_profile_id) === String(targetId));
          setIsSaved(found);
        } else {
          const list = await favouriteService.getFavoriteServices();
          const found = list.some((item) => String(item.service_id) === String(targetId));
          setIsSaved(found);
        }
      } catch (err) {
        console.error("Failed to fetch favorite status", err);
      }
    }
    checkSavedStatus();
  }, [targetId, type, user]);

  const handleToggle = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!user) {
      alert("Please login as a client to save items.");
      return;
    }
    if (user.role !== "CLIENT") {
      alert("Only clients can save freelancers or services.");
      return;
    }

    try {
      setLoading(true);
      if (isSaved) {
        if (type === "freelancer") {
          await favouriteService.unfavoriteFreelancer(targetId);
        } else {
          await favouriteService.unfavoriteService(targetId);
        }
        setIsSaved(false);
        if (onToggleSuccess) onToggleSuccess(false);
      } else {
        if (type === "freelancer") {
          await favouriteService.favoriteFreelancer(targetId);
        } else {
          await favouriteService.favoriteService(targetId);
        }
        setIsSaved(true);
        if (onToggleSuccess) onToggleSuccess(true);
      }
    } catch (err: any) {
      alert(err.message || "Failed to update saved list.");
    } finally {
      setLoading(false);
    }
  };

  const sizeClasses = {
    sm: "p-1.5 text-xs gap-1",
    md: "p-2 text-xs gap-1.5",
    lg: "p-2.5 text-sm gap-2",
  };

  const heartSize = {
    sm: "w-3.5 h-3.5",
    md: "w-4.5 h-4.5",
    lg: "w-5.5 h-5.5",
  };

  return (
    <button
      type="button"
      onClick={handleToggle}
      disabled={loading}
      className={`inline-flex items-center justify-center rounded-xl border border-border-custom bg-surface backdrop-blur text-text-sub hover:text-rose-500 hover:border-rose-950/30 transition shadow-sm ${
        sizeClasses[size]
      } ${loading ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill={isSaved ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={`${heartSize[size]} ${isSaved ? "text-rose-500" : ""}`}
      >
        <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
      </svg>
      {label && <span>{isSaved ? "Saved" : label}</span>}
    </button>
  );
}
