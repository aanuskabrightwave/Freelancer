"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { messageService } from "@/services/message.service";
import { notificationService } from "@/services/notification.service";
import { 
  MessageSquare, 
  X, 
  ArrowLeft, 
  Send, 
  Search, 
  ExternalLink 
} from "lucide-react";

export default function MessageWidget() {
  const { user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  // Widget view states
  const [isOpen, setIsOpen] = useState(false);
  const [activeConvoId, setActiveConvoId] = useState<number | null>(null);
  
  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState("");

  // Data states
  const [conversations, setConversations] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [replyText, setReplyText] = useState("");
  const [unreadCount, setUnreadCount] = useState(0);

  // Loading states
  const [loadingConvos, setLoadingConvos] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);

  // Scroll ref
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const widgetRef = useRef<HTMLDivElement>(null);

  // Poll notifications for unread state
  const fetchUnreadCount = async () => {
    try {
      const countRes = await notificationService.getUnreadCount();
      setUnreadCount(countRes.count);
    } catch (e) {
      console.error(e);
    }
  };

  // Load conversations list
  const fetchConversations = async () => {
    try {
      setLoadingConvos(true);
      const data = await messageService.getConversations();
      setConversations(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingConvos(false);
    }
  };

  // Load messages for selected convo
  const fetchMessages = async (convoId: number, quiet = false) => {
    try {
      if (!quiet) setLoadingMessages(true);
      const data = await messageService.getConversationMessages(convoId);
      setMessages(data);
    } catch (e) {
      console.error(e);
    } finally {
      if (!quiet) setLoadingMessages(false);
    }
  };

  // Run unread poll every 30s
  useEffect(() => {
    if (user) {
      fetchUnreadCount();
      const interval = setInterval(fetchUnreadCount, 30000);
      return () => clearInterval(interval);
    }
  }, [user]);

  // Load conversations on widget open
  useEffect(() => {
    if (isOpen && user) {
      fetchConversations();
    }
  }, [isOpen, user]);

  // Poll active conversation messages every 4s
  useEffect(() => {
    if (!activeConvoId) return;

    fetchMessages(activeConvoId);

    const timer = setInterval(() => {
      fetchMessages(activeConvoId, true);
    }, 4000);

    return () => clearInterval(timer);
  }, [activeConvoId]);

  // Auto scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Close widget when navigating to full messages page
  useEffect(() => {
    if (pathname.includes("/messages")) {
      setIsOpen(false);
    }
  }, [pathname]);

  if (!user || pathname.includes("/messages") || pathname === "/login" || pathname === "/register") {
    // Hide widget if full messages page is open, or user not logged in
    return null;
  }

  const role = user.role;

  const getChatPartnerName = (convo: any) => {
    if (role === "CLIENT") {
      return convo.freelancer?.full_name || "Freelancer";
    }
    return convo.client?.full_name || "Client";
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() || !activeConvoId) return;

    try {
      const text = replyText;
      setReplyText("");
      const res = await messageService.sendMessage(activeConvoId, text);
      setMessages(prev => [...prev, res]);
    } catch (err) {
      console.error("Failed to send message in widget", err);
    }
  };

  const handleViewAllMessages = () => {
    setIsOpen(false);
    if (role === "CLIENT") {
      router.push("/client/messages");
    } else {
      router.push("/freelancer/messages");
    }
  };

  const activeConvo = conversations.find(c => c.id === activeConvoId);
  const filteredConvos = conversations.filter(c => 
    getChatPartnerName(c).toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="fixed bottom-6 right-6 z-50 font-sans md:block hidden" ref={widgetRef}>
      
      {/* CLOSED STATE */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="flex items-center gap-2 px-5 py-3.5 bg-primary hover:bg-primary-hover text-text-on-dark font-bold rounded-full shadow-2xl transition duration-200 group cursor-pointer border border-primary/20"
        >
          <MessageSquare className="w-5 h-5 text-text-on-dark" />
          <span className="text-xs uppercase tracking-wider">Messages</span>
          {unreadCount > 0 && (
            <span className="flex items-center justify-center min-w-5 h-5 px-1.5 bg-rose-600 border border-white text-[10px] font-black text-white rounded-full">
              {unreadCount}
            </span>
          )}
        </button>
      )}

      {/* OPENED FLOATING PANEL */}
      {isOpen && (
        <div className="w-[360px] h-[480px] bg-surface border border-border-custom shadow-2xl rounded-2xl flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-150">
          
          {/* VIEW: Chat logs */}
          {activeConvoId ? (
            <>
              {/* Chat Header */}
              <div className="bg-surface-elevated px-4 py-3 border-b border-border-custom flex items-center justify-between">
                <button
                  onClick={() => setActiveConvoId(null)}
                  className="p-1 rounded-full hover:bg-surface text-text-sub hover:text-text-main transition cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <div className="text-center min-w-0 flex-grow px-2">
                  <h4 className="text-xs font-bold text-text-main truncate">
                    {activeConvo ? getChatPartnerName(activeConvo) : "Chat"}
                  </h4>
                  <span className="text-[9px] text-text-muted font-mono block">
                    Thread #{activeConvoId}
                  </span>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1 rounded-full hover:bg-surface text-text-sub hover:text-text-main transition cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Chat messages */}
              <div className="flex-grow overflow-y-auto p-4 space-y-3 bg-background/30">
                {loadingMessages && messages.length === 0 ? (
                  <div className="h-full flex items-center justify-center">
                    <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                  </div>
                ) : (
                  messages.map((msg) => {
                    if (msg.is_system) {
                      return (
                        <div key={msg.id} className="text-center my-2 text-[9px] bg-surface-elevated border border-border-custom rounded-xl p-2.5 text-text-muted leading-relaxed font-medium">
                          {msg.message_text}
                        </div>
                      );
                    }

                    const isOwn = msg.sender_id === user.id;
                    return (
                      <div key={msg.id} className={`flex ${isOwn ? "justify-end" : "justify-start"}`}>
                        <div className={`max-w-[75%] rounded-2xl px-3.5 py-2 text-[11px] shadow-xs leading-relaxed ${
                          isOwn 
                            ? "bg-primary text-text-on-dark rounded-br-none" 
                            : "bg-surface border border-border-custom text-text-main rounded-bl-none"
                        }`}>
                          <p>{msg.message_text}</p>
                          <span className={`text-[8px] block mt-1 text-right ${isOwn ? "text-text-on-dark/60" : "text-text-muted"}`}>
                            {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Chat Input */}
              <form onSubmit={handleSendMessage} className="p-3 border-t border-border-custom bg-surface flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Type a message..."
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  className="flex-grow px-3 py-2 rounded-xl bg-surface-elevated border border-border-custom text-text-main placeholder-text-muted text-xs focus:outline-none focus:border-primary transition"
                />
                <button
                  type="submit"
                  disabled={!replyText.trim()}
                  className="p-2 rounded-full bg-primary hover:bg-primary-hover disabled:bg-surface-elevated text-text-on-dark disabled:text-text-muted transition cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </>
          ) : (
            // VIEW: Conversation list
            <>
              {/* List Header */}
              <div className="bg-surface-elevated px-4 py-3 border-b border-border-custom flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <MessageSquare className="w-4.5 h-4.5 text-primary" />
                  <h3 className="text-xs font-bold text-text-main">Conversations</h3>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1 rounded-full hover:bg-surface text-text-sub hover:text-text-main transition cursor-pointer"
                >
                  <X className="w-4.5 h-4.5" />
                </button>
              </div>

              {/* Search bar */}
              <div className="p-3 border-b border-border-custom bg-surface relative flex items-center">
                <Search className="w-3.5 h-3.5 text-text-muted absolute left-6 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search conversations..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-surface-elevated border border-border-custom text-text-main placeholder-text-muted text-[11px] focus:outline-none focus:border-primary transition"
                />
              </div>

              {/* Conversation items list */}
              <div className="flex-grow overflow-y-auto divide-y divide-border-custom/30">
                {loadingConvos ? (
                  <div className="h-full flex items-center justify-center">
                    <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                  </div>
                ) : filteredConvos.length > 0 ? (
                  filteredConvos.map(convo => (
                    <button
                      key={convo.id}
                      onClick={() => setActiveConvoId(convo.id)}
                      className="w-full p-4 text-left hover:bg-surface-elevated transition flex items-center gap-3"
                    >
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary flex-shrink-0 uppercase">
                        {getChatPartnerName(convo)[0]}
                      </div>
                      <div className="min-w-0 flex-grow space-y-0.5">
                        <h4 className="text-xs font-bold text-text-main truncate">
                          {getChatPartnerName(convo)}
                        </h4>
                        <p className="text-[10px] text-text-muted truncate">
                          Thread ID #{convo.id}
                        </p>
                      </div>
                    </button>
                  ))
                ) : (
                  <div className="py-20 text-center text-text-muted text-xs">
                    No conversation threads found
                  </div>
                )}
              </div>

              {/* View all messages CTA */}
              <button
                onClick={handleViewAllMessages}
                className="p-3 bg-surface-elevated border-t border-border-custom text-center text-xs font-bold text-primary hover:bg-surface hover:underline transition flex items-center justify-center gap-1 cursor-pointer w-full"
              >
                <span>View All Messages</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            </>
          )}

        </div>
      )}

    </div>
  );
}
