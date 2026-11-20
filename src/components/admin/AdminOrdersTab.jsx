"use client";

import React, { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api";
import { formatINR } from "@/data/catalogData";

const STATUSES = [
  "PENDING_PAYMENT",
  "PAID",
  "PROCESSING",
  "SHIPPED",
  "DELIVERED",
  "CANCELLED",
  "CONCIERGE_REVIEW",
  "REFUNDED",
];

export default function AdminOrdersTab() {
  const [orders, setOrders] = useState([]);
  const [filter, setFilter] = useState("ALL");
  const [updatingId, setUpdatingId] = useState(null);

  const loadOrders = useCallback(async () => {
    const { data } = await api.get("/admin/orders", { params: { status: filter } });
    setOrders(data.data?.orders || []);
  }, [filter]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  const handleStatusChange = async (orderId, nextStatus) => {
    setUpdatingId(orderId);
    try {
      await api.patch(`/admin/orders/${orderId}/status`, { status: nextStatus });
      await loadOrders();
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <span className="text-[10px] uppercase tracking-[0.22em] text-[#5d100a] font-semibold">
            Fulfillment &amp; Dispatch
          </span>
          <h1 className="heading-serif text-2xl sm:text-3xl font-normal mt-1">
            Orders ({orders.length})
          </h1>
        </div>

        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="border border-[#1b1717]/25 px-3.5 py-2 text-xs uppercase bg-[#ffffff]"
        >
          <option value="ALL">All Orders</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      <div className="border border-[#1b1717]/15 overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-[#1b1717] text-[#ffffff] text-[10px] uppercase tracking-widest">
              <th className="py-3 px-4">Order #</th>
              <th className="py-3 px-4">Customer</th>
              <th className="py-3 px-4">Items</th>
              <th className="py-3 px-4">Total</th>
              <th className="py-3 px-4">Status (Triggers Customer Mail)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1b1717]/10">
            {orders.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-8 text-center text-[#1b1717]/55">
                  No orders found for this filter.
                </td>
              </tr>
            ) : (
              orders.map((ord) => (
                <tr key={ord._id}>
                  <td className="py-3 px-4">
                    <div className="font-semibold">{ord.orderNumber}</div>
                    <div className="text-[10px] text-[#1b1717]/55">
                      {new Date(ord.createdAt).toLocaleString("en-IN")}
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="font-medium">{ord.shippingAddress?.fullName}</div>
                    <div className="text-[11px] text-[#1b1717]/65">{ord.customerEmail}</div>
                    <div className="text-[10px] text-[#1b1717]/55">{ord.shippingAddress?.phone}</div>
                  </td>
                  <td className="py-3 px-4">
                    {(ord.items || []).map((i, idx) => (
                      <div key={idx} className="text-[11px]">
                        {i.title} ({i.size}) × {i.quantity}
                      </div>
                    ))}
                  </td>
                  <td className="py-3 px-4 font-semibold">
                    {formatINR(Math.round((ord.totalPaise || 0) / 100))}
                    {ord.couponCode && (
                      <div className="text-[10px] text-[#5d100a]">{ord.couponCode}</div>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    <select
                      disabled={updatingId === ord._id}
                      value={ord.status}
                      onChange={(e) => handleStatusChange(ord._id, e.target.value)}
                      className="border border-[#1b1717]/25 px-2.5 py-1.5 text-[11px] uppercase bg-[#ffffff]"
                    >
                      {STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}