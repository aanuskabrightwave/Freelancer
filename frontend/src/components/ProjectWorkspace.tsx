"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { workspaceService, WorkspaceFile, WorkspaceLink, WorkspaceEvent, MessageResponse, DeliveryResponse, RevisionRequestResponse } from "@/services/workspace.service";
import { bookingService } from "@/services/booking.service";

interface ProjectWorkspaceProps {
  bookingId: string;
  role: "CLIENT" | "FREELANCER";
}

export default function ProjectWorkspace({ bookingId, role }: ProjectWorkspaceProps) {
  const [booking, setBooking] = useState<any | null>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "messages" | "files" | "deliveries" | "revisions" | "timeline">("overview");

  // Library & Data states
  const [files, setFiles] = useState<WorkspaceFile[]>([]);
  const [links, setLinks] = useState<WorkspaceLink[]>([]);
  const [timeline, setTimeline] = useState<WorkspaceEvent[]>([]);
  const [messages, setMessages] = useState<MessageResponse[]>([]);
  const [deliveries, setDeliveries] = useState<DeliveryResponse[]>([]);
  const [revisions, setRevisions] = useState<RevisionRequestResponse[]>([]);

  // Loading / Error states
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // New message states
  const [messageText, setMessageText] = useState("");
  const [replyingTo, setReplyingTo] = useState<MessageResponse | null>(null);
  const [selectedUploads, setSelectedUploads] = useState<number[]>([]);
  const [isEditingMessageId, setIsEditingMessageId] = useState<number | null>(null);
  const [editText, setEditText] = useState("");

  // New file upload states
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadCategory, setUploadCategory] = useState("REFERENCE");
  const [uploadDesc, setUploadDesc] = useState("");

  // New link states
  const [linkLabel, setLinkLabel] = useState("");
  const [linkUrl, setLinkUrl] = useState("");

  // New delivery submission states
  const [deliveryType, setDeliveryType] = useState("PREVIEW");
  const [deliveryTitle, setDeliveryTitle] = useState("");
  const [deliveryMessage, setDeliveryMessage] = useState("");
  const [deliveryFileIds, setDeliveryFileIds] = useState<number[]>([]);

  // Revision request states
  const [revTitle, setRevTitle] = useState("");
  const [revDesc, setRevDesc] = useState("");
  const [selectedDeliveryId, setSelectedDeliveryId] = useState<number | null>(null);

  // Revision comment states
  const [activeRevId, setActiveRevId] = useState<number | null>(null);
  const [revCommentText, setRevCommentText] = useState("");
  const [revTimestamp, setRevTimestamp] = useState<number | null>(null);
  const [revComments, setRevComments] = useState<Record<number, any[]>>({});

  // Chat scroll ref
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Load everything
  async function loadWorkspaceData() {
    try {
      setLoading(true);
      setErrorMsg(null);

      // 1. Fetch booking details
      const bData = await bookingService.getBookingDetails(bookingId);
      setBooking(bData);

      // 2. Fetch workspace responses
      await workspaceService.getWorkspace(bookingId);
      
      const fileList = await workspaceService.getFiles(bookingId);
      setFiles(fileList);

      const linkList = await workspaceService.getLinks(bookingId);
      setLinks(linkList);

      const timelineEvents = await workspaceService.getTimeline(bookingId);
      setTimeline(timelineEvents);

      const messageList = await workspaceService.getMessages(bookingId);
      setMessages(messageList);

      const deliveryList = await workspaceService.getDeliveries(bookingId);
      setDeliveries(deliveryList);

      const revisionList = await workspaceService.getRevisions(bookingId);
      setRevisions(revisionList);

      // Fetch comments for all revisions
      const commentsMap: Record<number, any[]> = {};
      for (const rev of revisionList) {
        try {
          const comments = await workspaceService.getRevisionComments(rev.id);
          commentsMap[rev.id] = comments;
        } catch (e) {
          commentsMap[rev.id] = [];
        }
      }
      setRevComments(commentsMap);

    } catch (err: any) {
      setErrorMsg(err.response?.data?.detail || "Failed to load Project Workspace.");
    } finally {
      setLoading(false);
      scrollToBottom();
    }
  }

  useEffect(() => {
    loadWorkspaceData();
  }, [bookingId]);

  // Scroll helper
  function scrollToBottom() {
    setTimeout(() => {
      chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  }

  // Socket simul notification
  const [wsConnected, setWsConnected] = useState(true);

  // File size formatter
  function formatBytes(bytes?: number) {
    if (!bytes) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  }

  // Send message
  async function handleSendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!messageText.trim() && selectedUploads.length === 0) return;

    try {
      setActionLoading(true);
      await workspaceService.sendMessage(
        bookingId,
        messageText,
        replyingTo?.id || undefined,
        selectedUploads.length > 0 ? selectedUploads : undefined
      );
      setMessageText("");
      setReplyingTo(null);
      setSelectedUploads([]);
      
      // Reload chat
      const messageList = await workspaceService.getMessages(bookingId);
      setMessages(messageList);
      scrollToBottom();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Failed to post message.");
    } finally {
      setActionLoading(false);
    }
  }

  // Edit Text message
  async function handleEditSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isEditingMessageId || !editText.trim()) return;

    try {
      setActionLoading(true);
      await workspaceService.editMessage(isEditingMessageId, editText);
      setIsEditingMessageId(null);
      setEditText("");

      // Reload chat
      const messageList = await workspaceService.getMessages(bookingId);
      setMessages(messageList);
    } catch (err: any) {
      alert(err.response?.data?.detail || "Cannot edit message.");
    } finally {
      setActionLoading(false);
    }
  }

  // Delete message (soft)
  async function handleDeleteMessage(msgId: number) {
    if (!confirm("Are you sure you want to delete this message?")) return;
    try {
      setActionLoading(true);
      await workspaceService.deleteMessage(msgId);
      // Reload chat
      const messageList = await workspaceService.getMessages(bookingId);
      setMessages(messageList);
    } catch (err: any) {
      alert(err.response?.data?.detail || "Failed to delete message.");
    } finally {
      setActionLoading(false);
    }
  }

  // File uploads
  async function handleFileUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!uploadFile) return;

    try {
      setActionLoading(true);
      await workspaceService.uploadFile(bookingId, uploadFile, uploadCategory, uploadDesc);
      setUploadFile(null);
      setUploadDesc("");

      // Refresh files list & events
      const fileList = await workspaceService.getFiles(bookingId);
      setFiles(fileList);
      const timelineEvents = await workspaceService.getTimeline(bookingId);
      setTimeline(timelineEvents);
    } catch (err: any) {
      alert(err.response?.data?.detail || "File upload failed.");
    } finally {
      setActionLoading(false);
    }
  }

  // Add Link
  async function handleAddLink(e: React.FormEvent) {
    e.preventDefault();
    if (!linkLabel.trim() || !linkUrl.trim()) return;

    try {
      setActionLoading(true);
      await workspaceService.shareLink(bookingId, linkLabel, linkUrl);
      setLinkLabel("");
      setLinkUrl("");

      // Refresh links
      const linkList = await workspaceService.getLinks(bookingId);
      setLinks(linkList);
      const timelineEvents = await workspaceService.getTimeline(bookingId);
      setTimeline(timelineEvents);
    } catch (err: any) {
      alert(err.response?.data?.detail || "Failed to share link.");
    } finally {
      setActionLoading(false);
    }
  }

  // Delete library file
  async function handleDeleteFile(fileId: number) {
    if (!confirm("Remove this file from project workspace library?")) return;
    try {
      setActionLoading(true);
      await workspaceService.deleteFile(bookingId, fileId);
      const fileList = await workspaceService.getFiles(bookingId);
      setFiles(fileList);
    } catch (err: any) {
      alert(err.response?.data?.detail || "Failed to delete file.");
    } finally {
      setActionLoading(false);
    }
  }

  // Submit delivery
  async function handleDeliverSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!deliveryTitle.trim()) {
      alert("Please specify a title.");
      return;
    }

    try {
      setActionLoading(true);
      await workspaceService.submitDelivery(bookingId, {
        delivery_type: deliveryType,
        title: deliveryTitle,
        message: deliveryMessage || undefined,
        file_ids: deliveryFileIds
      });
      setDeliveryTitle("");
      setDeliveryMessage("");
      setDeliveryFileIds([]);

      // Reload
      const deliveryList = await workspaceService.getDeliveries(bookingId);
      setDeliveries(deliveryList);
      const fileList = await workspaceService.getFiles(bookingId);
      setFiles(fileList);
      const bData = await bookingService.getBookingDetails(bookingId);
      setBooking(bData);
      const timelineEvents = await workspaceService.getTimeline(bookingId);
      setTimeline(timelineEvents);
      
      alert("Deliverable package submitted successfully!");
    } catch (err: any) {
      alert(err.response?.data?.detail || "Delivery failed.");
    } finally {
      setActionLoading(false);
    }
  }

  // Request revision
  async function handleRevisionSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedDeliveryId || !revTitle.trim() || !revDesc.trim()) return;

    try {
      setActionLoading(true);
      await workspaceService.requestRevision(selectedDeliveryId, {
        title: revTitle,
        description: revDesc
      });
      setRevTitle("");
      setRevDesc("");
      setSelectedDeliveryId(null);

      // Reload
      const revisionList = await workspaceService.getRevisions(bookingId);
      setRevisions(revisionList);
      const deliveryList = await workspaceService.getDeliveries(bookingId);
      setDeliveries(deliveryList);
      const bData = await bookingService.getBookingDetails(bookingId);
      setBooking(bData);
      const timelineEvents = await workspaceService.getTimeline(bookingId);
      setTimeline(timelineEvents);

      alert("Revision request logged successfully.");
    } catch (err: any) {
      alert(err.response?.data?.detail || "Failed to submit revision.");
    } finally {
      setActionLoading(false);
    }
  }

  // Freelancer starts revision
  async function handleStartRevision(revId: number) {
    try {
      setActionLoading(true);
      await workspaceService.startRevisionWork(revId);
      const revisionList = await workspaceService.getRevisions(bookingId);
      setRevisions(revisionList);
    } catch (err: any) {
      alert(err.response?.data?.detail || "Failed to start revision.");
    } finally {
      setActionLoading(false);
    }
  }

  // Add revision comment
  async function handleAddComment(e: React.FormEvent, revId: number) {
    e.preventDefault();
    if (!revCommentText.trim()) return;

    try {
      setActionLoading(true);
      await workspaceService.addRevisionComment(revId, revTimestamp, revCommentText);
      setRevCommentText("");
      setRevTimestamp(null);

      // Reload comments
      const comments = await workspaceService.getRevisionComments(revId);
      setRevComments((prev) => ({ ...prev, [revId]: comments }));
    } catch (err: any) {
      alert(err.response?.data?.detail || "Failed to add comment.");
    } finally {
      setActionLoading(false);
    }
  }

  // Approve & complete
  async function handleCompleteBooking() {
    if (!confirm("Are you sure you want to approve this final delivery and mark booking completed?")) return;
    try {
      setActionLoading(true);
      await bookingService.completeBooking(bookingId);
      const bData = await bookingService.getBookingDetails(bookingId);
      setBooking(bData);
      const timelineEvents = await workspaceService.getTimeline(bookingId);
      setTimeline(timelineEvents);
      alert("Milestone completed! Booking completed successfully.");
    } catch (err: any) {
      alert(err.response?.data?.detail || "Fulfillment completion failed.");
    } finally {
      setActionLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center text-slate-400 py-12">
        <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-xs uppercase tracking-widest font-black animate-pulse">Entering Secure Workspace...</p>
      </div>
    );
  }

  if (errorMsg || !booking) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-200 p-8">
        <div className="max-w-xl mx-auto bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl text-center space-y-4">
          <span className="text-4xl block">🔒</span>
          <h2 className="text-lg font-black text-rose-500">Access Denied / Not Found</h2>
          <p className="text-xs text-slate-400">{errorMsg || "Workspace parameters could not be validated."}</p>
          <Link href={`/${role.toLowerCase()}/bookings`} className="inline-block mt-4 px-6 py-2 bg-slate-950 border border-slate-800 rounded-xl hover:bg-slate-850 text-xs font-bold transition">
            Back to Bookings
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 pb-16">
      
      {/* Workspace Banner */}
      <div className="bg-gradient-to-b from-slate-900 to-slate-950 border-b border-slate-850 py-8 px-6 md:px-12">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <span className="px-2 py-0.5 bg-indigo-500/10 border border-indigo-500/30 text-[10px] font-black tracking-wider text-indigo-400 rounded uppercase">
                Fulfillment Workspace
              </span>
              <span className="text-xs text-slate-400">Order: {booking.booking_number}</span>
            </div>
            <h1 className="text-xl md:text-2xl font-black text-white">{booking.title}</h1>
            <p className="text-xs text-slate-400">
              Role: <strong className="text-indigo-400 uppercase">{role}</strong> | Deadline:{" "}
              <strong className="text-slate-200">{booking.scheduled_date || "Flexible"}</strong>
            </p>
          </div>

          <div className="flex items-center gap-3 bg-slate-900 border border-slate-800 px-4 py-2.5 rounded-2xl">
            <div>
              <span className="text-[10px] text-slate-500 uppercase font-black block">WORKSPACE STATUS</span>
              <strong className="text-xs text-indigo-300 uppercase">{booking.status}</strong>
            </div>
            {wsConnected && (
              <span className="flex h-2.5 w-2.5 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Tabs Navigator */}
      <div className="max-w-7xl mx-auto px-6 md:px-12 mt-6">
        <div className="flex border-b border-slate-850 overflow-x-auto gap-4 md:gap-8 text-xs font-black uppercase tracking-wider pb-px scrollbar-none">
          {(["overview", "messages", "files", "deliveries", "revisions", "timeline"] as const).map((tab) => {
            const isActive = activeTab === tab;
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`py-3 transition border-b-2 font-black whitespace-nowrap ${
                  isActive ? "border-indigo-500 text-indigo-400" : "border-transparent text-slate-400 hover:text-slate-200"
                }`}
              >
                {tab}
              </button>
            );
          })}
        </div>

        {/* Tab Contents */}
        <div className="mt-8">
          
          {/* TAB 1: OVERVIEW */}
          {activeTab === "overview" && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-6">
                <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
                  <h3 className="text-xs font-black uppercase text-white tracking-wider">Project Specification</h3>
                  <p className="text-xs text-slate-300 leading-relaxed">{booking.description || "No specification overview available."}</p>
                  
                  {booking.requirements_answers && Object.keys(booking.requirements_answers).length > 0 && (
                    <div className="pt-4 border-t border-slate-850 space-y-3">
                      <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Requirement Briefs</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {Object.entries(booking.requirements_answers).map(([key, val]: [string, any], idx) => (
                          <div key={idx} className="bg-slate-950 border border-slate-850 p-3.5 rounded-2xl text-xs">
                            <span className="text-slate-500 block text-[9px] uppercase tracking-wider mb-1">Q ID: {key}</span>
                            <strong className="text-white break-words">{String(val)}</strong>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
                  <h3 className="text-xs font-black uppercase text-white tracking-wider">Recent Activity timeline</h3>
                  <div className="space-y-4">
                    {timeline.slice(-3).reverse().map((evt) => (
                      <div key={evt.id} className="flex gap-4 items-start text-xs border-l-2 border-slate-800 pl-4 py-1">
                        <div>
                          <strong className="text-indigo-400 block">{evt.title}</strong>
                          <span className="text-slate-400 block mt-0.5">{evt.description}</span>
                          <span className="text-[10px] text-slate-500 mt-1 block">
                            {new Date(evt.created_at).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Sidebar Action Column */}
              <div className="space-y-6">
                <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
                  <span className="text-[10px] text-indigo-400 font-extrabold uppercase tracking-wider block">Financial Rate summary</span>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-400">Total Rate</span>
                    <span className="text-sm font-bold text-white">₹{parseInt(booking.agreed_amount).toLocaleString()}</span>
                  </div>

                  <div className="pt-4 border-t border-slate-850 space-y-3">
                    {role === "CLIENT" && booking.status === "DELIVERY_PENDING" && (
                      <button
                        onClick={handleCompleteBooking}
                        disabled={actionLoading}
                        className="w-full py-2.5 bg-gradient-to-r from-emerald-600 to-indigo-600 hover:from-emerald-500 hover:to-indigo-500 text-white text-xs font-black rounded-xl transition uppercase tracking-wider"
                      >
                        Approve Final Output & Pay
                      </button>
                    )}

                    {role === "FREELANCER" && ["CONFIRMED", "IN_PROGRESS"].includes(booking.status) && (
                      <button
                        onClick={() => setActiveTab("deliveries")}
                        className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black rounded-xl transition uppercase tracking-wider"
                      >
                        Submit Delivery Package
                      </button>
                    )}

                    <button
                      onClick={() => setActiveTab("messages")}
                      className="w-full py-2.5 bg-slate-950 border border-slate-800 text-slate-300 text-xs font-bold rounded-xl hover:bg-slate-850 transition"
                    >
                      Open Chat Thread
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: MESSAGES */}
          {activeTab === "messages" && (
            <div className="bg-slate-900 border border-slate-800 rounded-3xl shadow-xl overflow-hidden flex flex-col h-[600px]">
              
              {/* Messages viewport */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4 scrollbar-none">
                {messages.length === 0 ? (
                  <div className="h-full flex flex-col justify-center items-center text-slate-500 text-xs space-y-2">
                    <span className="text-2xl">💬</span>
                    <p>No messages shared yet. Start the conversation!</p>
                  </div>
                ) : (
                  messages.map((msg) => {
                    const isMe = msg.sender_id === (booking.client_id === msg.sender_id ? booking.client_id : msg.sender_id);
                    // Safe name resolution
                    const senderLabel = msg.sender_id === booking.client_id ? "Client" : "Freelancer";

                    if (msg.is_deleted) {
                      return (
                        <div key={msg.id} className="flex justify-center my-1">
                          <span className="text-[10px] text-slate-600 italic bg-slate-950 px-3 py-1 rounded-full border border-slate-850">
                            This message was deleted
                          </span>
                        </div>
                      );
                    }

                    return (
                      <div key={msg.id} className={`flex flex-col max-w-[70%] space-y-1 ${msg.sender_id === (role === "CLIENT" ? booking.client_id : booking.freelancer_profile_id) ? "ml-auto items-end" : "mr-auto items-start"}`}>
                        <div className="flex items-center gap-2 text-[10px] text-slate-500">
                          <span className="font-bold">{senderLabel}</span>
                          <span>•</span>
                          <span>{new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          {msg.is_edited && <span className="text-indigo-400">(edited)</span>}
                        </div>

                        {/* Reply Indicator */}
                        {msg.reply_to_message_id && (
                          <div className="bg-slate-950 border border-slate-850 text-[10px] px-3 py-1 rounded-t-xl text-slate-400 italic">
                            Replying to message ID #{msg.reply_to_message_id}
                          </div>
                        )}

                        {/* Bubble */}
                        <div className={`px-4 py-2.5 rounded-2xl text-xs break-words relative group ${msg.sender_id === (role === "CLIENT" ? booking.client_id : booking.freelancer_profile_id) ? "bg-indigo-600 text-white rounded-tr-none" : "bg-slate-800 text-slate-100 rounded-tl-none"}`}>
                          
                          {isEditingMessageId === msg.id ? (
                            <form onSubmit={handleEditSubmit} className="flex gap-2">
                              <input
                                type="text"
                                value={editText}
                                onChange={(e) => setEditText(e.target.value)}
                                className="bg-slate-950 border border-slate-800 rounded px-2 py-1 text-xs text-white"
                              />
                              <button type="submit" className="text-[10px] text-indigo-400 font-bold">Save</button>
                              <button type="button" onClick={() => setIsEditingMessageId(null)} className="text-[10px] text-rose-400">Cancel</button>
                            </form>
                          ) : (
                            <p>{msg.content || msg.message_text}</p>
                          )}

                          {/* Message actions popover */}
                          {!isEditingMessageId && msg.sender_id === (role === "CLIENT" ? booking.client_id : booking.freelancer_profile_id) && (
                            <div className="opacity-0 group-hover:opacity-100 absolute -top-4 right-0 bg-slate-950 border border-slate-850 px-2 py-0.5 rounded flex gap-2 text-[9px] transition">
                              <button onClick={() => { setIsEditingMessageId(msg.id); setEditText(msg.content || ""); }} className="text-slate-400 hover:text-white">Edit</button>
                              <button onClick={() => handleDeleteMessage(msg.id)} className="text-rose-500 hover:text-rose-400">Delete</button>
                            </div>
                          )}

                          {/* Inline Attachments */}
                          {msg.attachments && msg.attachments.length > 0 && (
                            <div className="mt-2 space-y-1">
                              {msg.attachments.map((att: any) => (
                                <a
                                  key={att.id}
                                  href={att.workspace_file?.file_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-2 bg-slate-950/40 hover:bg-slate-950 p-2 rounded-xl text-[10px] text-indigo-300 font-bold border border-slate-800/40"
                                >
                                  📎 {att.workspace_file?.original_name || "Attachment File"}
                                </a>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={chatEndRef}></div>
              </div>

              {/* Chat Input form */}
              <div className="bg-slate-950/80 border-t border-slate-850 p-4">
                
                {/* Replying indicator */}
                {replyingTo && (
                  <div className="bg-slate-900 border border-slate-800 px-4 py-2 rounded-xl text-xs flex justify-between items-center mb-3 text-slate-400">
                    <span>Replying to: <em>{replyingTo.content}</em></span>
                    <button onClick={() => setReplyingTo(null)} className="text-rose-500 font-bold">Cancel</button>
                  </div>
                )}

                {/* Selected Attachments list */}
                {selectedUploads.length > 0 && (
                  <div className="flex gap-2 flex-wrap mb-3">
                    {selectedUploads.map((fid) => {
                      const f = files.find((item) => item.id === fid);
                      return (
                        <span key={fid} className="bg-indigo-950/30 border border-indigo-800 text-[10px] px-2.5 py-1 rounded-full text-indigo-400 flex items-center gap-1.5">
                          📎 {f?.original_name}
                          <button onClick={() => setSelectedUploads(prev => prev.filter(x => x !== fid))} className="text-rose-500 font-black">×</button>
                        </span>
                      );
                    })}
                  </div>
                )}

                <form onSubmit={handleSendMessage} className="flex gap-3">
                  {/* Select attachment dropdown */}
                  <select
                    onChange={(e) => {
                      const val = parseInt(e.target.value);
                      if (val) {
                        setSelectedUploads(prev => prev.includes(val) ? prev : [...prev, val]);
                        e.target.value = "";
                      }
                    }}
                    className="bg-slate-900 border border-slate-800 text-slate-400 rounded-xl px-2 text-[10px] font-bold"
                  >
                    <option value="">📎 Attach</option>
                    {files.map(f => (
                      <option key={f.id} value={f.id}>{f.original_name}</option>
                    ))}
                  </select>

                  <input
                    type="text"
                    required={selectedUploads.length === 0}
                    placeholder="Write a message in project workspace..."
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    className="flex-1 bg-slate-900 border border-slate-850 rounded-xl px-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none"
                  />
                  
                  <button
                    type="submit"
                    disabled={actionLoading}
                    className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-xs font-black rounded-xl text-white uppercase transition"
                  >
                    Send
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* TAB 3: FILES */}
          {activeTab === "files" && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              
              {/* File Library grid */}
              <div className="lg:col-span-2 space-y-6">
                <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
                  <h3 className="text-xs font-black uppercase text-white tracking-wider">Project Files Library</h3>
                  
                  {files.length === 0 ? (
                    <p className="text-xs text-slate-500 py-6 text-center">No files uploaded to workspace library yet.</p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {files.map((file) => (
                        <div key={file.id} className="bg-slate-950 border border-slate-850 p-4 rounded-2xl flex flex-col justify-between space-y-4">
                          <div>
                            <div className="flex justify-between items-start gap-2">
                              <span className="px-2 py-0.5 bg-indigo-950 text-indigo-400 border border-indigo-900 rounded text-[9px] font-black tracking-wider uppercase">
                                {file.file_category}
                              </span>
                              <button onClick={() => handleDeleteFile(file.id)} className="text-[11px] text-rose-500 hover:text-rose-400">
                                Delete
                              </button>
                            </div>
                            <h4 className="text-xs text-white font-bold truncate mt-2">{file.original_name}</h4>
                            <p className="text-[10px] text-slate-500 mt-1">{file.description || "No description provided."}</p>
                          </div>

                          <div className="pt-2 border-t border-slate-900 flex justify-between items-center text-[10px] text-slate-500">
                            <span>{formatBytes(file.file_size)}</span>
                            <a
                              href={file.file_url}
                              download
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-indigo-400 hover:underline font-bold"
                            >
                              Download
                            </a>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* External Links */}
                <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
                  <h3 className="text-xs font-black uppercase text-white tracking-wider">External Folder References</h3>
                  {links.length === 0 ? (
                    <p className="text-xs text-slate-500 py-4 text-center">No external reference links mapped.</p>
                  ) : (
                    <div className="space-y-3">
                      {links.map((link) => (
                        <a
                          key={link.id}
                          href={link.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex justify-between items-center bg-slate-950 border border-slate-850 p-3.5 rounded-2xl text-xs hover:border-slate-800 transition"
                        >
                          <div>
                            <strong className="text-indigo-400 block">{link.label}</strong>
                            <span className="text-[10px] text-slate-500 block truncate max-w-sm mt-0.5">{link.url}</span>
                          </div>
                          <span className="text-slate-400">🌐 Launch</span>
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Sidebar Upload Forms */}
              <div className="space-y-6">
                
                {/* Upload File form */}
                <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
                  <h3 className="text-xs font-black uppercase text-white tracking-wider">Share file attachment</h3>
                  <form onSubmit={handleFileUpload} className="space-y-4">
                    <div>
                      <label className="block text-[10px] text-slate-400 uppercase font-black mb-1">Category Type</label>
                      <select
                        value={uploadCategory}
                        onChange={(e) => setUploadCategory(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-850 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none"
                      >
                        <option value="REFERENCE">Reference Brief</option>
                        <option value="PROJECT_FILE">Project Resource</option>
                        <option value="OTHER">Other Metadata</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] text-slate-400 uppercase font-black mb-1">Description</label>
                      <input
                        type="text"
                        placeholder="e.g. Logo vector source files"
                        value={uploadDesc}
                        onChange={(e) => setUploadDesc(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-850 rounded-xl px-3 py-2 text-xs text-white"
                      />
                    </div>

                    <div>
                      <input
                        type="file"
                        required
                        onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                        className="w-full text-xs text-slate-400"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={actionLoading}
                      className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black rounded-xl transition uppercase tracking-wider"
                    >
                      Upload File
                    </button>
                  </form>
                </div>

                {/* Cloud link form */}
                <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
                  <h3 className="text-xs font-black uppercase text-white tracking-wider">Share Google Drive / Dropbox link</h3>
                  <form onSubmit={handleAddLink} className="space-y-4">
                    <div>
                      <label className="block text-[10px] text-slate-400 uppercase font-black mb-1">Folder Label</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. High-res Raw footage dump"
                        value={linkLabel}
                        onChange={(e) => setLinkLabel(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-850 rounded-xl px-3 py-2 text-xs text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] text-slate-400 uppercase font-black mb-1">External Target URL</label>
                      <input
                        type="url"
                        required
                        placeholder="https://drive.google.com/..."
                        value={linkUrl}
                        onChange={(e) => setLinkUrl(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-850 rounded-xl px-3 py-2 text-xs text-white"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={actionLoading}
                      className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black rounded-xl transition uppercase tracking-wider"
                    >
                      Share Folder Link
                    </button>
                  </form>
                </div>

              </div>
            </div>
          )}

          {/* TAB 4: DELIVERIES */}
          {activeTab === "deliveries" && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              
              {/* Deliveries pipeline */}
              <div className="lg:col-span-2 space-y-6">
                <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
                  <h3 className="text-xs font-black uppercase text-white tracking-wider">Milestone Submissions</h3>
                  {deliveries.length === 0 ? (
                    <p className="text-xs text-slate-500 py-6 text-center font-bold">No deliverables packages submitted yet.</p>
                  ) : (
                    <div className="space-y-6">
                      {deliveries.map((del) => (
                        <div key={del.id} className="bg-slate-950 border border-slate-850 p-6 rounded-3xl space-y-4 shadow-xl">
                          <div className="flex justify-between items-start gap-4">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="px-2 py-0.5 bg-indigo-500/10 text-indigo-400 border border-indigo-900 rounded text-[9px] font-black uppercase">
                                  {del.delivery_type} VERSION #{del.version}
                                </span>
                                <span className="text-[10px] text-slate-500">{new Date(del.submitted_at).toLocaleDateString()}</span>
                              </div>
                              <h4 className="text-sm font-bold text-white mt-1.5">{del.title}</h4>
                            </div>

                            <span className={`px-3 py-1 text-[10px] font-black rounded-full uppercase border ${
                              del.status === "APPROVED" 
                                ? "bg-emerald-950/20 border-emerald-500/40 text-emerald-400"
                                : del.status === "REVISION_REQUESTED"
                                ? "bg-rose-950/20 border-rose-500/40 text-rose-400"
                                : "bg-cyan-950/20 border-cyan-500/40 text-cyan-400"
                            }`}>
                              {del.status}
                            </span>
                          </div>

                          <p className="text-xs text-slate-300">{del.message}</p>

                          {/* Delivery Files links */}
                          {del.delivery_files && del.delivery_files.length > 0 && (
                            <div className="pt-3 border-t border-slate-900 space-y-2">
                              <h5 className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Enclosed Output Assets:</h5>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {del.delivery_files.map((df: any) => (
                                  <a
                                    key={df.id}
                                    href={df.workspace_file?.file_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="bg-slate-900 hover:bg-slate-850 border border-slate-800 p-2.5 rounded-xl text-[11px] text-indigo-400 font-bold block truncate"
                                  >
                                    📁 {df.workspace_file?.original_name}
                                  </a>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Client action controls on delivery */}
                          {role === "CLIENT" && del.status === "SUBMITTED" && (
                            <div className="flex gap-3 pt-4 border-t border-slate-900 justify-end">
                              <button
                                onClick={() => { setSelectedDeliveryId(del.id); setRevTitle(`Revisions on ${del.title}`); }}
                                className="px-4 py-1.5 bg-slate-900 border border-slate-850 hover:bg-slate-800 text-slate-300 text-xs font-bold rounded-lg transition"
                              >
                                Request Revisions
                              </button>
                              <button
                                onClick={handleCompleteBooking}
                                className="px-5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black rounded-lg transition uppercase tracking-wider"
                              >
                                Approve Final Output
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Sidebar submission form for Freelancer */}
              <div className="space-y-6">
                {role === "FREELANCER" && (
                  <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
                    <h3 className="text-xs font-black uppercase text-white tracking-wider">Publish New delivery</h3>
                    <form onSubmit={handleDeliverSubmit} className="space-y-4">
                      <div>
                        <label className="block text-[10px] text-slate-400 uppercase font-black mb-1">Fulfillment Type</label>
                        <select
                          value={deliveryType}
                          onChange={(e) => setDeliveryType(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-850 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none"
                        >
                          <option value="PREVIEW">Preview Draft</option>
                          <option value="FINAL">Final Project Delivery</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] text-slate-400 uppercase font-black mb-1">Package Title</label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. Wedding highlights film rough draft"
                          value={deliveryTitle}
                          onChange={(e) => setDeliveryTitle(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-850 rounded-xl px-3 py-2 text-xs text-white"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] text-slate-400 uppercase font-black mb-1">Note Message</label>
                        <textarea
                          rows={3}
                          placeholder="Leave feedback or remarks on this delivery batch..."
                          value={deliveryMessage}
                          onChange={(e) => setDeliveryMessage(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-850 rounded-xl px-3 py-2 text-xs text-white resize-none"
                        />
                      </div>

                      {/* File checkboxes */}
                      <div>
                        <label className="block text-[10px] text-slate-400 uppercase font-black mb-1.5">Enclose Uploaded Assets</label>
                        <div className="max-h-36 overflow-y-auto space-y-1.5 bg-slate-950 border border-slate-850 p-3.5 rounded-xl">
                          {files.length === 0 ? (
                            <span className="text-[10px] text-slate-500">No library files found to enclose. Upload first!</span>
                          ) : (
                            files.map((f) => (
                              <label key={f.id} className="flex items-center gap-2 text-[11px] text-slate-300 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={deliveryFileIds.includes(f.id)}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setDeliveryFileIds(prev => [...prev, f.id]);
                                    } else {
                                      setDeliveryFileIds(prev => prev.filter(x => x !== f.id));
                                    }
                                  }}
                                  className="rounded border-slate-800 text-indigo-600 focus:ring-0"
                                />
                                <span className="truncate">{f.original_name}</span>
                              </label>
                            ))
                          )}
                        </div>
                      </div>

                      <button
                        type="submit"
                        disabled={actionLoading}
                        className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black rounded-xl transition uppercase tracking-wider"
                      >
                        Publish Deliverable Package
                      </button>
                    </form>
                  </div>
                )}

                {/* Revision Request Dialog for Client */}
                {role === "CLIENT" && selectedDeliveryId && (
                  <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
                    <h3 className="text-xs font-black uppercase text-rose-400 tracking-wider">Propose Revision Loop</h3>
                    <form onSubmit={handleRevisionSubmit} className="space-y-4">
                      <div>
                        <label className="block text-[10px] text-slate-400 uppercase font-black mb-1">Brief Title</label>
                        <input
                          type="text"
                          required
                          value={revTitle}
                          onChange={(e) => setRevTitle(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-850 rounded-xl px-3 py-2 text-xs text-white"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] text-slate-400 uppercase font-black mb-1">Feedback Description *</label>
                        <textarea
                          rows={3}
                          required
                          placeholder="e.g. Fix grading saturation, transition cuts..."
                          value={revDesc}
                          onChange={(e) => setRevDesc(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-850 rounded-xl px-3 py-2 text-xs text-white resize-none"
                        />
                      </div>

                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setSelectedDeliveryId(null)}
                          className="flex-1 py-2 bg-slate-950 border border-slate-800 text-slate-400 text-xs font-bold rounded-xl"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={actionLoading}
                          className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl transition uppercase"
                        >
                          Submit Loop
                        </button>
                      </div>
                    </form>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 5: REVISIONS */}
          {activeTab === "revisions" && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              
              {/* Revision loops */}
              <div className="lg:col-span-2 space-y-6">
                <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
                  <h3 className="text-xs font-black uppercase text-white tracking-wider">Active Revision Loops</h3>
                  {revisions.length === 0 ? (
                    <p className="text-xs text-slate-500 py-6 text-center">No active revision requests found.</p>
                  ) : (
                    <div className="space-y-6">
                      {revisions.map((rev) => (
                        <div key={rev.id} className="bg-slate-950 border border-slate-850 p-6 rounded-3xl space-y-4 shadow-xl">
                          <div className="flex justify-between items-start gap-4">
                            <div>
                              <h4 className="text-sm font-bold text-white">{rev.title}</h4>
                              <p className="text-[10px] text-slate-500 mt-1">Requested on: {new Date(rev.created_at).toLocaleDateString()}</p>
                            </div>

                            <div className="flex items-center gap-2">
                              <span className={`px-2.5 py-0.5 text-[9px] font-black rounded uppercase border ${
                                rev.status === "RESOLVED"
                                  ? "bg-emerald-950 border-emerald-800 text-emerald-400"
                                  : rev.status === "IN_PROGRESS"
                                  ? "bg-amber-950 border-amber-800 text-amber-400"
                                  : "bg-rose-950 border-rose-800 text-rose-400"
                              }`}>
                                {rev.status}
                              </span>

                              {role === "FREELANCER" && rev.status === "OPEN" && (
                                <button
                                  onClick={() => handleStartRevision(rev.id)}
                                  className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-[10px] text-white font-bold rounded-lg transition"
                                >
                                  Start Work
                                </button>
                              )}
                            </div>
                          </div>

                          <p className="text-xs text-slate-300 bg-slate-900/50 p-3 rounded-xl border border-slate-900">
                            {rev.description}
                          </p>

                          {/* Timestamped Comments section */}
                          <div className="pt-4 border-t border-slate-900 space-y-3">
                            <div className="flex justify-between items-center">
                              <h5 className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                                Timestamp Frame Comments ({revComments[rev.id]?.length || 0})
                              </h5>
                              <button
                                onClick={() => setActiveRevId(activeRevId === rev.id ? null : rev.id)}
                                className="text-[10px] text-indigo-400 font-bold hover:underline"
                              >
                                {activeRevId === rev.id ? "Hide Comment Form" : "Add Frame Comment"}
                              </button>
                            </div>

                            {/* Comment Form */}
                            {activeRevId === rev.id && (
                              <form onSubmit={(e) => handleAddComment(e, rev.id)} className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex gap-3 items-end">
                                <div className="w-24">
                                  <label className="block text-[8px] text-slate-500 uppercase font-black mb-1">Time (Sec)</label>
                                  <input
                                    type="number"
                                    min="0"
                                    placeholder="e.g. 45"
                                    value={revTimestamp || ""}
                                    onChange={(e) => setRevTimestamp(e.target.value ? parseInt(e.target.value) : null)}
                                    className="w-full bg-slate-950 border border-slate-850 rounded-xl px-2.5 py-1.5 text-xs text-white"
                                  />
                                </div>
                                <div className="flex-1">
                                  <label className="block text-[8px] text-slate-500 uppercase font-black mb-1">Comment Message</label>
                                  <input
                                    type="text"
                                    required
                                    placeholder="Enter timeline annotation comment..."
                                    value={revCommentText}
                                    onChange={(e) => setRevCommentText(e.target.value)}
                                    className="w-full bg-slate-950 border border-slate-850 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none"
                                  />
                                </div>
                                <button
                                  type="submit"
                                  disabled={actionLoading}
                                  className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-xs font-bold text-white rounded-xl transition"
                                >
                                  Add
                                </button>
                              </form>
                            )}

                            {/* Comments viewport list */}
                            <div className="space-y-2">
                              {(revComments[rev.id] || []).map((comm) => (
                                <div key={comm.id} className="bg-slate-900/30 border border-slate-900/60 px-4 py-2.5 rounded-xl text-[11px] flex gap-3 items-start justify-between">
                                  <div className="flex-1 leading-relaxed">
                                    <p className="text-slate-300">{comm.comment}</p>
                                    <span className="text-[9px] text-slate-500 block mt-1">
                                      {new Date(comm.created_at).toLocaleString()}
                                    </span>
                                  </div>
                                  {comm.timestamp_seconds !== null && (
                                    <span className="px-2 py-0.5 bg-rose-500/10 border border-rose-500/30 text-[10px] text-rose-400 font-extrabold rounded">
                                      ⏱️ {Math.floor(comm.timestamp_seconds / 60)}:{(comm.timestamp_seconds % 60).toString().padStart(2, '0')}
                                    </span>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>

                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Sidebar Revision brief details */}
              <div className="space-y-6">
                <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4 text-xs text-slate-300 leading-relaxed">
                  <h3 className="text-xs font-black uppercase text-white tracking-wider">How Revisions Work</h3>
                  <p>When the freelancer publishes a preview draft, the client owner can trigger a revision loop identifying adjustments.</p>
                  <p>Adding timestamped frame remarks enables pin-pointing precise feedback segments (e.g. at 1:45 in video montages).</p>
                  <p>Note: Service packages enforce included revisions limits automatically.</p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: TIMELINE */}
          {activeTab === "timeline" && (
            <div className="max-w-3xl mx-auto bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-xl">
              <h3 className="text-xs font-black uppercase text-white tracking-wider mb-8">Visual project Timeline events</h3>
              
              <div className="relative border-l-2 border-slate-800 ml-4 space-y-8 pb-4">
                {timeline.map((evt) => (
                  <div key={evt.id} className="relative pl-8">
                    {/* Event Dot */}
                    <span className="absolute -left-[9px] top-1.5 bg-indigo-500 border border-slate-950 w-4 h-4 rounded-full flex items-center justify-center">
                      <span className="bg-white w-1.5 h-1.5 rounded-full"></span>
                    </span>

                    <div className="space-y-1.5 text-xs">
                      <span className="text-[10px] font-black uppercase tracking-wider text-indigo-400">
                        {evt.event_type}
                      </span>
                      <h4 className="text-sm font-black text-white">{evt.title}</h4>
                      <p className="text-slate-400 leading-relaxed">{evt.description}</p>
                      <span className="text-[10px] text-slate-500 block pt-1">
                        {new Date(evt.created_at).toLocaleString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
