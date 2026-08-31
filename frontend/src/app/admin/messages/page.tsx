"use client";

import React, { useEffect, useState, useRef, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { api, getMediaUrl } from "@/lib/api";

interface UserMiniOut {
  id: number;
  full_name: string;
  email: string;
}

interface FreelancerMiniOut {
  id: number;
  user_id: number;
  professional_title: string;
  full_name: string;
}

interface ConversationRoleContextOut {
  booking_id: number | null;
  booking_number: string | null;
  title: string | null;
  project_id: number | null;
  project_title: string | null;
  status: string | null;
  scheduled_date: string | null;
  start_time: string | null;
  end_time: string | null;
  location_city: string | null;
  venue_name: string | null;
  agreed_amount: string | null;
  freelancer_payout_amount: string | null;
  currency: string | null;
  assigned_creator_display_name: string | null;
  client_display_name: string | null;
  admin_display_name: string | null;
}

interface ManagedConversationListItem {
  id: number;
  conversation_type: string;
  booking_id: number | null;
  project_id: number | null;
  recipient_role: string;
  recipient_name: string;
  recipient_user_id: number | null;
  latest_message: string | null;
  last_message_at: string | null;
  unread_count: number;
  context: ConversationRoleContextOut | null;
}

interface ManagedParticipantOut {
  id: number;
  user_id: number;
  full_name: string;
  role: string;
}

interface MessageAttachmentOut {
  id: number;
  file_name: string | null;
  file_url: string | null;
  file_size_bytes: number | null;
  mime_type: string | null;
}

interface ManagedMessageOut {
  id: number;
  conversation_id: number;
  sender_id: number;
  content: string | null;
  message_text: string | null;
  message_type: string;
  created_at: string;
  sender: {
    id: number;
    full_name: string;
    role: string;
  } | null;
  attachments: MessageAttachmentOut[];
}

interface ManagedConversationDetail {
  id: number;
  conversation_type: string;
  booking_id: number | null;
  project_id: number | null;
  recipient_role: string;
  recipient_name: string;
  unread_count: number;
  context: ConversationRoleContextOut | null;
  participants: ManagedParticipantOut[];
  messages: ManagedMessageOut[];
}

function MessagesContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const conversationParam = searchParams.get("conversation");

  // State
  const [conversations, setConversations] = useState<ManagedConversationListItem[]>([]);
  const [selectedConvo, setSelectedConvo] = useState<ManagedConversationDetail | null>(null);
  const [loadingList, setLoadingList] = useState<boolean>(true);
  const [loadingChat, setLoadingChat] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
  // Filters & Search
  const [filterTab, setFilterTab] = useState<"ALL" | "CLIENTS" | "FREELANCERS" | "UNREAD">("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Composer
  const [newMessage, setNewMessage] = useState<string>("");
  const [sending, setSending] = useState<boolean>(false);

  // Layout context sidebar
  const [showContextPanel, setShowContextPanel] = useState<boolean>(true);

  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch conversation lists
  const fetchConversationsList = async (selectIdAfterLoad?: number) => {
    try {
      const data = await api.get<ManagedConversationListItem[]>("/admin/conversations");
      setConversations(data);
      
      const bookingIdParam = searchParams.get("booking_id");
      const roleParam = searchParams.get("role");

      let activeId = selectIdAfterLoad || (conversationParam ? parseInt(conversationParam) : null);
      if (!activeId && bookingIdParam && roleParam) {
        const bid = parseInt(bookingIdParam);
        const typeMatch = roleParam === "CLIENT" ? "CLIENT_ADMIN" : "FREELANCER_ADMIN";
        const found = data.find((c) => c.booking_id === bid && c.conversation_type === typeMatch);
        if (found) {
          activeId = found.id;
        }
      }

      if (activeId) {
        // Verify conversation is in list
        const match = data.find((c) => c.id === activeId);
        if (match) {
          fetchChatDetail(activeId);
        }
      }
    } catch (err: any) {
      setError(err.message || "We couldn't load mediated conversations list. Please try again.");
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => {
    fetchConversationsList();
  }, []);

  // Sync with search parameter changes
  useEffect(() => {
    if (conversationParam) {
      const cid = parseInt(conversationParam);
      if (cid && (!selectedConvo || selectedConvo.id !== cid)) {
        fetchChatDetail(cid);
      }
    } else {
      setSelectedConvo(null);
    }
  }, [conversationParam]);

  // Fetch active conversation messages and detail
  const fetchChatDetail = async (cid: number) => {
    setLoadingChat(true);
    try {
      const data = await api.get<ManagedConversationDetail>(`/messages/conversations/${cid}`);
      setSelectedConvo(data);
      
      // Auto-scroll to bottom
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 50);

      // Trigger Mark as Read
      if (data.unread_count > 0) {
        await api.post(`/messages/conversations/${cid}/read`, {});
        // Decrease/clear locally in list
        setConversations((prev) =>
          prev.map((c) => (c.id === cid ? { ...c, unread_count: 0 } : c))
        );
      }
    } catch (err: any) {
      console.error("Error loading conversation detail:", err);
    } finally {
      setLoadingChat(false);
    }
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!selectedConvo || !newMessage.trim() || sending) return;
    setSending(true);
    try {
      const sent = await api.post<ManagedMessageOut>(`/messages/conversations/${selectedConvo.id}/messages`, {
        content: newMessage.trim()
      });
      setSelectedConvo((prev) => {
        if (!prev) return null;
        return { ...prev, messages: [...prev.messages, sent] };
      });
      setNewMessage("");
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 50);

      // Refresh list to update latest preview and activity timestamps
      fetchConversationsList(selectedConvo.id);
    } catch (err: any) {
      alert("Message couldn't be sent. Try again.");
    } finally {
      setSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatCurrency = (val: string | number | null) => {
    if (!val) return "N/A";
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0
    }).format(typeof val === "string" ? parseFloat(val || "0") : val);
  };

  const formatDate = (isoStr: string | null) => {
    if (!isoStr) return "N/A";
    try {
      const date = new Date(isoStr);
      return date.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
    } catch {
      return "N/A";
    }
  };

  // Filtering Conversations
  const filteredConvos = conversations.filter((c) => {
    // 1. Role Tabs filters
    if (filterTab === "CLIENTS" && c.conversation_type !== "CLIENT_ADMIN") return false;
    if (filterTab === "FREELANCERS" && c.conversation_type !== "FREELANCER_ADMIN") return false;
    if (filterTab === "UNREAD" && c.unread_count === 0) return false;

    // 2. Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = c.recipient_name.toLowerCase().includes(q);
      const matchRef = c.context?.booking_number?.toLowerCase().includes(q) || false;
      const matchTitle = c.context?.title?.toLowerCase().includes(q) || false;
      return matchName || matchRef || matchTitle;
    }

    return true;
  });

  const getEmptyStateMessage = () => {
    if (filterTab === "CLIENTS") return "No Client conversations found.";
    if (filterTab === "FREELANCERS") return "No Freelancer conversations found.";
    if (filterTab === "UNREAD") return "You're all caught up.";
    return "No conversations yet.";
  };

  const getEmptyStateSubtitle = () => {
    return "Client conversations appear after booking/project submission, and Freelancer conversations appear after assignment.";
  };

  return (
    <div className="flex h-[calc(100vh-64px)] bg-background text-text-main font-sans overflow-hidden">
      
      {/* 1. Left Conversation Sidebar */}
      <div className="w-80 border-r border-border-custom bg-surface-elevated flex flex-col h-full min-w-[320px]">
        {/* Search & Tabs filters */}
        <div className="p-4 border-b border-border-custom space-y-3">
          <input
            type="text"
            placeholder="Search name, ref, project..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-surface border border-border-custom text-text-main text-xs rounded-full px-4 py-2.5 focus:ring-1 focus:ring-primary focus:outline-none placeholder-text-muted"
          />
          <div className="flex bg-surface p-1 rounded-full border border-border-custom/80 text-[10px] font-bold">
            {(["ALL", "CLIENTS", "FREELANCERS", "UNREAD"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setFilterTab(tab)}
                className={`flex-1 py-1.5 rounded-full text-[9px] uppercase tracking-wider transition-all cursor-pointer ${
                  filterTab === tab
                    ? "bg-primary text-text-on-dark shadow"
                    : "text-text-sub hover:text-text-main"
                }`}
              >
                {tab === "ALL" ? "All" : tab === "CLIENTS" ? "Clients" : tab === "FREELANCERS" ? "Creators" : "Unread"}
              </button>
            ))}
          </div>
        </div>

        {/* Conversation List */}
        <div className="flex-1 overflow-y-auto divide-y divide-border-custom/30 min-h-0">
          {loadingList ? (
            <div className="p-4 space-y-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="flex gap-3 items-center animate-pulse">
                  <div className="w-10 h-10 rounded-full bg-surface"></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-3 bg-surface rounded w-1/3"></div>
                    <div className="h-2.5 bg-surface rounded w-2/3"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : filteredConvos.length > 0 ? (
            filteredConvos.map((convo) => {
              const isActive = selectedConvo?.id === convo.id;
              const isClient = convo.conversation_type === "CLIENT_ADMIN";
              return (
                <div
                  key={convo.id}
                  onClick={() => router.push(`/admin/messages?conversation=${convo.id}`)}
                  className={`p-4 flex gap-3 cursor-pointer hover:bg-surface/40 transition-all ${
                    isActive ? "bg-surface" : ""
                  }`}
                >
                  {/* Initials circle */}
                  <div className="w-10 h-10 rounded-full bg-surface border border-border-custom flex items-center justify-center font-bold text-xs text-text-muted select-none flex-shrink-0">
                    {convo.recipient_name[0]}
                  </div>

                  {/* Body */}
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex justify-between items-center">
                      <h4 className="text-xs font-bold text-text-main truncate w-3/4">
                        {convo.recipient_name}
                      </h4>
                      <span className={`text-[8px] px-1.5 py-0.2 border rounded uppercase tracking-wider font-bold ${
                        isClient
                          ? "bg-primary/20 border-primary/30 text-primary"
                          : "bg-indigo-950 border-indigo-900 text-indigo-300"
                      }`}>
                        {isClient ? "Client" : "Creator"}
                      </span>
                    </div>

                    {convo.context?.booking_number && (
                      <p className="text-[9px] text-text-muted font-bold tracking-wide">
                        {convo.context.booking_number} • {convo.context.title || convo.context.project_title || "Brief"}
                      </p>
                    )}

                    <p className="text-[10px] text-text-sub truncate font-medium">
                      {convo.latest_message || <span className="italic text-text-muted">No messages yet</span>}
                    </p>

                    {convo.last_message_at && (
                      <span className="text-[8px] text-text-muted block mt-1">
                        {new Date(convo.last_message_at).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" })}
                      </span>
                    )}
                  </div>

                  {/* Unread dot badge */}
                  {convo.unread_count > 0 && (
                    <div className="w-5 h-5 rounded-full bg-primary text-text-on-dark text-[9px] font-bold flex items-center justify-center flex-shrink-0 self-center">
                      {convo.unread_count}
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <div className="p-8 text-center space-y-2">
              <p className="text-xs text-text-sub font-semibold">{getEmptyStateMessage()}</p>
              <p className="text-[10px] text-text-muted leading-relaxed">{getEmptyStateSubtitle()}</p>
            </div>
          )}
        </div>
      </div>

      {/* 2. Active Chat Detail Pane */}
      <div className="flex-1 flex flex-col h-full bg-background min-w-0">
        {selectedConvo ? (
          <div className="flex-grow flex h-full min-h-0 overflow-hidden">
            {/* Thread detail */}
            <div className="flex-1 flex flex-col h-full min-w-0">
              
              {/* Header Context panel recipient check (Part 8) */}
              <div className="p-4 border-b border-border-custom bg-surface-elevated flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-surface border border-border-custom flex items-center justify-center font-bold text-xs text-text-muted">
                    {selectedConvo.recipient_name[0]}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-xs font-bold text-text-main">{selectedConvo.recipient_name}</h3>
                      <span className={`text-[8px] px-1.5 py-0.2 border rounded uppercase tracking-wider font-bold ${
                        selectedConvo.conversation_type === "CLIENT_ADMIN"
                          ? "bg-primary/20 border-primary/30 text-primary"
                          : "bg-indigo-950 border-indigo-900 text-indigo-300"
                      }`}>
                        {selectedConvo.conversation_type === "CLIENT_ADMIN" ? "CLIENT THREAD" : "CREATOR THREAD"}
                      </span>
                    </div>
                    {selectedConvo.context?.booking_number && (
                      <p className="text-[9px] text-text-muted font-bold tracking-wide mt-0.5">
                        Context: {selectedConvo.context.booking_number} • {selectedConvo.context.title || "Project Brief"}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowContextPanel(!showContextPanel)}
                    className="px-3 py-1.5 border border-border-custom hover:bg-surface text-text-main text-[10px] font-bold rounded-full uppercase tracking-wider cursor-pointer"
                  >
                    {showContextPanel ? "Hide Details" : "Show Details"}
                  </button>
                  {selectedConvo.booking_id && (
                    <Link
                      href={`/admin/bookings/${selectedConvo.booking_id}`}
                      className="px-4 py-1.5 bg-primary hover:bg-primary-hover text-text-on-dark text-[10px] font-bold rounded-full uppercase tracking-wider cursor-pointer"
                    >
                      View Booking
                    </Link>
                  )}
                </div>
              </div>

              {/* Chat messages listing container (Part 11) */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4 min-h-0 bg-surface/10">
                {loadingChat ? (
                  <div className="text-center py-12 text-xs text-text-muted">Loading messages history...</div>
                ) : selectedConvo.messages && selectedConvo.messages.length > 0 ? (
                  selectedConvo.messages.map((msg) => {
                    const isAdmin = msg.sender?.role === "ADMIN";
                    return (
                      <div
                        key={msg.id}
                        className={`flex flex-col max-w-[75%] ${
                          isAdmin ? "ml-auto items-end" : "mr-auto items-start"
                        }`}
                      >
                        <span className="text-[8px] text-text-muted mb-0.5">
                          {msg.sender?.full_name || "Recipient"} • {new Date(msg.created_at).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" })}
                        </span>
                        <div
                          className={`p-3 rounded-2xl text-[11px] font-medium leading-relaxed ${
                            isAdmin
                              ? "bg-primary/20 text-primary border border-primary/30 rounded-tr-none"
                              : "bg-surface-elevated text-text-main border border-border-custom rounded-tl-none"
                          }`}
                        >
                          <p className="whitespace-pre-wrap break-all leading-relaxed">
                            {msg.content || msg.message_text}
                          </p>

                          {/* Render links wrap safely */}
                          {msg.content && msg.content.match(/https?:\/\/\S+/g) && (
                            <div className="mt-2 pt-2 border-t border-border-custom/25 space-y-1">
                              {msg.content.match(/https?:\/\/\S+/g)?.map((url, uidx) => (
                                <a
                                  key={uidx}
                                  href={url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-[10px] text-primary hover:underline block break-all font-semibold"
                                >
                                  🔗 {url}
                                </a>
                              ))}
                            </div>
                          )}

                          {/* Message attachments list */}
                          {msg.attachments && msg.attachments.length > 0 && (
                            <div className="mt-2 pt-2 border-t border-border-custom/20 space-y-1.5">
                              {msg.attachments.map((att) => (
                                <a
                                  key={att.id}
                                  href={att.file_url ? getMediaUrl(att.file_url) : "#"}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-2 p-2 bg-surface rounded-xl hover:bg-surface-elevated text-[10px] text-text-main font-semibold"
                                >
                                  <span>📎</span>
                                  <span className="truncate flex-1">{att.file_name || "Attachment File"}</span>
                                </a>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="py-24 text-center text-text-muted text-xs italic">
                    No messages in this conversation yet. Send a message below to start mediation.
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Message Composer (Part 15) */}
              <form onSubmit={handleSendMessage} className="p-4 border-t border-border-custom bg-surface-elevated flex gap-3 items-end">
                <textarea
                  rows={2}
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={handleKeyPress}
                  placeholder={`Write mediated message to ${selectedConvo.recipient_name}...`}
                  className="flex-grow bg-surface border border-border-custom text-text-main text-xs rounded-2xl p-3 focus:ring-1 focus:ring-primary focus:outline-none placeholder-text-muted resize-none font-medium"
                ></textarea>
                <button
                  type="submit"
                  disabled={!newMessage.trim() || sending}
                  className="px-5 py-2.5 bg-primary hover:bg-primary-hover text-text-on-dark text-[10px] font-bold rounded-full uppercase tracking-wider transition-all cursor-pointer disabled:opacity-50 h-[38px] flex items-center justify-center"
                >
                  {sending ? "Sending..." : "Send Message"}
                </button>
              </form>

            </div>

            {/* Collapsible Sidebar: Booking Context Info Panel (Part 9) */}
            {showContextPanel && selectedConvo.context && (
              <div className="w-80 border-l border-border-custom bg-surface-elevated p-6 overflow-y-auto space-y-6 hidden xl:block">
                <h4 className="text-xs font-bold text-text-main uppercase tracking-wider border-b border-border-custom pb-3">
                  Context Information
                </h4>

                <div className="space-y-4 text-xs font-semibold">
                  <div className="space-y-1">
                    <span className="text-[10px] text-text-muted uppercase font-bold block">Status</span>
                    <p className="text-primary font-bold uppercase">{selectedConvo.context.status?.replace(/_/g, " ")}</p>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[10px] text-text-muted uppercase font-bold block">Agreed Budget</span>
                    <p className="text-text-main font-bold">{formatCurrency(selectedConvo.context.agreed_amount)}</p>
                  </div>

                  {selectedConvo.context.freelancer_payout_amount && (
                    <div className="space-y-1">
                      <span className="text-[10px] text-text-muted uppercase font-bold block">Assigned Payout</span>
                      <p className="text-text-main font-bold">{formatCurrency(selectedConvo.context.freelancer_payout_amount)}</p>
                    </div>
                  )}

                  <div className="space-y-1">
                    <span className="text-[10px] text-text-muted uppercase font-bold block">Scheduled Date</span>
                    <p className="text-text-main">{formatDate(selectedConvo.context.scheduled_date)}</p>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[10px] text-text-muted uppercase font-bold block">Venue Address</span>
                    <p className="text-text-main">{selectedConvo.context.venue_name || "Remote / Digital"}</p>
                    <p className="text-[10px] text-text-sub">{selectedConvo.context.location_city}</p>
                  </div>

                  {selectedConvo.context.client_display_name && (
                    <div className="space-y-1 border-t border-border-custom/50 pt-3">
                      <span className="text-[10px] text-text-muted uppercase font-bold block">Client Name</span>
                      <p className="text-text-main font-medium">{selectedConvo.context.client_display_name}</p>
                    </div>
                  )}

                  {selectedConvo.context.assigned_creator_display_name && (
                    <div className="space-y-1">
                      <span className="text-[10px] text-text-muted uppercase font-bold block">Assigned Creator</span>
                      <p className="text-text-main font-medium">{selectedConvo.context.assigned_creator_display_name}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

          </div>
        ) : (
          <div className="flex-1 flex flex-col justify-center items-center p-8 text-center space-y-3">
            <div className="w-16 h-16 rounded-full bg-surface border border-border-custom flex items-center justify-center text-2xl">
              💬
            </div>
            <div>
              <h3 className="text-sm font-bold text-text-main">Mediated Chat Workspace</h3>
              <p className="text-xs text-text-sub max-w-sm mt-1">
                Select any Client support or Freelancer curation conversation thread from the sidebar panel.
              </p>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}

export default function AdminMessagesPage() {
  return (
    <Suspense fallback={
      <div className="p-8 text-center text-xs text-text-muted animate-pulse">
        Initializing workspace components...
      </div>
    }>
      <MessagesContent />
    </Suspense>
  );
}
