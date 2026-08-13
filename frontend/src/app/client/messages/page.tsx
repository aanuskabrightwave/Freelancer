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

  const messagesEndRef = useRef<HTMLDivElement>(null);

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
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
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

  const activeConvo = conversations.find((c) => c.id === activeConvoId);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center text-white">
        <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex font-sans">
      
      {/* Messages Thread Sidebar */}
      <div className="w-80 border-r border-slate-850 bg-slate-900/50 flex flex-col flex-shrink-0">
        <div className="p-6 border-b border-slate-850">
          <h2 className="text-lg font-black text-white">Conversations</h2>
          <p className="text-slate-400 text-xs mt-1">Direct messaging chats</p>
        </div>

        <div className="flex-grow overflow-y-auto divide-y divide-slate-850/50">
          {conversations.map((convo) => {
            const isSelected = convo.id === activeConvoId;
            return (
              <button
                key={convo.id}
                onClick={() => setActiveConvoId(convo.id)}
                className={`w-full p-5 text-left transition flex items-center gap-4 ${
                  isSelected ? "bg-indigo-600/10 border-l-4 border-indigo-500" : "hover:bg-slate-900/40"
                }`}
              >
                <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center font-bold text-xs uppercase text-slate-300">
                  {getChatPartnerName(convo)[0]}
                </div>
                <div className="min-w-0 flex-grow">
                  <h4 className="text-xs font-bold text-white truncate">{getChatPartnerName(convo)}</h4>
                  <p className="text-[10px] text-slate-500 mt-1 uppercase tracking-wider font-semibold">
                    Thread #{convo.id}
                  </p>
                </div>
              </button>
            );
          })}

          {conversations.length === 0 && (
            <div className="py-12 text-center text-xs text-slate-500">
              No messaging threads yet.
            </div>
          )}
        </div>
      </div>

      {/* Main Messaging Logs Area */}
      <div className="flex-grow flex flex-col bg-slate-950/20">
        {activeConvo ? (
          <>
            {/* Log Header */}
            <div className="p-6 bg-slate-900/50 border-b border-slate-850 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center font-bold text-sm uppercase text-slate-200">
                  {getChatPartnerName(activeConvo)[0]}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">{getChatPartnerName(activeConvo)}</h3>
                  <span className="text-[10px] text-slate-500">Direct Chat Portal</span>
                </div>
              </div>
            </div>

            {/* Scrollable Logs */}
            <div className="flex-grow overflow-y-auto p-6 space-y-4">
              {messagesLoading && messages.length === 0 ? (
                <div className="h-full flex items-center justify-center">
                  <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                </div>
              ) : (
                messages.map((msg) => {
                  if (msg.is_system) {
                    return (
                      <div key={msg.id} className="max-w-2xl mx-auto text-center my-3 bg-slate-900 border border-slate-800 rounded-2xl p-4 text-xs text-slate-400 whitespace-pre-line leading-relaxed shadow">
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
                          ? "bg-indigo-600 text-white rounded-br-none" 
                          : "bg-slate-900 border border-slate-800 text-slate-200 rounded-bl-none"
                      }`}>
                        <p className="leading-relaxed">{msg.message_text}</p>
                        <span className="text-[8px] text-slate-400 block mt-1.5 text-right font-medium">
                          {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Submit Reply Form */}
            <div className="p-6 bg-slate-900/50 border-t border-slate-850">
              <form onSubmit={handleSendMessage} className="flex gap-4">
                <input
                  type="text"
                  placeholder="Type your message here..."
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  className="flex-grow bg-slate-950 border border-slate-850 rounded-xl px-4 py-3 text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500 text-xs transition"
                />
                <button
                  type="submit"
                  disabled={!replyText.trim()}
                  className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-900 disabled:text-slate-600 disabled:border-slate-850 disabled:border text-white text-xs font-black rounded-xl transition shadow-lg shadow-indigo-600/10 text-center"
                >
                  Send
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-grow flex flex-col items-center justify-center text-slate-500 text-xs">
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
      <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center text-white">
        <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    }>
      <MessagesContent />
    </Suspense>
  );
}
