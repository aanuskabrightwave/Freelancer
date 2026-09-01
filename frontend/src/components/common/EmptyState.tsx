import React, { ReactNode } from "react";

interface EmptyStateProps {
  title: string;
  description: string;
  action?: ReactNode;
}

export default function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center text-center p-12 border border-dashed border-border-custom bg-surface-elevated rounded-3xl max-w-md mx-auto my-8 shadow-sm">
      <div className="w-12 h-12 rounded-full bg-surface flex items-center justify-center text-text-muted mb-4 text-xl border border-border-custom/40">
        📭
      </div>
      <h3 className="text-base font-bold text-text-main">{title}</h3>
      <p className="text-xs text-text-sub mt-2 mb-6 max-w-sm">{description}</p>
      {action && action}
    </div>
  );
}
