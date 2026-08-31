"use client";

import React, { useState, useEffect, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { messageService } from "@/services/message.service";

function MessagesContent() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const activeParam = searchParams.get("active");

  const [conversations, setConversations] = useState<any[]>([]);
  const [activeConvoId, setActiveConvoId] = useState<number | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [replyText, setReplyText] = useState("");
  const [loading, setLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const messagesContainerRef = useRef<HTMLDivElement>(null);

  // Load conversations list
  async function loadConversations() {
    try {
      const data = await messageService.getConversations();
      setConversations(data);
      
      // Auto-select convo from search params if matches
      if (activeParam && !activeConvoId) {
        const id = parseInt(activeParam);
        if (data.some((c) => c.id === id)) {
          setActiveConvoId(id);
        }
      } else if (data.length > 0 && !activeConvoId) {
        setActiveConvoId(data[0].id);
      }
    } catch (err) {
      setErrorMsg("Failed to retrieve conversation threads.");
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

  // Load messages when active convo changes
  useEffect(() => {
    if (activeConvoId) {
      loadMessages(activeConvoId);
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
    if (!replyText.trim() || !activeConvoId) return;

    try {
      const text = replyText;
      setReplyText("");
      const res = await messageService.sendMessage(activeConvoId, text);
      setMessages((prev) => [...prev, res]);
    } catch (err) {
      setErrorMsg("Failed to send message.");
    }
  };

  const getChatPartnerName = (convo: any) => {
    // Current user is CLIENT, partner is FREELANCER
    return convo.freelancer?.full_name || "Freelancer";
  };

  const getInitials = (name: string) => {
    if (!name) return "";
    const parts = name.trim().split(" ");
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  };

  const activeConvo = conversations.find((c) => c.id === activeConvoId);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col justify-center items-center text-text-main">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="w-full h-full max-w-full max-h-full min-w-0 min-h-0 overflow-hidden bg-background text-text-main flex font-sans">
      
      {/* Messages Thread Sidebar */}
      <div className="w-80 max-w-[320px] border-r border-border-custom bg-surface flex flex-col flex-shrink-0 min-h-0">
        <div className="p-6 border-b border-border-custom flex-shrink-0">
          <h2 className="text-lg font-black text-text-main">Conversations</h2>
          <p className="text-text-sub text-xs mt-1">Direct messaging chats</p>
        </div>

        <div className="flex-1 overflow-y-auto overscroll-contain divide-y divide-border-custom min-h-0">
          {conversations.map((convo) => {
            const isSelected = convo.id === activeConvoId;
            return (
              <button
                key={convo.id}
                onClick={() => setActiveConvoId(convo.id)}
                className={`w-full p-5 text-left transition flex items-center gap-4 ${
                  isSelected ? "bg-primary border-l-4 border-primary" : "hover:bg-surface"
                }`}
              >
                <div className="w-10 h-10 rounded-full bg-surface-elevated flex items-center justify-center font-bold text-xs uppercase text-text-sub">
                  {getInitials(getChatPartnerName(convo))}
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="text-xs font-bold text-text-main truncate">{getChatPartnerName(convo)}</h4>
                  <p className="text-[10px] text-text-muted mt-1 uppercase tracking-wider font-semibold">
                    Started on {new Date(convo.created_at).toLocaleDateString()}
                  </p>
                </div>
              </button>
            );
          })}

          {conversations.length === 0 && (
            <div className="py-12 text-center text-xs text-text-muted">
              No messaging threads yet.
            </div>
          )}
        </div>
      </div>

      {/* Main Messaging Logs Area */}
      <div className="flex-1 flex flex-col bg-background min-w-0 min-h-0">
        {activeConvo ? (
          <>
            {/* Log Header */}
            <div className="p-6 bg-surface border-b border-border-custom flex flex-shrink-0 items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-surface-elevated flex items-center justify-center font-bold text-sm uppercase text-text-main">
                  {getInitials(getChatPartnerName(activeConvo))}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-text-main">{getChatPartnerName(activeConvo)}</h3>
                  <span className="text-[10px] text-text-muted">Direct Chat Portal</span>
                </div>
              </div>
            </div>

            {/* Scrollable Logs */}
            <div ref={messagesContainerRef} className="flex-1 overflow-y-auto overscroll-contain p-6 space-y-4 min-h-0">
              {messagesLoading && messages.length === 0 ? (
                <div className="h-full flex items-center justify-center">
                  <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                </div>
              ) : (
                messages.map((msg) => {
                  if (msg.is_system) {
                    return (
                      <div key={msg.id} className="max-w-2xl mx-auto text-center my-3 bg-surface border border-border-custom rounded-2xl p-4 text-xs text-text-sub whitespace-pre-line leading-relaxed shadow">
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
                      <div className={`max-w-md rounded-2xl px-4 py-2.5 text-xs shadow-md ${
                        isOwn 
                          ? "bg-primary text-text-main rounded-br-none" 
                          : "bg-surface border border-border-custom text-text-main rounded-bl-none"
                      }`}>
                        <p className="leading-relaxed">{msg.message_text}</p>
                        <span className="text-[8px] text-text-sub block mt-1.5 text-right font-medium">
                          {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Submit Reply Form */}
            <div className="p-6 bg-surface border-t border-border-custom flex-shrink-0">
              <form onSubmit={handleSendMessage} className="flex gap-4">
                <input
                  type="text"
                  placeholder="Type your message here..."
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  className="flex-1 min-w-0 bg-background border border-border-custom rounded-xl px-4 py-3 text-text-main placeholder-text-muted focus:outline-none focus:border-primary text-xs transition"
                />
                <button
                  type="submit"
                  disabled={!replyText.trim()}
                  className="px-6 py-3 bg-primary hover:bg-primary-hover disabled:bg-surface disabled:text-text-muted disabled:border-border-custom disabled:border text-text-main text-xs font-black rounded-xl transition shadow-lg shadow-primary text-center"
                >
                  Send
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-text-muted text-xs">
            <span>Select a conversation to start messaging.</span>
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
