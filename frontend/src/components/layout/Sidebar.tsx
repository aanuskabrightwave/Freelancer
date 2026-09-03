import React from "react";
import Link from "next/link";

interface SidebarProps {
  role: "client" | "freelancer" | "admin";
  activeItem?: string;
}

export default function Sidebar({ role, activeItem }: SidebarProps) {
  const flatItems = {
    client: [
      { name: "Dashboard", href: "/client/dashboard" },
      { name: "Profile", href: "/client/profile" },
      { name: "Projects", href: "/client/projects" },
      { name: "New Project", href: "/client/projects/new" },
      { name: "Bookings", href: "/client/bookings" },
      { name: "Payments", href: "/client/payments" },
      { name: "Favourites", href: "/client/favourites" },
      { name: "Reviews", href: "/client/reviews" },
      { name: "Settings", href: "/client/settings" },
    ],
    freelancer: [
      { name: "Dashboard", href: "/freelancer/dashboard" },
      { name: "My Profile", href: "/freelancer/profile" },
      { name: "Portfolio", href: "/freelancer/portfolio" },
      { name: "Services", href: "/freelancer/services" },
      { name: "Bookings", href: "/freelancer/bookings" },
      { name: "Deliveries", href: "/freelancer/deliveries" },
      { name: "Earnings", href: "/freelancer/earnings" },
      { name: "Availability", href: "/freelancer/availability" },
      { name: "Settings", href: "/freelancer/settings" },
    ]
  };

  const adminGroups = [
    {
      groupName: "ADMIN",
      items: [
        { name: "Overview", href: "/admin/dashboard" }
      ]
    },
    {
      groupName: "BOOKING OPERATIONS",
      items: [
        { name: "Booking Inbox", href: "/admin/bookings" },
        { name: "Job Posts", href: "/admin/job-posts" },
        { name: "Assignments", href: "/admin/assignments" },
        { name: "Active Jobs", href: "/admin/active-jobs" },
        { name: "Deliveries", href: "/admin/deliveries" },
        { name: "Completed Jobs", href: "/admin/completed-jobs" },
        { name: "Messages", disabled: true }
      ]
    },
    {
      groupName: "MARKETPLACE",
      items: [
        { name: "Clients", disabled: true },
        { name: "Freelancers", disabled: true },
        { name: "Profiles", disabled: true },
        { name: "Services", disabled: true },
        { name: "Categories", disabled: true },
        { name: "Verifications", href: "/admin/verification" }
      ]
    },
    {
      groupName: "FINANCE",
      items: [
        { name: "Payments", disabled: true },
        { name: "Refunds", disabled: true },
        { name: "Payouts", disabled: true }
      ]
    },
    {
      groupName: "TRUST & SAFETY",
      items: [
        { name: "Reviews", disabled: true },
        { name: "Disputes", href: "/admin/disputes" },
        { name: "Reports", disabled: true }
      ]
    },
    {
      groupName: "SYSTEM",
      items: [
        { name: "Platform Settings", href: "/admin/settings" },
        { name: "Audit Logs", href: "/admin/audit" }
      ]
    },
    {
      groupName: "SUPPORT",
      items: [
        { name: "Help / Documentation", disabled: true }
      ]
    }
  ];

  if (role === "admin") {
    return (
      <aside className="w-64 border-r border-white/[0.06] bg-surface/75 backdrop-blur-xl text-text-main flex flex-col p-6 gap-6 h-screen sticky top-0 overflow-y-auto">
        <div className="border-b border-border-custom/50 pb-4">
          <span className="font-bold text-[10px] uppercase tracking-widest text-primary block">
            ADMIN WORKSPACE
          </span>
        </div>
        <nav className="flex flex-col gap-5 flex-grow font-sans">
          {adminGroups.map((group) => (
            <div key={group.groupName} className="flex flex-col gap-1">
              <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest px-3 mb-1 block drop-shadow-sm">
                {group.groupName}
              </span>
              {group.items.map((item) => {
                const isActive = activeItem === item.name || false;
                if (item.disabled) {
                  return (
                    <div
                      key={item.name}
                      className="px-4 py-1.5 text-gray-400/50 cursor-not-allowed text-[11px] font-medium tracking-wide flex items-center justify-between group"
                    >
                      <span>{item.name}</span>
                      <span className="opacity-0 group-hover:opacity-100 transition-opacity text-[8px] bg-surface text-gray-300 px-1.5 py-0.5 rounded-full uppercase tracking-wider font-bold">
                        Soon
                      </span>
                    </div>
                  );
                }
                return (
                  <Link
                    key={item.name}
                    href={item.href || "#"}
                    className={`px-4 py-1.5 rounded-full text-xs font-semibold tracking-wide transition-all cursor-pointer block ${
                      isActive
                        ? "bg-primary/20 text-[#FF6B57] font-bold drop-shadow-sm"
                        : "text-gray-200 hover:text-white hover:bg-white/10"
                    }`}
                  >
                    {item.name}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>
      </aside>
    );
  }

  const currentItems = flatItems[role] || [];

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
