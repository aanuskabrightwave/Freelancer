"use client";

import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import { messageService } from "@/services/message.service";
import {
  X,
  MessageSquare,
  Send,
  Search,
  Inbox,
  AlertCircle,
  ArrowLeft,
  User,
  Clock,
  ShieldCheck,
  CheckCircle2
} from "lucide-react";

interface MessagesModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialConvoId?: number;
}

export default function MessagesModal({
  isOpen,
  onClose,
  initialConvoId
}: MessagesModalProps) {
  const { user } = useAuth();

  const [conversations, setConversations] = useState<any[]>([]);
  const [activeConvoId, setActiveConvoId] = useState<number | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [replyText, setReplyText] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [loadingConvos, setLoadingConvos] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<"ALL" | "UNREAD">("ALL");

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Lock body scroll and handle Escape key
  useEffect(() => {
    if (!isOpen) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  // Load conversations when opened
  async function loadConversations(autoSelectId?: number) {
    try {
      setLoadingConvos(true);
      setErrorMsg(null);
      const data = await messageService.getConversations();
      setConversations(data);

      if (autoSelectId) {
        setActiveConvoId(autoSelectId);
      } else if (!activeConvoId && data.length > 0) {
        setActiveConvoId(data[0].id);
      }
    } catch (err) {
      setErrorMsg("Failed to load conversations.");
    } finally {
      setLoadingConvos(false);
    }
  }

  // Load messages for a specific conversation
  async function loadMessages(convoId: number, quiet = false) {
    try {
      if (!quiet) setLoadingMessages(true);
      const log = await messageService.getConversationMessages(convoId);
      setMessages(log);

      if (!quiet) {
        await messageService.markConversationRead(convoId).catch(() => null);
      }
    } catch (err) {
      // Quiet fail on background poll
    } finally {
      if (!quiet) setLoadingMessages(false);
    }
  }

  useEffect(() => {
    if (isOpen && user) {
      loadConversations(initialConvoId);
    }
  }, [isOpen, user, initialConvoId]);

  useEffect(() => {
    if (isOpen && activeConvoId) {
      loadMessages(activeConvoId);
    }
  }, [isOpen, activeConvoId]);

  // Polling loop when open
  useEffect(() => {
    if (!isOpen || !activeConvoId) return;

    const timer = setInterval(() => {
      loadMessages(activeConvoId, true);
    }, 4000);

    return () => clearInterval(timer);
  }, [isOpen, activeConvoId]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() || !activeConvoId || sending) return;

    try {
      setSending(true);
      const text = replyText.trim();
      setReplyText("");
      const res = await messageService.sendMessage(activeConvoId, text);
      setMessages((prev) => [...prev, res]);
    } catch (err) {
      setErrorMsg("Message could not be sent. Please retry.");
    } finally {
      setSending(false);
    }
  };

  const getPartnerName = (convo: any) => {
    if (!convo) return "Discussion Partner";
    if (convo.conversation_type === "FREELANCER_ADMIN") {
      return user?.role === "ADMIN" ? "Freelancer" : "Marketplace Team (Admin)";
    }
    if (convo.partner?.full_name) {
      return convo.partner.full_name;
    }
    if (user?.role === "CLIENT") {
      return convo.freelancer_name || convo.partner_name || `Freelancer (Thread #${convo.id})`;
    }
    return convo.client_name || convo.partner_name || `Client (Thread #${convo.id})`;
  };

  if (!isOpen) return null;

  const activeConvo = conversations.find((c) => c.id === activeConvoId);

  const filteredConversations = conversations.filter((c) => {
    const name = getPartnerName(c).toLowerCase();
    const query = searchQuery.toLowerCase();
    const matchesSearch = name.includes(query) || (c.booking_title && c.booking_title.toLowerCase().includes(query));
    if (!matchesSearch) return false;

    if (activeFilter === "UNREAD") return (c.unread_count || 0) > 0;
    return true;
  });

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      {/* Backdrop overlay identical to HelpModal */}
      <div
        className="fixed inset-0 z-[9998] bg-[rgba(0,0,0,0.55)] backdrop-blur-[8px]"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Card */}
      <div
        className="relative z-[9999] bg-surface border border-border-custom rounded-3xl w-full max-w-4xl overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200 flex flex-col h-[700px] max-h-[90vh]"
        role="dialog"
        aria-modal="true"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border-custom/50 bg-surface-elevated shrink-0">
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-primary animate-pulse"></span>
            <div>
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-primary" />
                <h2 className="text-base font-bold text-text-main">Messages & Coordination</h2>
              </div>
              <p className="text-[11px] text-text-muted mt-0.5">
                Communicate directly with clients and project support coordinators.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-surface text-text-muted hover:text-text-main transition cursor-pointer"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Error notification */}
        {errorMsg && (
          <div className="px-6 py-2 bg-rose-500/10 border-b border-rose-500/20 text-rose-400 text-xs flex items-center gap-2 shrink-0">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Main 2-column layout */}
        <div className="flex-1 flex flex-row min-h-0 overflow-hidden">
          
          {/* Left Column: Conversations List */}
          <div className="w-80 shrink-0 border-r border-border-custom/60 flex flex-col bg-surface-elevated/40">
            
            {/* Search input */}
            <div className="p-3 border-b border-border-custom/40">
              <div className="relative flex items-center">
                <Search className="w-3.5 h-3.5 text-text-muted absolute left-3 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search threads..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-surface border border-border-custom text-text-main placeholder-text-muted text-xs focus:outline-none focus:border-primary transition"
                />
              </div>

              {/* Filter Tabs - Only All and Unread */}
              <div className="flex gap-2 mt-2.5">
                {[
                  { id: "ALL", label: "All" },
                  { id: "UNREAD", label: "Unread" }
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveFilter(tab.id as "ALL" | "UNREAD")}
                    className={`flex-1 py-1.5 text-xs font-bold rounded-xl transition cursor-pointer text-center ${
                      activeFilter === tab.id
                        ? "bg-primary text-text-on-dark shadow-xs"
                        : "text-text-muted hover:text-text-main hover:bg-surface"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Threads List */}
            <div className="flex-1 overflow-y-auto divide-y divide-border-custom/30">
              {loadingConvos ? (
                <div className="p-8 text-center">
                  <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                  <span className="text-xs text-text-muted">Loading chats...</span>
                </div>
              ) : filteredConversations.length > 0 ? (
                filteredConversations.map((convo) => {
                  const isSelected = convo.id === activeConvoId;
                  const partnerName = getPartnerName(convo);
                  const isAdmin = convo.conversation_type === "FREELANCER_ADMIN";

                  return (
                    <button
                      key={convo.id}
                      onClick={() => setActiveConvoId(convo.id)}
                      className={`w-full p-3.5 text-left transition flex items-start gap-3 cursor-pointer ${
                        isSelected
                          ? "bg-primary/15 border-l-2 border-primary"
                          : "hover:bg-surface/80"
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 uppercase ${
                        isAdmin
                          ? "bg-purple-500/20 text-purple-400 border border-purple-500/30"
                          : "bg-primary/10 text-primary border border-primary/20"
                      }`}>
                        {isAdmin ? <ShieldCheck className="w-4 h-4" /> : partnerName[0]}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-1">
                          <h4 className="text-xs font-bold text-text-main truncate">
                            {partnerName}
                          </h4>
                          {convo.unread_count > 0 && (
                            <span className="px-1.5 py-0.2 bg-primary text-[9px] font-black text-white rounded-full">
                              {convo.unread_count}
                            </span>
                          )}
                        </div>

                        {convo.booking_title ? (
                          <p className="text-[10px] text-text-sub truncate mt-0.5 font-medium">
                            {convo.booking_title}
                          </p>
                        ) : (
                          <p className="text-[10px] text-text-muted truncate mt-0.5">
                            Thread ID #{convo.id}
                          </p>
                        )}
                      </div>
                    </button>
                  );
                })
              ) : (
                <div className="p-8 text-center text-text-muted text-xs">
                  <Inbox className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <span>{activeFilter === "UNREAD" ? "No unread conversations" : "No conversations found"}</span>
                </div>
              )}
            </div>

          </div>

          {/* Right Column: Chat Stream & Message Input */}
          <div className="flex-1 flex flex-col bg-background/40 min-w-0">
            {activeConvoId ? (
              <>
                {/* Active Chat Header */}
                <div className="px-6 py-3 border-b border-border-custom/50 bg-surface flex items-center justify-between shrink-0">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs uppercase shrink-0">
                      {activeConvo ? getPartnerName(activeConvo)[0] : "C"}
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-xs font-bold text-text-main truncate">
                        {getPartnerName(activeConvo)}
                      </h3>
                      <span className="text-[10px] text-text-muted block font-mono">
                        {activeConvo?.conversation_type === "FREELANCER_ADMIN"
                          ? "Official Support & Project Coordination"
                          : `Thread ID #${activeConvoId}`}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Messages stream */}
                <div className="flex-1 overflow-y-auto p-5 space-y-3">
                  {loadingMessages && messages.length === 0 ? (
                    <div className="h-full flex items-center justify-center">
                      <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                    </div>
                  ) : messages.length > 0 ? (
                    messages.map((msg) => {
                      if (msg.is_system) {
                        return (
                          <div
                            key={msg.id}
                            className="my-3 mx-auto max-w-md text-center text-[10px] bg-surface-elevated border border-border-custom/60 rounded-xl p-2 text-text-muted leading-relaxed"
                          >
                            {msg.message_text}
                          </div>
                        );
                      }

                      const isOwn = msg.sender_id === user?.id;
                      return (
                        <div
                          key={msg.id}
                          className={`flex ${isOwn ? "justify-end" : "justify-start"}`}
                        >
                          <div
                            className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-xs shadow-xs leading-relaxed ${
                              isOwn
                                ? "bg-primary text-text-on-dark rounded-br-none"
                                : "bg-surface border border-border-custom text-text-main rounded-bl-none"
                            }`}
                          >
                            <p className="whitespace-pre-line">{msg.message_text}</p>
                            <span
                              className={`text-[9px] block mt-1 text-right ${
                                isOwn ? "text-text-on-dark/70" : "text-text-muted"
                              }`}
                            >
                              {new Date(msg.created_at).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit"
                              })}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-text-muted text-xs space-y-2">
                      <MessageSquare className="w-8 h-8 opacity-40" />
                      <p>No messages yet in this discussion.</p>
                      <span className="text-[10px]">Type below to start the conversation.</span>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Reply Form */}
                <form
                  onSubmit={handleSendMessage}
                  className="p-3 border-t border-border-custom/50 bg-surface flex items-center gap-2 shrink-0"
                >
                  <input
                    type="text"
                    placeholder="Type your message..."
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    className="flex-1 px-4 py-2.5 rounded-xl bg-surface-elevated border border-border-custom text-text-main placeholder-text-muted text-xs focus:outline-none focus:border-primary transition"
                  />
                  <button
                    type="submit"
                    disabled={!replyText.trim() || sending}
                    className="px-4 py-2.5 bg-primary hover:bg-primary-hover disabled:bg-surface-elevated text-text-on-dark disabled:text-text-muted text-xs font-bold rounded-xl transition flex items-center gap-1.5 cursor-pointer disabled:cursor-not-allowed"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Send</span>
                  </button>
                </form>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-text-muted text-xs space-y-3 p-8">
                <MessageSquare className="w-12 h-12 opacity-30 text-primary" />
                <h3 className="font-bold text-text-main text-sm">Select a discussion thread</h3>
                <p className="max-w-xs text-center text-text-muted text-xs">
                  Choose a conversation from the left to view messages and communicate with clients or support coordinators.
                </p>
              </div>
            )}
          </div>

        </div>

        {/* Modal Footer */}
        <div className="bg-surface-elevated px-6 py-3 border-t border-border-custom/50 flex justify-between items-center text-[10px] text-text-muted shrink-0">
          <p>© {new Date().getFullYear()} CreativeMarket. Secure Messaging.</p>
          <span className="text-text-sub font-semibold">Real-time encrypted communication</span>
        </div>

      </div>
    </div>
  );
}
