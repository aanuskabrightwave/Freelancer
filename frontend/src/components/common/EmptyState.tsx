import React, { ReactNode } from "react";

interface EmptyStateProps {
  title: string;
  description: string;
  action?: ReactNode;
}

export default function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center text-center p-12 border border-dashed border-[var(--border)] bg-[var(--card)] rounded-lg max-w-md mx-auto my-8">
      <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center text-[var(--muted-foreground)] mb-4 text-xl">
        📭
      </div>
      <h3 className="text-lg font-semibold text-[var(--foreground)]">{title}</h3>
      <p className="text-sm text-[var(--muted-foreground)] mt-2 mb-6">{description}</p>
      {action && action}
    </div>
  );
}
