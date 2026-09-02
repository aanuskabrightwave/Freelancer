"use client";

import React, { useState } from "react";
import { usePathname } from "next/navigation";
import WorkspaceNavbar from "./WorkspaceNavbar";
import WorkspaceSidebar from "./WorkspaceSidebar";
import MessageWidget from "@/components/messaging/MessageWidget";
import HelpModal from "@/components/common/HelpModal";
import AuthenticatedFluidBackground from "@/components/backgrounds/AuthenticatedFluidBackground";

interface WorkspaceLayoutProps {
  children: React.ReactNode;
  role: "client" | "freelancer";
}

export default function WorkspaceLayout({ children, role }: WorkspaceLayoutProps) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const pathname = usePathname();
  
  const isMessagesPage = pathname?.includes("/messages");

  return (
    <div className="flex flex-col h-[100dvh] overflow-hidden bg-background text-text-main font-sans relative">
      {/* ThreeUI Fluid Field Authenticated Background */}
      <AuthenticatedFluidBackground />
      
      {/* Top navbar */}
      <div className="relative z-40 shrink-0">
        <WorkspaceNavbar />
      </div>

      {/* Main panel layout */}
      <div className="flex flex-row flex-grow overflow-hidden relative z-10">
        
        {/* Left collapsible sidebar */}
        <WorkspaceSidebar
          role={role}
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          onOpenHelp={() => setIsHelpOpen(true)}
        />

        {/* Scrollable workspace content */}
        <main className={`flex-1 flex flex-col min-w-0 overflow-x-hidden bg-transparent ${isMessagesPage ? 'overflow-hidden' : 'overflow-y-auto'}`}>
          <div className={`flex-1 flex flex-col min-w-0 min-h-0 ${isMessagesPage ? '' : 'pb-16'}`}>
            {children}
          </div>
        </main>
        
      </div>

      {/* Bottom right message widget (Freelancer and Client) */}
      {(role === "freelancer" || role === "client") && <MessageWidget />}

      {/* Shared Help center modal */}
      <HelpModal isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} />
      
    </div>
  );
}
