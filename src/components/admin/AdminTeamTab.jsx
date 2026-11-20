"use client";

import React, { useEffect, useState, useCallback } from "react";
import { UserPlus, Trash2, Power } from "lucide-react";
import { api, getApiErrorMessage } from "@/lib/api";

export default function AdminTeamTab() {
  const [admins, setAdmins] = useState([]);
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    notificationEmail: "",
    password: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const loadAdmins = useCallback(async () => {
    try {
      const { data } = await api.get("/admin/team");
      setAdmins(data.data?.admins || []);
    } catch {
      setAdmins([]);
    }
  }, []);

  useEffect(() => {
    loadAdmins();
  }, [loadAdmins]);

  const handleCreate = async (e) => {
    e.preventDefault();
    setErrorMsg("");
    setFeedback("");
    setSubmitting(true);
    try {
      const payload = {
        fullName: form.fullName.trim(),
        email: form.email.trim(),
        password: form.password,
        ...(form.notificationEmail.trim()
          ? { notificationEmail: form.notificationEmail.trim() }
          : {}),
      };
      const { data } = await api.post("/admin/team", payload);
      setFeedback(data.message || "Admin created.");
      setForm({ fullName: "", email: "", notificationEmail: "", password: "" });
      await loadAdmins();
    } catch (err) {
      setErrorMsg(getApiErrorMessage(err, "Could not create admin."));
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggle = async (id) => {
    await api.patch(`/admin/team/${id}/toggle`);
    await loadAdmins();
  };

  const handleDelete = async (id) => {
    await api.delete(`/admin/team/${id}`);
    await loadAdmins();
  };

  return (
    <div className="space-y-8">
      <div>
        <span className="text-[10px] uppercase tracking-[0.22em] text-[#5d100a] font-semibold">
          Super Admin Exclusive
        </span>
        <h1 className="heading-serif text-2xl sm:text-3xl font-normal mt-1">
          Add &amp; Manage Admins
        </h1>
      </div>

      <form
        onSubmit={handleCreate}
        className="border border-[#1b1717]/15 p-6 bg-[#ffffff] space-y-4 max-w-2xl"
      >
        <div className="flex items-center gap-2 text-xs uppercase tracking-widest font-semibold">
          <UserPlus className="w-4 h-4 text-[#5d100a]" />
          <span>Create New Admin Account</span>
        </div>

        {errorMsg && (
          <div className="p-3 bg-[#5d100a]/5 border border-[#5d100a]/25 text-xs text-[#5d100a]">
            {errorMsg}
          </div>
        )}
        {feedback && (
          <div className="p-3 bg-[#1b1717]/5 border border-[#1b1717]/20 text-xs">{feedback}</div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <input
            type="text"
            required
            placeholder="Full Name *"
            value={form.fullName}
            onChange={(e) => setForm({ ...form, fullName: e.target.value })}
            className="border border-[#1b1717]/25 px-3.5 py-2.5 text-xs outline-none focus:border-[#5d100a]"
          />
          <input
            type="email"
            required
            placeholder="Login Email * (e.g. ops@divara.com)"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className="border border-[#1b1717]/25 px-3.5 py-2.5 text-xs outline-none focus:border-[#5d100a]"
          />
          <input
            type="email"
            placeholder="OTP Email (optional — defaults to login email)"
            value={form.notificationEmail}
            onChange={(e) => setForm({ ...form, notificationEmail: e.target.value })}
            className="border border-[#1b1717]/25 px-3.5 py-2.5 text-xs outline-none focus:border-[#5d100a]"
          />
          <input
            type="password"
            required
            minLength={8}
            placeholder="Temporary Password * (min 8 chars)"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            className="border border-[#1b1717]/25 px-3.5 py-2.5 text-xs outline-none focus:border-[#5d100a]"
          />
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="px-6 py-2.5 bg-[#1b1717] text-[#ffffff] hover:bg-[#5d100a] text-xs uppercase tracking-widest font-semibold transition-colors cursor-pointer disabled:opacity-50"
        >
          {submitting ? "Creating..." : "Add Admin"}
        </button>
      </form>

      <div className="border border-[#1b1717]/15 overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-[#1b1717] text-[#ffffff] text-[10px] uppercase tracking-widest">
              <th className="py-3 px-4">Name</th>
              <th className="py-3 px-4">Login Email</th>
              <th className="py-3 px-4">Role / Verification</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1b1717]/10">
            {admins.map((adm) => (
              <tr key={adm._id}>
                <td className="py-3 px-4 font-medium">{adm.fullName}</td>
                <td className="py-3 px-4">
                  <div>{adm.email}</div>
                  {adm.notificationEmail && adm.notificationEmail !== adm.email && (
                    <div className="text-[10px] text-[#1b1717]/55">
                      OTP Inbox: {adm.notificationEmail}
                    </div>
                  )}
                </td>
                <td className="py-3 px-4 uppercase text-[10px] tracking-wider">
                  {adm.role === "super_admin" ? "Super Admin (TOTP)" : "Admin (Email OTP)"}
                </td>
                <td className="py-3 px-4">
                  <span className="text-[10px] uppercase font-semibold">
                    {adm.isActive ? "Active" : "Disabled"}
                  </span>
                </td>
                <td className="py-3 px-4 text-right">
                  {adm.role !== "super_admin" ? (
                    <div className="inline-flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleToggle(adm._id)}
                        title="Toggle Active Status"
                        className="p-1.5 border border-[#1b1717]/20 hover:border-[#5d100a] cursor-pointer"
                      >
                        <Power className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(adm._id)}
                        title="Delete Admin"
                        className="p-1.5 border border-[#1b1717]/20 hover:border-[#5d100a] text-[#5d100a] cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <span className="text-[10px] uppercase text-[#1b1717]/45">Protected</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}