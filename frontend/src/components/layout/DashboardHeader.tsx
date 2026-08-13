import React from "react";
import Link from "next/link";

interface DashboardHeaderProps {
  title: string;
  role: "client" | "freelancer" | "admin";
}

export default function DashboardHeader({ title, role }: DashboardHeaderProps) {
  return (
    <header className="h-16 border-b border-[var(--border)] bg-[var(--card)] px-6 flex items-center justify-between">
      <h1 className="text-xl font-bold text-[var(--foreground)]">{title}</h1>
      <div className="flex items-center gap-4">
        <span className="text-xs uppercase px-2.5 py-0.5 rounded-full font-semibold bg-blue-900/30 text-blue-400 border border-blue-800">
          {role}
        </span>
        <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center font-bold text-white text-sm">
          U
        </div>
      </div>
    </header>
  );
}
