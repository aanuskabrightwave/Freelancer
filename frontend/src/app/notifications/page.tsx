"use client";

import React, { useState, useEffect } from "react";
import { Bell, CheckSquare, ChevronLeft, ChevronRight, Inbox, Loader2 } from "lucide-react";
import Container from "@/components/ui/Container";
import PageHeader from "@/components/ui/PageHeader";
import NotificationItem from "@/components/notifications/NotificationItem";
import { NotificationItemData, notificationService } from "@/services/notification.service";
import LoadingState from "@/components/common/LoadingState";

type TypeFilter = "ALL" | "BOOKING" | "MESSAGE" | "PAYMENT" | "DELIVERY" | "REVIEW" | "PROPOSAL";

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<NotificationItemData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [page, setPage] = useState<number>(1);
  const [unreadOnly, setUnreadOnly] = useState<boolean>(false);
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("ALL");
  const [hasMore, setHasMore] = useState<boolean>(true);
  const pageSize = 15;

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const filterVal = typeFilter === "ALL" ? undefined : typeFilter;
      const res = await notificationService.getNotifications(page, pageSize, unreadOnly, filterVal);
      setNotifications(res);
      setHasMore(res.length === pageSize);
    } catch (err) {
      console.error("Failed to load notifications", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, [page, unreadOnly, typeFilter]);

  const handleMarkAllRead = async () => {
    try {
      await notificationService.markAllRead();
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    } catch (err) {
      console.error("Failed to mark all read", err);
    }
  };

  const handleItemMarkedRead = (id: number) => {
    setNotifications(prev =>
      prev.map(n => (n.id === id ? { ...n, is_read: true } : n))
    );
  };

  // Grouping notifications helper
  const getGroupedNotifications = () => {
    const today: NotificationItemData[] = [];
    const yesterday: NotificationItemData[] = [];
    const earlier: NotificationItemData[] = [];

    const now = new Date();
    const todayStr = now.toDateString();
    
    const yesterdayDate = new Date();
    yesterdayDate.setDate(now.getDate() - 1);
    const yesterdayStr = yesterdayDate.toDateString();

    notifications.forEach(n => {
      const nDate = new Date(n.created_at);
      const nDateStr = nDate.toDateString();

      if (nDateStr === todayStr) {
        today.push(n);
      } else if (nDateStr === yesterdayStr) {
        yesterday.push(n);
      } else {
        earlier.push(n);
      }
    });

    return { today, yesterday, earlier };
  };

  const { today, yesterday, earlier } = getGroupedNotifications();
  const filterTabs: { label: string; value: TypeFilter }[] = [
    { label: "All", value: "ALL" },
    { label: "Bookings", value: "BOOKING" },
    { label: "Messages", value: "MESSAGE" },
    { label: "Payments", value: "PAYMENT" },
    { label: "Deliveries", value: "DELIVERY" },
    { label: "Reviews", value: "REVIEW" },
    { label: "Proposals", value: "PROPOSAL" }
  ];

  return (
    <Container className="py-8">
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <PageHeader
            title="Notification Center"
            description="Manage your project alerts, booking updates, workspace messages, and transactional updates."
          />
          <div className="flex items-center gap-3">
            {/* Unread Only Toggle */}
            <button
              onClick={() => { setUnreadOnly(!unreadOnly); setPage(1); }}
              className={`px-4 py-2 border rounded-xl text-xs font-bold transition ${
                unreadOnly 
                  ? "bg-primary border-primary text-text-on-dark" 
                  : "bg-surface border-border-custom text-text-sub hover:text-text-main"
              }`}
            >
              Unread Only
            </button>
            {/* Mark All Read */}
            <button
              onClick={handleMarkAllRead}
              className="flex items-center gap-1.5 px-4 py-2 bg-surface border border-border-custom hover:bg-surface-elevated rounded-xl text-xs font-bold text-text-main transition"
            >
              <CheckSquare className="w-4 h-4 text-primary" />
              Mark All Read
            </button>
          </div>
        </div>

        {/* Filters Grid */}
        <div className="flex flex-wrap gap-2 pb-2 border-b border-border-custom">
          {filterTabs.map(tab => (
            <button
              key={tab.value}
              onClick={() => { setTypeFilter(tab.value); setPage(1); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition ${
                typeFilter === tab.value
                  ? "bg-primary/10 text-primary border border-primary/20"
                  : "text-text-sub hover:text-text-main border border-transparent"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        {loading ? (
          <LoadingState message="Fetching notifications..." />
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 bg-surface border border-border-custom rounded-3xl text-center p-6 shadow-xs">
            <Inbox className="w-16 h-16 text-text-muted/20 mb-4" />
            <h3 className="font-bold text-lg text-text-main mb-2">No notifications yet</h3>
            <p className="text-sm text-text-sub max-w-sm">
              Important project status changes, booking invites, payment captures, and deliveries will show up here.
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Today Group */}
            {today.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-xs font-black uppercase text-primary/80 tracking-wider">Today</h3>
                <div className="grid grid-cols-1 gap-3">
                  {today.map(n => (
                    <NotificationItem key={n.id} notification={n} onMarkRead={handleItemMarkedRead} />
                  ))}
                </div>
              </div>
            )}

            {/* Yesterday Group */}
            {yesterday.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-xs font-black uppercase text-text-muted tracking-wider">Yesterday</h3>
                <div className="grid grid-cols-1 gap-3">
                  {yesterday.map(n => (
                    <NotificationItem key={n.id} notification={n} onMarkRead={handleItemMarkedRead} />
                  ))}
                </div>
              </div>
            )}

            {/* Earlier Group */}
            {earlier.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-xs font-black uppercase text-text-muted tracking-wider">Earlier</h3>
                <div className="grid grid-cols-1 gap-3">
                  {earlier.map(n => (
                    <NotificationItem key={n.id} notification={n} onMarkRead={handleItemMarkedRead} />
                  ))}
                </div>
              </div>
            )}

            {/* Pagination Controls */}
            <div className="flex items-center justify-between border-t border-border-custom pt-6">
              <button
                disabled={page === 1}
                onClick={() => setPage(prev => Math.max(1, prev - 1))}
                className="flex items-center gap-1.5 px-4 py-2 border border-border-custom bg-surface disabled:opacity-30 disabled:cursor-not-allowed hover:bg-surface-elevated rounded-xl text-xs font-bold text-text-main transition"
              >
                <ChevronLeft className="w-4 h-4" />
                Previous Page
              </button>
              <span className="text-xs text-text-sub">Page {page}</span>
              <button
                disabled={!hasMore}
                onClick={() => setPage(prev => prev + 1)}
                className="flex items-center gap-1.5 px-4 py-2 border border-border-custom bg-surface disabled:opacity-30 disabled:cursor-not-allowed hover:bg-surface-elevated rounded-xl text-xs font-bold text-text-main transition"
              >
                Next Page
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </Container>
  );
}
