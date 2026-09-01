"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import {
  Bell,
  HelpCircle,
  MessageSquare,
  Plus,
  Search,
  User,
  Settings,
  LogOut,
  CheckSquare
} from "lucide-react";
import { notificationService, NotificationItemData } from "@/services/notification.service";
import HelpModal from "@/components/common/HelpModal";

export default function WorkspaceNavbar() {
  const { user, logout } = useAuth();
  const router = useRouter();

  // Search state
  const [searchQuery, setSearchQuery] = useState("");

  // UI state
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);

  // Notifications state
  const [unreadCount, setUnreadCount] = useState(0);
  const [recentNotifications, setRecentNotifications] = useState<NotificationItemData[]>([]);

  // Refs
  const notificationsRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);
  const createRef = useRef<HTMLDivElement>(null);

  // Fetch notifications count & list
  const fetchNotifications = async () => {
    try {
      const countRes = await notificationService.getUnreadCount();
      setUnreadCount(countRes.count);

      if (notificationsOpen) {
        const listRes = await notificationService.getNotifications(1, 5);
        setRecentNotifications(listRes);
      }
    } catch (err) {
      console.error("Failed to load notifications", err);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [notificationsOpen]);

  // Click outside to close dropdowns
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (notificationsRef.current && !notificationsRef.current.contains(event.target as Node)) {
        setNotificationsOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setProfileOpen(false);
      }
      if (createRef.current && !createRef.current.contains(event.target as Node)) {
        setCreateOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleMarkAllRead = async () => {
    try {
      await notificationService.markAllRead();
      setUnreadCount(0);
      setRecentNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    } catch (err) {
      console.error(err);
    }
  };

  const handleNotificationClick = async (notif: NotificationItemData) => {
    try {
      if (!notif.is_read) {
        await notificationService.markRead(notif.id);
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
      setNotificationsOpen(false);
      if (notif.action_url) {
        router.push(notif.action_url);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Global Search Submit
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    const query = searchQuery.trim().toLowerCase();
    const professions = [
      "photographer", "videographer", "video_editor", "photo_editor",
      "cinematographer", "drone_operator", "reel_editor",
      "motion_graphics_artist", "color_grader"
    ];

    // Check if query matches a profession
    const matchedProfession = professions.find(
      p => p.replace("_", " ") === query || p === query
    );

    if (matchedProfession) {
      router.push(`/freelancers?profession=${matchedProfession.toUpperCase()}`);
    } else {
      // Default to search by city on the talent exploration page
      router.push(`/freelancers?city=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const role = user?.role || "CLIENT";
  const initials = user?.full_name ? user.full_name.split(" ").map(n => n[0]).join("").substring(0, 2).toUpperCase() : "US";

  const getLogoHref = () => {
    if (!user) return "/";
    if (user.role === "CLIENT") return "/client/dashboard";
    if (user.role === "FREELANCER") return "/freelancer/dashboard";
    if (user.role === "ADMIN") return "/admin/dashboard";
    return "/";
  };

  return (
    <>
      <header className="sticky top-0 z-40 bg-surface border-b border-border-custom px-6 h-[120px] min-h-[120px] shrink-0 flex items-center justify-between font-sans">

        {/* LEFT: Logo */}
        <div className="flex items-center gap-6">
          <Link href={getLogoHref()} className="font-semibold text-sm uppercase tracking-widest text-text-main flex items-center gap-1">
            <span>Creative</span>
            <span className="w-1.5 h-1.5 bg-primary rounded-full"></span>
            <span>Market</span>
          </Link>
        </div>

        {/* CENTER: Global Search */}
        <form onSubmit={handleSearchSubmit} className="hidden md:flex items-center relative max-w-md w-full mx-4">
          <Search className="w-4 h-4 text-text-muted absolute left-4 pointer-events-none" />
          <input
            type="text"
            placeholder="Search creatives by city (e.g. Mumbai) or profession..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-11 pr-4 py-2.5 rounded-full bg-surface-elevated border border-border-custom text-text-main placeholder-text-muted text-xs focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
          />
        </form>

        {/* RIGHT: Action items */}
        <div className="flex items-center gap-6">

          {/* Quick Create Button */}
          <div className="relative" ref={createRef}>
            <button
              onClick={() => setCreateOpen(!createOpen)}
              className="flex items-center gap-1.5 px-5 py-2.5 bg-primary hover:bg-primary-hover text-text-on-dark text-xs font-bold rounded-full transition shadow-xs cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create</span>
            </button>

            {createOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-surface border border-border-custom rounded-2xl shadow-xl py-2 z-50 animate-in fade-in slide-in-from-top-1 duration-150 text-xs font-medium text-text-sub">
                {role === "CLIENT" ? (
                  <>
                    <button
                      onClick={() => { setCreateOpen(false); router.push("/client/bookings"); }}
                      className="w-full text-left px-4 py-2 hover:bg-surface-elevated hover:text-text-main transition"
                    >
                      Book a Service
                    </button>
                    <button
                      onClick={() => { setCreateOpen(false); router.push("/freelancers"); }}
                      className="w-full text-left px-4 py-2 hover:bg-surface-elevated hover:text-text-main transition"
                    >
                      Find Creative
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => { setCreateOpen(false); router.push("/freelancer/services/new"); }}
                      className="w-full text-left px-4 py-2 hover:bg-surface-elevated hover:text-text-main transition"
                    >
                      Create Service
                    </button>
                    <button
                      onClick={() => { setCreateOpen(false); router.push("/freelancer/profile"); }}
                      className="w-full text-left px-4 py-2 hover:bg-surface-elevated hover:text-text-main transition"
                    >
                      Edit Profile
                    </button>
                    <button
                      onClick={() => { setCreateOpen(false); router.push("/services"); }}
                      className="w-full text-left px-4 py-2 hover:bg-surface-elevated hover:text-text-main transition"
                    >
                      Browse Marketplace
                    </button>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Messages Link (Freelancers only) */}
          {role === "FREELANCER" && (
            <Link
              href="/freelancer/messages"
              className="p-2 text-text-muted hover:text-text-main rounded-full hover:bg-surface-elevated transition"
              title="Messages"
            >
              <MessageSquare className="w-4.5 h-4.5" />
            </Link>
          )}

          {/* Notifications Bell */}
          <div className="relative" ref={notificationsRef}>
            <button
              onClick={() => setNotificationsOpen(!notificationsOpen)}
              className="p-2 text-text-muted hover:text-text-main rounded-full hover:bg-surface-elevated transition relative cursor-pointer"
            >
              <Bell className="w-4.5 h-4.5" />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-primary rounded-full ring-2 ring-surface"></span>
              )}
            </button>

            {notificationsOpen && (
              <div className="absolute right-0 mt-2 w-80 bg-surface border border-border-custom rounded-2xl shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150">
                <div className="flex items-center justify-between p-4 border-b border-border-custom/50">
                  <span className="font-bold text-xs text-text-main">Recent Notifications</span>
                  {unreadCount > 0 && (
                    <button
                      onClick={handleMarkAllRead}
                      className="flex items-center gap-1 text-[10px] text-primary hover:underline font-bold transition cursor-pointer"
                    >
                      <CheckSquare className="w-3.5 h-3.5" />
                      Mark read
                    </button>
                  )}
                </div>

                <div className="max-h-64 overflow-y-auto divide-y divide-border-custom/30">
                  {recentNotifications.length > 0 ? (
                    recentNotifications.map(n => (
                      <button
                        key={n.id}
                        onClick={() => handleNotificationClick(n)}
                        className={`w-full p-4 text-left hover:bg-surface-elevated transition flex gap-3 text-xs ${!n.is_read ? "bg-primary/5 font-semibold" : ""
                          }`}
                      >
                        <div className="flex-grow space-y-1">
                          <p className="text-text-main leading-snug">{n.message}</p>
                          <span className="text-[9px] text-text-muted block">
                            {new Date(n.created_at).toLocaleDateString([], { month: "short", day: "numeric" })}
                          </span>
                        </div>
                      </button>
                    ))
                  ) : (
                    <div className="p-8 text-center text-text-muted text-xs">
                      No notifications yet
                    </div>
                  )}
                </div>

                <div className="p-2 border-t border-border-custom/50 bg-surface-elevated text-center">
                  <Link
                    href="/notifications"
                    onClick={() => setNotificationsOpen(false)}
                    className="block py-1.5 text-xs text-primary font-bold hover:underline"
                  >
                    View All Notifications →
                  </Link>
                </div>
              </div>
            )}
          </div>

          {/* Help Button */}
          <button
            onClick={() => setHelpOpen(true)}
            className="p-2 text-text-muted hover:text-text-main rounded-full hover:bg-surface-elevated transition cursor-pointer"
            title="Help & Support"
          >
            <HelpCircle className="w-4.5 h-4.5" />
          </button>

          {/* Profile Avatar Dropdown */}
          <div className="relative" ref={profileRef}>
            <button
              onClick={() => setProfileOpen(!profileOpen)}
              className="w-8 h-8 rounded-full bg-primary/10 hover:bg-primary/20 border border-border-custom flex items-center justify-center text-[10px] font-bold text-primary transition cursor-pointer"
            >
              {initials}
            </button>

            {profileOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-surface border border-border-custom rounded-2xl shadow-xl py-3 z-50 text-xs animate-in fade-in slide-in-from-top-1 duration-150">
                <div className="px-4 py-2 border-b border-border-custom/50 mb-2">
                  <p className="font-bold text-text-main truncate">{user?.full_name}</p>
                  <p className="text-[10px] text-text-muted capitalize">{role.toLowerCase()}</p>
                </div>

                <Link
                  href={role === "CLIENT" ? "/client/profile" : "/freelancer/profile"}
                  onClick={() => setProfileOpen(false)}
                  className="flex items-center gap-2 px-4 py-2 text-text-sub hover:text-text-main hover:bg-surface-elevated transition"
                >
                  <User className="w-3.5 h-3.5" />
                  <span>My Profile</span>
                </Link>

                <Link
                  href={role === "CLIENT" ? "/client/settings" : "/freelancer/settings"}
                  onClick={() => setProfileOpen(false)}
                  className="flex items-center gap-2 px-4 py-2 text-text-sub hover:text-text-main hover:bg-surface-elevated transition"
                >
                  <Settings className="w-3.5 h-3.5" />
                  <span>Settings</span>
                </Link>

                <button
                  onClick={() => { setProfileOpen(false); setHelpOpen(true); }}
                  className="w-full flex items-center gap-2 px-4 py-2 text-text-sub hover:text-text-main hover:bg-surface-elevated transition text-left cursor-pointer"
                >
                  <HelpCircle className="w-3.5 h-3.5" />
                  <span>Help & Support</span>
                </button>

                <div className="border-t border-border-custom/50 mt-2 pt-2">
                  <button
                    onClick={logout}
                    className="w-full flex items-center gap-2 px-4 py-2 text-primary hover:text-primary hover:bg-primary/5 transition text-left font-bold cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Logout</span>
                  </button>
                </div>
              </div>
            )}
          </div>

        </div>
      </header>

      {/* Embedded Help Modal */}
      <HelpModal isOpen={helpOpen} onClose={() => setHelpOpen(false)} />
    </>
  );
}
