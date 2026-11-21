"use client";

import React, { useEffect, useState, useCallback } from "react";
import {
  FileSpreadsheet,
  Search,
  Eye,
  ArrowLeft,
  Truck,
  RotateCcw,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Printer,
} from "lucide-react";
import { api, getApiErrorMessage } from "@/lib/api";
import { formatINR } from "@/data/catalogData";
import { downloadExcelWorkbook } from "@/lib/excelExport";
import { printOrderInvoice } from "@/lib/printInvoice";
import ResponsiveImage from "@/components/ui/ResponsiveImage";
import SmartDateRange from "./SmartDateRange";
import UrlPagination, { useUrlPageParam } from "./UrlPagination";

const STATUSES = [
  "PENDING_PAYMENT",
  "PAID",
  "PROCESSING",
  "SHIPPED",
  "DELIVERED",
  "RETURN_REQUESTED",
  "RETURN_APPROVED",
  "RETURN_REJECTED",
  "CANCELLED",
  "CONCIERGE_REVIEW",
  "REFUNDED",
];

function paiseToINR(paise) {
  return formatINR(Math.round((paise || 0) / 100));
}

function getGstSummary(ord) {
  const totalPaise = ord.totalPaise || 0;
  const subtotalPaise = ord.subtotalPaise || totalPaise;
  const discountPaise = ord.discountPaise || 0;
  const taxableBasePaise = ord.taxableBasePaise ?? Math.round(totalPaise / 1.12);
  const gstPaise = ord.gstPaise ?? Math.max(0, totalPaise - taxableBasePaise);
  const isIntraState =
    ord.taxType === "CGST_SGST" ||
    (!ord.taxType &&
      (ord.shippingAddress?.state || "").trim().toLowerCase() === "west bengal");
  const cgstPaise = ord.cgstPaise ?? (isIntraState ? Math.round(gstPaise / 2) : 0);
  const sgstPaise = ord.sgstPaise ?? (isIntraState ? gstPaise - cgstPaise : 0);
  const igstPaise = ord.igstPaise ?? (isIntraState ? 0 : gstPaise);

  return {
    totalPaise,
    subtotalPaise,
    discountPaise,
    taxableBasePaise,
    gstPaise,
    taxType: isIntraState ? "CGST_SGST" : "IGST",
    isIntraState,
    cgstPaise,
    sgstPaise,
    igstPaise,
    hsnCode: ord.hsnCode || "6204",
  };
}

