import React, { ReactNode } from "react";

interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: ReactNode;
}

export default function PageHeader({ title, description, actions }: PageHeaderProps) {
  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-border-custom/50 mb-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight drop-shadow-sm">{title}</h1>
        {description && (
          <p className="text-xs md:text-sm text-text-sub font-medium mt-1.5 drop-shadow-sm">{description}</p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
