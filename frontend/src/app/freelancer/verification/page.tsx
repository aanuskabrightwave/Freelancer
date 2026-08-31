"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { ShieldCheck, ShieldAlert, Upload, Clock, CheckCircle, FileText, AlertTriangle } from "lucide-react";
import Container from "@/components/ui/Container";
import PageHeader from "@/components/ui/PageHeader";
import { freelancerService } from "@/services/freelancer.service";
import { api } from "@/lib/api";
import LoadingState from "@/components/common/LoadingState";

type VerificationStatus = "NOT_SUBMITTED" | "PENDING" | "UNDER_REVIEW" | "VERIFIED" | "REJECTED" | "RESUBMISSION_REQUIRED";

export default function FreelancerVerificationPage() {
  const [verification, setVerification] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Form parameters
  const [showWizard, setShowWizard] = useState(false);
  const [fullName, setFullName] = useState("");
  const [idType, setIdType] = useState("IDENTITY_DOCUMENT");
  const [idNumber, setIdNumber] = useState("");
  const [uploadedFileUrl, setUploadedFileUrl] = useState<string | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  async function loadVerificationStatus() {
    try {
      setLoading(true);
      setErrorMsg(null);
      
      // Query relative endpoint
      const data = await api.get<any>("/freelancer/verification");
      setVerification(data);
      
      // Prefill fields if resubmitting
      if (data.status === "REJECTED" || data.status === "RESUBMISSION_REQUIRED") {
        setFullName("");
        setIdNumber("");
        setUploadedFileUrl(null);
        setUploadedFileName(null);
      }
    } catch (err: any) {
      console.error("Failed to load freelancer verification details", err);
      setErrorMsg("Failed to query verification status.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadVerificationStatus();
  }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Client-side validations
    const allowedExtensions = /(\.pdf|\.png|\.jpg|\.jpeg)$/i;
    if (!allowedExtensions.exec(file.name)) {
      setErrorMsg("Invalid file format. Allowed types: PDF, PNG, JPG, JPEG.");
      return;
    }

    if (file.size > 20 * 1024 * 1024) {
      setErrorMsg("Document size exceeds the maximum limit of 20 MB.");
      return;
    }

    try {
      setUploading(true);
      setErrorMsg(null);
      setSuccessMsg(null);
      
      // Upload using target subfolder verifications (private)
      const res = await freelancerService.uploadFile(file, "verifications");
      setUploadedFileUrl(res.file_url);
      setUploadedFileName(file.name);
      setSuccessMsg("Document uploaded and staged successfully.");
    } catch (err: any) {
      setErrorMsg(err.response?.data?.detail || "Failed to upload document file.");
    } finally {
      setUploading(false);
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    if (!fullName.trim() || !idNumber.trim() || !uploadedFileUrl) {
      setErrorMsg("Please complete all required fields and upload supporting proof.");
      return;
    }

    try {
      setSubmitting(true);
      setErrorMsg(null);
      setSuccessMsg(null);

      // Submit verification documents payload
      await api.post("/freelancer/verification", {
        documents: [{
          document_type: idType,
          file_path: uploadedFileUrl,
          mime_type: uploadedFileUrl.endsWith(".pdf") ? "application/pdf" : "image/jpeg"
        }]
      });

      setSuccessMsg("Verification request submitted successfully.");
      setShowWizard(false);
      
      // Reload verification status
      await loadVerificationStatus();
    } catch (err: any) {
      setErrorMsg(err.response?.data?.detail || "Failed to submit verification request.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <LoadingState message="Loading verification record..." />;
  }

  const status: VerificationStatus = verification ? verification.status : "NOT_SUBMITTED";

  return (
    <Container className="py-8 max-w-3xl">
      <div className="space-y-6">
        <PageHeader
          title="Identity Verification"
          description="Verify your professional identity to gain the trust badge shield and unlock advanced booking options."
        />

        {errorMsg && (
          <div className="bg-rose-50 border border-rose-200 text-rose-700 p-4 rounded-xl text-xs font-semibold">
            {errorMsg}
          </div>
        )}

        {successMsg && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 p-4 rounded-xl text-xs font-semibold">
            {successMsg}
          </div>
        )}

        {/* Current status info cards */}
        {!showWizard && (
          <div className="bg-surface-elevated border border-border-custom rounded-3xl p-6 md:p-8 space-y-6 shadow-xs">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-border-custom pb-6">
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider block">Current Status</span>
                <div className="flex items-center gap-2">
                  {status === "VERIFIED" && <ShieldCheck className="w-5 h-5 text-emerald-500" />}
                  {status === "PENDING" && <Clock className="w-5 h-5 text-amber-500 animate-pulse" />}
                  {status === "UNDER_REVIEW" && <Clock className="w-5 h-5 text-primary animate-pulse" />}
                  {(status === "REJECTED" || status === "RESUBMISSION_REQUIRED") && <ShieldAlert className="w-5 h-5 text-rose-500" />}
                  {status === "NOT_SUBMITTED" && <ShieldAlert className="w-5 h-5 text-text-muted" />}
                  <h2 className="text-lg font-black text-text-main uppercase tracking-wider">
                    {status.replace("_", " ")}
                  </h2>
                </div>
              </div>
            </div>

            {/* Render details based on status */}
            {status === "NOT_SUBMITTED" && (
              <div className="space-y-4">
                <p className="text-xs text-text-sub leading-relaxed font-medium">
                  You have not submitted your profile verification documents yet. Uploading a valid government-issued identity proof will entitle you to:
                </p>
                <ul className="text-xs text-text-sub list-disc list-inside space-y-1.5 font-medium pl-2">
                  <li>Verification badge visible on your public cards and profiles.</li>
                  <li>Higher exposure in public client searches.</li>
                  <li>Priority eligibility for custom project bidding workflows.</li>
                </ul>
                <div className="pt-4">
                  <button
                    onClick={() => setShowWizard(true)}
                    className="px-6 py-3 bg-primary hover:bg-primary-hover text-text-on-dark text-xs font-extrabold uppercase tracking-wider rounded-xl transition shadow-xs active:scale-[0.99] cursor-pointer"
                  >
                    Start Verification
                  </button>
                </div>
              </div>
            )}

            {(status === "PENDING" || status === "UNDER_REVIEW") && (
              <div className="space-y-4">
                <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 flex gap-3 text-xs text-amber-800 leading-relaxed font-medium">
                  <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold block uppercase tracking-wider text-[10px] mb-1">Under Administration Review</span>
                    Your documents have been queued for processing. Submissions are typically audited within 24-48 business hours. You will receive a dashboard notification once complete. Duplicate submissions are disabled.
                  </div>
                </div>
              </div>
            )}

            {status === "VERIFIED" && (
              <div className="space-y-4">
                <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-5 flex gap-4 text-xs text-emerald-800 leading-relaxed font-medium">
                  <CheckCircle className="w-6 h-6 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold block uppercase tracking-wider text-[10px] mb-1">Identity Verified Badge Active</span>
                    Congratulations! Your account identity verification has been approved. The trusted verified shield badge is now active on your public profile cards. No further actions are required.
                  </div>
                </div>
              </div>
            )}

            {(status === "REJECTED" || status === "RESUBMISSION_REQUIRED") && (
              <div className="space-y-6">
                <div className="bg-rose-50 border border-rose-100 rounded-2xl p-5 space-y-3 text-xs text-rose-800 leading-relaxed font-medium">
                  <span className="font-bold block uppercase tracking-wider text-[10px] text-rose-700">
                    Verification Auditing Reject Notice
                  </span>
                  <p className="font-semibold">
                    Reason: {verification.rejection_reason || "Documents provided were not legible or did not match registered details."}
                  </p>
                  {verification.admin_notes && (
                    <p className="text-[11px] text-text-muted mt-2">
                      Admin Notes: {verification.admin_notes}
                    </p>
                  )}
                </div>

                <div className="pt-2 border-t border-border-custom">
                  <button
                    onClick={() => setShowWizard(true)}
                    className="px-6 py-3 bg-primary hover:bg-primary-hover text-text-on-dark text-xs font-extrabold uppercase tracking-wider rounded-xl transition shadow-xs active:scale-[0.99] cursor-pointer"
                  >
                    Resubmit Verification
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Verification Submit wizard form */}
        {showWizard && (
          <div className="bg-surface-elevated border border-border-custom rounded-3xl p-6 md:p-8 space-y-6 shadow-xs">
            <div className="flex justify-between items-center border-b border-border-custom pb-4">
              <h3 className="font-black text-base text-text-main uppercase tracking-wider">
                Verification Details Form
              </h3>
              <button
                onClick={() => setShowWizard(false)}
                className="text-text-muted hover:text-text-main text-xs font-bold uppercase tracking-wider"
              >
                Back
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="space-y-6 text-xs font-medium text-text-sub">
              {/* Legal Name */}
              <div className="space-y-1.5">
                <label className="block text-[9px] font-bold text-text-sub uppercase tracking-wider">Full Legal Name *</label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="As written on your government ID"
                  className="w-full bg-surface border border-border-custom rounded-xl px-4 py-3 text-xs text-text-main focus:outline-none focus:border-primary"
                />
              </div>

              {/* ID Type & ID Number */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1.5">
                  <label className="block text-[9px] font-bold text-text-sub uppercase tracking-wider">ID Document Type *</label>
                  <select
                    value={idType}
                    onChange={(e) => setIdType(e.target.value)}
                    className="w-full bg-surface border border-border-custom rounded-xl px-4 py-3 text-xs text-text-main focus:outline-none focus:border-primary font-bold"
                  >
                    <option value="IDENTITY_DOCUMENT">National Identity Card / Aadhaar Card</option>
                    <option value="ADDRESS_PROOF">Passport / Driver License</option>
                    <option value="BUSINESS_DOCUMENT">GSTIN / Business Registration Certificate</option>
                    <option value="PORTFOLIO_PROOF">Creative Work / Trademark Certification</option>
                    <option value="OTHER">Other Proof of Identity</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[9px] font-bold text-text-sub uppercase tracking-wider">Document Number / Code *</label>
                  <input
                    type="text"
                    required
                    value={idNumber}
                    onChange={(e) => setHeader(e.target.value)}
                    placeholder="e.g. ID card unique number"
                    className="w-full bg-surface border border-border-custom rounded-xl px-4 py-3 text-xs text-text-main focus:outline-none focus:border-primary"
                  />
                </div>
              </div>

              {/* Document upload field */}
              <div className="space-y-2">
                <label className="block text-[9px] font-bold text-text-sub uppercase tracking-wider">Supporting Proof Document (PDF, PNG, JPG) *</label>
                
                <div className="border-2 border-dashed border-border-custom hover:border-primary/50 rounded-2xl p-8 text-center transition relative">
                  <input
                    type="file"
                    accept=".pdf,.png,.jpg,.jpeg"
                    onChange={handleFileUpload}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <div className="space-y-2">
                    <Upload className="w-8 h-8 text-text-muted mx-auto" />
                    <p className="text-xs text-text-main font-bold">
                      {uploading ? "Uploading Document..." : uploadedFileName ? `Staged: ${uploadedFileName}` : "Drag and drop your file, or click to browse"}
                    </p>
                    <p className="text-[10px] text-text-muted">
                      Max file size: 20 MB. PDF, PNG, or JPG formats allowed.
                    </p>
                  </div>
                </div>

                {uploadedFileUrl && (
                  <div className="flex items-center gap-2 text-[10px] text-emerald-600 font-bold uppercase mt-2">
                    <CheckCircle className="w-4 h-4" />
                    Document ready for submission
                  </div>
                )}
              </div>

              <div className="pt-4 border-t border-border-custom flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowWizard(false)}
                  className="flex-grow py-3 bg-surface border border-border-custom text-text-sub hover:text-text-main text-xs font-extrabold uppercase tracking-wider rounded-xl transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || uploading || !uploadedFileUrl}
                  className="flex-grow py-3 bg-primary hover:bg-primary-hover disabled:bg-primary/50 text-text-on-dark text-xs font-extrabold uppercase tracking-wider rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  {submitting ? "Submitting Request..." : "Submit Verification"}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </Container>
  );

  // Simple override to support pydantic mapping without breaking
  function setHeader(val: string) {
    setIdNumber(val);
  }
}
