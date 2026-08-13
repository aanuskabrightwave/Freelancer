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
      { name: "Settings", href: "/freelancer/settings" },
    ],
    admin: [
      { name: "Dashboard", href: "/admin/dashboard" },
      { name: "Users", href: "/admin/users" },
      { name: "Freelancers", href: "/admin/freelancers" },
      { name: "Clients", href: "/admin/clients" },
      { name: "Projects", href: "/admin/projects" },
      { name: "Bookings", href: "/admin/bookings" },
      { name: "Payments", href: "/admin/payments" },
      { name: "Disputes", href: "/admin/disputes" },
      { name: "Categories", href: "/admin/categories" },
      { name: "Reviews", href: "/admin/reviews" },
      { name: "Verification", href: "/admin/verification" },
      { name: "Settings", href: "/admin/settings" },
    ]
  };

  const currentItems = items[role] || [];

  return (
    <aside className="w-64 border-r border-[var(--border)] bg-[var(--card)] text-[var(--card-foreground)] flex flex-col p-4 gap-2">
      <div className="font-bold text-xs uppercase tracking-wider text-[var(--muted-foreground)] px-3 mb-2">
        {role} Menu
      </div>
      <nav className="flex flex-col gap-1">
        {currentItems.map((item) => {
          const isActive = activeItem === item.name || false;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                isActive
                  ? "bg-blue-600 text-white"
                  : "hover:bg-[var(--border)] text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
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
