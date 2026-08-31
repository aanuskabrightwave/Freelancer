"use client";

import React, { useState, useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { getMediaUrl } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { messageService } from "@/services/message.service";
import {
  MessageSquare,
  Shield,
  FileText,
  Clock,
  ArrowLeft,
  Send,
  Sparkles,
  Search,
  ExternalLink,
  ChevronRight,
  Inbox,
  AlertCircle
} from "lucide-react";

type MessageFilter = "ALL" | "BOOKINGS" | "PROJECTS" | "UNREAD" | "LEGACY";

export function MessagesContent() {
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeParam = searchParams.get("active");

  const [conversations, setConversations] = useState<any[]>([]);
  const [activeConvoId, setActiveConvoId] = useState<number | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [replyText, setReplyText] = useState("");
  
  // Status states
  const [loading, setLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  // Filters and Search (Part 13, 14)
  const [activeFilter, setActiveFilter] = useState<MessageFilter>("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // Mobile layout state (Part 38)
  const [mobileShowChat, setMobileShowChat] = useState(false);

  const messagesContainerRef = useRef<HTMLDivElement>(null);

  // Load conversations list
  async function loadConversations(autoSelectId?: number) {
    try {
      const data = await messageService.getConversations();
      setConversations(data);
      
      // Select target ID if provided
      const targetId = autoSelectId || (activeParam ? parseInt(activeParam) : null);
      
      if (targetId) {
        if (data.some((c) => c.id === targetId)) {
          setActiveConvoId(targetId);
          if (autoSelectId || activeParam) {
            setMobileShowChat(true);
          }
        }
      } else if (data.length > 0 && !activeConvoId) {
        // Default select first CLIENT_ADMIN convo if available
        const firstAdminConvo = data.find(c => c.conversation_type === "CLIENT_ADMIN");
        if (firstAdminConvo) {
          setActiveConvoId(firstAdminConvo.id);
        } else {
          setActiveConvoId(data[0].id);
        }
      }
    } catch (err) {
      setErrorMsg("We couldn't load your conversations.");
    } finally {
      setLoading(false);
    }
  }

  // Load message logs for active conversation
  async function loadMessages(convoId: number, quiet = false) {
    try {
      if (!quiet) setMessagesLoading(true);
      const log = await messageService.getConversationMessages(convoId);
      setMessages(log);
    } catch (err) {
      // Quiet errors on poll
    } finally {
      if (!quiet) setMessagesLoading(false);
    }
  }

  useEffect(() => {
    if (user) {
      loadConversations();
    }
  }, [user, activeParam]);

  // Load messages when active convo changes & mark read (Part 16)
  useEffect(() => {
    if (activeConvoId) {
      loadMessages(activeConvoId);
      
      // Mark read API (only Client's read state changes)
      try {
        messageService.markConversationRead?.(activeConvoId);
      } catch (err) {
        // quiet read mark failure
      }
    }
  }, [activeConvoId]);

  // Real-time polling loop (every 4 seconds)
  useEffect(() => {
    if (!activeConvoId) return;

    const timer = setInterval(() => {
      loadMessages(activeConvoId, true);
    }, 4000);

    return () => clearInterval(timer);
  }, [activeConvoId]);

  // Scroll to bottom on new messages
  useEffect(() => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() || !activeConvoId || sending) return;

    try {
      setSending(true);
      const text = replyText;
      setReplyText("");
      const res = await messageService.sendMessage(activeConvoId, text);
      setMessages((prev) => [...prev, res]);
      
      // Refresh list to pull latest activity and move thread to top (Part 33)
      loadConversations(activeConvoId);
    } catch (err) {
      setErrorMsg("Your message couldn't be sent.");
    } finally {
      setSending(false);
    }
  };

  const getInitials = (name: string) => {
    if (!name) return "SP";
    const parts = name.trim().split(" ");
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  };

  const activeConvo = conversations.find((c) => c.id === activeConvoId);

  // Filter Conversations (Part 13)
  const filteredConversations = conversations.filter((convo) => {
    const isLegacy = convo.conversation_type === "DIRECT_LEGACY";
    const bookingId = convo.booking_id;
    const projectId = convo.project_id;
    
    // Filter matching
    if (activeFilter === "LEGACY") {
      if (!isLegacy) return false;
    } else {
      if (isLegacy) return false; // Hide legacy chats from normal filters
      if (activeFilter === "BOOKINGS" && !bookingId) return false;
      if (activeFilter === "PROJECTS" && !projectId) return false;
      if (activeFilter === "UNREAD" && convo.unread_count === 0) return false;
    }

    // Search query matching (Part 14)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const title = (convo.context?.title || convo.context?.project_title || "").toLowerCase();
      const ref = (convo.context?.booking_number || String(convo.project_id) || "").toLowerCase();
      const latest = (convo.latest_message || "").toLowerCase();
      return title.includes(q) || ref.includes(q) || latest.includes(q);
    }

    return true;
  });

  const getEmptyFilterMessage = () => {
    if (activeFilter === "BOOKINGS") return "No booking conversations found.";
    if (activeFilter === "PROJECTS") return "No project conversations found.";
    if (activeFilter === "UNREAD") return "You're all caught up.";
    if (activeFilter === "LEGACY") return "No legacy conversation history.";
    return "No conversations yet.";
  };

  const getFriendlyStatus = (status: string) => {
    return status.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
  };

  if (loading) {
    return (
      <div className="h-full w-full min-h-0 bg-background flex flex-col justify-center items-center text-text-main">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-64px)] w-full flex overflow-hidden bg-background text-text-main font-sans min-w-0">
      
      {/* 1. Conversations List Sidebar */}
      <div className={`w-full md:w-80 md:max-w-[320px] border-r border-border-custom bg-surface flex flex-col flex-shrink-0 min-h-0 ${
        mobileShowChat ? "hidden md:flex" : "flex"
      }`}>
        {/* Title */}
        <div className="p-5 border-b border-border-custom flex-shrink-0 space-y-3">
          <div>
            <h2 className="text-base font-black text-text-main">Messages</h2>
            <p className="text-text-sub text-[10px] mt-0.5">Communicate with our team about your bookings and projects.</p>
          </div>
          
          {/* Search bar */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-text-muted absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search ref or title..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-background border border-border-custom rounded-xl pl-9 pr-4 py-2 text-[10px] text-text-main focus:outline-none focus:border-primary placeholder-text-muted font-medium"
            />
          </div>
        </div>

        {/* Filters tabs (Part 13) */}
        <div className="flex gap-1 p-2 bg-surface-elevated/30 border-b border-border-custom flex-shrink-0 overflow-x-auto scrollbar-none">
          {(["ALL", "BOOKINGS", "PROJECTS", "UNREAD", "LEGACY"] as MessageFilter[]).map((filter) => {
            const hasLegacy = conversations.some(c => c.conversation_type === "DIRECT_LEGACY");
            if (filter === "LEGACY" && !hasLegacy) return null; // Hide legacy filter if no legacy chats exist
            
            return (
              <button
                key={filter}
                onClick={() => setActiveFilter(filter)}
                className={`px-2.5 py-1 rounded-lg text-[9px] font-bold uppercase shrink-0 transition cursor-pointer ${
                  activeFilter === filter
                    ? "bg-primary text-text-on-dark shadow-sm"
                    : "hover:bg-surface-elevated text-text-muted"
                }`}
              >
                {filter === "LEGACY" ? "History" : filter.toLowerCase()}
              </button>
            );
          })}
        </div>

        {/* Conversation Items List (Part 4) */}
        <div className="flex-1 overflow-y-auto overscroll-contain divide-y divide-border-custom/50 min-h-0">
          {filteredConversations.map((convo) => {
            const isSelected = convo.id === activeConvoId;
            const isLegacy = convo.conversation_type === "DIRECT_LEGACY";
            const contextTitle = convo.context?.title || convo.context?.project_title || "Direct Message";
            const contextRef = convo.context?.booking_number || (convo.project_id ? `Project #${convo.project_id}` : "");
            
            // Recipient labels (Part 5)
            const recipientLabel = isLegacy ? convo.recipient_name : "Marketplace Team";

            return (
              <button
                key={convo.id}
                onClick={() => {
                  setActiveConvoId(convo.id);
                  setMobileShowChat(true);
                }}
                className={`w-full p-4 text-left transition flex items-start gap-3 border-l-4 ${
                  isSelected 
                    ? "bg-surface-elevated border-primary" 
                    : "hover:bg-surface-elevated/45 border-transparent"
                }`}
              >
                <div className={`w-9 h-9 rounded-full shrink-0 flex items-center justify-center font-bold text-xs uppercase ${
                  isLegacy ? "bg-zinc-700 text-zinc-300" : "bg-primary/10 text-primary border border-primary/20"
                }`}>
                  {isLegacy ? getInitials(recipientLabel) : "MT"}
                </div>
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex justify-between items-center">
                    <h4 className="text-[11px] font-extrabold text-text-main truncate">{recipientLabel}</h4>
                    <span className="text-[8px] text-text-muted shrink-0">
                      {convo.last_message_at ? new Date(convo.last_message_at).toLocaleDateString() : ""}
                    </span>
                  </div>
                  
                  {/* Context context specifics */}
                  <div className="flex justify-between items-center text-[9px] text-primary font-bold">
                    <span className="truncate max-w-[120px]">{contextTitle}</span>
                    <span className="font-mono text-[8px] shrink-0">{contextRef}</span>
                  </div>

                  <p className="text-[10px] text-text-sub truncate leading-relaxed">
                    {convo.latest_message || "No messages yet."}
                  </p>

                  {/* Unread badge */}
                  {convo.unread_count > 0 && (
                    <span className="inline-block px-1.5 py-0.2 rounded-full bg-primary text-text-on-dark text-[8px] font-bold mt-1">
                      {convo.unread_count} new
                    </span>
                  )}
                </div>
              </button>
            );
          })}

          {filteredConversations.length === 0 && (
            <div className="py-20 text-center text-text-muted flex flex-col justify-center items-center p-4">
              <Inbox className="w-8 h-8 text-text-muted mb-2" />
              <h4 className="font-bold text-text-main text-[11px]">{getEmptyFilterMessage()}</h4>
              <p className="text-[9px] text-text-sub mt-1 max-w-[180px] mx-auto leading-relaxed">
                {activeFilter === "ALL" 
                  ? "When you submit a booking or project, your conversation with our team will appear here."
                  : "Try checking other filters or clear search query."}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* 2. Main Chat Panel */}
      <div className={`flex-1 flex flex-col bg-background min-w-0 min-h-0 ${
        mobileShowChat ? "flex" : "hidden md:flex"
      }`}>
        {activeConvo ? (
          <>
            {/* Header (Part 7) */}
            <div className="p-4 bg-surface border-b border-border-custom flex-shrink-0 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                {/* Back button on Mobile */}
                <button
                  onClick={() => setMobileShowChat(false)}
                  className="p-1 text-text-sub hover:text-text-main hover:bg-surface-elevated rounded-xl transition md:hidden cursor-pointer"
                  aria-label="Back to conversations list"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>

                <div className={`w-9 h-9 rounded-full shrink-0 flex items-center justify-center font-bold text-sm uppercase ${
                  activeConvo.conversation_type === "DIRECT_LEGACY" 
                    ? "bg-zinc-700 text-zinc-300"
                    : "bg-primary/10 text-primary border border-primary/20"
                }`}>
                  {activeConvo.conversation_type === "DIRECT_LEGACY" ? getInitials(activeConvo.recipient_name) : "MT"}
                </div>
                <div className="min-w-0">
                  <h3 className="text-xs font-black text-text-main flex items-center gap-1.5">
                    <span>{activeConvo.conversation_type === "DIRECT_LEGACY" ? activeConvo.recipient_name : "Marketplace Team"}</span>
                    {activeConvo.conversation_type === "DIRECT_LEGACY" && (
                      <span className="px-1.5 py-0.2 rounded-full bg-zinc-800 text-zinc-400 text-[7px] uppercase tracking-wider font-bold">Legacy Chat</span>
                    )}
                  </h3>
                  <p className="text-[9px] text-text-muted mt-0.5 truncate font-semibold">
                    {activeConvo.context?.title || activeConvo.context?.project_title || "General Support"}
                    {activeConvo.context?.booking_number && ` • Booking: ${activeConvo.context.booking_number}`}
                    {activeConvo.context?.project_id && ` • Project: #${activeConvo.context.project_id}`}
                  </p>
                </div>
              </div>

              {/* View details deep links (Part 8) */}
              <div className="shrink-0 flex items-center gap-2">
                {activeConvo.context?.status && (
                  <span className="hidden sm:inline-block px-2.5 py-0.5 rounded-full bg-surface-elevated border border-border-custom text-[8px] font-bold text-primary uppercase">
                    {getFriendlyStatus(activeConvo.context.status)}
                  </span>
                )}
                
                {activeConvo.booking_id && (
                  <Link
                    href={`/client/bookings/${activeConvo.booking_id}`}
                    className="px-3 py-1.5 bg-surface hover:bg-surface-elevated border border-border-custom text-[10px] font-bold rounded-xl transition flex items-center gap-1 cursor-pointer"
                  >
                    <span>View Booking</span>
                    <ChevronRight className="w-3 h-3" />
                  </Link>
                )}
                {activeConvo.project_id && (
                  <Link
                    href={`/client/projects/${activeConvo.project_id}`}
                    className="px-3 py-1.5 bg-surface hover:bg-surface-elevated border border-border-custom text-[10px] font-bold rounded-xl transition flex items-center gap-1 cursor-pointer"
                  >
                    <span>View Project</span>
                    <ChevronRight className="w-3 h-3" />
                  </Link>
                )}
              </div>
            </div>

            {/* Scrollable Message Logs (Part 9) */}
            <div ref={messagesContainerRef} className="flex-1 overflow-y-auto overscroll-contain p-6 space-y-4 min-h-0">
              {messagesLoading && messages.length === 0 ? (
                <div className="h-full flex items-center justify-center">
                  <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                </div>
              ) : (
                messages.map((msg) => {
                  if (msg.is_system) {
                    return (
                      <div key={msg.id} className="max-w-2xl mx-auto text-center my-3 bg-surface border border-border-custom rounded-2xl p-4 text-[10px] text-text-sub whitespace-pre-line leading-relaxed shadow-sm">
                        {msg.message_text}
                      </div>
                    );
                  }

                  const isOwn = msg.sender_id === user?.id;
                  
                  // Label indicator
                  const senderName = isOwn ? "You" : msg.sender_name || "Marketplace Team";

                  return (
                    <div 
                      key={msg.id}
                      className={`flex flex-col ${isOwn ? "items-end" : "items-start"}`}
                    >
                      <span className="text-[8px] text-text-muted mb-1 font-bold tracking-wider px-1">
                        {senderName}
                      </span>
                      <div className={`max-w-md rounded-2xl px-4 py-2.5 text-xs shadow-sm ${
                        isOwn 
                          ? "bg-primary text-text-on-dark rounded-br-none" 
                          : "bg-surface border border-border-custom text-text-main rounded-bl-none"
                      }`}>
                        <p className="leading-relaxed whitespace-pre-wrap">{msg.message_text}</p>
                        
                        {/* Attachments if any */}
                        {msg.attachments && msg.attachments.length > 0 && (
                          <div className="mt-2.5 pt-2 border-t border-border-custom/30 space-y-1">
                            {msg.attachments.map((file: any) => (
                              <a
                                key={file.id}
                                href={getMediaUrl(file.file_url)}
                                target="_blank"
                                rel="noreferrer"
                                className="flex items-center gap-1.5 text-[9px] hover:underline text-primary font-semibold"
                              >
                                <FileText className="w-3 h-3" />
                                <span className="truncate max-w-[180px]">{file.original_name}</span>
                              </a>
                            ))}
                          </div>
                        )}

                        <span className="text-[8px] text-text-muted block mt-1.5 text-right font-medium">
                          {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Composer Box (Part 26, 27) */}
            <div className="p-4 bg-surface border-t border-border-custom flex-shrink-0">
              {activeConvo.conversation_type === "DIRECT_LEGACY" ? (
                /* Legacy read-only banner (Part 12) */
                <div className="p-3 bg-surface-elevated border border-border-custom rounded-xl flex items-center gap-3 text-[10px] font-semibold text-text-muted">
                  <AlertCircle className="w-4 h-4 shrink-0 text-text-muted" />
                  <p>This legacy direct conversation is read-only. Secure coordinated workspace tools are enforced for all active bookings.</p>
                </div>
              ) : (
                <form onSubmit={handleSendMessage} className="flex gap-4">
                  <input
                    type="text"
                    disabled={sending}
                    placeholder="Type your reply to the Marketplace Team..."
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    className="flex-1 min-w-0 bg-background border border-border-custom rounded-xl px-4 py-3 text-text-main placeholder-text-muted focus:outline-none focus:border-primary text-xs transition disabled:opacity-50"
                  />
                  <button
                    type="submit"
                    disabled={!replyText.trim() || sending}
                    className="px-5 py-3 bg-primary hover:bg-primary-hover disabled:bg-surface-elevated disabled:text-text-muted disabled:border-border-custom text-text-on-dark text-xs font-black rounded-xl transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <span>{sending ? "Sending..." : "Send"}</span>
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </form>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-text-muted text-xs p-6 space-y-4 text-center">
            <MessageSquare className="w-10 h-10 text-text-muted" />
            <div>
              <h4 className="font-bold text-text-main text-[11px]">Select a conversation</h4>
              <p className="text-[9px] text-text-sub mt-1 max-w-[200px] leading-relaxed">
                Click a support or coordination thread in the sidebar to review logs and send replies.
              </p>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}

export default function ClientMessagesPage() {
  return (
    <Suspense fallback={
      <div className="h-full min-h-0 bg-background flex flex-col justify-center items-center text-text-main">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    }>
      <MessagesContent />
    </Suspense>
  );
}
