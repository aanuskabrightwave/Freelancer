"use client";

import React, { Suspense } from "react";
import { useParams } from "next/navigation";
import ProjectWorkspace from "@/components/ProjectWorkspace";

function FreelancerWorkspaceContent() {
  const { id } = useParams();
  
  if (!id) return null;
  
  return (
    <div className="bg-slate-950 min-h-screen text-slate-100 font-sans antialiased">
      <ProjectWorkspace bookingId={id as string} role="FREELANCER" />
    </div>
  );
}

export default function FreelancerWorkspacePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center text-slate-400 py-12">
        <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-xs uppercase tracking-widest font-black animate-pulse">Loading Freelancer Workspace...</p>
      </div>
    }>
      <FreelancerWorkspaceContent />
    </Suspense>
  );
}
