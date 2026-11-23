"use client";

import React, { useEffect, useState, useCallback } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  Search,
  UserPlus,
  FileSpreadsheet,
  Eye,
  ArrowLeft,
  Ban,
  CheckCircle2,
  Trash2,
  LogOut,
  ShoppingCart,
  Package,
  MapPin,
  MessageSquare,
  Star,
  Pencil,
  X,
} from "lucide-react";
import { api, getApiErrorMessage } from "@/lib/api";
import { formatINR } from "@/data/catalogData";
import { downloadExcelWorkbook } from "@/lib/excelExport";
import ResponsiveImage from "@/components/ui/ResponsiveImage";
import UrlPagination, { useUrlPageParam } from "./UrlPagination";
import ProfileIntelligencePanel from "./ProfileIntelligencePanel";
import AdminVisitorsView from "./AdminVisitorsView";

function formatDate(d) {
  if (!d) return "Never";
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return "Never";
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  }).formatToParts(dt);
  const get = (t) => parts.find((p) => p.type === t)?.value || "";
  const period = (get("dayPeriod") || "").toUpperCase();
  return `${get("day")}/${get("month")}/${get("year")} ${get("hour")}:${get("minute")}:${get("second")} ${period}`.trim();
}

export default function AdminUsersTab() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const activeSubTab = searchParams.get("sub") === "visitors" ? "visitors" : "accounts";
  const urlViewUserId = searchParams.get("view") || "";

  const [page, setPage] = useUrlPageParam("page");
  const [users, setUsers] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [status, setStatus] = useState("ALL");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createForm, setCreateForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    password: "",
  });

  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [editingProfile, setEditingProfile] = useState(false);
  const [editForm, setEditForm] = useState({ fullName: "", phone: "" });

  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState({ type: "", text: "" });

  const updateUrlParams = useCallback(
    (mutate) => {
      const next = new URLSearchParams(searchParams.toString());
      mutate(next);
      const qs = next.toString();
      router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams]
  );

  const handleSwitchSubTab = (sub) => {
    setDetail(null);
    updateUrlParams((p) => {
      p.delete("view");
      p.delete("visitor");
      p.delete("page");
      p.delete("vpage");
      if (sub === "visitors") p.set("sub", "visitors");
      else p.delete("sub");
    });
  };

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 350);
    return () => clearTimeout(t);
  }, [search]);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/admin/users", {
        params: {
          status,
          page,
          limit: 15,
          ...(debouncedSearch ? { q: debouncedSearch } : {}),
        },
      });
      setUsers(data.data?.users || []);
      if (data.data?.pagination) setPagination(data.data.pagination);
    } catch (err) {
      setNotice({ type: "error", text: getApiErrorMessage(err, "Failed to load users.") });
    } finally {
      setLoading(false);
    }
  }, [status, page, debouncedSearch]);

  useEffect(() => {
    if (activeSubTab === "accounts" && !urlViewUserId) {
      loadUsers();
    }
  }, [activeSubTab, urlViewUserId, loadUsers]);

  const fetchUserDetail = useCallback(async (userId) => {
    if (!userId) return;
    setDetailLoading(true);
    setNotice({ type: "", text: "" });
    setEditingProfile(false);
    try {
      const { data } = await api.get(`/admin/users/${userId}`);
      setDetail(data.data);
      setEditForm({
        fullName: data.data?.user?.fullName || "",
        phone: data.data?.user?.phone || "",
      });
    } catch (err) {
      setNotice({ type: "error", text: getApiErrorMessage(err, "Failed to load user details.") });
    } finally {
      setDetailLoading(false);
    }
  }, []);

  // Auto-open 360° profile whenever ?view=<userId> is in the URL (survives reload)
  useEffect(() => {
    if (!urlViewUserId) {
      setDetail(null);
      return;
    }
    if (detail?.user?._id !== urlViewUserId) {
      fetchUserDetail(urlViewUserId);
    }
  }, [urlViewUserId, detail?.user?._id, fetchUserDetail]);

  const openUserDetail = (userId) => {
    updateUrlParams((p) => {
      p.delete("sub");
      p.delete("visitor");
      p.set("view", userId);
    });
  };

  const closeUserDetail = () => {
    setDetail(null);
    updateUrlParams((p) => {
      p.delete("view");
    });
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setBusy(true);
    setNotice({ type: "", text: "" });
    try {
      await api.post("/admin/users", createForm);
      setNotice({ type: "success", text: `Customer ${createForm.email} created.` });
      setCreateForm({ fullName: "", email: "", phone: "", password: "" });
      setShowCreateForm(false);
      await loadUsers();
    } catch (err) {
      setNotice({ type: "error", text: getApiErrorMessage(err, "Failed to create customer.") });
    } finally {
      setBusy(false);
    }
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (!detail?.user?._id) return;
    setBusy(true);
    setNotice({ type: "", text: "" });
    try {
      await api.patch(`/admin/users/${detail.user._id}`, editForm);
      setNotice({ type: "success", text: "Customer profile updated." });
      setEditingProfile(false);
      await fetchUserDetail(detail.user._id);
    } catch (err) {
      setNotice({ type: "error", text: getApiErrorMessage(err, "Failed to update profile.") });
    } finally {
      setBusy(false);
    }
  };

  const handleToggleBan = async (userObj) => {
    const actionLabel = userObj.isActive ? "BAN / BLOCK" : "UNBAN";
    if (!window.confirm(`Are you sure you want to ${actionLabel} ${userObj.email}?`)) return;
    setBusy(true);
    setNotice({ type: "", text: "" });
    try {
      const { data } = await api.patch(`/admin/users/${userObj._id}/toggle-ban`);
      setNotice({ type: "success", text: data.message || "Account status updated." });
      if (detail?.user?._id === userObj._id) await fetchUserDetail(userObj._id);
      else await loadUsers();
    } catch (err) {
      setNotice({ type: "error", text: getApiErrorMessage(err, "Failed to update account status.") });
    } finally {
      setBusy(false);
    }
  };

  const handleRevokeSessions = async (userId) => {
    if (!window.confirm("Force sign-out this customer from all active devices?")) return;
    setBusy(true);
    setNotice({ type: "", text: "" });
    try {
      const { data } = await api.post(`/admin/users/${userId}/revoke-sessions`);
      setNotice({ type: "success", text: data.message || "Sessions revoked." });
      if (detail?.user?._id === userId) await fetchUserDetail(userId);
    } catch (err) {
      setNotice({ type: "error", text: getApiErrorMessage(err, "Failed to revoke sessions.") });
    } finally {
      setBusy(false);
    }
  };

  const handleClearCart = async (userId) => {
    if (!window.confirm("Clear all items from this customer's shopping cart?")) return;
    setBusy(true);
    setNotice({ type: "", text: "" });
    try {
      await api.delete(`/admin/users/${userId}/cart`);
      setNotice({ type: "success", text: "Customer cart cleared." });
      if (detail?.user?._id === userId) await fetchUserDetail(userId);
      else await loadUsers();
    } catch (err) {
      setNotice({ type: "error", text: getApiErrorMessage(err, "Failed to clear cart.") });
    } finally {
      setBusy(false);
    }
  };

  const handleDeleteUser = async (userObj) => {
    if (
      !window.confirm(
        `Permanently delete ${userObj.email}? Their login and cart will be removed (past GST order invoices remain archived).`
      )
    ) {
      return;
    }
    setBusy(true);
    setNotice({ type: "", text: "" });
    try {
      await api.delete(`/admin/users/${userObj._id}`);
      setNotice({ type: "success", text: `Deleted ${userObj.email}.` });
      if (detail?.user?._id === userObj._id) closeUserDetail();
      await loadUsers();
    } catch (err) {
      setNotice({ type: "error", text: getApiErrorMessage(err, "Failed to delete customer.") });
    } finally {
      setBusy(false);
    }
  };

  const handleExportExcel = async () => {
    setExporting(true);
    try {
      const { data } = await api.get("/admin/users", {
        params: {
          status,
          exportAll: "true",
          ...(debouncedSearch ? { q: debouncedSearch } : {}),
        },
      });
      const allUsers = data.data?.users || [];
      downloadExcelWorkbook({
        filename: `DIVARA_Customers_${status}_${new Date().toISOString().slice(0, 10)}.xls`,
        sheetName: "Customers",
        columns: [
          { label: "Full Name", key: "fullName" },
          { label: "Email", key: "email" },
          { label: "Phone", key: "phone" },
          { label: "Status", value: (r) => (r.isActive ? "Active" : "Banned") },
          { label: "Auth Provider", key: "authProvider" },
          { label: "Member Since", value: (r) => formatDate(r.createdAt) },
          { label: "Last Active", value: (r) => formatDate(r.lastLoginAt) },
          { label: "Total Orders", value: (r) => r.stats?.orderCount || 0 },
          { label: "Lifetime Spend (INR)", value: (r) => r.stats?.totalSpentInr || 0 },
          { label: "Active Cart Items", value: (r) => r.stats?.cartItemCount || 0 },
          { label: "Cart Value (INR)", value: (r) => r.stats?.cartValueInr || 0 },
          { label: "Saved Addresses", value: (r) => r.stats?.addressesCount || 0 },
          { label: "Support Tickets", value: (r) => r.stats?.ticketCount || 0 },
        ],
        rows: allUsers,
      });
    } catch (err) {
      setNotice({ type: "error", text: getApiErrorMessage(err, "Export failed.") });
    } finally {
      setExporting(false);
    }
  };

  if (detailLoading || (urlViewUserId && !detail?.user)) {
    return (
      <div className="space-y-4">
        <div className="h-10 w-64 bg-[#1b1717]/[0.07] animate-pulse" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 bg-[#1b1717]/[0.05] animate-pulse" />
          ))}
        </div>
        <div className="h-64 bg-[#1b1717]/[0.04] animate-pulse" />
      </div>
    );
  }

  // 360° USER DETAIL VIEW (URL-synced via ?view=<userId>)
  if (detail?.user) {
    const u = detail.user;
    const s = detail.summary || {};

    return (
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#1b1717]/15 pb-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={closeUserDetail}
              className="inline-flex items-center gap-1.5 px-3 py-2 border border-[#1b1717]/25 text-xs uppercase tracking-widest hover:border-[#1b1717] cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>All Users</span>
            </button>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase tracking-[0.2em] text-[#5d100a] font-semibold">
                  Customer 360° Profile
                </span>
                <span
                  className={`px-2 py-0.5 text-[9px] uppercase tracking-widest font-semibold ${
                    u.isActive
                      ? "bg-[#1b1717] text-[#ffffff]"
                      : "bg-[#5d100a] text-[#ffffff]"
                  }`}
                >
                  {u.isActive ? "Active" : "Banned"}
                </span>
              </div>
              <h2 className="heading-serif text-2xl font-normal">
                {u.fullName || u.email}
              </h2>
              <p className="text-xs text-[#1b1717]/65">
                {u.email} {u.phone ? `• ${u.phone}` : ""} • Auth: {u.authProvider}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => setEditingProfile((p) => !p)}
              className="inline-flex items-center gap-1.5 px-3 py-2 border border-[#1b1717]/25 text-[10px] uppercase tracking-widest hover:border-[#1b1717] cursor-pointer"
            >
              <Pencil className="w-3.5 h-3.5" />
              <span>Edit</span>
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => handleRevokeSessions(u._id)}
              className="inline-flex items-center gap-1.5 px-3 py-2 border border-[#1b1717]/25 text-[10px] uppercase tracking-widest hover:border-[#1b1717] cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Force Sign-Out ({s.activeSessions || 0})</span>
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => handleToggleBan(u)}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-[10px] uppercase tracking-widest cursor-pointer ${
                u.isActive
                  ? "border border-[#5d100a] text-[#5d100a] hover:bg-[#5d100a] hover:text-[#ffffff]"
                  : "bg-[#1b1717] text-[#ffffff] hover:bg-[#5d100a]"
              }`}
            >
              {u.isActive ? <Ban className="w-3.5 h-3.5" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
              <span>{u.isActive ? "Ban Account" : "Unban Account"}</span>
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => handleDeleteUser(u)}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-[#5d100a] text-[#ffffff] hover:bg-[#1b1717] text-[10px] uppercase tracking-widest cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete</span>
            </button>
          </div>
        </div>

        {notice.text && (
          <div
            className={`p-3 text-xs border ${
              notice.type === "error"
                ? "border-[#5d100a]/40 bg-[#5d100a]/5 text-[#5d100a]"
                : "border-[#1b1717]/25 bg-[#1b1717]/[0.03] text-[#1b1717]"
            }`}
          >
            {notice.text}
          </div>
        )}

        {editingProfile && (
          <form
            onSubmit={handleSaveProfile}
            className="border border-[#1b1717]/20 p-5 bg-[#ffffff] flex flex-wrap items-end gap-4"
          >
            <div className="flex-1 min-w-[200px]">
              <label className="block text-[10px] uppercase tracking-widest text-[#1b1717]/60 mb-1">
                Full Name
              </label>
              <input
                type="text"
                required
                value={editForm.fullName}
                onChange={(e) => setEditForm((p) => ({ ...p, fullName: e.target.value }))}
                className="w-full border border-[#1b1717]/25 px-3 py-2 text-xs outline-none focus:border-[#5d100a]"
              />
            </div>
            <div className="flex-1 min-w-[200px]">
              <label className="block text-[10px] uppercase tracking-widest text-[#1b1717]/60 mb-1">
                Phone
              </label>
              <input
                type="text"
                value={editForm.phone}
                onChange={(e) => setEditForm((p) => ({ ...p, phone: e.target.value }))}
                className="w-full border border-[#1b1717]/25 px-3 py-2 text-xs outline-none focus:border-[#5d100a]"
              />
            </div>
            <button
              type="submit"
              disabled={busy}
              className="px-5 py-2 bg-[#1b1717] text-[#ffffff] hover:bg-[#5d100a] text-xs uppercase tracking-widest cursor-pointer"
            >
              Save
            </button>
          </form>
        )}

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="border border-[#1b1717]/15 p-4 bg-[#ffffff]">
            <span className="text-[10px] uppercase tracking-widest text-[#1b1717]/55">Active Since</span>
            <p className="text-xs font-semibold font-mono mt-1">{formatDate(u.createdAt)}</p>
            <p className="text-[10px] text-[#1b1717]/55 font-mono mt-1">
              Last Login: {formatDate(u.lastLoginAt)}
            </p>
          </div>
          <div className="border border-[#1b1717]/15 p-4 bg-[#ffffff]">
            <span className="text-[10px] uppercase tracking-widest text-[#1b1717]/55">Lifetime Spend</span>
            <p className="heading-serif text-2xl mt-1 text-[#5d100a]">{formatINR(s.totalSpentInr || 0)}</p>
            <p className="text-[10px] text-[#1b1717]/55 mt-1">
              {s.paidOrders || 0} paid / {s.totalOrders || 0} total orders
            </p>
          </div>
          <div className="border border-[#1b1717]/15 p-4 bg-[#ffffff]">
            <span className="text-[10px] uppercase tracking-widest text-[#1b1717]/55">Live Cart Value</span>
            <p className="heading-serif text-2xl mt-1">{formatINR(s.cartValueInr || 0)}</p>
            <p className="text-[10px] text-[#1b1717]/55 mt-1">{s.cartItemCount || 0} item(s) in bag</p>
          </div>
          <div className="border border-[#1b1717]/15 p-4 bg-[#ffffff]">
            <span className="text-[10px] uppercase tracking-widest text-[#1b1717]/55">Engagement</span>
            <p className="text-sm font-semibold mt-1">
              {(u.addresses || []).length} Addresses • {s.ticketsCount || 0} Tickets
            </p>
            <p className="text-[10px] text-[#1b1717]/55 mt-1">{s.reviewsCount || 0} Reviews written</p>
          </div>
        </div>

        {/* Behavioral Intelligence, Interest Scores, Style DNA & Complete Activity Timeline */}
        <ProfileIntelligencePanel type="account" id={u._id} />

        {/* Live Cart + Saved Addresses */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="border border-[#1b1717]/15 bg-[#ffffff] p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShoppingCart className="w-4 h-4 text-[#5d100a]" />
                <h3 className="text-xs uppercase tracking-[0.18em] font-semibold">
                  Live Shopping Cart ({detail.cart?.length || 0})
                </h3>
              </div>
              {detail.cart?.length > 0 && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => handleClearCart(u._id)}
                  className="text-[10px] uppercase tracking-widest text-[#5d100a] underline cursor-pointer"
                >
                  Clear Cart
                </button>
              )}
            </div>

            {!detail.cart?.length ? (
              <p className="text-xs text-[#1b1717]/55">Cart is currently empty.</p>
            ) : (
              <div className="divide-y divide-[#1b1717]/10">
                {detail.cart.map((item, idx) => (
                  <div key={idx} className="py-2.5 flex items-center gap-3 text-xs">
                    <div className="w-10 h-14 bg-[#1b1717]/5 shrink-0 overflow-hidden">
                      <ResponsiveImage src={item.image} alt={item.title} preset="thumb" className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{item.title}</p>
                      <p className="text-[11px] text-[#1b1717]/60">Size: {item.size} × {item.quantity}</p>
                    </div>
                    <span className="font-semibold">{formatINR((item.price || 0) * (item.quantity || 1))}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="border border-[#1b1717]/15 bg-[#ffffff] p-5 space-y-4">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-[#5d100a]" />
              <h3 className="text-xs uppercase tracking-[0.18em] font-semibold">
                Saved Addresses ({u.addresses?.length || 0})
              </h3>
            </div>

            {!u.addresses?.length ? (
              <p className="text-xs text-[#1b1717]/55">No saved addresses yet.</p>
            ) : (
              <div className="space-y-3">
                {u.addresses.map((addr) => (
                  <div key={addr._id} className="border border-[#1b1717]/10 p-3 text-xs space-y-0.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] uppercase tracking-widest font-semibold text-[#5d100a]">
                        {addr.label || "Home"}
                      </span>
                      {addr.isDefault && (
                        <span className="text-[9px] uppercase tracking-widest px-1.5 py-0.5 bg-[#1b1717] text-[#ffffff]">
                          Default
                        </span>
                      )}
                    </div>
                    <p className="font-medium">{addr.fullName} • {addr.phone}</p>
                    <p className="text-[#1b1717]/70">
                      {[addr.line1, addr.line2, addr.city, addr.state, addr.postalCode].filter(Boolean).join(", ")}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Order History */}
        <div className="border border-[#1b1717]/15 bg-[#ffffff] p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Package className="w-4 h-4 text-[#5d100a]" />
            <h3 className="text-xs uppercase tracking-[0.18em] font-semibold">
              Order History ({detail.orders?.length || 0})
            </h3>
          </div>
          {!detail.orders?.length ? (
            <p className="text-xs text-[#1b1717]/55">No orders placed yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-[#1b1717]/15 text-[10px] uppercase tracking-widest text-[#1b1717]/60">
                    <th className="py-2 pr-4">Order #</th>
                    <th className="py-2 pr-4">Date</th>
                    <th className="py-2 pr-4">Items</th>
                    <th className="py-2 pr-4">Status</th>
                    <th className="py-2 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1b1717]/10">
                  {detail.orders.map((ord) => (
                    <tr key={ord._id}>
                      <td className="py-2.5 pr-4 font-semibold">{ord.orderNumber}</td>
                      <td className="py-2.5 pr-4 text-[#1b1717]/65 font-mono text-[11px]">{formatDate(ord.createdAt)}</td>
                      <td className="py-2.5 pr-4">{ord.items?.length || 0} item(s)</td>
                      <td className="py-2.5 pr-4">
                        <span className="px-2 py-0.5 text-[10px] uppercase border border-[#1b1717]/20">
                          {ord.status}
                        </span>
                      </td>
                      <td className="py-2.5 text-right font-semibold">
                        {formatINR(Math.round((ord.totalPaise || 0) / 100))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Contact Tickets & Reviews */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="border border-[#1b1717]/15 bg-[#ffffff] p-5 space-y-3">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-[#5d100a]" />
              <h3 className="text-xs uppercase tracking-[0.18em] font-semibold">
                Contact Inquiries ({detail.tickets?.length || 0})
              </h3>
            </div>
            {!detail.tickets?.length ? (
              <p className="text-xs text-[#1b1717]/55">No contact tickets.</p>
            ) : (
              <div className="space-y-2.5">
                {detail.tickets.map((t) => (
                  <div key={t._id} className="border border-[#1b1717]/10 p-3 text-xs">
                    <div className="flex justify-between gap-2">
                      <span className="font-semibold">{t.subject}</span>
                      <span className="text-[10px] uppercase text-[#5d100a]">{t.status}</span>
                    </div>
                    <p className="text-[#1b1717]/70 mt-1 line-clamp-2">{t.message}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="border border-[#1b1717]/15 bg-[#ffffff] p-5 space-y-3">
            <div className="flex items-center gap-2">
              <Star className="w-4 h-4 text-[#5d100a]" />
              <h3 className="text-xs uppercase tracking-[0.18em] font-semibold">
                Product Reviews ({detail.reviews?.length || 0})
              </h3>
            </div>
            {!detail.reviews?.length ? (
              <p className="text-xs text-[#1b1717]/55">No reviews submitted.</p>
            ) : (
              <div className="space-y-2.5">
                {detail.reviews.map((r) => (
                  <div key={r._id} className="border border-[#1b1717]/10 p-3 text-xs">
                    <div className="flex justify-between gap-2">
                      <span className="font-semibold">{r.title} ({r.rating}★)</span>
                      <span className="text-[10px] uppercase text-[#1b1717]/60">{r.status}</span>
                    </div>
                    <p className="text-[#1b1717]/70 mt-1 line-clamp-2">{r.comment}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // USERS & ANONYMOUS VISITORS HUB
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <span className="text-[10px] uppercase tracking-[0.22em] text-[#5d100a] font-semibold">
            Customer CRM, Visitors &amp; Intelligence
          </span>
          <h1 className="heading-serif text-2xl sm:text-3xl font-normal mt-1">
            {activeSubTab === "accounts"
              ? `Registered Accounts (${pagination.total})`
              : "Anonymous Visitors"}
          </h1>
        </div>

        {activeSubTab === "accounts" && (
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() => setShowCreateForm((p) => !p)}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#1b1717] text-[#ffffff] hover:bg-[#5d100a] text-xs uppercase tracking-widest font-semibold transition-colors cursor-pointer"
            >
              {showCreateForm ? <X className="w-3.5 h-3.5" /> : <UserPlus className="w-3.5 h-3.5" />}
              <span>{showCreateForm ? "Close Form" : "Add Customer"}</span>
            </button>

            <button
              type="button"
              disabled={exporting}
              onClick={handleExportExcel}
              className="inline-flex items-center gap-2 px-4 py-2.5 border border-[#1b1717] text-[#1b1717] hover:bg-[#1b1717] hover:text-[#ffffff] text-xs uppercase tracking-widest font-semibold transition-colors cursor-pointer disabled:opacity-50"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>{exporting ? "Exporting..." : "Export Excel"}</span>
            </button>
          </div>
        )}
      </div>

      {/* URL-Synced Sub-Tab Bar (?sub=visitors) */}
      <div className="flex items-center gap-2 border-b border-[#1b1717]/15 pb-3">
        <button
          type="button"
          onClick={() => handleSwitchSubTab("accounts")}
          className={`px-4 py-2 text-xs uppercase tracking-widest transition-colors cursor-pointer ${
            activeSubTab === "accounts"
              ? "bg-[#1b1717] text-[#ffffff]"
              : "border border-[#1b1717]/20 text-[#1b1717]/75 hover:border-[#1b1717]"
          }`}
        >
          Registered Accounts
        </button>
        <button
          type="button"
          onClick={() => handleSwitchSubTab("visitors")}
          className={`px-4 py-2 text-xs uppercase tracking-widest transition-colors cursor-pointer ${
            activeSubTab === "visitors"
              ? "bg-[#1b1717] text-[#ffffff]"
              : "border border-[#1b1717]/20 text-[#1b1717]/75 hover:border-[#1b1717]"
          }`}
        >
          Anonymous Visitors
        </button>
      </div>

      {activeSubTab === "visitors" ? (
        <AdminVisitorsView />
      ) : (
        <>
          {notice.text && (
            <div
              className={`p-3 text-xs border ${
                notice.type === "error"
                  ? "border-[#5d100a]/40 bg-[#5d100a]/5 text-[#5d100a]"
                  : "border-[#1b1717]/25 bg-[#1b1717]/[0.03] text-[#1b1717]"
              }`}
            >
              {notice.text}
            </div>
          )}

          {showCreateForm && (
            <form
              onSubmit={handleCreateUser}
              className="border border-[#1b1717]/20 bg-[#ffffff] p-5 space-y-4"
            >
              <h2 className="heading-serif text-lg">Create Customer Account</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <input
                  type="text"
                  required
                  placeholder="Full Name *"
                  value={createForm.fullName}
                  onChange={(e) => setCreateForm((p) => ({ ...p, fullName: e.target.value }))}
                  className="border border-[#1b1717]/25 px-3 py-2 text-xs outline-none focus:border-[#5d100a]"
                />
                <input
                  type="email"
                  required
                  placeholder="Email Address *"
                  value={createForm.email}
                  onChange={(e) => setCreateForm((p) => ({ ...p, email: e.target.value }))}
                  className="border border-[#1b1717]/25 px-3 py-2 text-xs outline-none focus:border-[#5d100a]"
                />
                <input
                  type="tel"
                  placeholder="Phone (Optional)"
                  value={createForm.phone}
                  onChange={(e) => setCreateForm((p) => ({ ...p, phone: e.target.value }))}
                  className="border border-[#1b1717]/25 px-3 py-2 text-xs outline-none focus:border-[#5d100a]"
                />
                <input
                  type="password"
                  required
                  minLength={8}
                  placeholder="Temporary Password (8+ chars) *"
                  value={createForm.password}
                  onChange={(e) => setCreateForm((p) => ({ ...p, password: e.target.value }))}
                  className="border border-[#1b1717]/25 px-3 py-2 text-xs outline-none focus:border-[#5d100a]"
                />
              </div>
              <button
                type="submit"
                disabled={busy}
                className="px-5 py-2.5 bg-[#5d100a] text-[#ffffff] hover:bg-[#1b1717] text-xs uppercase tracking-widest cursor-pointer disabled:opacity-50"
              >
                {busy ? "Creating..." : "Create Account"}
              </button>
            </form>
          )}

          {/* Filters */}
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex-1 min-w-[220px]">
              <label className="block text-[9px] uppercase tracking-[0.18em] text-[#1b1717]/60 font-semibold mb-1">
                Search Customers
              </label>
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#1b1717]/45" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  placeholder="Name, email, phone..."
                  className="w-full pl-8 pr-3 py-2 text-xs border border-[#1b1717]/25 outline-none focus:border-[#5d100a]"
                />
              </div>
            </div>

            <div>
              <label className="block text-[9px] uppercase tracking-[0.18em] text-[#1b1717]/60 font-semibold mb-1">
                Account Status
              </label>
              <select
                value={status}
                onChange={(e) => {
                  setStatus(e.target.value);
                  setPage(1);
                }}
                className="border border-[#1b1717]/25 px-3.5 py-2 text-xs uppercase bg-[#ffffff]"
              >
                <option value="ALL">All Users</option>
                <option value="ACTIVE">Active Only</option>
                <option value="BANNED">Banned / Blocked</option>
              </select>
            </div>
          </div>

          {/* Table */}
          <div className="border border-[#1b1717]/15 overflow-x-auto bg-[#ffffff]">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#1b1717] text-[#ffffff] text-[10px] uppercase tracking-widest">
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Member Since / Last Active</th>
                  <th className="py-3 px-4">Orders &amp; LTV</th>
                  <th className="py-3 px-4">Live Cart</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1b1717]/10">
                {loading ? (
                  Array.from({ length: 5 }).map((_, idx) => (
                    <tr key={idx}>
                      <td colSpan={6} className="py-4 px-4">
                        <div className="h-5 w-full bg-[#1b1717]/[0.06] animate-pulse" />
                      </td>
                    </tr>
                  ))
                ) : users.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-[#1b1717]/55">
                      No customers match your filters.
                    </td>
                  </tr>
                ) : (
                  users.map((u) => (
                    <tr key={u._id} className="hover:bg-[#1b1717]/[0.015]">
                      <td className="py-3 px-4">
                        <button
                          type="button"
                          onClick={() => openUserDetail(u._id)}
                          className="font-semibold text-left hover:text-[#5d100a] hover:underline cursor-pointer"
                        >
                          {u.fullName || "Unnamed Client"}
                        </button>
                        <div className="text-[11px] text-[#1b1717]/65">{u.email}</div>
                        {u.phone && <div className="text-[10px] text-[#1b1717]/50">{u.phone}</div>}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 text-[10px] uppercase tracking-widest font-semibold ${
                            u.isActive
                              ? "bg-[#1b1717]/10 text-[#1b1717]"
                              : "bg-[#5d100a] text-[#ffffff]"
                          }`}
                        >
                          {u.isActive ? "Active" : "Banned"}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-[11px] font-mono">
                        <div>Joined: {formatDate(u.createdAt)}</div>
                        <div className="text-[#1b1717]/55">Last: {formatDate(u.lastLoginAt)}</div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold">{formatINR(u.stats?.totalSpentInr || 0)}</div>
                        <div className="text-[10px] text-[#1b1717]/55">
                          {u.stats?.orderCount || 0} order(s)
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        {u.stats?.cartItemCount > 0 ? (
                          <>
                            <div className="font-medium text-[#5d100a]">
                              {u.stats.cartItemCount} item(s)
                            </div>
                            <div className="text-[10px] text-[#1b1717]/60">
                              {formatINR(u.stats.cartValueInr)}
                            </div>
                          </>
                        ) : (
                          <span className="text-[#1b1717]/40">Empty</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="inline-flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => openUserDetail(u._id)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 border border-[#1b1717]/25 hover:border-[#5d100a] hover:text-[#5d100a] text-[10px] uppercase tracking-widest cursor-pointer"
                          >
                            <Eye className="w-3 h-3" />
                            <span>View</span>
                          </button>
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => handleToggleBan(u)}
                            className="px-2.5 py-1.5 border border-[#5d100a]/40 text-[#5d100a] hover:bg-[#5d100a] hover:text-[#ffffff] text-[10px] uppercase tracking-widest cursor-pointer"
                          >
                            {u.isActive ? "Ban" : "Unban"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <UrlPagination
            page={page}
            totalPages={pagination.totalPages}
            totalItems={pagination.total}
            onPageChange={setPage}
          />
        </>
      )}
    </div>
  );
}