"use client";

import React, { Suspense } from "react";
import { useParams } from "next/navigation";
import ProjectWorkspace from "@/components/ProjectWorkspace";

function FreelancerWorkspaceContent() {
  const { id } = useParams();
  
  if (!id) return null;
  
  return (
    <div className="bg-background min-h-screen text-text-main font-sans antialiased">
      <ProjectWorkspace bookingId={id as string} role="FREELANCER" />
    </div>
  );
}

export default function FreelancerWorkspacePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex flex-col justify-center items-center text-text-sub py-12">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-xs uppercase tracking-widest font-black animate-pulse">Loading Freelancer Workspace...</p>
      </div>
    }>
      <FreelancerWorkspaceContent />
    </Suspense>
  );
}
