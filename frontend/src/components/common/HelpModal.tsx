"use client";

import React, { useState } from "react";
import { X, Mail, Phone, Clock, FileText, ChevronDown, ChevronUp } from "lucide-react";

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function HelpModal({ isOpen, onClose }: HelpModalProps) {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  if (!isOpen) return null;

  const faqs = [
    {
      q: "How do I book a creative professional?",
      a: "Browse the 'Services' page to explore packaged creative offerings (e.g., Wedding Shoots, Video Editing). Select a package, choose your preferred dates, fill in requirements, and send a booking request. Once the freelancer accepts, you can complete the secure payment to activate the workspace.",
    },
    {
      q: "How are payments handled on Creative Market?",
      a: "We use a secure escrow model. Clients make payments for bookings in advance. The funds are securely held in escrow and only released to the freelancer's earnings once the client approves the final project deliverables or if the revision cycle completes without disputes.",
    },
    {
      q: "What is the project workspace and file delivery process?",
      a: "Every booking has a dedicated 'Workspace' where clients and freelancers can exchange messages and share media files. Freelancers deliver project files directly through the workspace. Clients can review, download, request revisions, or mark the job as complete.",
    },
    {
      q: "How do revisions and disputes work?",
      a: "If the initial delivery needs adjustments, clients can click 'Request Revision' in the workspace. If an issue cannot be resolved cooperatively, either party can raise a dispute, which is reviewed by our admin arbitration team.",
    },
    {
      q: "How do freelancers get paid?",
      a: "Once a booking is marked complete by the client or auto-released, the funds move to the freelancer's 'Earnings'. Freelancers can configure their bank account details under Money -> Payouts to request payouts directly to their bank.",
    },
  ];

  const toggleFaq = (index: number) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-dark/40 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-surface border border-border-custom rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-border-custom/50">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-primary animate-pulse"></span>
            <h2 className="text-base font-bold text-text-main">Help & Support Center</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-surface-elevated text-text-muted hover:text-text-main transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[70vh] space-y-6">
          
          {/* Quick FAQ Section */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-text-muted">Frequently Asked Questions</h3>
            <div className="divide-y divide-border-custom/40 border border-border-custom/60 rounded-2xl overflow-hidden bg-surface-elevated">
              {faqs.map((faq, idx) => {
                const isOpen = openFaq === idx;
                return (
                  <div key={idx} className="transition-colors hover:bg-surface">
                    <button
                      onClick={() => toggleFaq(idx)}
                      className="w-full px-5 py-4 flex items-center justify-between text-left text-xs font-semibold text-text-main cursor-pointer"
                    >
                      <span>{faq.q}</span>
                      {isOpen ? (
                        <ChevronUp className="w-4 h-4 text-primary" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-text-muted" />
                      )}
                    </button>
                    {isOpen && (
                      <div className="px-5 pb-5 pt-1 text-xs text-text-sub leading-relaxed font-normal border-t border-border-custom/20">
                        {faq.a}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Contact Support Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Direct Channels */}
            <div className="border border-border-custom/60 rounded-2xl p-5 bg-surface-elevated space-y-4">
              <h4 className="text-[10px] font-bold uppercase tracking-wider text-text-muted">Direct Support Contacts</h4>
              <div className="space-y-3 text-xs text-text-sub font-medium">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                    <Mail className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[10px] text-text-muted font-normal block">Email Support</span>
                    <a href="mailto:support@creativemarket.com" className="text-text-main font-semibold hover:underline">
                      support@creativemarket.com
                    </a>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                    <Phone className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[10px] text-text-muted font-normal block">Phone Helpline</span>
                    <span className="text-text-main font-semibold">+91 98765 43210</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Operating Details */}
            <div className="border border-border-custom/60 rounded-2xl p-5 bg-surface-elevated space-y-4">
              <h4 className="text-[10px] font-bold uppercase tracking-wider text-text-muted">Support Hours & Info</h4>
              <div className="space-y-3 text-xs text-text-sub font-medium">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                    <Clock className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[10px] text-text-muted font-normal block">Availability Hours</span>
                    <span className="text-text-main font-semibold">Mon - Fri, 9:00 AM - 6:00 PM IST</span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[10px] text-text-muted font-normal block">Arbitration Policy</span>
                    <span className="text-text-main font-semibold">Escrow & Disputes Mediation</span>
                  </div>
                </div>
              </div>
            </div>

          </div>

        </div>

        {/* Footer */}
        <div className="bg-surface-elevated px-6 py-4 border-t border-border-custom/50 flex justify-between items-center text-[10px] text-text-muted">
          <p>© {new Date().getFullYear()} CreativeMarket. Support Portal.</p>
          <p className="font-semibold text-primary">Your trust is our priority.</p>
        </div>

      </div>
    </div>
  );
}
