"use client";

import React, { useEffect, useState, useCallback } from "react";
import { Send } from "lucide-react";
import { api, getApiErrorMessage } from "@/lib/api";

export default function AdminTicketsTab() {
  const [tickets, setTickets] = useState([]);
  const [replyDrafts, setReplyDrafts] = useState({});
  const [sendingId, setSendingId] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");

  const loadTickets = useCallback(async () => {
    const { data } = await api.get("/crm/admin/tickets");
    setTickets(data.data?.tickets || []);
  }, []);

  useEffect(() => {
    loadTickets();
  }, [loadTickets]);

  const handleReply = async (e, ticketId, parentReplyId = null) => {
    e.preventDefault();
    const message = (replyDrafts[ticketId] || "").trim();
    if (!message) return;
    setSendingId(ticketId);
    setErrorMsg("");
    try {
      await api.post(`/crm/admin/tickets/${ticketId}/reply`, {
        message,
        parentReplyId,
      });
      setReplyDrafts((prev) => ({ ...prev, [ticketId]: "" }));
      await loadTickets();
    } catch (err) {
      setErrorMsg(getApiErrorMessage(err, "Failed to send reply."));
    } finally {
      setSendingId(null);
    }
  };

  const handleStatusChange = async (ticketId, status) => {
    await api.patch(`/crm/admin/tickets/${ticketId}/status`, { status });
    await loadTickets();
  };

  return (
    <div className="space-y-6">
      <div>
        <span className="text-[10px] uppercase tracking-[0.22em] text-[#5d100a] font-semibold">
          Client Support Inbox
        </span>
        <h1 className="heading-serif text-2xl sm:text-3xl font-normal mt-1">
          Contact Inquiries ({tickets.length})
        </h1>
      </div>

      {errorMsg && (
        <div className="p-3 bg-[#5d100a]/5 border border-[#5d100a]/25 text-xs text-[#5d100a]">
          {errorMsg}
        </div>
      )}

      <div className="space-y-5">
        {tickets.map((t) => (
          <div key={t.id} className="border border-[#1b1717]/15 p-5 bg-[#ffffff] space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <span className="text-[10px] uppercase tracking-widest text-[#5d100a] font-semibold">
                  {t.ticketNumber} • {t.name} ({t.email})
                </span>
                <h2 className="heading-serif text-lg font-normal mt-0.5">{t.subject}</h2>
              </div>

              <select
                value={t.status}
                onChange={(e) => handleStatusChange(t.id, e.target.value)}
                className="border border-[#1b1717]/25 px-2.5 py-1 text-[11px] uppercase bg-[#ffffff]"
              >
                <option value="OPEN">OPEN</option>
                <option value="IN_PROGRESS">IN PROGRESS</option>
                <option value="RESOLVED">RESOLVED</option>
              </select>
            </div>

            <p className="text-xs sm:text-sm font-light text-[#1b1717]/85">{t.message}</p>

            {t.replies?.length > 0 && (
              <div className="space-y-2 border-t border-[#1b1717]/10 pt-3">
                {t.replies.map((r) => (
                  <div
                    key={r.id}
                    className={`p-3 text-xs border ${
                      r.authorRole === "admin"
                        ? "border-[#5d100a]/25 bg-[#5d100a]/[0.03]"
                        : "border-[#1b1717]/12 ml-4"
                    }`}
                  >
                    <div className="flex justify-between text-[10px] uppercase tracking-wider text-[#1b1717]/60 mb-1">
                      <span className="font-semibold text-[#1b1717]">
                        {r.authorName} ({r.authorRole})
                      </span>
                      <span>{new Date(r.createdAt).toLocaleString("en-IN")}</span>
                    </div>
                    <p>{r.message}</p>
                  </div>
                ))}
              </div>
            )}

            <form
              onSubmit={(e) => handleReply(e, t.id, t.replies?.[t.replies.length - 1]?.id || null)}
              className="flex flex-col sm:flex-row gap-2 pt-2"
            >
              <input
                type="text"
                required
                value={replyDrafts[t.id] || ""}
                onChange={(e) => setReplyDrafts((prev) => ({ ...prev, [t.id]: e.target.value }))}
                placeholder="Write a reply (posts to /contact & emails user via Resend)..."
                className="flex-1 border border-[#1b1717]/25 px-3 py-2 text-xs outline-none focus:border-[#5d100a]"
              />
              <button
                type="submit"
                disabled={sendingId === t.id}
                className="inline-flex items-center justify-center gap-1.5 px-5 py-2 bg-[#1b1717] text-[#ffffff] hover:bg-[#5d100a] text-[10px] uppercase tracking-widest font-semibold cursor-pointer disabled:opacity-50"
              >
                <Send className="w-3 h-3" />
                <span>{sendingId === t.id ? "Sending..." : "Reply & Email"}</span>
              </button>
            </form>
          </div>
        ))}
      </div>
    </div>
  );
}