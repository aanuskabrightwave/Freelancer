"use client";

import React, { useState } from "react";
import WorkspaceNavbar from "./WorkspaceNavbar";
import WorkspaceSidebar from "./WorkspaceSidebar";
import MessageWidget from "@/components/messaging/MessageWidget";
import HelpModal from "@/components/common/HelpModal";

interface WorkspaceLayoutProps {
  children: React.ReactNode;
  role: "client" | "freelancer";
}

export default function WorkspaceLayout({ children, role }: WorkspaceLayoutProps) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-background text-text-main font-sans">
      
      {/* Top navbar */}
      <WorkspaceNavbar />

      {/* Main panel layout */}
      <div className="flex flex-row flex-grow overflow-hidden relative">
        
        {/* Left collapsible sidebar */}
        <WorkspaceSidebar
          role={role}
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          onOpenHelp={() => setIsHelpOpen(true)}
        />

        {/* Scrollable workspace content */}
        <main className="flex-grow flex flex-col min-w-0 overflow-y-auto overflow-x-hidden bg-background">
          <div className="flex-grow">
            {children}
          </div>
        </main>
        
      </div>

      {/* Bottom right message widget */}
      <MessageWidget />

      {/* Shared Help center modal */}
      <HelpModal isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} />
      
    </div>
  );
}
