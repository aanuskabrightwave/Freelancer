"use client";

import React, { useState, useEffect } from "react";
import { freelancerService } from "@/services/freelancer.service";
import Container from "@/components/ui/Container";
import PageHeader from "@/components/ui/PageHeader";
import { 
  Plus, 
  Trash2, 
  Image as ImageIcon, 
  Video as VideoIcon, 
  ExternalLink,
  Loader,
  AlertCircle,
  FileImage,
  Upload
} from "lucide-react";

interface PortfolioItem {
  id: number;
  title: string;
  description?: string;
  media_type: "IMAGE" | "VIDEO" | "EXTERNAL_VIDEO";
  media_url: string;
  thumbnail_url?: string;
  category: string;
  project_date?: string;
  is_featured?: boolean;
}

const CATEGORIES = [
  "Wedding photography",
  "Commercial shoot",
  "Product showcase",
  "Corporate film",
  "Event cover",
  "Portrait",
  "Nature / Aerial",
  "Short film / Reels",
  "Post-production sample"
];

export default function FreelancerPortfolioPage() {
  const [items, setItems] = useState<PortfolioItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Form states
  const [isOpenForm, setIsOpenForm] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [mediaType, setMediaType] = useState<"IMAGE" | "VIDEO" | "EXTERNAL_VIDEO">("IMAGE");
  const [mediaUrl, setMediaUrl] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const loadPortfolio = async () => {
    try {
      setLoading(true);
      setErrorMsg(null);
      const data = await freelancerService.getPortfolio();
      setItems(data);
    } catch (e: any) {
      setErrorMsg("Failed to load portfolio showcase items.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPortfolio();
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFile(e.target.files[0]);
      setMediaUrl(""); // Clear URL input if file is chosen
    }
  };

  const handleAddPortfolioItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    try {
      setSubmitting(true);
      setErrorMsg(null);

      let finalMediaUrl = mediaUrl;

      // Handle file upload if file is selected
      if (selectedFile && (mediaType === "IMAGE" || mediaType === "VIDEO")) {
        const uploadRes = await freelancerService.uploadFile(selectedFile, "portfolios");
        finalMediaUrl = uploadRes.file_url;
      }

      if (!finalMediaUrl.trim()) {
        throw new Error("Please select a file to upload or provide an external video URL.");
      }

      await freelancerService.addPortfolio({
        title: title.trim(),
        description: description.trim() || undefined,
        media_type: mediaType,
        media_url: finalMediaUrl.trim(),
        category
      });

      // Reset form
      setTitle("");
      setDescription("");
      setCategory(CATEGORIES[0]);
      setMediaType("IMAGE");
      setMediaUrl("");
      setSelectedFile(null);
      setIsOpenForm(false);

      // Reload
      await loadPortfolio();
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to add portfolio item.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteItem = async (id: number) => {
    if (!window.confirm("Are you sure you want to delete this portfolio item?")) return;

    try {
      setErrorMsg(null);
      await freelancerService.deletePortfolio(id);
      setItems(prev => prev.filter(item => item.id !== id));
    } catch (err: any) {
      setErrorMsg("Failed to delete portfolio item.");
    }
  };

  return (
    <Container className="py-8 font-sans space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <PageHeader
          title="Portfolio Showcase"
          description="Manage your professional creative showcase gallery visible on your public profile."
        />
        <button
          onClick={() => setIsOpenForm(!isOpenForm)}
          className="flex items-center gap-1.5 px-4 py-2 bg-primary hover:bg-primary-hover text-text-on-dark text-xs font-bold rounded-full transition shadow-xs cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Add Work</span>
        </button>
      </div>

      {errorMsg && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 rounded-xl p-4 text-xs font-medium flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Add Item Form Collapse */}
      {isOpenForm && (
        <form onSubmit={handleAddPortfolioItem} className="bg-surface border border-border-custom rounded-3xl p-6 space-y-5 shadow-sm max-w-2xl animate-in fade-in slide-in-from-top-2 duration-200">
          <h3 className="text-xs font-bold uppercase tracking-wider text-text-main">New Portfolio Project</h3>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] text-text-sub font-bold uppercase tracking-wider mb-2">Project Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Luminous Wedding Highlight"
                className="w-full px-4 py-2.5 rounded-xl bg-surface-elevated border border-border-custom text-text-main text-xs focus:outline-none focus:border-primary transition"
                required
              />
            </div>
            
            <div>
              <label className="block text-[10px] text-text-sub font-bold uppercase tracking-wider mb-2">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-surface-elevated border border-border-custom text-text-main text-xs focus:outline-none focus:border-primary transition"
              >
                {CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[10px] text-text-sub font-bold uppercase tracking-wider mb-2">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Provide context about your contribution, equipment used, client scope, etc."
              rows={3}
              className="w-full px-4 py-2.5 rounded-xl bg-surface-elevated border border-border-custom text-text-main text-xs focus:outline-none focus:border-primary transition"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] text-text-sub font-bold uppercase tracking-wider mb-2">Media Type</label>
              <select
                value={mediaType}
                onChange={(e) => {
                  setMediaType(e.target.value as any);
                  setSelectedFile(null);
                  setMediaUrl("");
                }}
                className="w-full px-4 py-2.5 rounded-xl bg-surface-elevated border border-border-custom text-text-main text-xs focus:outline-none focus:border-primary transition"
              >
                <option value="IMAGE">Image File (JPG/PNG)</option>
                <option value="VIDEO">Video File (MP4)</option>
                <option value="EXTERNAL_VIDEO">External URL (YouTube/Vimeo)</option>
              </select>
            </div>

            <div>
              {mediaType === "EXTERNAL_VIDEO" ? (
                <div>
                  <label className="block text-[10px] text-text-sub font-bold uppercase tracking-wider mb-2">Video URL</label>
                  <input
                    type="url"
                    value={mediaUrl}
                    onChange={(e) => setMediaUrl(e.target.value)}
                    placeholder="https://www.youtube.com/watch?v=..."
                    className="w-full px-4 py-2.5 rounded-xl bg-surface-elevated border border-border-custom text-text-main text-xs focus:outline-none focus:border-primary transition"
                    required
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-[10px] text-text-sub font-bold uppercase tracking-wider mb-2">File Upload</label>
                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-2 px-4 py-2.5 bg-surface-elevated border border-border-custom hover:bg-surface rounded-xl text-xs font-bold text-text-sub hover:text-text-main transition cursor-pointer flex-grow text-center justify-center">
                      <Upload className="w-4 h-4 text-text-muted" />
                      <span>{selectedFile ? selectedFile.name : "Select Media"}</span>
                      <input
                        type="file"
                        accept={mediaType === "IMAGE" ? "image/*" : "video/*"}
                        onChange={handleFileChange}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-3">
            <button
              type="button"
              onClick={() => setIsOpenForm(false)}
              className="px-4 py-2.5 border border-border-custom rounded-xl hover:bg-surface-elevated text-xs font-bold text-text-sub transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2.5 bg-primary text-text-on-dark hover:bg-primary-hover rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? (
                <>
                  <Loader className="w-3.5 h-3.5 animate-spin" />
                  <span>Uploading...</span>
                </>
              ) : (
                <span>Publish Item</span>
              )}
            </button>
          </div>
        </form>
      )}

      {/* Grid gallery */}
      {loading ? (
        <div className="flex justify-center items-center py-20">
          <Loader className="w-8 h-8 text-primary animate-spin" />
        </div>
      ) : items.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          {items.map((item) => (
            <div 
              key={item.id}
              className="bg-surface border border-border-custom rounded-2xl overflow-hidden shadow-xs hover:border-primary/20 transition flex flex-col justify-between group"
            >
              <div className="aspect-[4/3] bg-surface-elevated relative overflow-hidden flex items-center justify-center border-b border-border-custom/50">
                {item.media_type === "IMAGE" ? (
                  <img
                    src={item.media_url}
                    alt={item.title}
                    className="w-full h-full object-cover group-hover:scale-[1.02] transition duration-300"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center text-text-muted gap-2">
                    {item.media_type === "VIDEO" ? (
                      <VideoIcon className="w-8 h-8 text-text-muted/60" />
                    ) : (
                      <ExternalLink className="w-8 h-8 text-text-muted/60" />
                    )}
                    <span className="text-[10px] font-bold uppercase tracking-wider">Video Showcase</span>
                  </div>
                )}
                
                <span className="absolute top-3 left-3 bg-dark/80 backdrop-blur-xs px-2.5 py-0.5 rounded text-[8px] font-black uppercase text-primary tracking-wider">
                  {item.category}
                </span>

                <button
                  onClick={() => handleDeleteItem(item.id)}
                  className="absolute top-3 right-3 p-1.5 bg-rose-600/90 text-text-main rounded-lg opacity-0 group-hover:opacity-100 transition hover:bg-rose-700 cursor-pointer"
                  title="Delete project"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="p-4 space-y-1">
                <h4 className="text-xs font-bold text-text-main">{item.title}</h4>
                {item.description && (
                  <p className="text-[10px] text-text-sub line-clamp-2 leading-relaxed font-normal">
                    {item.description}
                  </p>
                )}
                <div className="flex items-center justify-between pt-2">
                  <span className="text-[8px] uppercase tracking-wider font-extrabold text-primary">
                    {item.media_type.replace("_", " ")}
                  </span>
                  
                  {item.media_type === "EXTERNAL_VIDEO" && (
                    <a
                      href={item.media_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[9px] font-bold text-primary hover:underline flex items-center gap-0.5"
                    >
                      <span>Watch</span>
                      <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="py-20 text-center border border-dashed border-border-custom rounded-3xl bg-surface-elevated flex flex-col items-center justify-center max-w-lg mx-auto">
          <ImageIcon className="w-10 h-10 text-text-muted/40 mb-3" />
          <h3 className="text-xs font-bold text-text-main uppercase tracking-wider">Empty Showcase</h3>
          <p className="text-[11px] text-text-sub mt-2 mb-6 max-w-xs leading-relaxed font-normal">
            No work uploaded. Publish sample shoots or projects to showcase your creative style to prospective clients!
          </p>
          <button
            onClick={() => setIsOpenForm(true)}
            className="px-4 py-2 bg-primary text-text-on-dark text-[10px] font-bold rounded-full hover:bg-primary-hover transition cursor-pointer"
          >
            Upload Your First Item
          </button>
        </div>
      )}

    </Container>
  );
}
