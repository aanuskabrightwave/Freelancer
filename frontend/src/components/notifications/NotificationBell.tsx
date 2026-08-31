"use client";

import React, { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell, CheckSquare } from "lucide-react";
import { NotificationItemData, notificationService } from "@/services/notification.service";
import NotificationItem from "./NotificationItem";

export default function NotificationBell() {
  const router = useRouter();
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [dropdownOpen, setDropdownOpen] = useState<boolean>(false);
  const [recentNotifications, setRecentNotifications] = useState<NotificationItemData[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Poll / fetch notifications and counts
  const fetchData = async () => {
    try {
      const countRes = await notificationService.getUnreadCount();
      setUnreadCount(countRes.count);

      if (dropdownOpen) {
        const listRes = await notificationService.getNotifications(1, 5);
        setRecentNotifications(listRes);
      }
    } catch (err) {
      console.error("Failed to load notifications overview", err);
    }
  };

  useEffect(() => {
    fetchData();
    // Poll every 30 seconds for new alerts
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [dropdownOpen]);

  // Click outside close
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
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
      console.error("Failed to mark all read", err);
    }
  };

  const handleItemMarkedRead = (id: number) => {
    setUnreadCount(prev => Math.max(0, prev - 1));
    setRecentNotifications(prev =>
      prev.map(n => (n.id === id ? { ...n, is_read: true } : n))
    );
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button Trigger */}
      <button
        id="notification-bell-trigger"
        onClick={() => setDropdownOpen(!dropdownOpen)}
        className="relative p-2.5 bg-white/5 border border-border-custom rounded-xl hover:bg-white/10 text-text-main/80 hover:text-text-main transition-all duration-300 focus:outline-none"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span 
            id="notification-bell-badge"
            className="absolute -top-1 -right-1 flex items-center justify-center min-w-5 h-5 px-1.5 bg-primary-hover border-2 border-border-custom text-[10px] font-black text-text-main rounded-full animate-bounce"
          >
            {unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Card */}
      {dropdownOpen && (
        <div 
          id="notification-bell-dropdown"
          className="absolute right-0 mt-3 w-80 md:w-96 bg-surface backdrop-blur-xl border border-border-custom rounded-2xl shadow-2xl z-50 overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-border-custom">
            <span className="font-bold text-sm text-text-main">Notifications</span>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="flex items-center gap-1.5 text-xs text-primary hover:text-indigo-300 font-bold transition-all"
              >
                <CheckSquare className="w-3.5 h-3.5" />
                Mark all read
              </button>
            )}
          </div>

          {/* List items */}
          <div className="max-h-[350px] overflow-y-auto p-2 space-y-1.5">
            {recentNotifications.length > 0 ? (
              recentNotifications.map(n => (
                <NotificationItem 
                  key={n.id} 
                  notification={n} 
                  onMarkRead={handleItemMarkedRead}
                />
              ))
            ) : (
              <div className="py-12 text-center text-text-main/40">
                <Bell className="w-8 h-8 mx-auto mb-2 text-text-main/10" />
                <p className="text-xs">No notifications yet</p>
              </div>
            )}
          </div>

          {/* Footer CTA */}
          <div className="p-3 bg-white/[0.01] border-t border-border-custom text-center">
            <Link
              href="/notifications"
              onClick={() => setDropdownOpen(false)}
              className="block text-xs font-bold text-primary hover:text-indigo-300 transition-all py-1.5 rounded-lg hover:bg-white/5"
            >
              View All Notifications
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