export default function AdminOrdersTab() {
  const [page, setPage] = useUrlPageParam("page");
  const [orders, setOrders] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [status, setStatus] = useState("ALL");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [dateRange, setDateRange] = useState({ from: "", to: "" });
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);
  const [exporting, setExporting] = useState(false);

  const [selectedOrder, setSelectedOrder] = useState(null);
  const [courierName, setCourierName] = useState("");
  const [trackingNumber, setTrackingNumber] = useState("");
  const [adminNote, setAdminNote] = useState("");
  const [restockOnRefund, setRestockOnRefund] = useState(true);
  const [actionBusy, setActionBusy] = useState(false);
  const [notice, setNotice] = useState({ type: "", text: "" });

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search.trim());
    }, 350);
    return () => clearTimeout(t);
  }, [search]);

  const loadOrders = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/admin/orders", {
        params: {
          status,
          page,
          limit: 15,
          ...(dateRange.from ? { from: dateRange.from } : {}),
          ...(dateRange.to ? { to: dateRange.to } : {}),
          ...(debouncedSearch ? { q: debouncedSearch } : {}),
        },
      });
      const fetched = data.data?.orders || [];
      setOrders(fetched);
      if (data.data?.pagination) setPagination(data.data.pagination);

      setSelectedOrder((prev) => {
        if (!prev) return null;
        return fetched.find((o) => o._id === prev._id) || prev;
      });
    } catch (err) {
      setNotice({
        type: "error",
        text: getApiErrorMessage(err, "Failed to load orders."),
      });
    } finally {
      setLoading(false);
    }
  }, [status, page, dateRange, debouncedSearch]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  const openOrderDetail = (ord) => {
    setSelectedOrder(ord);
    setCourierName(ord.courierName || "");
    setTrackingNumber(ord.trackingNumber || "");
    setAdminNote(ord.returnRequest?.adminNote || "");
    setRestockOnRefund(!ord.stockRestored);
    setNotice({ type: "", text: "" });
  };

  const handleStatusChange = async (orderId, nextStatus) => {
    setUpdatingId(orderId);
    setNotice({ type: "", text: "" });
    try {
      const { data } = await api.patch(`/admin/orders/${orderId}/status`, {
        status: nextStatus,
      });
      if (selectedOrder && selectedOrder._id === orderId && data.data?.order) {
        setSelectedOrder(data.data.order);
      }
      setNotice({ type: "success", text: `Order status updated to ${nextStatus}.` });
      await loadOrders();
    } catch (err) {
      setNotice({
        type: "error",
        text: getApiErrorMessage(err, "Failed to update order status."),
      });
    } finally {
      setUpdatingId(null);
    }
  };

  const handleShipOrder = async (e) => {
    e.preventDefault();
    if (!selectedOrder) return;
    setActionBusy(true);
    setNotice({ type: "", text: "" });
    try {
      const { data } = await api.patch(`/admin/orders/${selectedOrder._id}/status`, {
        status: "SHIPPED",
        courierName: courierName.trim(),
        trackingNumber: trackingNumber.trim(),
      });
      if (data.data?.order) setSelectedOrder(data.data.order);
      setNotice({
        type: "success",
        text: "Order marked as SHIPPED and dispatch notification queued.",
      });
      await loadOrders();
    } catch (err) {
      setNotice({
        type: "error",
        text: getApiErrorMessage(err, "Failed to ship order."),
      });
    } finally {
      setActionBusy(false);
    }
  };

  const handleReturnDecision = async (decision) => {
    if (!selectedOrder) return;
    setActionBusy(true);
    setNotice({ type: "", text: "" });
    try {
      const { data } = await api.patch(`/admin/orders/${selectedOrder._id}/return`, {
        decision,
        adminNote: adminNote.trim(),
      });
      if (data.data?.order) setSelectedOrder(data.data.order);
      setNotice({
        type: "success",
        text: `Return request ${decision === "APPROVE" ? "approved" : "rejected"}.`,
      });
      await loadOrders();
    } catch (err) {
      setNotice({
        type: "error",
        text: getApiErrorMessage(err, "Failed to review return request."),
      });
    } finally {
      setActionBusy(false);
    }
  };

  const handleIssueRefund = async () => {
    if (!selectedOrder) return;
    if (
      !window.confirm(
        `Issue Razorpay refund for ${selectedOrder.orderNumber} (${paiseToINR(
          selectedOrder.totalPaise
        )})?`
      )
    ) {
      return;
    }
    setActionBusy(true);
    setNotice({ type: "", text: "" });
    try {
      const { data } = await api.post(`/admin/orders/${selectedOrder._id}/refund`, {
        restock: restockOnRefund,
        reason: adminNote.trim() || "Admin approved refund",
      });
      if (data.data?.order) setSelectedOrder(data.data.order);
      setNotice({
        type: "success",
        text: "Refund processed and inventory updated.",
      });
      await loadOrders();
    } catch (err) {
      setNotice({
        type: "error",
        text: getApiErrorMessage(err, "Failed to issue refund."),
      });
    } finally {
      setActionBusy(false);
    }
  };

  const handleExportExcel = async () => {
    setExporting(true);
    setNotice({ type: "", text: "" });
    try {
      const { data } = await api.get("/admin/orders", {
        params: {
          status,
          exportAll: "true",
          ...(dateRange.from ? { from: dateRange.from } : {}),
          ...(dateRange.to ? { to: dateRange.to } : {}),
          ...(debouncedSearch ? { q: debouncedSearch } : {}),
        },
      });
      const allFiltered = data.data?.orders || [];
      const suffix =
        dateRange.from || dateRange.to
          ? `_${dateRange.from || "start"}_to_${dateRange.to || "now"}`
          : "";

      downloadExcelWorkbook({
        filename: `DIVARA_Orders_${status}${suffix}_${new Date()
          .toISOString()
          .slice(0, 10)}.xls`,
        sheetName: "Orders_GST_Ledger",
        columns: [
          { label: "Order Number", key: "orderNumber" },
          { label: "Order Date (IST)", value: (r) => new Date(r.createdAt).toLocaleString("en-IN") },
          { label: "Status", key: "status" },
          { label: "Customer Name", value: (r) => r.shippingAddress?.fullName || "" },
          { label: "Email", key: "customerEmail" },
          { label: "Phone", value: (r) => r.shippingAddress?.phone || "" },
          { label: "Shipping State", value: (r) => r.shippingAddress?.state || "" },
          {
            label: "Shipping Address",
            value: (r) =>
              [
                r.shippingAddress?.line1,
                r.shippingAddress?.line2,
                r.shippingAddress?.city,
                r.shippingAddress?.state,
                r.shippingAddress?.postalCode,
                r.shippingAddress?.country,
              ]
                .filter(Boolean)
                .join(", "),
          },
          {
            label: "Items",
            value: (r) =>
              (r.items || []).map((i) => `${i.title} (${i.size}) x${i.quantity}`).join(" | "),
          },
          { label: "HSN Code", value: (r) => getGstSummary(r).hsnCode },
          { label: "MRP Subtotal (INR)", value: (r) => Math.round(getGstSummary(r).subtotalPaise / 100) },
          { label: "Coupon Code", value: (r) => r.couponCode || "" },
          { label: "Discount (INR)", value: (r) => Math.round(getGstSummary(r).discountPaise / 100) },
          { label: "Taxable Value (INR)", value: (r) => Math.round(getGstSummary(r).taxableBasePaise / 100) },
          { label: "GST Type", value: (r) => getGstSummary(r).taxType },
          { label: "CGST 6% (INR)", value: (r) => Math.round(getGstSummary(r).cgstPaise / 100) },
          { label: "SGST 6% (INR)", value: (r) => Math.round(getGstSummary(r).sgstPaise / 100) },
          { label: "IGST 12% (INR)", value: (r) => Math.round(getGstSummary(r).igstPaise / 100) },
          { label: "Total GST (INR)", value: (r) => Math.round(getGstSummary(r).gstPaise / 100) },
          { label: "Total Paid (INR)", value: (r) => Math.round(getGstSummary(r).totalPaise / 100) },
          { label: "Courier", value: (r) => r.courierName || "" },
          { label: "Tracking / AWB", value: (r) => r.trackingNumber || "" },
          { label: "Razorpay Payment ID", value: (r) => r.razorpayPaymentId || "" },
          { label: "Refund ID", value: (r) => r.refund?.razorpayRefundId || "" },
          { label: "Stock Restored", value: (r) => (r.stockRestored ? "Yes" : "No") },
          { label: "UTM Source", value: (r) => r.attribution?.utmSource || "direct" },
          { label: "Referral Partner", value: (r) => r.attribution?.referralPerson || "" },
        ],
        rows: allFiltered,
      });
    } catch (err) {
      setNotice({
        type: "error",
        text: getApiErrorMessage(err, "Failed to export orders."),
      });
    } finally {
      setExporting(false);
    }
  };

  // ORDER DETAILS VIEW
  if (selectedOrder) {
    const gst = getGstSummary(selectedOrder);
    const canRefund =
      Boolean(selectedOrder.razorpayPaymentId || selectedOrder.paidAt) &&
      selectedOrder.status !== "REFUNDED" &&
      ["RETURN_APPROVED", "CANCELLED", "PAID", "PROCESSING"].includes(selectedOrder.status);

    return (
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#1b1717]/15 pb-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setSelectedOrder(null)}
              className="inline-flex items-center gap-1.5 px-3 py-2 border border-[#1b1717]/25 text-xs uppercase tracking-widest hover:border-[#1b1717] cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>All Orders</span>
            </button>
            <div>
              <span className="text-[10px] uppercase tracking-[0.2em] text-[#5d100a] font-semibold">
                Order Details &amp; Fulfillment
              </span>
              <h2 className="heading-serif text-2xl font-normal">
                {selectedOrder.orderNumber}
              </h2>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() => printOrderInvoice(selectedOrder, { viewer: "admin" })}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 border border-[#1b1717] text-[#1b1717] hover:bg-[#1b1717] hover:text-[#ffffff] text-xs uppercase tracking-widest font-semibold transition-colors cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Invoice</span>
            </button>

            <span className="text-[10px] uppercase tracking-widest text-[#1b1717]/60 ml-1">
              Manual Status:
            </span>
            <select
              disabled={updatingId === selectedOrder._id || selectedOrder.status === "REFUNDED"}
              value={selectedOrder.status}
              onChange={(e) => handleStatusChange(selectedOrder._id, e.target.value)}
              className="border border-[#1b1717]/30 px-3 py-2 text-xs uppercase bg-[#ffffff] font-semibold disabled:opacity-50"
            >
              {STATUSES.map((s) => (
                <option key={s} value={s} disabled={s === "REFUNDED" && selectedOrder.status !== "REFUNDED"}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        </div>

        {notice.text && (
          <div
            className={`p-3.5 text-xs border ${
              notice.type === "error"
                ? "border-[#5d100a]/40 bg-[#5d100a]/5 text-[#5d100a]"
                : "border-[#1b1717]/25 bg-[#1b1717]/[0.03] text-[#1b1717]"
            }`}
          >
            {notice.text}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 space-y-6">
            <div className="border border-[#1b1717]/15 bg-[#ffffff] p-5 space-y-4">
              <h3 className="text-xs uppercase tracking-[0.2em] font-semibold text-[#5d100a]">
                Ordered Items ({selectedOrder.items?.length || 0})
              </h3>
              <div className="divide-y divide-[#1b1717]/10">
                {(selectedOrder.items || []).map((item, idx) => (
                  <div key={idx} className="py-3 first:pt-0 last:pb-0 flex items-center gap-4">
                    <div className="w-12 h-16 shrink-0 bg-[#1b1717]/5 overflow-hidden">
                      <ResponsiveImage
                        src={item.image}
                        alt={item.title}
                        preset="thumb"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="heading-serif text-sm text-[#1b1717] line-clamp-1">
                        {item.title}
                      </p>
                      <p className="text-[11px] text-[#1b1717]/60">
                        SKU: <span className="font-mono">{item.sku}</span> • Size: {item.size} • Qty: {item.quantity}
                      </p>
                    </div>
                    <div className="text-right text-xs">
                      <p className="font-semibold">
                        {formatINR((item.unitPrice || 0) * (item.quantity || 1))}
                      </p>
                      <p className="text-[10px] text-[#1b1717]/55">
                        {formatINR(item.unitPrice || 0)} each
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <form
              onSubmit={handleShipOrder}
              className="border border-[#1b1717]/15 bg-[#ffffff] p-5 space-y-4"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Truck className="w-4 h-4 text-[#5d100a]" />
                  <h3 className="text-xs uppercase tracking-[0.2em] font-semibold">
                    Logistics Dispatch (Ship Order)
                  </h3>
                </div>
                {selectedOrder.shippedAt && (
                  <span className="text-[10px] text-[#1b1717]/60">
                    Shipped {new Date(selectedOrder.shippedAt).toLocaleDateString("en-IN")}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] uppercase tracking-widest text-[#1b1717]/60 mb-1">
                    Courier Partner *
                  </label>
                  <input
                    type="text"
                    required
                    value={courierName}
                    onChange={(e) => setCourierName(e.target.value)}
                    placeholder="BlueDart, Delhivery, DTDC..."
                    className="w-full border border-[#1b1717]/25 px-3 py-2 text-xs outline-none focus:border-[#5d100a]"
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase tracking-widest text-[#1b1717]/60 mb-1">
                    Tracking / AWB Number *
                  </label>
                  <input
                    type="text"
                    required
                    value={trackingNumber}
                    onChange={(e) => setTrackingNumber(e.target.value)}
                    placeholder="AWB123456789"
                    className="w-full border border-[#1b1717]/25 px-3 py-2 text-xs font-mono outline-none focus:border-[#5d100a]"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={actionBusy}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#1b1717] text-[#ffffff] hover:bg-[#5d100a] text-xs uppercase tracking-widest transition-colors cursor-pointer disabled:opacity-50"
              >
                <Truck className="w-3.5 h-3.5" />
                <span>
                  {actionBusy
                    ? "Dispatching..."
                    : selectedOrder.status === "SHIPPED"
                    ? "Update Tracking Details"
                    : "Ship Order"}
                </span>
              </button>
            </form>

            {(selectedOrder.status === "RETURN_REQUESTED" ||
              selectedOrder.returnRequest?.reason ||
              canRefund ||
              selectedOrder.status === "REFUNDED") && (
              <div className="border border-[#1b1717]/15 bg-[#ffffff] p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <RotateCcw className="w-4 h-4 text-[#5d100a]" />
                    <h3 className="text-xs uppercase tracking-[0.2em] font-semibold">
                      Returns, Refunds &amp; Restocking
                    </h3>
                  </div>
                  {selectedOrder.stockRestored && (
                    <span className="px-2 py-0.5 text-[10px] uppercase tracking-wider bg-[#1b1717] text-[#ffffff]">
                      Stock Restored
                    </span>
                  )}
                </div>

                {selectedOrder.returnRequest?.reason && (
                  <div className="p-3 bg-[#1b1717]/[0.03] border border-[#1b1717]/10 text-xs">
                    <span className="text-[10px] uppercase tracking-widest text-[#1b1717]/60 block mb-1">
                      Customer Return Reason
                    </span>
                    <p>{selectedOrder.returnRequest.reason}</p>
                  </div>
                )}

                <div>
                  <label className="block text-[10px] uppercase tracking-widest text-[#1b1717]/60 mb-1">
                    Admin Note (Internal / Customer Email)
                  </label>
                  <input
                    type="text"
                    value={adminNote}
                    onChange={(e) => setAdminNote(e.target.value)}
                    placeholder="Inspection note or refund reference..."
                    className="w-full border border-[#1b1717]/25 px-3 py-2 text-xs outline-none focus:border-[#5d100a]"
                  />
                </div>

                {selectedOrder.status === "RETURN_REQUESTED" && (
                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      disabled={actionBusy}
                      onClick={() => handleReturnDecision("APPROVE")}
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#1b1717] text-[#ffffff] hover:bg-[#5d100a] text-xs uppercase tracking-widest cursor-pointer disabled:opacity-50"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Approve Return</span>
                    </button>
                    <button
                      type="button"
                      disabled={actionBusy}
                      onClick={() => handleReturnDecision("REJECT")}
                      className="inline-flex items-center gap-1.5 px-4 py-2 border border-[#5d100a] text-[#5d100a] hover:bg-[#5d100a] hover:text-[#ffffff] text-xs uppercase tracking-widest cursor-pointer disabled:opacity-50"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      <span>Reject Return</span>
                    </button>
                  </div>
                )}

                {canRefund && (
                  <div className="pt-3 border-t border-[#1b1717]/10 space-y-3">
                    <label className="inline-flex items-center gap-2 text-xs cursor-pointer">
                      <input
                        type="checkbox"
                        checked={restockOnRefund}
                        disabled={selectedOrder.stockRestored}
                        onChange={(e) => setRestockOnRefund(e.target.checked)}
                        className="accent-[#5d100a]"
                      />
                      <span>
                        Restock returned/cancelled quantities back to inventory
                        {selectedOrder.stockRestored ? " (already restocked)" : ""}
                      </span>
                    </label>

                    <div>
                      <button
                        type="button"
                        disabled={actionBusy}
                        onClick={handleIssueRefund}
                        className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#5d100a] text-[#ffffff] hover:bg-[#1b1717] text-xs uppercase tracking-widest cursor-pointer disabled:opacity-50"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>
                          {actionBusy
                            ? "Processing Refund..."
                            : `Issue Razorpay Refund (${paiseToINR(selectedOrder.totalPaise)})`}
                        </span>
                      </button>
                    </div>
                  </div>
                )}

                {selectedOrder.refund?.razorpayRefundId && (
                  <p className="text-[11px] font-mono text-[#1b1717]/70">
                    Razorpay Refund ID: {selectedOrder.refund.razorpayRefundId}
                  </p>
                )}
              </div>
            )}
          </div>

          <div className="lg:col-span-5 space-y-6">
            <div className="border border-[#1b1717]/15 bg-[#ffffff] p-5 space-y-3 text-xs">
              <div className="flex items-center justify-between border-b border-[#1b1717]/10 pb-2.5">
                <h3 className="text-[10px] uppercase tracking-[0.2em] text-[#5d100a] font-semibold">
                  CA GST &amp; Price Breakdown
                </h3>
                <span className="font-mono text-[10px] text-[#1b1717]/60">
                  HSN {gst.hsnCode} • {gst.taxType}
                </span>
              </div>

              <div className="flex justify-between text-[#1b1717]/75">
                <span>MRP Subtotal (Incl. 12% GST)</span>
                <span>{paiseToINR(gst.subtotalPaise)}</span>
              </div>

              {gst.discountPaise > 0 && (
                <div className="flex justify-between text-[#5d100a]">
                  <span>
                    Discount {selectedOrder.couponCode ? `(${selectedOrder.couponCode})` : ""}
                  </span>
                  <span>−{paiseToINR(gst.discountPaise)}</span>
                </div>
              )}

              <div className="flex justify-between pt-2 border-t border-dashed border-[#1b1717]/15">
                <span>Taxable Value (Excl. GST)</span>
                <span className="font-medium">{paiseToINR(gst.taxableBasePaise)}</span>
              </div>

              {gst.isIntraState ? (
                <>
                  <div className="flex justify-between text-[#1b1717]/70">
                    <span>CGST (6% — West Bengal)</span>
                    <span>{paiseToINR(gst.cgstPaise)}</span>
                  </div>
                  <div className="flex justify-between text-[#1b1717]/70">
                    <span>SGST (6% — West Bengal)</span>
                    <span>{paiseToINR(gst.sgstPaise)}</span>
                  </div>
                </>
              ) : (
                <div className="flex justify-between text-[#1b1717]/70">
                  <span>IGST (12% — Interstate)</span>
                  <span>{paiseToINR(gst.igstPaise)}</span>
                </div>
              )}

              <div className="flex justify-between text-[#1b1717]/75">
                <span>Total GST Collected</span>
                <span>{paiseToINR(gst.gstPaise)}</span>
              </div>

              <div className="flex justify-between text-[#1b1717]/75">
                <span>Insured Shipping</span>
                <span>Complimentary</span>
              </div>

              <div className="flex justify-between text-sm font-semibold pt-2.5 border-t border-[#1b1717]/15">
                <span>Final Total</span>
                <span>{paiseToINR(gst.totalPaise)}</span>
              </div>
            </div>

            <div className="border border-[#1b1717]/15 bg-[#ffffff] p-5 space-y-2 text-xs">
              <h3 className="text-[10px] uppercase tracking-[0.2em] text-[#5d100a] font-semibold mb-2">
                Customer &amp; Shipping Address
              </h3>
              <p className="font-semibold text-sm">{selectedOrder.shippingAddress?.fullName}</p>
              <p className="text-[#1b1717]/75">{selectedOrder.customerEmail}</p>
              <p className="text-[#1b1717]/75">{selectedOrder.shippingAddress?.phone}</p>
              <p className="pt-2 text-[#1b1717]/80 leading-relaxed">
                {[
                  selectedOrder.shippingAddress?.line1,
                  selectedOrder.shippingAddress?.line2,
                  selectedOrder.shippingAddress?.city,
                  selectedOrder.shippingAddress?.state,
                  selectedOrder.shippingAddress?.postalCode,
                  selectedOrder.shippingAddress?.country,
                ]
                  .filter(Boolean)
                  .join(", ")}
              </p>
            </div>

            <div className="border border-[#1b1717]/15 bg-[#ffffff] p-5 space-y-2 text-xs">
              <h3 className="text-[10px] uppercase tracking-[0.2em] text-[#5d100a] font-semibold mb-2">
                Payment &amp; Attribution
              </h3>
              <p>
                <span className="text-[#1b1717]/55">Razorpay Order:</span>{" "}
                <span className="font-mono">{selectedOrder.razorpayOrderId || "—"}</span>
              </p>
              <p>
                <span className="text-[#1b1717]/55">Razorpay Payment:</span>{" "}
                <span className="font-mono">{selectedOrder.razorpayPaymentId || "—"}</span>
              </p>
              <p>
                <span className="text-[#1b1717]/55">UTM Source:</span>{" "}
                <span className="uppercase">{selectedOrder.attribution?.utmSource || "direct"}</span>
              </p>
              {selectedOrder.attribution?.referralPerson && (
                <p>
                  <span className="text-[#1b1717]/55">Referral:</span>{" "}
                  <span className="font-semibold text-[#5d100a]">
                    {selectedOrder.attribution.referralPerson}
                  </span>
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ORDERS LIST VIEW
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <span className="text-[10px] uppercase tracking-[0.22em] text-[#5d100a] font-semibold">
            Fulfillment &amp; Dispatch
          </span>
          <h1 className="heading-serif text-2xl sm:text-3xl font-normal mt-1">
            Orders ({pagination.total})
          </h1>
        </div>

        <button
          type="button"
          disabled={exporting}
          onClick={handleExportExcel}
          className="inline-flex items-center gap-2 px-4 py-2.5 border border-[#1b1717] text-[#1b1717] hover:bg-[#1b1717] hover:text-[#ffffff] text-xs uppercase tracking-widest font-semibold transition-colors cursor-pointer disabled:opacity-50"
        >
          <FileSpreadsheet className="w-3.5 h-3.5" />
          <span>{exporting ? "Exporting..." : "Export CA GST Excel"}</span>
        </button>
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

      <SmartDateRange
        from={dateRange.from}
        to={dateRange.to}
        allowAllTime
        onChange={(next) => {
          setDateRange(next);
          setPage(1);
        }}
      />

      <div className="flex flex-wrap items-end gap-3">
        <div className="flex-1 min-w-[220px]">
          <label className="block text-[9px] uppercase tracking-[0.18em] text-[#1b1717]/60 font-semibold mb-1">
            Search Orders
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
              placeholder="Order #, customer name, email, phone, coupon..."
              className="w-full pl-8 pr-3 py-2 text-xs border border-[#1b1717]/25 outline-none focus:border-[#5d100a]"
            />
          </div>
        </div>

        <div>
          <label className="block text-[9px] uppercase tracking-[0.18em] text-[#1b1717]/60 font-semibold mb-1">
            Order Status
          </label>
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
            className="border border-[#1b1717]/25 px-3.5 py-2 text-xs uppercase bg-[#ffffff]"
          >
            <option value="ALL">All Statuses</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="border border-[#1b1717]/15 overflow-x-auto bg-[#ffffff]">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-[#1b1717] text-[#ffffff] text-[10px] uppercase tracking-widest">
              <th className="py-3 px-4">Order #</th>
              <th className="py-3 px-4">Customer</th>
              <th className="py-3 px-4">Items</th>
              <th className="py-3 px-4">Total (Incl. GST)</th>
              <th className="py-3 px-4">Status</th>
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
            ) : orders.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-[#1b1717]/55">
                  No orders found for the selected filters.
                </td>
              </tr>
            ) : (
              orders.map((ord) => (
                <tr key={ord._id} className="hover:bg-[#1b1717]/[0.015]">
                  <td className="py-3 px-4">
                    <button
                      type="button"
                      onClick={() => openOrderDetail(ord)}
                      className="font-semibold text-left hover:text-[#5d100a] underline-offset-2 hover:underline cursor-pointer"
                    >
                      {ord.orderNumber}
                    </button>
                    <div className="text-[10px] text-[#1b1717]/55">
                      {new Date(ord.createdAt).toLocaleString("en-IN")}
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="font-medium">{ord.shippingAddress?.fullName}</div>
                    <div className="text-[11px] text-[#1b1717]/65">{ord.customerEmail}</div>
                    <div className="text-[10px] text-[#1b1717]/55">
                      {ord.shippingAddress?.state || ""}
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    {(ord.items || []).map((i, idx) => (
                      <div key={idx} className="text-[11px]">
                        {i.title} ({i.size}) × {i.quantity}
                      </div>
                    ))}
                  </td>
                  <td className="py-3 px-4 font-semibold">
                    {paiseToINR(ord.totalPaise)}
                    {ord.couponCode && (
                      <div className="text-[10px] text-[#5d100a]">{ord.couponCode}</div>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    <select
                      disabled={updatingId === ord._id || ord.status === "REFUNDED"}
                      value={ord.status}
                      onChange={(e) => handleStatusChange(ord._id, e.target.value)}
                      className="border border-[#1b1717]/25 px-2.5 py-1.5 text-[11px] uppercase bg-[#ffffff] disabled:opacity-50"
                    >
                      {STATUSES.map((s) => (
                        <option key={s} value={s} disabled={s === "REFUNDED" && ord.status !== "REFUNDED"}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="inline-flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => printOrderInvoice(ord, { viewer: "admin" })}
                        title="Print Tax Invoice"
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 border border-[#1b1717]/25 hover:border-[#1b1717] hover:bg-[#1b1717] hover:text-[#ffffff] text-[10px] uppercase tracking-widest transition-colors cursor-pointer"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        <span className="hidden xl:inline">Invoice</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => openOrderDetail(ord)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-[#1b1717]/25 hover:border-[#5d100a] hover:text-[#5d100a] text-[10px] uppercase tracking-widest transition-colors cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Open</span>
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
    </div>
  );
}