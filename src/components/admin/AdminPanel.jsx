"use client";

import React, { useState, Suspense } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import {
  LayoutDashboard,
  Link2,
  ShoppingBag,
  Boxes,
  Package,
  Users,
  Tag,
  MessageSquare,
  Star,
  FileText,
  ScrollText,
  UserPlus,
  LogOut,
  PanelLeft,
  X,
} from "lucide-react";
import { useShop } from "@/context/ShopContext";
import AdminOverview from "./AdminOverview";
import AdminUtmTab from "./AdminUtmTab";
import AdminProductsTab from "./AdminProductsTab";
import AdminInventoryTab from "./AdminInventoryTab";
import AdminOrdersTab from "./AdminOrdersTab";
import AdminUsersTab from "./AdminUsersTab";
import AdminCouponsTab from "./AdminCouponsTab";
import AdminTicketsTab from "./AdminTicketsTab";
import AdminReviewsTab from "./AdminReviewsTab";
import AdminCmsTab from "./AdminCmsTab";
import AdminLogsTab from "./AdminLogsTab";
import AdminTeamTab from "./AdminTeamTab";

function AdminPanelInner() {
  const { user, isSuperAdmin, logout } = useShop();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const navItems = [
    { id: "overview", label: "Overview", icon: LayoutDashboard },
    { id: "utm", label: "UTM & Referrals", icon: Link2 },
    { id: "products", label: "Products", icon: ShoppingBag },
    { id: "inventory", label: "Inventory", icon: Boxes },
    { id: "orders", label: "Orders", icon: Package },
    { id: "users", label: "Users", icon: Users },
    { id: "coupons", label: "Coupons", icon: Tag },
    { id: "tickets", label: "Contact Tickets", icon: MessageSquare },
    { id: "reviews", label: "Reviews & Approval", icon: Star },
    { id: "cms", label: "Smart CMS", icon: FileText },
    { id: "logs", label: "Audit Logs", icon: ScrollText },
    ...(isSuperAdmin ? [{ id: "team", label: "Add Admin", icon: UserPlus }] : []),
  ];

  const requestedTab = searchParams.get("tab") || "overview";
  const activeTab = navItems.some((n) => n.id === requestedTab) ? requestedTab : "overview";

  const handleSelectTab = (id) => {
    const params = new URLSearchParams();
    if (id !== "overview") params.set("tab", id);
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    setMobileNavOpen(false);
  };

  return (
    <div className="w-full min-h-svh bg-[#ffffff] text-[#1b1717] pt-[56px] lg:pt-[64px] flex items-start">
      <aside className="hidden lg:flex flex-col justify-between w-64 shrink-0 border-r border-[#1b1717]/15 self-start sticky top-[64px] h-[calc(100svh-64px)] bg-[#ffffff] px-5 py-6">
        <div className="overflow-y-auto pr-1">
          <div className="pb-5 mb-5 border-b border-[#1b1717]/15">
            <span className="text-[10px] uppercase tracking-[0.22em] text-[#5d100a] font-semibold block">
              {isSuperAdmin ? "Super Admin Console" : "Admin Console"}
            </span>
            <p className="text-xs font-medium text-[#1b1717] mt-1 truncate">{user?.email}</p>
          </div>

          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleSelectTab(item.id)}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 text-xs uppercase tracking-[0.14em] rounded-[2px] transition-colors cursor-pointer ${
                    active
                      ? "bg-[#1b1717] text-[#ffffff] font-semibold"
                      : "text-[#1b1717]/75 hover:bg-[#1b1717]/5 hover:text-[#1b1717]"
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="truncate">{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        <div className="pt-4 border-t border-[#1b1717]/15">
          <button
            type="button"
            onClick={logout}
            className="w-full flex items-center justify-center gap-2 py-2.5 border border-[#5d100a] text-[#5d100a] hover:bg-[#5d100a] hover:text-[#ffffff] text-xs uppercase tracking-[0.18em] font-semibold rounded-[2px] transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {mobileNavOpen && (
        <div
          data-lenis-prevent
          onClick={() => setMobileNavOpen(false)}
          className="fixed inset-0 z-[1005] bg-black/45 lg:hidden"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-[260px] max-w-[80vw] h-svh bg-[#ffffff] border-r border-[#1b1717]/15 flex flex-col justify-between p-5 shadow-2xl"
          >
            <div className="overflow-y-auto">
              <div className="flex items-center justify-between pb-4 mb-4 border-b border-[#1b1717]/15">
                <div>
                  <span className="text-[10px] uppercase tracking-[0.2em] text-[#5d100a] font-semibold block">
                    {isSuperAdmin ? "Super Admin" : "Admin Menu"}
                  </span>
                  <p className="text-[11px] text-[#1b1717]/70 truncate max-w-[175px]">
                    {user?.email}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setMobileNavOpen(false)}
                  aria-label="Close Admin Menu"
                  className="p-1 text-[#1b1717] hover:text-[#5d100a] cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <nav className="space-y-1">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const active = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleSelectTab(item.id)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 text-xs uppercase tracking-[0.14em] rounded-[2px] cursor-pointer ${
                        active
                          ? "bg-[#1b1717] text-[#ffffff] font-semibold"
                          : "text-[#1b1717]/80 hover:bg-[#1b1717]/5"
                      }`}
                    >
                      <Icon className="w-4 h-4 shrink-0" />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </nav>
            </div>

            <button
              type="button"
              onClick={logout}
              className="w-full flex items-center justify-center gap-2 py-2.5 border border-[#5d100a] text-[#5d100a] text-xs uppercase tracking-widest font-semibold rounded-[2px] cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      )}

      <div className="flex-1 min-w-0 px-4 sm:px-8 lg:px-10 py-6 lg:py-8">
        <div className="lg:hidden flex items-center justify-between gap-3 pb-4 mb-6 border-b border-[#1b1717]/15">
          <button
            type="button"
            onClick={() => setMobileNavOpen(true)}
            className="inline-flex items-center gap-2 px-3.5 py-2 border border-[#1b1717] text-[11px] uppercase tracking-[0.18em] font-semibold hover:bg-[#1b1717] hover:text-[#ffffff] transition-colors cursor-pointer"
          >
            <PanelLeft className="w-4 h-4" />
            <span>Admin Panel</span>
          </button>

          <span className="text-[11px] uppercase tracking-[0.18em] text-[#5d100a] font-semibold">
            {navItems.find((n) => n.id === activeTab)?.label}
          </span>
        </div>

        {activeTab === "overview" && <AdminOverview onOpenUtm={() => handleSelectTab("utm")} />}
        {activeTab === "utm" && <AdminUtmTab />}
        {activeTab === "products" && <AdminProductsTab />}
        {activeTab === "inventory" && <AdminInventoryTab />}
        {activeTab === "orders" && <AdminOrdersTab />}
        {activeTab === "users" && <AdminUsersTab />}
        {activeTab === "coupons" && <AdminCouponsTab />}
        {activeTab === "tickets" && <AdminTicketsTab />}
        {activeTab === "reviews" && <AdminReviewsTab />}
        {activeTab === "cms" && <AdminCmsTab />}
        {activeTab === "logs" && <AdminLogsTab />}
        {activeTab === "team" && isSuperAdmin && <AdminTeamTab />}
      </div>
    </div>
  );
}

export default function AdminPanel() {
  return (
    <Suspense fallback={<div className="min-h-svh bg-[#ffffff]" />}>
      <AdminPanelInner />
    </Suspense>
  );
}