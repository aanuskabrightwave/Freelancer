"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { 
  LayoutDashboard, 
  Users, 
  Briefcase, 
  FileText, 
  Calendar, 
  MessageSquare, 
  CreditCard, 
  Heart, 
  Star, 
  Bell, 
  User, 
  Settings, 
  HelpCircle, 
  ChevronLeft, 
  ChevronRight,
  Clock,
  TrendingUp,
  ArrowUpRight,
  ShieldCheck,
  Image,
  FolderOpen
} from "lucide-react";

interface SidebarMenuItem {
  name: string;
  href: string;
  icon: any;
  tooltip?: string;
}

interface SidebarMenuGroup {
  group: string;
  items: SidebarMenuItem[];
}

interface WorkspaceSidebarProps {
  role: "client" | "freelancer";
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onOpenHelp: () => void;
}

export default function WorkspaceSidebar({ role, isCollapsed, onToggleCollapse, onOpenHelp }: WorkspaceSidebarProps) {
  const pathname = usePathname();
  const { user } = useAuth();

  // Define sidebar menu configurations
  const clientMenu: SidebarMenuGroup[] = [
    {
      group: "General",
      items: [
        { name: "Overview", href: "/client/dashboard", icon: LayoutDashboard }
      ]
    },
    {
      group: "Discover",
      items: [
        { name: "Explore Creatives", href: "/freelancers", icon: Users },
        { name: "Services", href: "/services", icon: Briefcase },
        { name: "Browse Projects", href: "/services", icon: FileText }
      ]
    },
    {
      group: "Work",
      items: [
        { name: "My Projects", href: "/client/projects", icon: FolderOpen },
        { name: "Bookings", href: "/client/bookings", icon: Calendar },
        { name: "Messages", href: "/client/messages", icon: MessageSquare }
      ]
    },
    {
      group: "Money",
      items: [
        { name: "Payments", href: "/client/payments", icon: CreditCard }
      ]
    },
    {
      group: "Personal",
      items: [
        { name: "Favourites", href: "/client/favourites", icon: Heart },
        { name: "Reviews", href: "/client/reviews", icon: Star },
        { name: "Notifications", href: "/notifications", icon: Bell }
      ]
    },
    {
      group: "Account",
      items: [
        { name: "Profile", href: "/client/profile", icon: User },
        { name: "Settings", href: "/client/settings", icon: Settings }
      ]
    },
    {
      group: "Support",
      items: [
        { name: "Help & Support", href: "#", icon: HelpCircle }
      ]
    }
  ];

  const freelancerMenu: SidebarMenuGroup[] = [
    {
      group: "General",
      items: [
        { name: "Overview", href: "/freelancer/dashboard", icon: LayoutDashboard }
      ]
    },
    {
      group: "My Business",
      items: [
        { name: "Profile", href: "/freelancer/profile", icon: User },
        { name: "Portfolio", href: "/freelancer/portfolio", icon: Image },
        { name: "Services", href: "/freelancer/services", icon: Briefcase },
        { name: "Availability", href: "/freelancer/availability", icon: Clock }
      ]
    },
    {
      group: "Find Work",
      items: [
        { name: "Browse Projects", href: "/services", icon: FileText },
        { name: "My Proposals", href: "/freelancer/proposals", icon: FolderOpen }
      ]
    },
    {
      group: "Work",
      items: [
        { name: "Bookings", href: "/freelancer/bookings", icon: Calendar },
        { name: "Messages", href: "/freelancer/messages", icon: MessageSquare }
      ]
    },
    {
      group: "Money",
      items: [
        { name: "Earnings", href: "/freelancer/earnings", icon: TrendingUp },
        { name: "Payouts", href: "/freelancer/earnings/payouts", icon: ArrowUpRight }
      ]
    },
    {
      group: "Reputation",
      items: [
        { name: "Reviews", href: "/freelancer/reviews", icon: Star },
        { name: "Verification", href: "/freelancer/dashboard", icon: ShieldCheck }
      ]
    },
    {
      group: "Personal",
      items: [
        { name: "Notifications", href: "/notifications", icon: Bell },
        { name: "Settings", href: "/freelancer/settings", icon: Settings }
      ]
    },
    {
      group: "Support",
      items: [
        { name: "Help & Support", href: "#", icon: HelpCircle }
      ]
    }
  ];

  const menuGroups = role === "client" ? clientMenu : freelancerMenu;
  const initials = user?.full_name ? user.full_name.split(" ").map(n => n[0]).join("").substring(0, 2).toUpperCase() : "US";

  return (
    <aside 
      className={`border-r border-border-custom bg-surface flex flex-col h-full transition-all duration-300 font-sans relative ${
        isCollapsed ? "w-20" : "w-64"
      }`}
    >
      {/* Menu links list - overflow behavior changes dynamically to allow tooltip visibility */}
      <div 
        className={`flex-1 min-h-0 px-4 pt-4 pb-3 space-y-5 ${
          isCollapsed ? "overflow-visible" : "overflow-y-auto overflow-x-hidden"
        }`}
      >
        {menuGroups.map((group, idx) => (
          <div key={idx} className="space-y-1">
            {idx === 0 ? (
              <div className={`flex items-center ${isCollapsed ? "justify-center" : "justify-between px-3"} mb-1.5`}>
                {!isCollapsed && (
                  <span className="text-[10px] font-extrabold text-text-muted uppercase tracking-widest block">
                    {group.group}
                  </span>
                )}
                <button
                  onClick={onToggleCollapse}
                  className="p-1 rounded-lg border border-border-custom hover:bg-surface-elevated text-text-muted hover:text-text-main transition cursor-pointer"
                  title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
                >
                  {isCollapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
                </button>
              </div>
            ) : (
              !isCollapsed && (
                <span className="text-[10px] font-extrabold text-text-muted uppercase tracking-widest px-3 block mb-1">
                  {group.group}
                </span>
              )
            )}
            <nav className="space-y-0.5">
              {group.items.map((item) => {
                const getIsActive = (itemHref: string, itemName: string) => {
                  if (itemHref === "#") return false;
                  if (itemHref === "/client/dashboard" || itemHref === "/freelancer/dashboard") {
                    return pathname === itemHref;
                  }
                  if (itemName === "Earnings") {
                    return pathname === "/freelancer/earnings" || pathname === "/freelancer/earnings/transactions";
                  }
                  if (itemName === "Payouts") {
                    return pathname === "/freelancer/earnings/payouts" || pathname === "/freelancer/earnings/payout-account";
                  }
                  if (pathname === itemHref) return true;
                  return pathname.startsWith(itemHref + "/");
                };

                const isActive = getIsActive(item.href, item.name);
                const IconComponent = item.icon;

                const linkContent = (
                  <div
                    className={`group relative flex items-center gap-3 px-3 py-2 rounded-xl text-xs min-w-0 transition duration-200 cursor-pointer ${
                      isActive 
                        ? "bg-primary/5 text-primary font-bold border-l-2 border-primary rounded-l-none" 
                        : "text-text-sub hover:text-text-main hover:bg-surface-elevated font-medium"
                    }`}
                  >
                    <IconComponent className={`w-4.5 h-4.5 flex-shrink-0 ${isActive ? "text-primary" : "text-text-sub group-hover:text-text-main"}`} />
                    {!isCollapsed && <span className="truncate">{item.name}</span>}
                    
                    {/* Tooltip for collapsed state */}
                    {isCollapsed && (
                      <span className="hidden group-hover:block absolute left-full ml-3 px-2.5 py-1.5 bg-dark text-text-on-dark text-[10px] rounded-lg shadow-md z-[100] whitespace-nowrap">
                        {item.name}
                      </span>
                    )}
                  </div>
                );

                if (item.name === "Help & Support") {
                  return (
                    <button key={item.name} onClick={onOpenHelp} className="w-full text-left block min-w-0">
                      {linkContent}
                    </button>
                  );
                }

                return (
                  <Link key={item.name} href={item.href} className="block w-full min-w-0">
                    {linkContent}
                  </Link>
                );
              })}
            </nav>
          </div>
        ))}

        {/* Divider and User Profile Section inside the scrollable content flow */}
        <hr className="border-border-custom/50 my-4" />

        <div className={`flex items-center gap-3 px-3 py-2 ${isCollapsed ? "justify-center" : ""}`}>
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary flex-shrink-0">
            {initials}
          </div>
          {!isCollapsed && (
            <div className="min-w-0 flex-grow">
              <p className="text-[11px] font-extrabold text-text-main truncate leading-tight">
                {user?.full_name || "Aarav Sharma"}
              </p>
              <p className="text-[9px] text-text-muted capitalize leading-none mt-0.5">
                {role}
              </p>
            </div>
          )}
        </div>
      </div>

    </aside>
  );
}
