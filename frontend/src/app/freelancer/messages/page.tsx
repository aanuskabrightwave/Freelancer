"use client";

import React, { useState, useEffect, useRef, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { messageService } from "@/services/message.service";
import { 
  MessageSquare, 
  Send, 
  Calendar, 
  MapPin, 
  DollarSign, 
  Lock, 
  Clock, 
  ArrowLeft,
  ChevronRight,
  Inbox,
  UserCheck,
  AlertCircle
} from "lucide-react";

function MessagesContent() {
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeParam = searchParams.get("active");

  const [conversations, setConversations] = useState<any[]>([]);
  const [activeConvoId, setActiveConvoId] = useState<number | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [replyText, setReplyText] = useState("");
  const [loading, setLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"ACTIVE" | "LEGACY">("ACTIVE");

  const messagesContainerRef = useRef<HTMLDivElement>(null);

  // Load conversations list
  async function loadConversations(autoSelectId?: number) {
    try {
      const data = await messageService.getConversations();
      setConversations(data);
      
      // Auto-select convo from search params if matches
      if (autoSelectId) {
        setActiveConvoId(autoSelectId);
      } else if (activeParam && !activeConvoId) {
        const id = parseInt(activeParam);
        if (data.some((c) => c.id === id)) {
          setActiveConvoId(id);
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

      // Mark as read (Part 17)
      if (!quiet) {
        await messageService.markConversationRead(convoId).catch(() => null);
      }
    } catch (err) {
      // Quiet errors on poll
    } finally {
      if (!quiet) setMessagesLoading(false);
    }
  }

  useEffect(() => {
    if (user) {
      const activeId = activeParam ? parseInt(activeParam) : undefined;
      loadConversations(activeId);
    }
  }, [user, activeParam]);

  // Load messages when active convo changes
  useEffect(() => {
    if (activeConvoId) {
      loadMessages(activeConvoId);
    }
  }, [activeConvoId]);

  // Real-time polling loop (every 4 seconds) (Part 32)
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
    } catch (err) {
      setErrorMsg("Your message couldn't be sent.");
    } finally {
      setSending(false);
    }
  };

  const getInitials = (name: string) => {
    if (!name) return "";
    const parts = name.trim().split(" ");
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  };

  // Filters active conversations versus legacy direct histories (Part 3 & 13)
  const activeConversations = conversations.filter(
    (c) => c.conversation_type === "FREELANCER_ADMIN"
  );
  
  const legacyConversations = conversations.filter(
    (c) => c.conversation_type === "DIRECT_LEGACY"
  );

  const displayedConversations = activeTab === "ACTIVE" ? activeConversations : legacyConversations;

  const activeConvo = conversations.find((c) => c.id === activeConvoId);
  const isLegacy = activeConvo?.conversation_type === "DIRECT_LEGACY";

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col justify-center items-center text-text-main">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="w-full h-[calc(100vh-64px)] max-h-screen overflow-hidden bg-background text-text-main flex flex-col md:flex-row font-sans">
      
      {/* Messages Thread List Sidebar */}
      <div className={`w-full md:w-80 border-r border-border-custom bg-surface flex flex-col flex-shrink-0 min-h-0 ${
        activeConvoId !== null ? "hidden md:flex" : "flex"
      }`}>
        <div className="p-5 border-b border-border-custom flex-shrink-0 space-y-3">
          <div>
            <h2 className="text-sm font-black text-text-main uppercase tracking-wider">Workspace Messages</h2>
            <p className="text-text-sub text-[10px] mt-0.5">Communicate with our team about assignments and jobs.</p>
          </div>

          {/* Tab Filter toggler (Part 14) */}
          <div className="grid grid-cols-2 gap-1 p-1 bg-surface-elevated rounded-xl">
            <button
              onClick={() => {
                setActiveTab("ACTIVE");
                setActiveConvoId(null);
              }}
              className={`py-1 text-[9px] font-black uppercase rounded-lg transition ${
                activeTab === "ACTIVE" ? "bg-background text-primary shadow-sm border border-border-custom" : "text-text-muted hover:text-text-main"
              }`}
            >
              Support/Admin
            </button>
            <button
              onClick={() => {
                setActiveTab("LEGACY");
                setActiveConvoId(null);
              }}
              className={`py-1 text-[9px] font-black uppercase rounded-lg transition ${
                activeTab === "LEGACY" ? "bg-background text-text-main shadow-sm border border-border-custom" : "text-text-muted hover:text-text-main"
              }`}
            >
              Direct History
            </button>
          </div>
        </div>

        {/* Conversation Items list */}
        <div className="flex-1 overflow-y-auto overscroll-contain divide-y divide-border-custom/40 min-h-0">
          {displayedConversations.map((convo) => {
            const isSelected = convo.id === activeConvoId;
            const contextTitle = convo.context?.title || "Creative Gig";
            const contextRef = convo.context?.booking_number || "CM-GIG";
            
            return (
              <button
                key={convo.id}
                onClick={() => setActiveConvoId(convo.id)}
                className={`w-full p-4 text-left transition flex items-start gap-3 border-l-4 ${
                  isSelected ? "bg-surface-elevated border-primary" : "hover:bg-surface-elevated/40 border-transparent"
                }`}
              >
                <div className="w-9 h-9 rounded-full bg-primary/10 text-primary border border-primary/20 flex items-center justify-center font-bold text-xs uppercase shrink-0">
                  {getInitials(activeTab === "ACTIVE" ? "Marketplace Team" : convo.recipient_name)}
                </div>
                <div className="min-w-0 flex-grow">
                  <div className="flex justify-between items-start gap-1">
                    <h4 className="text-xs font-extrabold text-text-main truncate">
                      {activeTab === "ACTIVE" ? "Marketplace Team" : convo.recipient_name}
                    </h4>
                    {convo.unread_count > 0 && (
                      <span className="w-2.5 h-2.5 rounded-full bg-primary shrink-0 animate-pulse"></span>
                    )}
                  </div>
                  <p className="text-[10px] text-text-muted font-bold truncate mt-0.5">
                    {contextTitle} <span className="font-mono text-[9px]">({contextRef})</span>
                  </p>
                  {convo.latest_message && (
                    <p className="text-[11px] text-text-sub truncate mt-1 leading-snug">
                      {convo.latest_message}
                    </p>
                  )}
                </div>
              </button>
            );
          })}

          {displayedConversations.length === 0 && (
            <div className="py-16 px-4 text-center text-xs text-text-muted flex flex-col items-center justify-center space-y-3">
              <Inbox className="w-8 h-8 text-text-muted" />
              <div>
                <h4 className="font-bold text-text-main text-[11px]">
                  {activeTab === "ACTIVE" ? "No active conversations yet." : "No legacy chats found."}
                </h4>
                <p className="text-[9px] text-text-sub mt-1 leading-relaxed">
                  {activeTab === "ACTIVE" 
                    ? "When our team assigns you a booking, your conversation will appear here." 
                    : "Previous direct communication records are empty."}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Main Messages & Context Split View */}
      <div className={`flex-1 flex min-w-0 min-h-0 ${
        activeConvoId === null ? "hidden md:flex" : "flex"
      }`}>
        {activeConvo ? (
          <div className="flex-grow flex flex-col md:flex-row min-w-0 min-h-0">
            
            {/* Messages Feed panel */}
            <div className="flex-1 flex flex-col bg-background min-w-0 min-h-0 border-r border-border-custom/50">
              
              {/* Header block */}
              <div className="p-4 bg-surface border-b border-border-custom flex flex-shrink-0 items-center justify-between">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setActiveConvoId(null)}
                    className="md:hidden p-1.5 hover:bg-surface-elevated rounded-xl transition text-text-sub"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                  <div className="w-9 h-9 rounded-full bg-primary/15 text-primary flex items-center justify-center font-bold text-xs uppercase shrink-0">
                    {getInitials(isLegacy ? activeConvo.recipient_name : "Marketplace Team")}
                  </div>
                  <div>
                    <h3 className="text-xs font-black text-text-main">
                      {isLegacy ? activeConvo.recipient_name : "Marketplace Team"}
                    </h3>
                    <span className="text-[9px] text-text-muted block mt-0.5">
                      {isLegacy ? "Legacy Chat (Read-Only)" : `Booking coordination thread`}
                    </span>
                  </div>
                </div>
              </div>

              {errorMsg && (
                <div className="bg-rose-500/10 border-b border-rose-500/20 text-rose-300 p-3 text-[11px] font-semibold">
                  {errorMsg}
                </div>
              )}

              {/* Scrollable message logs */}
              <div ref={messagesContainerRef} className="flex-grow overflow-y-auto overscroll-contain p-5 space-y-4 min-h-0">
                {messagesLoading && messages.length === 0 ? (
                  <div className="h-full flex items-center justify-center">
                    <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                  </div>
                ) : (
                  messages.map((msg) => {
                    if (msg.is_system) {
                      return (
                        <div key={msg.id} className="max-w-md mx-auto text-center my-3 bg-surface border border-border-custom rounded-xl p-3 text-[10px] text-text-sub whitespace-pre-line leading-relaxed shadow">
                          {msg.message_text || msg.content}
                        </div>
                      );
                    }

                    const isOwn = msg.sender_id === user?.id;
                    return (
                      <div 
                        key={msg.id}
                        className={`flex ${isOwn ? "justify-end" : "justify-start"}`}
                      >
                        <div className={`max-w-xs md:max-w-md rounded-2xl px-4 py-2.5 text-xs shadow-sm ${
                          isOwn 
                            ? "bg-primary text-text-on-dark rounded-br-none" 
                            : "bg-surface border border-border-custom text-text-main rounded-bl-none"
                        }`}>
                          <p className="leading-relaxed whitespace-pre-line">{msg.message_text || msg.content}</p>
                          <span className={`text-[8px] block mt-1 text-right font-medium ${isOwn ? "text-text-on-dark/70" : "text-text-muted"}`}>
                            {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Message Input Composer (Part 30) */}
              <div className="p-4 bg-surface border-t border-border-custom flex-shrink-0">
                {isLegacy ? (
                  <div className="bg-surface-elevated border border-border-custom p-3.5 rounded-xl text-center text-[10px] text-text-muted italic">
                    This is a read-only historical direct thread. Message composer has been disabled.
                  </div>
                ) : (
                  <form onSubmit={handleSendMessage} className="flex gap-2">
                    <input
                      type="text"
                      disabled={sending}
                      placeholder="Type message to Marketplace coordinator..."
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      className="flex-grow min-w-0 bg-background border border-border-custom rounded-xl px-4 py-2.5 text-xs text-text-main placeholder-text-muted focus:outline-none focus:border-primary transition disabled:opacity-50"
                    />
                    <button
                      type="submit"
                      disabled={!replyText.trim() || sending}
                      className="px-4 py-2.5 bg-primary hover:bg-primary-hover text-text-on-dark text-xs font-black rounded-xl transition flex items-center justify-center gap-1 disabled:opacity-50"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Send</span>
                    </button>
                  </form>
                )}
              </div>

            </div>

            {/* Context Panel Sidebar (Part 8 & 9) */}
            {activeConvo.context && (
              <div className="w-full md:w-64 border-t md:border-t-0 bg-surface p-5 flex-shrink-0 flex flex-col justify-between overflow-y-auto">
                <div className="space-y-5 text-xs font-semibold text-text-sub">
                  <div>
                    <span className="text-[8px] text-primary font-black uppercase tracking-wider block mb-1">
                      Linked Context
                    </span>
                    <h4 className="font-extrabold text-sm text-text-main">
                      {activeConvo.context.title}
                    </h4>
                    <span className="text-[10px] text-text-muted font-mono font-semibold">
                      Reference: {activeConvo.context.booking_number}
                    </span>
                  </div>

                  <div className="space-y-3 pt-3 border-t border-border-custom/50">
                    <div className="flex justify-between">
                      <span className="text-text-muted">Booking Status</span>
                      <span className="text-text-main font-bold">
                        {activeConvo.context.status}
                      </span>
                    </div>

                    {activeConvo.context.scheduled_date && (
                      <div className="flex justify-between">
                        <span className="text-text-muted">Date</span>
                        <span className="text-text-main font-bold">
                          {new Date(activeConvo.context.scheduled_date).toLocaleDateString("en-IN")}
                        </span>
                      </div>
                    )}

                    {activeConvo.context.venue_name && (
                      <div className="flex flex-col gap-0.5">
                        <span className="text-text-muted">Venue</span>
                        <span className="text-text-main font-bold truncate">
                          {activeConvo.context.venue_name}
                        </span>
                      </div>
                    )}

                    {activeConvo.context.freelancer_payout_amount && (
                      <div className="flex justify-between pt-1">
                        <span className="text-text-muted">Agreed Payout</span>
                        <span className="text-xs font-black text-primary">
                          ₹{Number(activeConvo.context.freelancer_payout_amount).toLocaleString("en-IN")}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-5 border-t border-border-custom/50">
                  <Link
                    href={`/freelancer/bookings/${activeConvo.booking_id}`}
                    className="w-full text-center py-2 block bg-surface-elevated hover:bg-background border border-border-custom text-text-sub hover:text-text-main text-[10px] font-black uppercase tracking-wider rounded-xl transition"
                  >
                    View Booking
                  </Link>
                </div>
              </div>
            )}

          </div>
        ) : (
          <div className="flex-grow flex flex-col items-center justify-center text-text-muted text-xs p-6 space-y-3">
            <MessageSquare className="w-8 h-8 text-text-muted" />
            <div className="text-center">
              <h4 className="font-bold text-text-main text-[11px]">Select a discussion thread</h4>
              <p className="text-[9px] text-text-sub mt-1 leading-relaxed">
                Choose a conversation from the sidebar list to communicate with support coordinators.
              </p>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}

export default function FreelancerMessagesPage() {
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
