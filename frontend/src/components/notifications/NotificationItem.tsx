"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { 
  FileText, 
  Calendar, 
  MessageSquare, 
  CreditCard, 
  Download, 
  Star, 
  Wallet, 
  Info, 
  Settings,
  Bell
} from "lucide-react";
import { NotificationItemData, notificationService } from "@/services/notification.service";

interface NotificationItemProps {
  notification: NotificationItemData;
  onMarkRead?: (id: number) => void;
}

export default function NotificationItem({ notification, onMarkRead }: NotificationItemProps) {
  const router = useRouter();

  // Helper to resolve icon type
  const getIcon = (type: string) => {
    switch (type.toUpperCase()) {
      case "PROPOSAL":
        return <FileText className="w-5 h-5 text-purple-600" />;
      case "BOOKING":
        return <Calendar className="w-5 h-5 text-blue-600" />;
      case "MESSAGE":
        return <MessageSquare className="w-5 h-5 text-green-600" />;
      case "PAYMENT":
        return <CreditCard className="w-5 h-5 text-amber-600" />;
      case "DELIVERY":
      case "REVISION":
        return <Download className="w-5 h-5 text-primary" />;
      case "REVIEW":
        return <Star className="w-5 h-5 text-pink-600" fill="currentColor" />;
      case "PAYOUT":
        return <Wallet className="w-5 h-5 text-emerald-600" />;
      case "ACCOUNT":
      case "SYSTEM":
        return <Info className="w-5 h-5 text-cyan-600" />;
      default:
        return <Bell className="w-5 h-5 text-text-muted" />;
    }
  };

  // Human-friendly relative time
  const getRelativeTime = (dateStr: string) => {
    try {
      const now = new Date();
      const past = new Date(dateStr);
      const diffMs = now.getTime() - past.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffMins < 1) return "Just now";
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays === 1) return "Yesterday";
      if (diffDays < 7) return `${diffDays}d ago`;
      
      return past.toLocaleDateString(undefined, { month: "short", day: "numeric" });
    } catch {
      return "Some time ago";
    }
  };

  const handleClick = async () => {
    if (!notification.is_read) {
      try {
        await notificationService.markRead(notification.id);
        if (onMarkRead) {
          onMarkRead(notification.id);
        }
      } catch (err) {
        console.error("Failed to mark notification read", err);
      }
    }
    
    if (notification.action_url) {
      router.push(notification.action_url);
    }
  };

  return (
    <div
      id={`notification-item-${notification.id}`}
      onClick={handleClick}
      className={`flex items-start gap-4 p-4 border rounded-xl cursor-pointer transition-all duration-300 ${
        notification.is_read
          ? "bg-surface border-border-custom hover:bg-surface-elevated"
          : "bg-primary/5 border-primary/20 hover:bg-primary/10 shadow-xs"
      }`}
    >
      {/* Icon Badge */}
      <div className="flex-shrink-0 p-2.5 bg-surface-elevated border border-border-custom rounded-xl">
        {getIcon(notification.notification_type)}
      </div>

      {/* Text Context */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 mb-1">
          <span className="font-bold text-sm text-text-main truncate">
            {notification.title}
          </span>
          <span className="text-xs text-text-muted whitespace-nowrap">
            {getRelativeTime(notification.created_at)}
          </span>
        </div>
        <p className="text-xs text-text-sub leading-relaxed break-words line-clamp-2">
          {notification.message}
        </p>
      </div>

      {/* Unread Indicator */}
      {!notification.is_read && (
        <span className="flex-shrink-0 w-2.5 h-2.5 bg-primary rounded-full animate-pulse self-center" />
      )}
    </div>
  );
}
