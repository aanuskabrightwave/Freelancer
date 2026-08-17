import React from "react";
import Link from "next/link";

interface SidebarProps {
  role: "client" | "freelancer" | "admin";
  activeItem?: string;
}

export default function Sidebar({ role, activeItem }: SidebarProps) {
  const items = {
    client: [
      { name: "Dashboard", href: "/client/dashboard" },
      { name: "Profile", href: "/client/profile" },
      { name: "Projects", href: "/client/projects" },
      { name: "New Project", href: "/client/projects/new" },
      { name: "Bookings", href: "/client/bookings" },
      { name: "Messages", href: "/client/messages" },
      { name: "Payments", href: "/client/payments" },
      { name: "Favourites", href: "/client/favourites" },
      { name: "Reviews", href: "/client/reviews" },
      { name: "Settings", href: "/client/settings" },
    ],
    freelancer: [
      { name: "Dashboard", href: "/freelancer/dashboard" },
      { name: "Profile", href: "/freelancer/profile" },
      { name: "Portfolio", href: "/freelancer/portfolio" },
      { name: "Services", href: "/freelancer/services" },
      { name: "Projects", href: "/freelancer/projects" },
      { name: "Proposals", href: "/freelancer/proposals" },
      { name: "Bookings", href: "/freelancer/bookings" },
      { name: "Messages", href: "/freelancer/messages" },
      { name: "Earnings", href: "/freelancer/earnings" },
      { name: "Availability", href: "/freelancer/availability" },
      { name: "Reviews", href: "/freelancer/reviews" },
      { name: "Settings", href: "/freelancer/settings" },
    ],
    admin: [
      { name: "Dashboard", href: "/admin/dashboard" },
      { name: "Users", href: "/admin/users" },
      { name: "Verification", href: "/admin/verification" },
      { name: "Disputes", href: "/admin/disputes" },
      { name: "Settings", href: "/admin/settings" },
      { name: "Audit Logs", href: "/admin/audit" }
    ]
  };

  const currentItems = items[role] || [];

  return (
    <aside className="w-64 border-r border-border-custom bg-surface-elevated text-text-main flex flex-col p-6 gap-6 h-screen sticky top-0 overflow-y-auto">
      <div>
        <span className="font-bold text-[10px] uppercase tracking-widest text-text-muted px-3 block">
          {role} Workspace
        </span>
      </div>
      <nav className="flex flex-col gap-1.5 flex-grow">
        {currentItems.map((item) => {
          const isActive = activeItem === item.name || false;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`px-4 py-2.5 rounded-full text-xs font-semibold tracking-wide transition-all cursor-pointer ${
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-text-sub hover:text-text-main hover:bg-surface"
              }`}
            >
              {item.name}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
