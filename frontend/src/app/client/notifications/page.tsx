"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { notificationService, NotificationItemData } from "@/services/notification.service";
import {
  Bell,
  CheckCircle,
  FileText,
  Clock,
  MessageSquare,
  CreditCard,
  Briefcase,
  AlertCircle,
  ChevronRight,
  ExternalLink
} from "lucide-react";

export default function ClientNotificationsPage() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<NotificationItemData[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"ALL" | "UNREAD">("ALL");

  async function loadData() {
    try {
      setLoading(true);
      setErrorMsg(null);
      
      const list = await notificationService.getNotifications(1, 50, activeTab === "UNREAD");
      const unread = await notificationService.getUnreadCount();
      
      setNotifications(list);
      setUnreadCount(unread.count);
    } catch (err) {
      setErrorMsg("We couldn't load your notifications.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const handleMarkRead = async (n: NotificationItemData) => {
    if (n.is_read) {
      // Direct navigation if already read
      triggerNavigation(n);
      return;
    }
    try {
      await notificationService.markRead(n.id);
      // Refresh count and item state
      setNotifications(prev =>
        prev.map(item => item.id === n.id ? { ...item, is_read: true } : item)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
      triggerNavigation(n);
    } catch (err) {
      console.error("Failed to mark notification read", err);
      // Fallback navigation
      triggerNavigation(n);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationService.markAllRead();
      setNotifications(prev => prev.map(item => ({ ...item, is_read: true })));
      setUnreadCount(0);
      alert("All notifications marked as read.");
    } catch (err) {
      alert("Failed to mark all as read.");
    }
  };

  // Safe Deep Link Resolver (Part 23 & 24)
  const triggerNavigation = (n: NotificationItemData) => {
    const type = n.entity_type;
    const id = n.entity_id;

    if (!type || !id) return;

    if (type === "BOOKING") {
      router.push(`/client/bookings/${id}`);
    } else if (type === "PROJECT") {
      router.push(`/client/projects/${id}`);
    } else if (type === "CONVERSATION" || type === "MESSAGE" || n.notification_type === "ADMIN_MESSAGE") {
      router.push(`/client/dashboard`);
    } else if (type === "DELIVERY") {
      router.push("/client/deliveries");
    } else if (type === "REVIEW") {
      router.push("/client/reviews");
    } else if (type === "PAYMENT") {
      router.push(`/client/bookings/${id}/payment`);
    }
  };

  // Terminology Translation Helper (Part 19 & 22)
  const getFriendlyWording = (n: NotificationItemData) => {
    let title = n.title;
    let message = n.message;

    // Rewrite Title enums or descriptions
    if (title === "REPLACEMENT_APPROVAL_REQUIRED" || title.includes("Replacement")) {
      title = "Professional approval needed";
      message = "Please review the professional proposed for your booking.";
    }

    // Direct Freelancer wording cleanup
    if (message.toLowerCase().includes("freelancer sent you a message")) {
      message = "Our team sent you a message.";
    }
    if (message.toLowerCase().includes("freelancer submitted work")) {
      message = "Your final delivery is ready.";
    }
    if (message.toLowerCase().includes("new proposal") || message.toLowerCase().includes("freelancer applied")) {
      message = "Your project is being reviewed.";
    }
    if (message.toLowerCase().includes("proposal accepted")) {
      message = "A professional has been proposed for your booking.";
    }
    if (message.toLowerCase().includes("contact your freelancer")) {
      message = "Message your booking coordinator.";
    }

    return { title, message };
  };

  // Notification Icon Helper
  const getNotificationIcon = (n: NotificationItemData) => {
    const t = n.entity_type;
    switch (t) {
      case "BOOKING":
        return <Briefcase className="w-4 h-4 text-blue-450" />;
      case "PROJECT":
        return <Briefcase className="w-4 h-4 text-purple-450" />;
      case "PAYMENT":
        return <CreditCard className="w-4 h-4 text-emerald-450" />;
      case "DELIVERY":
        return <FileText className="w-4 h-4 text-pink-450" />;
      case "CONVERSATION":
      case "MESSAGE":
        return <MessageSquare className="w-4 h-4 text-indigo-450" />;
      default:
        return <Bell className="w-4 h-4 text-text-muted" />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background py-10 px-4 md:px-8 font-sans">
        <div className="max-w-4xl mx-auto space-y-6 animate-pulse">
          <div className="bg-surface border border-border-custom rounded-3xl p-6 h-32 flex flex-col justify-between">
            <div className="w-1/3 h-5 bg-surface-elevated rounded"></div>
            <div className="w-1/2 h-3 bg-surface-elevated rounded"></div>
          </div>
          <div className="h-48 bg-surface rounded-3xl border border-border-custom"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-text-main py-10 px-4 md:px-8 font-sans">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* Header Block */}
        <div className="bg-surface border border-border-custom rounded-3xl p-6 shadow-xl backdrop-blur-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-xl md:text-2xl font-black text-text-main">Notifications</h1>
            <p className="text-text-sub text-xs mt-1">
              Stay updated on bookings, projects, payments, messages and deliveries.
            </p>
          </div>
          
          <div className="flex gap-2 shrink-0">
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="px-4 py-2 bg-surface-elevated hover:bg-surface border border-border-custom text-[10px] font-black uppercase tracking-wider rounded-xl transition cursor-pointer"
              >
                Mark all read
              </button>
            )}
            <Link
              href="/client/dashboard"
              className="px-4 py-2 bg-primary hover:bg-primary-hover text-text-on-dark text-[10px] font-black uppercase tracking-wider rounded-xl transition cursor-pointer text-center"
            >
              Dashboard
            </Link>
          </div>
        </div>

        {errorMsg && (
          <div className="bg-rose-500/10 border border-rose-500/20 text-rose-300 rounded-xl p-4 text-xs">
            {errorMsg}
          </div>
        )}

        {/* Tab filters */}
        <div className="flex gap-2 pb-2 border-b border-border-custom">
          <button
            onClick={() => setActiveTab("ALL")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition border cursor-pointer ${
              activeTab === "ALL"
                ? "bg-primary text-text-on-dark border-primary"
                : "bg-surface hover:bg-surface-elevated text-text-sub border-border-custom"
            }`}
          >
            All Updates
          </button>
          <button
            onClick={() => setActiveTab("UNREAD")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition border cursor-pointer flex items-center gap-1.5 ${
              activeTab === "UNREAD"
                ? "bg-primary text-text-on-dark border-primary"
                : "bg-surface hover:bg-surface-elevated text-text-sub border-border-custom"
            }`}
          >
            <span>Unread</span>
            {unreadCount > 0 && (
              <span className="bg-rose-600 text-text-on-dark px-1.5 py-0.2 rounded-full text-[9px] font-bold">
                {unreadCount}
              </span>
            )}
          </button>
        </div>

        {/* Notifications list */}
        <div className="bg-surface border border-border-custom rounded-3xl p-6 shadow-xl space-y-4">
          {notifications.length > 0 ? (
            <div className="divide-y divide-border-custom/30">
              {notifications.map((n) => {
                const { title, message } = getFriendlyWording(n);
                return (
                  <div
                    key={n.id}
                    onClick={() => handleMarkRead(n)}
                    className={`py-4 flex gap-4 items-start cursor-pointer hover:bg-surface-elevated/10 px-3 rounded-2xl transition duration-150 relative ${
                      !n.is_read ? "bg-primary/5 border border-primary/10" : ""
                    }`}
                  >
                    {/* Unread circle pip indicator */}
                    {!n.is_read && (
                      <span className="absolute top-4 left-3 w-1.5 h-1.5 bg-primary rounded-full"></span>
                    )}

                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center border shrink-0 ${
                      !n.is_read ? "bg-primary/10 border-primary/20" : "bg-surface-elevated border-border-custom"
                    }`}>
                      {getNotificationIcon(n)}
                    </div>

                    <div className="space-y-1 flex-1 min-w-0">
                      <div className="flex justify-between items-start gap-4">
                        <h4 className={`text-xs font-extrabold truncate ${!n.is_read ? "text-text-main" : "text-text-sub"}`}>
                          {title}
                        </h4>
                        <span className="text-[9px] text-text-muted shrink-0 font-mono">
                          {new Date(n.created_at).toLocaleDateString("en-IN")}
                        </span>
                      </div>
                      <p className="text-[11px] text-text-sub leading-relaxed font-medium">
                        {message}
                      </p>
                    </div>

                    <ChevronRight className="w-4 h-4 text-text-muted shrink-0 mt-2" />
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="py-24 text-center text-text-muted flex flex-col justify-center items-center space-y-4">
              <Bell className="w-10 h-10 text-text-muted" />
              <div>
                <h3 className="font-bold text-text-main text-sm">You're all caught up</h3>
                <p className="text-xs text-text-sub mt-1 max-w-xs mx-auto">
                  Updates about your bookings and projects will appear here.
                </p>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
