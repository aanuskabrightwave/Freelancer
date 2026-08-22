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

  // Dispute states
  const [showDisputeModal, setShowDisputeModal] = useState(false);
  const [disputeReason, setDisputeReason] = useState("QUALITY_ISSUE");
  const [disputeDescription, setDisputeDescription] = useState("");

  const getDisputeTimeRemaining = () => {
    if (!booking?.dispute_window_ends_at) return null;
    const ends = new Date(booking.dispute_window_ends_at).getTime();
    const now = new Date().getTime();
    const diff = ends - now;
    if (diff <= 0) return "Expired";
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${mins}m remaining`;
  };

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

  // Start confirmed job
  async function handleStartProject() {
    if (!confirm("Are you ready to start working on this project? This will change the status to 'Work In Progress'.")) return;
    try {
      setActionLoading(true);
      await bookingService.startBooking(bookingId);
      
      // Reload workspace data
      const bData = await bookingService.getBookingDetails(bookingId);
      setBooking(bData);
      const timelineEvents = await workspaceService.getTimeline(bookingId);
      setTimeline(timelineEvents);
      
      alert("Project started! You are now in the 'Work In Progress' stage.");
    } catch (err: any) {
      alert(err.response?.data?.detail || "Failed to start project.");
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

  // Approve preview draft
  async function handleApprovePreview() {
    if (!confirm("Are you sure you want to approve this preview draft? Remaining balance payment will be required to unlock final deliverables.")) return;
    try {
      setActionLoading(true);
      await bookingService.approvePreview(bookingId);
      const bData = await bookingService.getBookingDetails(bookingId);
      setBooking(bData);
      const deliveryList = await workspaceService.getDeliveries(bookingId);
      setDeliveries(deliveryList);
      const timelineEvents = await workspaceService.getTimeline(bookingId);
      setTimeline(timelineEvents);
      alert("Preview draft approved successfully!");
    } catch (err: any) {
      alert(err.response?.data?.detail || "Preview approval failed.");
    } finally {
      setActionLoading(false);
    }
  }

  // Approve final delivery
  async function handleApproveFinal() {
    if (!confirm("Are you sure you want to approve this final delivery? This starts the 48-hour dispute window before payout release.")) return;
    try {
      setActionLoading(true);
      await bookingService.approveFinalDelivery(bookingId);
      const bData = await bookingService.getBookingDetails(bookingId);
      setBooking(bData);
      const deliveryList = await workspaceService.getDeliveries(bookingId);
      setDeliveries(deliveryList);
      const timelineEvents = await workspaceService.getTimeline(bookingId);
      setTimeline(timelineEvents);
      alert("Final delivery approved successfully! The 48-hour dispute window has started.");
    } catch (err: any) {
      alert(err.response?.data?.detail || "Final approval failed.");
    } finally {
      setActionLoading(false);
    }
  }

  // Submit dispute claim
  async function handleCreateDispute(e: React.FormEvent) {
    e.preventDefault();
    if (!disputeDescription.trim()) {
      alert("Please provide a description of the dispute.");
      return;
    }
    try {
      setActionLoading(true);
      await bookingService.openDispute(bookingId, disputeReason, disputeDescription);
      setShowDisputeModal(false);
      setDisputeDescription("");
      // Reload
      const bData = await bookingService.getBookingDetails(bookingId);
      setBooking(bData);
      const timelineEvents = await workspaceService.getTimeline(bookingId);
      setTimeline(timelineEvents);
      alert("Dispute opened successfully. Payout is held, and our support team will contact you shortly.");
    } catch (err: any) {
      alert(err.response?.data?.detail || "Failed to open dispute.");
    } finally {
      setActionLoading(false);
    }
  }

  // Legacy approve & complete fallback
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
      <div className="min-h-screen bg-background flex flex-col justify-center items-center py-12">
        <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-xs uppercase tracking-widest font-bold animate-pulse text-text-sub">Entering Secure Workspace...</p>
      </div>
    );
  }

  if (errorMsg || !booking) {
    return (
      <div className="min-h-screen bg-background text-text-main p-8">
        <div className="max-w-xl mx-auto bg-surface-elevated border border-border-custom rounded-3xl p-6 shadow-sm text-center space-y-4">
          <span className="text-4xl block">🔒</span>
          <h2 className="text-lg font-semibold text-primary">Access Denied / Not Found</h2>
          <p className="text-xs text-text-sub">{errorMsg || "Workspace parameters could not be validated."}</p>
          <Link href={`/${role.toLowerCase()}/bookings`} className="inline-block mt-4 px-6 py-2 bg-surface border border-border-custom rounded-full hover:bg-surface-elevated text-xs font-bold transition">
            Back to Bookings
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-text-main pb-24 font-sans">
      
      {/* Workspace Banner */}
      <div className="bg-surface-elevated border-b border-border-custom py-8 px-6 md:px-12">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <span className="px-2.5 py-0.5 bg-primary/10 border border-primary/20 text-[10px] font-bold tracking-wider text-primary rounded uppercase">
                Fulfillment Workspace
              </span>
              <span className="text-xs text-text-muted">Order: {booking.booking_number}</span>
            </div>
            <h1 className="text-xl md:text-2xl font-semibold text-text-main">{booking.title}</h1>
            <p className="text-xs text-text-sub font-medium">
              Role: <strong className="text-primary uppercase">{role}</strong> | Deadline:{" "}
              <strong className="text-text-main">{booking.scheduled_date || "Flexible"}</strong>
            </p>
          </div>

          <div className="flex items-center gap-3 bg-surface border border-border-custom px-4 py-2.5 rounded-2xl">
            <div>
              <span className="text-[10px] text-text-muted uppercase font-bold block">WORKSPACE STATUS</span>
              <strong className="text-xs text-primary uppercase font-bold">{booking.status}</strong>
            </div>
            {wsConnected && (
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-success"></span>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* visual pipeline stage tracker */}
      {(() => {
        const getStepIndex = (status: string) => {
          switch (status) {
            case "REQUESTED":
            case "PENDING_CONFIRMATION":
            case "CONFIRMED":
            case "RESCHEDULE_REQUESTED":
              return 0;
            case "IN_PROGRESS":
              return 1;
            case "DELIVERY_PENDING":
              return 2;
            case "COMPLETED":
              return 3;
            default:
              return 0;
          }
        };
        const currentStep = getStepIndex(booking.status);
        return (
          <div className="max-w-7xl mx-auto px-6 md:px-12 mt-8">
            <div className="bg-surface-elevated border border-border-custom rounded-3xl p-6 shadow-sm">
              <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-6 relative">
                
                {/* Step 1: Confirmed */}
                <div className="flex-1 flex flex-row md:flex-col items-center md:text-center gap-3 md:gap-2 relative z-10">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs transition duration-300 ${
                    currentStep >= 0 ? "bg-primary text-text-on-dark" : "bg-surface border border-border-custom text-text-muted"
                  }`}>
                    1
                  </div>
                  <div className="md:space-y-0.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider block text-text-main">Order Confirmed</span>
                    <span className="text-[9px] text-text-muted block font-medium">Workspace opened</span>
                  </div>
                </div>

                {/* Step 2: In Progress */}
                <div className="flex-1 flex flex-row md:flex-col items-center md:text-center gap-3 md:gap-2 relative z-10">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs transition duration-300 ${
                    currentStep >= 1 ? "bg-primary text-text-on-dark" : "bg-surface border border-border-custom text-text-muted"
                  }`}>
                    2
                  </div>
                  <div className="md:space-y-0.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider block text-text-main">Work In Progress</span>
                    <span className="text-[9px] text-text-muted block font-medium">Fulfillment started</span>
                  </div>
                </div>

                {/* Step 3: Delivery Review */}
                <div className="flex-1 flex flex-row md:flex-col items-center md:text-center gap-3 md:gap-2 relative z-10">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs transition duration-300 ${
                    currentStep >= 2 ? "bg-primary text-text-on-dark" : "bg-surface border border-border-custom text-text-muted"
                  }`}>
                    3
                  </div>
                  <div className="md:space-y-0.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider block text-text-main">Delivery Review</span>
                    <span className="text-[9px] text-text-muted block font-medium">Under review by client</span>
                  </div>
                </div>

                {/* Step 4: Completed */}
                <div className="flex-1 flex flex-row md:flex-col items-center md:text-center gap-3 md:gap-2 relative z-10">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs transition duration-300 ${
                    currentStep >= 3 ? "bg-primary text-text-on-dark" : "bg-surface border border-border-custom text-text-muted"
                  }`}>
                    4
                  </div>
                  <div className="md:space-y-0.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider block text-text-main">Completed</span>
                    <span className="text-[9px] text-text-muted block font-medium">Payout released</span>
                  </div>
                </div>

                {/* Connector Line (visible on desktop md) */}
                <div className="hidden md:block absolute top-[18px] left-[12.5%] right-[12.5%] h-0.5 bg-border-custom z-0">
                  <div 
                    className="h-full bg-primary transition-all duration-500" 
                    style={{ width: `${(currentStep / 3) * 100}%` }}
                  />
                </div>

              </div>
            </div>
          </div>
        );
      })()}

      {/* Tabs Navigator */}
      <div className="max-w-7xl mx-auto px-6 md:px-12 mt-6">
        <div className="flex border-b border-border-custom overflow-x-auto gap-4 md:gap-8 text-xs font-bold uppercase tracking-wider pb-px scrollbar-none">
          {(["overview", "messages", "files", "deliveries", "revisions", "timeline"] as const).map((tab) => {
            const isActive = activeTab === tab;
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`py-3 transition border-b-2 font-bold whitespace-nowrap cursor-pointer ${
                  isActive ? "border-primary text-primary" : "border-transparent text-text-muted hover:text-text-sub"
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
                <div className="bg-surface-elevated border border-border-custom rounded-3xl p-6 shadow-sm space-y-4">
                  <h3 className="text-xs font-bold uppercase text-text-main tracking-wider">Project Specification</h3>
                  <p className="text-xs text-text-sub leading-relaxed font-normal">{booking.description || "No specification overview available."}</p>
                  
                  {booking.requirements_answers && Object.keys(booking.requirements_answers).length > 0 && (
                    <div className="pt-4 border-t border-border-custom/50 space-y-3">
                      <h4 className="text-[10px] font-bold uppercase text-text-sub tracking-wider">Requirement Briefs</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {Object.entries(booking.requirements_answers).map(([key, val]: [string, any], idx) => (
                          <div key={idx} className="bg-surface border border-border-custom/85 p-3.5 rounded-2xl text-xs">
                            <span className="text-text-muted block text-[9px] uppercase tracking-wider mb-1">Q ID: {key}</span>
                            <strong className="text-text-main break-words font-semibold">{String(val)}</strong>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="bg-surface-elevated border border-border-custom rounded-3xl p-6 shadow-sm space-y-4">
                  <h3 className="text-xs font-bold uppercase text-text-main tracking-wider">Recent Activity timeline</h3>
                  <div className="space-y-4">
                    {timeline.slice(-3).reverse().map((evt) => (
                      <div key={evt.id} className="flex gap-4 items-start text-xs border-l-2 border-border-custom pl-4 py-1">
                        <div>
                          <strong className="text-primary block font-semibold">{evt.title}</strong>
                          <span className="text-text-sub block mt-0.5 font-normal">{evt.description}</span>
                          <span className="text-[10px] text-text-muted mt-1 block">
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
                <div className="bg-surface-elevated border border-border-custom rounded-3xl p-6 shadow-sm space-y-4">
                  <span className="text-[10px] text-primary font-bold uppercase tracking-wider block">Financial Rate summary</span>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-text-sub">Total Rate</span>
                    <span className="text-sm font-bold text-text-main">₹{parseInt(booking.agreed_amount).toLocaleString()}</span>
                  </div>

                  <div className="pt-4 border-t border-border-custom/50 space-y-3">
                    {role === "CLIENT" && booking.status === "DELIVERY_PENDING" && (
                      <button
                        onClick={handleCompleteBooking}
                        disabled={actionLoading}
                        className="w-full py-2.5 bg-primary hover:bg-primary-hover text-text-on-dark text-xs font-bold rounded-full transition uppercase tracking-wider cursor-pointer"
                      >
                        Approve Final Output & Pay
                      </button>
                    )}

                    {role === "FREELANCER" && booking.status === "CONFIRMED" && (
                      <button
                        onClick={handleStartProject}
                        disabled={actionLoading}
                        className="w-full py-2.5 bg-primary hover:bg-primary-hover text-text-on-dark text-xs font-bold rounded-full transition uppercase tracking-wider cursor-pointer animate-bounce"
                      >
                        Start Work Project
                      </button>
                    )}

                    {role === "FREELANCER" && booking.status === "IN_PROGRESS" && (
                      <button
                        onClick={() => setActiveTab("deliveries")}
                        className="w-full py-2.5 bg-primary hover:bg-primary-hover text-text-on-dark text-xs font-bold rounded-full transition uppercase tracking-wider cursor-pointer"
                      >
                        Submit Delivery Package
                      </button>
                    )}

                    <button
                      onClick={() => setActiveTab("messages")}
                      className="w-full py-2.5 bg-surface border border-border-custom text-text-sub hover:text-text-main text-xs font-bold rounded-full transition cursor-pointer"
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
            <div className="bg-surface-elevated border border-border-custom rounded-3xl shadow-sm overflow-hidden flex flex-col h-[600px]">
              
              {/* Messages viewport */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4 scrollbar-none">
                {messages.length === 0 ? (
                  <div className="h-full flex flex-col justify-center items-center text-text-muted text-xs space-y-2">
                    <span className="text-2xl">💬</span>
                    <p>No messages shared yet. Start the conversation!</p>
                  </div>
                ) : (
                  messages.map((msg) => {
                    const isMe = msg.sender_id === (booking.client_id === msg.sender_id ? booking.client_id : msg.sender_id);
                    const senderLabel = msg.sender_id === booking.client_id ? "Client" : "Freelancer";

                    if (msg.is_deleted) {
                      return (
                        <div key={msg.id} className="flex justify-center my-1">
                          <span className="text-[10px] text-text-muted italic bg-surface border border-border-custom/50 px-3 py-1 rounded-full">
                            This message was deleted
                          </span>
                        </div>
                      );
                    }

                    const msgIsMe = msg.sender_id === (role === "CLIENT" ? booking.client_id : booking.freelancer_profile_id);

                    return (
                      <div key={msg.id} className={`flex flex-col max-w-[70%] space-y-1 ${msgIsMe ? "ml-auto items-end" : "mr-auto items-start"}`}>
                        <div className="flex items-center gap-2 text-[10px] text-text-muted">
                          <span className="font-bold">{senderLabel}</span>
                          <span>•</span>
                          <span>{new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          {msg.is_edited && <span className="text-primary">(edited)</span>}
                        </div>

                        {/* Reply Indicator */}
                        {msg.reply_to_message_id && (
                          <div className="bg-surface border border-border-custom/50 text-[10px] px-3 py-1 rounded-t-xl text-text-muted italic">
                            Replying to message ID #{msg.reply_to_message_id}
                          </div>
                        )}

                        {/* Bubble */}
                        <div className={`px-4 py-2.5 rounded-2xl text-xs break-words relative group ${msgIsMe ? "bg-primary text-text-on-dark rounded-tr-none shadow-xs" : "bg-surface border border-border-custom text-text-main rounded-tl-none shadow-xs"}`}>
                          
                          {isEditingMessageId === msg.id ? (
                            <form onSubmit={handleEditSubmit} className="flex gap-2">
                              <input
                                type="text"
                                value={editText}
                                onChange={(e) => setEditText(e.target.value)}
                                className="bg-surface-elevated border border-border-custom rounded-xl px-2 py-1 text-xs text-text-main focus:outline-none"
                              />
                              <button type="submit" className="text-[10px] text-primary font-bold">Save</button>
                              <button type="button" onClick={() => setIsEditingMessageId(null)} className="text-[10px] text-rose-600">Cancel</button>
                            </form>
                          ) : (
                            <p>{msg.content || msg.message_text}</p>
                          )}

                          {/* Message actions popover */}
                          {!isEditingMessageId && msgIsMe && (
                            <div className="opacity-0 group-hover:opacity-100 absolute -top-4 right-0 bg-surface border border-border-custom px-2 py-0.5 rounded flex gap-2 text-[9px] transition shadow-sm">
                              <button onClick={() => { setIsEditingMessageId(msg.id); setEditText(msg.content || ""); }} className="text-text-sub hover:text-text-main font-semibold">Edit</button>
                              <button onClick={() => handleDeleteMessage(msg.id)} className="text-rose-600 hover:text-rose-500 font-semibold">Delete</button>
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
                                  className="flex items-center gap-2 bg-black/5 hover:bg-black/10 p-2 rounded-xl text-[10px] text-primary font-bold border border-border-custom/30"
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
              <div className="bg-surface border-t border-border-custom/50 p-4">
                
                {/* Replying indicator */}
                {replyingTo && (
                  <div className="bg-surface-elevated border border-border-custom px-4 py-2 rounded-xl text-xs flex justify-between items-center mb-3 text-text-sub">
                    <span>Replying to: <em>{replyingTo.content}</em></span>
                    <button onClick={() => setReplyingTo(null)} className="text-rose-600 font-bold">Cancel</button>
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
                    className="bg-surface-elevated border border-border-custom text-text-sub rounded-xl px-2 text-[10px] font-bold focus:outline-none"
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
                    className="flex-1 bg-surface border border-border-custom rounded-xl px-4 py-2.5 text-xs text-text-main placeholder-text-muted focus:outline-none focus:border-primary transition-all"
                  />
                  
                  <button
                    type="submit"
                    disabled={actionLoading}
                    className="px-6 py-2.5 bg-primary hover:bg-primary-hover text-xs font-bold rounded-full text-text-on-dark uppercase transition shadow-sm cursor-pointer"
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
                <div className="bg-surface-elevated border border-border-custom rounded-3xl p-6 shadow-sm space-y-4">
                  <h3 className="text-xs font-bold uppercase text-text-main tracking-wider">Project Files Library</h3>
                  
                  {files.length === 0 ? (
                    <p className="text-xs text-text-muted py-6 text-center">No files uploaded to workspace library yet.</p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {files.map((file) => (
                        <div key={file.id} className="bg-surface border border-border-custom p-4 rounded-2xl flex flex-col justify-between space-y-4">
                          <div>
                            <div className="flex justify-between items-start gap-2">
                              <span className="px-2 py-0.5 bg-primary/10 text-primary border border-primary/20 rounded text-[9px] font-bold tracking-wider uppercase">
                                {file.file_category}
                              </span>
                              <button onClick={() => handleDeleteFile(file.id)} className="text-[11px] text-rose-600 hover:text-rose-500 font-bold">
                                Delete
                              </button>
                            </div>
                            <h4 className="text-xs text-text-main font-semibold truncate mt-2">{file.original_name}</h4>
                            <p className="text-[10px] text-text-sub mt-1">{file.description || "No description provided."}</p>
                          </div>

                          <div className="pt-2 border-t border-border-custom/50 flex justify-between items-center text-[10px] text-text-muted font-medium">
                            <span>{formatBytes(file.file_size)}</span>
                            {role === "CLIENT" && file.file_category === "FINAL" && booking.payment_completion_state !== "FULLY_PAID" ? (
                              <span className="text-rose-500 font-bold flex items-center gap-1">
                                🔒 Locked (Payment Required)
                              </span>
                            ) : (
                              <a
                                href={file.file_url}
                                download
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-primary hover:underline font-bold"
                              >
                                Download
                              </a>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* External Links */}
                <div className="bg-surface-elevated border border-border-custom rounded-3xl p-6 shadow-sm space-y-4">
                  <h3 className="text-xs font-bold uppercase text-text-main tracking-wider">External Folder References</h3>
                  {links.length === 0 ? (
                    <p className="text-xs text-text-muted py-4 text-center">No external reference links mapped.</p>
                  ) : (
                    <div className="space-y-3">
                      {links.map((link) => (
                        <a
                          key={link.id}
                          href={link.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex justify-between items-center bg-surface border border-border-custom p-3.5 rounded-2xl text-xs hover:border-primary/30 transition shadow-xs"
                        >
                          <div>
                            <strong className="text-primary block font-semibold">{link.label}</strong>
                            <span className="text-[10px] text-text-muted block truncate max-w-sm mt-0.5 font-normal">{link.url}</span>
                          </div>
                          <span className="text-text-sub font-semibold">🌐 Launch</span>
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Sidebar Upload Forms */}
              <div className="space-y-6">
                
                {/* Upload File form */}
                <div className="bg-surface-elevated border border-border-custom rounded-3xl p-6 shadow-sm space-y-4">
                  <h3 className="text-xs font-bold uppercase text-text-main tracking-wider">Share file attachment</h3>
                  <form onSubmit={handleFileUpload} className="space-y-4">
                    <div>
                      <label className="block text-[10px] text-text-sub font-bold uppercase mb-1.5">Category Type</label>
                      <select
                        value={uploadCategory}
                        onChange={(e) => setUploadCategory(e.target.value)}
                        className="w-full bg-surface border border-border-custom rounded-xl px-3 py-2 text-xs text-text-main focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                      >
                        <option value="REFERENCE">Reference Brief</option>
                        <option value="PROJECT_FILE">Project Resource</option>
                        <option value="OTHER">Other Metadata</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] text-text-sub font-bold uppercase mb-1.5">Description</label>
                      <input
                        type="text"
                        placeholder="e.g. Logo vector source files"
                        value={uploadDesc}
                        onChange={(e) => setUploadDesc(e.target.value)}
                        className="w-full bg-surface border border-border-custom rounded-xl px-3 py-2 text-xs text-text-main focus:outline-none placeholder-text-muted"
                      />
                    </div>

                    <div>
                      <input
                        type="file"
                        required
                        onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                        className="w-full text-xs text-text-sub font-medium"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={actionLoading}
                      className="w-full py-2.5 bg-primary hover:bg-primary-hover text-text-on-dark text-xs font-bold rounded-full transition uppercase tracking-wider cursor-pointer"
                    >
                      Upload File
                    </button>
                  </form>
                </div>

                {/* Cloud link form */}
                <div className="bg-surface-elevated border border-border-custom rounded-3xl p-6 shadow-sm space-y-4">
                  <h3 className="text-xs font-bold uppercase text-text-main tracking-wider">Share external directory link</h3>
                  <form onSubmit={handleAddLink} className="space-y-4">
                    <div>
                      <label className="block text-[10px] text-text-sub font-bold uppercase mb-1.5">Folder Label</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. High-res Raw footage dump"
                        value={linkLabel}
                        onChange={(e) => setLinkLabel(e.target.value)}
                        className="w-full bg-surface border border-border-custom rounded-xl px-3 py-2 text-xs text-text-main focus:outline-none placeholder-text-muted"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] text-text-sub font-bold uppercase mb-1.5">External Target URL</label>
                      <input
                        type="url"
                        required
                        placeholder="https://drive.google.com/..."
                        value={linkUrl}
                        onChange={(e) => setLinkUrl(e.target.value)}
                        className="w-full bg-surface border border-border-custom rounded-xl px-3 py-2 text-xs text-text-main focus:outline-none placeholder-text-muted"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={actionLoading}
                      className="w-full py-2.5 bg-primary hover:bg-primary-hover text-text-on-dark text-xs font-bold rounded-full transition uppercase tracking-wider cursor-pointer"
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
                <div className="bg-surface-elevated border border-border-custom rounded-3xl p-6 shadow-sm space-y-4">
                  <h3 className="text-xs font-bold uppercase text-text-main tracking-wider">Milestone Submissions</h3>
                  {deliveries.length === 0 ? (
                    <p className="text-xs text-text-muted py-6 text-center font-semibold">No deliverables packages submitted yet.</p>
                  ) : (
                    <div className="space-y-6">
                      {deliveries.map((del) => (
                        <div key={del.id} className="bg-surface border border-border-custom p-6 rounded-3xl space-y-4 shadow-sm">
                          <div className="flex justify-between items-start gap-4">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="px-2 py-0.5 bg-primary/10 text-primary border border-primary/20 rounded text-[9px] font-bold uppercase">
                                  {del.delivery_type} VERSION #{del.version}
                                </span>
                                <span className="text-[10px] text-text-muted">{new Date(del.submitted_at).toLocaleDateString()}</span>
                              </div>
                              <h4 className="text-sm font-semibold text-text-main mt-1.5">{del.title}</h4>
                            </div>

                            <span className={`px-3 py-1 text-[10px] font-bold rounded-full uppercase border ${
                              del.status === "APPROVED" 
                                ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                                : del.status === "REVISION_REQUESTED"
                                ? "bg-rose-50 border-rose-255 text-rose-700"
                                : "bg-cyan-50 border-cyan-200 text-cyan-700"
                            }`}>
                              {del.status}
                            </span>
                          </div>

                          <p className="text-xs text-text-sub font-normal">{del.message}</p>

                          {/* Delivery Files links */}
                          {del.delivery_files && del.delivery_files.length > 0 && (
                            <div className="pt-3 border-t border-border-custom/50 space-y-2">
                              <h5 className="text-[9px] font-bold text-text-muted uppercase tracking-widest">Enclosed Output Assets:</h5>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {del.delivery_files.map((df: any) => (
                                  <a
                                    key={df.id}
                                    href={df.workspace_file?.file_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="bg-surface-elevated hover:bg-surface border border-border-custom p-2.5 rounded-xl text-[11px] text-primary font-bold block truncate"
                                  >
                                    📁 {df.workspace_file?.original_name}
                                  </a>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Client action controls on delivery */}
                          {role === "CLIENT" && del.status === "SUBMITTED" && (
                            <div className="flex gap-3 pt-4 border-t border-border-custom/50 justify-end">
                              <button
                                onClick={() => { setSelectedDeliveryId(del.id); setRevTitle(`Revisions on ${del.title}`); }}
                                className="px-4 py-1.5 bg-surface border border-border-custom hover:bg-surface-elevated text-text-sub hover:text-text-main text-xs font-bold rounded-full transition cursor-pointer"
                              >
                                Request Revisions
                              </button>
                              {del.delivery_type === "FINAL" ? (
                                <button
                                  onClick={handleApproveFinal}
                                  className="px-5 py-1.5 bg-success hover:bg-emerald-600 text-text-on-dark text-xs font-bold rounded-full transition uppercase tracking-wider cursor-pointer"
                                >
                                  Approve Final Output
                                </button>
                              ) : (
                                <button
                                  onClick={handleApprovePreview}
                                  className="px-5 py-1.5 bg-success hover:bg-emerald-600 text-text-on-dark text-xs font-bold rounded-full transition uppercase tracking-wider cursor-pointer"
                                >
                                  Approve Preview Draft
                                </button>
                              )}
                            </div>
                          )}

                          {/* Dispute window controls if final deliverable approved and active */}
                          {role === "CLIENT" && del.status === "APPROVED" && del.delivery_type === "FINAL" && booking.dispute_window_ends_at && new Date() < new Date(booking.dispute_window_ends_at) && (
                            <div className="pt-4 border-t border-border-custom/50 space-y-3">
                              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-amber-500/10 border border-amber-500/20 px-4 py-2.5 rounded-2xl gap-3">
                                <div>
                                  <span className="text-[10px] text-amber-500 uppercase font-bold block">48-Hour Dispute Window</span>
                                  <strong className="text-xs text-text-main font-semibold">{getDisputeTimeRemaining()}</strong>
                                </div>
                                <button
                                  onClick={() => setShowDisputeModal(true)}
                                  className="px-4 py-1.5 bg-rose-600 hover:bg-rose-500 text-text-on-dark text-xs font-bold rounded-full transition"
                                >
                                  Raise Dispute
                                </button>
                              </div>
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
                  <div className="bg-surface-elevated border border-border-custom rounded-3xl p-6 shadow-sm space-y-4">
                    <h3 className="text-xs font-bold uppercase text-text-main tracking-wider">Publish New delivery</h3>
                    <form onSubmit={handleDeliverSubmit} className="space-y-4">
                      <div>
                        <label className="block text-[10px] text-text-sub font-bold uppercase mb-1.5">Fulfillment Type</label>
                        <select
                          value={deliveryType}
                          onChange={(e) => setDeliveryType(e.target.value)}
                          className="w-full bg-surface border border-border-custom rounded-xl px-3 py-2 text-xs text-text-main focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                        >
                          <option value="PREVIEW">Preview Draft</option>
                          <option value="FINAL">Final Project Delivery</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] text-text-sub font-bold uppercase mb-1.5">Package Title</label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. Wedding highlights film rough draft"
                          value={deliveryTitle}
                          onChange={(e) => setDeliveryTitle(e.target.value)}
                          className="w-full bg-surface border border-border-custom rounded-xl px-3 py-2 text-xs text-text-main focus:outline-none placeholder-text-muted"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] text-text-sub font-bold uppercase mb-1.5">Note Message</label>
                        <textarea
                          rows={3}
                          placeholder="Leave feedback or remarks on this delivery batch..."
                          value={deliveryMessage}
                          onChange={(e) => setDeliveryMessage(e.target.value)}
                          className="w-full bg-surface border border-border-custom rounded-xl px-3 py-2 text-xs text-text-main focus:outline-none placeholder-text-muted resize-none"
                        />
                      </div>

                      {/* File checkboxes */}
                      <div>
                        <label className="block text-[10px] text-text-sub font-bold uppercase mb-2">Enclose Uploaded Assets</label>
                        <div className="max-h-36 overflow-y-auto space-y-1.5 bg-surface border border-border-custom p-3.5 rounded-xl">
                          {files.length === 0 ? (
                            <span className="text-[10px] text-text-muted">No library files found to enclose. Upload first!</span>
                          ) : (
                            files.map((f) => (
                              <label key={f.id} className="flex items-center gap-2 text-[11px] text-text-sub cursor-pointer">
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
                                  className="rounded border-border-custom text-primary focus:ring-0"
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
                        className="w-full py-2.5 bg-primary hover:bg-primary-hover text-text-on-dark text-xs font-bold rounded-full transition uppercase tracking-wider cursor-pointer"
                      >
                        Publish Deliverable Package
                      </button>
                    </form>
                  </div>
                )}

                {/* Revision Request Dialog for Client */}
                {role === "CLIENT" && selectedDeliveryId && (
                  <div className="bg-surface-elevated border border-border-custom rounded-3xl p-6 shadow-sm space-y-4">
                    <h3 className="text-xs font-bold uppercase text-primary tracking-wider">Propose Revision Loop</h3>
                    <form onSubmit={handleRevisionSubmit} className="space-y-4">
                      <div>
                        <label className="block text-[10px] text-text-sub font-bold uppercase mb-1.5">Brief Title</label>
                        <input
                          type="text"
                          required
                          value={revTitle}
                          onChange={(e) => setRevTitle(e.target.value)}
                          className="w-full bg-surface border border-border-custom rounded-xl px-3 py-2 text-xs text-text-main focus:outline-none placeholder-text-muted"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] text-text-sub font-bold uppercase mb-1.5">Feedback Description *</label>
                        <textarea
                          rows={3}
                          required
                          placeholder="e.g. Fix grading saturation, transition cuts..."
                          value={revDesc}
                          onChange={(e) => setRevDesc(e.target.value)}
                          className="w-full bg-surface border border-border-custom rounded-xl px-3 py-2 text-xs text-text-main focus:outline-none placeholder-text-muted resize-none"
                        />
                      </div>

                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setSelectedDeliveryId(null)}
                          className="flex-1 py-2.5 bg-surface border border-border-custom text-text-sub hover:text-text-main text-xs font-bold rounded-full cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={actionLoading}
                          className="flex-1 py-2.5 bg-primary hover:bg-primary-hover text-text-on-dark text-xs font-bold rounded-full transition uppercase cursor-pointer"
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
                <div className="bg-surface-elevated border border-border-custom rounded-3xl p-6 shadow-sm space-y-4">
                  <h3 className="text-xs font-bold uppercase text-text-main tracking-wider">Active Revision Loops</h3>
                  {revisions.length === 0 ? (
                    <p className="text-xs text-text-muted py-6 text-center">No active revision requests found.</p>
                  ) : (
                    <div className="space-y-6">
                      {revisions.map((rev) => (
                        <div key={rev.id} className="bg-surface border border-border-custom p-6 rounded-3xl space-y-4 shadow-sm">
                          <div className="flex justify-between items-start gap-4">
                            <div>
                              <h4 className="text-sm font-semibold text-text-main">{rev.title}</h4>
                              <p className="text-[10px] text-text-muted mt-1 font-medium">Requested on: {new Date(rev.created_at).toLocaleDateString()}</p>
                            </div>

                            <div className="flex items-center gap-2">
                              <span className={`px-2.5 py-1 text-[9px] font-bold rounded uppercase border ${
                                rev.status === "RESOLVED"
                                  ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                                  : rev.status === "IN_PROGRESS"
                                  ? "bg-amber-50 border-amber-200 text-amber-700"
                                  : "bg-rose-50 border-rose-200 text-rose-700"
                              }`}>
                                {rev.status}
                              </span>

                              {role === "FREELANCER" && rev.status === "OPEN" && (
                                <button
                                  onClick={() => handleStartRevision(rev.id)}
                                  className="px-3.5 py-1.5 bg-primary hover:bg-primary-hover text-[10px] text-text-on-dark font-bold rounded-full transition cursor-pointer"
                                >
                                  Start Work
                                </button>
                              )}
                            </div>
                          </div>

                          <p className="text-xs text-text-sub bg-surface p-3.5 rounded-2xl border border-border-custom/50 font-normal">
                            {rev.description}
                          </p>

                          {/* Timestamped Comments section */}
                          <div className="pt-4 border-t border-border-custom/50 space-y-3">
                            <div className="flex justify-between items-center">
                              <h5 className="text-[9px] font-bold text-text-muted uppercase tracking-widest">
                                Timestamp Frame Comments ({revComments[rev.id]?.length || 0})
                              </h5>
                              <button
                                onClick={() => setActiveRevId(activeRevId === rev.id ? null : rev.id)}
                                className="text-[10px] text-primary font-bold hover:underline cursor-pointer"
                              >
                                {activeRevId === rev.id ? "Hide Comment Form" : "Add Frame Comment"}
                              </button>
                            </div>

                            {/* Comment Form */}
                            {activeRevId === rev.id && (
                              <form onSubmit={(e) => handleAddComment(e, rev.id)} className="bg-surface border border-border-custom p-4 rounded-2xl flex gap-3 items-end">
                                <div className="w-24">
                                  <label className="block text-[8px] text-text-sub uppercase font-bold mb-1">Time (Sec)</label>
                                  <input
                                    type="number"
                                    min="0"
                                    placeholder="e.g. 45"
                                    value={revTimestamp || ""}
                                    onChange={(e) => setRevTimestamp(e.target.value ? parseInt(e.target.value) : null)}
                                    className="w-full bg-surface-elevated border border-border-custom rounded-xl px-2.5 py-1.5 text-xs text-text-main focus:outline-none"
                                  />
                                </div>
                                <div className="flex-1">
                                  <label className="block text-[8px] text-text-sub uppercase font-bold mb-1">Comment Message</label>
                                  <input
                                    type="text"
                                    required
                                    placeholder="Enter timeline annotation comment..."
                                    value={revCommentText}
                                    onChange={(e) => setRevCommentText(e.target.value)}
                                    className="w-full bg-surface-elevated border border-border-custom rounded-xl px-3 py-1.5 text-xs text-text-main focus:outline-none focus:border-primary"
                                  />
                                </div>
                                <button
                                  type="submit"
                                  disabled={actionLoading}
                                  className="px-4 py-1.5 bg-primary hover:bg-primary-hover text-xs font-bold text-text-on-dark rounded-xl transition cursor-pointer"
                                >
                                  Add
                                </button>
                              </form>
                            )}

                            {/* Comments viewport list */}
                            <div className="space-y-2">
                              {(revComments[rev.id] || []).map((comm) => (
                                <div key={comm.id} className="bg-surface border border-border-custom/50 px-4 py-2.5 rounded-xl text-[11px] flex gap-3 items-start justify-between">
                                  <div className="flex-1 leading-relaxed font-normal">
                                    <p className="text-text-sub">{comm.comment}</p>
                                    <span className="text-[9px] text-text-muted block mt-1">
                                      {new Date(comm.created_at).toLocaleString()}
                                    </span>
                                  </div>
                                  {comm.timestamp_seconds !== null && (
                                    <span className="px-2 py-0.5 bg-primary/10 border border-primary/20 text-[10px] text-primary font-bold rounded">
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
                <div className="bg-surface-elevated border border-border-custom rounded-3xl p-6 shadow-sm space-y-4 text-xs text-text-sub leading-relaxed font-normal">
                  <h3 className="text-xs font-bold uppercase text-text-main tracking-wider">How Revisions Work</h3>
                  <p>When the freelancer publishes a preview draft, the client owner can trigger a revision loop identifying adjustments.</p>
                  <p>Adding timestamped frame remarks enables pin-pointing precise feedback segments (e.g. at 1:45 in video montages).</p>
                  <p>Note: Service packages enforce included revisions limits automatically.</p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: TIMELINE */}
          {activeTab === "timeline" && (
            <div className="max-w-3xl mx-auto bg-surface-elevated border border-border-custom rounded-3xl p-8 shadow-sm">
              <h3 className="text-xs font-bold uppercase text-text-main tracking-wider mb-8">Visual project Timeline events</h3>
              
              <div className="relative border-l border-border-custom/80 ml-4 space-y-8 pb-4">
                {timeline.map((evt) => (
                  <div key={evt.id} className="relative pl-8">
                    {/* Event Dot */}
                    <span className="absolute -left-[5px] top-1.5 bg-primary border-4 border-surface w-2.5 h-2.5 rounded-full flex items-center justify-center">
                    </span>

                    <div className="space-y-1.5 text-xs font-medium">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-primary">
                        {evt.event_type}
                      </span>
                      <h4 className="text-sm font-semibold text-text-main">{evt.title}</h4>
                      <p className="text-text-sub leading-relaxed font-normal">{evt.description}</p>
                      <span className="text-[10px] text-text-muted block pt-1">
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
      {/* Dispute Modal */}
      {showDisputeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs">
          <div className="bg-surface-elevated border border-border-custom w-full max-w-md p-6 rounded-3xl space-y-4 shadow-xl">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-bold uppercase text-text-main tracking-wider">Raise Booking Dispute</h3>
              <button onClick={() => setShowDisputeModal(false)} className="text-text-muted hover:text-text-main text-xs font-bold">✕ Close</button>
            </div>
            
            <form onSubmit={handleCreateDispute} className="space-y-4">
              <div>
                <label className="block text-[10px] text-text-sub font-bold uppercase mb-1.5">Reason for Dispute</label>
                <select
                  value={disputeReason}
                  onChange={(e) => setDisputeReason(e.target.value)}
                  className="w-full bg-surface border border-border-custom rounded-xl px-3 py-2 text-xs text-text-main focus:outline-none focus:border-primary transition-all"
                >
                  <option value="QUALITY_ISSUE">Quality of work is not as described</option>
                  <option value="WORK_NOT_DELIVERED">Work was not delivered</option>
                  <option value="MISSED_DEADLINE">Missed crucial deadlines</option>
                  <option value="OTHER">Other Issues</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] text-text-sub font-bold uppercase mb-1.5">Provide detailed feedback</label>
                <textarea
                  rows={4}
                  required
                  placeholder="Explain exactly what is wrong and what resolution you are requesting..."
                  value={disputeDescription}
                  onChange={(e) => setDisputeDescription(e.target.value)}
                  className="w-full bg-surface border border-border-custom rounded-xl px-3 py-2 text-xs text-text-main focus:outline-none placeholder-text-muted resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={actionLoading}
                className="w-full py-2.5 bg-rose-600 hover:bg-rose-500 text-text-on-dark text-xs font-bold rounded-full transition uppercase tracking-wider cursor-pointer"
              >
                Submit Dispute Claim
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
