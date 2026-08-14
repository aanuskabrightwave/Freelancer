import React from "react";

export type BadgeCode =
  | "EMAIL_VERIFIED"
  | "PHONE_VERIFIED"
  | "TOP_RATED"
  | "RISING_CREATOR"
  | "EXPERIENCED_CREATOR";

interface TrustBadgeProps {
  code: BadgeCode | string;
  showIcon?: boolean;
}

export function TrustBadge({ code, showIcon = true }: TrustBadgeProps) {
  const badgeConfig: Record<
    string,
    { name: string; style: string; icon: React.ReactNode }
  > = {
    EMAIL_VERIFIED: {
      name: "Email Verified",
      style: "bg-emerald-500/10 border-emerald-500/30 text-emerald-400",
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth="2.5"
          stroke="currentColor"
          className="w-3.5 h-3.5"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
        </svg>
      ),
    },
    PHONE_VERIFIED: {
      name: "Phone Verified",
      style: "bg-emerald-500/10 border-emerald-500/30 text-emerald-400",
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth="2.5"
          stroke="currentColor"
          className="w-3.5 h-3.5"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
        </svg>
      ),
    },
    TOP_RATED: {
      name: "Top Rated",
      style: "bg-amber-500/10 border-amber-500/30 text-amber-400",
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth="2"
          stroke="currentColor"
          className="w-3.5 h-3.5 animate-pulse"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M11.48 3.499c.15-.358.74-.358.89 0l2.4 4.887 5.376.781c.396.057.554.542.268.825l-3.89 3.792 1.18 5.347c.087.395-.327.697-.678.508L12 17.568l-4.795 2.52c-.35.189-.765-.113-.679-.508l1.18-5.347-3.89-3.792c-.286-.283-.128-.768.269-.825l5.376-.782 2.4-4.887z"
          />
        </svg>
      ),
    },
    RISING_CREATOR: {
      name: "Rising Creator",
      style: "bg-indigo-500/10 border-indigo-500/30 text-indigo-400",
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth="2"
          stroke="currentColor"
          className="w-3.5 h-3.5"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9.813 15.904L9 21l-3.905-2.254-3.905 2.254.813-5.096-3.703-3.608 5.117-.744L9 4.25l2.254 4.546 5.117.744-3.703 3.608z"
          />
        </svg>
      ),
    },
    EXPERIENCED_CREATOR: {
      name: "100+ Completed Projects",
      style: "bg-cyan-500/10 border-cyan-500/30 text-cyan-400",
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth="2"
          stroke="currentColor"
          className="w-3.5 h-3.5"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M20.25 14.15v4.25c0 .621-.504 1.125-1.125 1.125H4.875c-.621 0-1.125-.504-1.125-1.125v-4.25m16.5 0a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 14.15m17.25 0c-.397 0-.783-.06-1.144-.171a2.25 2.25 0 00-2.235 2.235v1.286c0 .412-.334.745-.745.745H7.875c-.412 0-.745-.333-.745-.745v-1.286A2.25 2.25 0 004.894 14a2.25 2.25 0 00-1.144.171"
          />
        </svg>
      ),
    },
  };

  const config = badgeConfig[code] || {
    name: code.replace("_", " ").toLowerCase(),
    style: "bg-slate-800 border-slate-700 text-slate-300",
    icon: null,
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1 border rounded-full text-[10px] font-black uppercase tracking-wider ${config.style}`}
    >
      {showIcon && config.icon}
      {config.name}
    </span>
  );
}

interface TrustBadgeListProps {
  badges: string[];
}

export function TrustBadgeList({ badges }: TrustBadgeListProps) {
  if (!badges || badges.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {badges.map((badgeCode, idx) => (
        <TrustBadge key={idx} code={badgeCode} />
      ))}
    </div>
  );
}
