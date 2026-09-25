"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import DashboardShell, { Badge, Icon } from "@/components/DashboardShell";
import { useToast } from "@/components/ui/toast";
import { getInquiriesFromApi, updateInquiry } from "@/lib/inquiryApi";

const STATUS_LABELS = {
  need_contact: "Need to contact",
  contacted: "Contacted",
};

export default function InquiriesPage() {
  const { showToast } = useToast();
  const [inquiries, setInquiries] = useState([]);
  const [topics, setTopics] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [replyText, setReplyText] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [statusFilter, setStatusFilter] = useState("need_contact");
  const [topicFilter, setTopicFilter] = useState("");
  const [q, setQ] = useState("");

  const loadInquiries = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getInquiriesFromApi({
        status: statusFilter || undefined,
        topic: topicFilter || undefined,
        q: q || undefined,
      });
      setInquiries(data.inquiries);
      setTopics(data.topics || []);
      setSelectedId((current) => {
        if (current && data.inquiries.some((item) => item._id === current)) {
          return current;
        }
        return data.inquiries[0]?._id || "";
      });
      const selected =
        data.inquiries.find((item) => item._id === selectedId) ||
        data.inquiries[0];
      setReplyText(selected?.adminReply || "");
    } catch (error) {
      showToast({
        tone: "danger",
        title: error.message || "Failed to load inquiries.",
      });
    } finally {
      setLoading(false);
    }
  }, [q, selectedId, showToast, statusFilter, topicFilter]);

  useEffect(() => {
    loadInquiries();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selected = useMemo(
    () => inquiries.find((item) => item._id === selectedId) || inquiries[0] || null,
    [inquiries, selectedId]
  );

  const needContact = useMemo(
    () => inquiries.filter((item) => item.status === "need_contact"),
    [inquiries]
  );
  const contacted = useMemo(
    () => inquiries.filter((item) => item.status === "contacted"),
    [inquiries]
  );

  const selectInquiry = (id) => {
    const next = inquiries.find((item) => item._id === id);
    if (!next) return;
    setSelectedId(id);
    setReplyText(next.adminReply || "");
  };

  const saveUpdate = async (payload) => {
    if (!selected) return;
    setSaving(true);
    try {
      const updated = await updateInquiry(selected._id, payload);
      setInquiries((current) =>
        current.map((item) => (item._id === updated._id ? updated : item))
      );
      setReplyText(updated.adminReply || "");
      showToast({ tone: "success", title: "Inquiry updated." });
      if (statusFilter && updated.status !== statusFilter) {
        await loadInquiries();
      }
    } catch (error) {
      showToast({
        tone: "danger",
        title: error.message || "Failed to update inquiry.",
      });
    } finally {
      setSaving(false);
    }
  };

  const renderColumn = (title, items, tone) => (
    <section className="rounded-[24px] border border-neutral-200 bg-white shadow-lg shadow-main/5">
      <div className="flex items-center justify-between border-b border-neutral-100 px-5 py-4">
        <p className="text-sm font-black uppercase tracking-[0.35em] text-main/70">
          {title}
        </p>
        <Badge tone={tone}>{items.length}</Badge>
      </div>
      <div className="space-y-3 p-4">
        {loading ? (
          <p className="px-2 py-4 text-sm font-semibold text-slate-500">
            Loading...
          </p>
        ) : items.length ? (
          items.map((inquiry) => {
            const isActive = inquiry._id === selectedId;
            return (
              <button
                type="button"
                key={inquiry._id}
                onClick={() => selectInquiry(inquiry._id)}
                className={`w-full rounded-2xl border p-4 text-left transition ${
                  isActive
                    ? "border-main/30 bg-mainSoft shadow-inner"
                    : "border-neutral-200 bg-white hover:border-main/20 hover:bg-mainSoft/40"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-black text-main">{inquiry.name}</p>
                    <p className="mt-1 text-xs font-semibold text-slate-400">
                      {inquiry.topic} · {inquiry.pet}
                    </p>
                  </div>
                  <Badge tone={inquiry.status === "contacted" ? "green" : "yellow"}>
                    {STATUS_LABELS[inquiry.status]}
                  </Badge>
                </div>
                <p className="mt-3 line-clamp-2 text-sm font-semibold leading-6 text-slate-600">
                  {inquiry.message}
                </p>
              </button>
            );
          })
        ) : (
          <p className="px-2 py-4 text-sm font-semibold text-slate-500">
            No inquiries here.
          </p>
        )}
      </div>
    </section>
  );

  return (
    <DashboardShell activeItem="Inquiries">
      <div className="rounded-[24px] border border-neutral-200 bg-white px-5 py-5 shadow-lg shadow-main/5 md:px-6">
        <p className="text-sm font-black uppercase tracking-[0.35em] text-main/70">
          Customer Care
        </p>
        <h1 className="mt-2 text-2xl font-black tracking-tight text-main md:text-3xl">
          Inquiries
        </h1>
        <p className="mt-1.5 max-w-3xl text-sm font-semibold leading-6 text-slate-500">
          Messages from the contact form. Filter by topic, reply to the
          customer, and move items between Need to contact and Contacted.
        </p>
      </div>

      <form
        className="mt-5 grid gap-3 rounded-[24px] border border-neutral-200 bg-white p-4 shadow-lg shadow-main/5 md:grid-cols-[1fr_180px_180px_auto]"
        onSubmit={(event) => {
          event.preventDefault();
          loadInquiries();
        }}
      >
        <label>
          <span className="text-xs font-black uppercase tracking-[0.22em] text-main/75">
            Search
          </span>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Name, email, phone, or message"
            className="mt-1.5 h-11 w-full rounded-xl border border-neutral-200 px-4 text-sm font-semibold outline-none focus:border-main"
          />
        </label>
        <label>
          <span className="text-xs font-black uppercase tracking-[0.22em] text-main/75">
            Topic
          </span>
          <select
            value={topicFilter}
            onChange={(e) => setTopicFilter(e.target.value)}
            className="mt-1.5 h-11 w-full rounded-xl border border-neutral-200 px-3 text-sm font-semibold outline-none focus:border-main"
          >
            <option value="">All topics</option>
            {topics.map((topic) => (
              <option key={topic} value={topic}>
                {topic}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className="text-xs font-black uppercase tracking-[0.22em] text-main/75">
            Status view
          </span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="mt-1.5 h-11 w-full rounded-xl border border-neutral-200 px-3 text-sm font-semibold outline-none focus:border-main"
          >
            <option value="">Both columns</option>
            <option value="need_contact">Need to contact</option>
            <option value="contacted">Contacted</option>
          </select>
        </label>
        <button
          type="submit"
          className="mt-6 inline-flex h-11 items-center justify-center rounded-xl bg-main px-4 text-sm font-black text-white hover:bg-mainHover"
        >
          Apply
        </button>
      </form>

      <div className="mt-5 grid gap-5 xl:grid-cols-[0.9fr_0.9fr_1.1fr]">
        {(!statusFilter || statusFilter === "need_contact") &&
          renderColumn("Need to contact", needContact, "yellow")}
        {(!statusFilter || statusFilter === "contacted") &&
          renderColumn("Contacted", contacted, "green")}

        <section className="rounded-[24px] border border-neutral-200 bg-white p-5 shadow-lg shadow-main/5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.35em] text-main/70">
                Reply
              </p>
              <h2 className="mt-2 text-xl font-black text-main">Selected inquiry</h2>
            </div>
            <Icon name="chat" className="h-6 w-6 text-main/70" />
          </div>

          {selected ? (
            <>
              <div className="mt-5 space-y-2 rounded-2xl border border-neutral-200 bg-mainSoft/30 p-4 text-sm font-semibold text-slate-600">
                <p className="text-sm font-black text-main">{selected.name}</p>
                <p>{selected.email}</p>
                <p>{selected.phone}</p>
                <p>
                  {selected.topic} · Pet: {selected.pet}
                </p>
                <p className="pt-2 leading-6">{selected.message}</p>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {selected.status !== "need_contact" ? (
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => saveUpdate({ status: "need_contact" })}
                    className="inline-flex h-10 items-center rounded-xl bg-amber-500 px-3 text-xs font-black text-white hover:bg-amber-600 disabled:opacity-60"
                  >
                    Mark need to contact
                  </button>
                ) : null}
                {selected.status !== "contacted" ? (
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => saveUpdate({ status: "contacted" })}
                    className="inline-flex h-10 items-center rounded-xl bg-emerald-600 px-3 text-xs font-black text-white hover:bg-emerald-700 disabled:opacity-60"
                  >
                    Mark contacted
                  </button>
                ) : null}
              </div>

              <label className="mt-5 block">
                <span className="text-xs font-black uppercase tracking-[0.22em] text-main/75">
                  Reply to customer
                </span>
                <textarea
                  value={replyText}
                  onChange={(event) => setReplyText(event.target.value)}
                  rows={6}
                  className="mt-1.5 w-full rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-sm font-semibold leading-6 text-slate-700 outline-none transition placeholder:text-slate-300 focus:border-main"
                  placeholder="Write a reply the customer will see in their profile..."
                />
              </label>

              <div className="mt-4">
                <button
                  type="button"
                  disabled={saving}
                  onClick={() =>
                    saveUpdate({
                      adminReply: replyText.trim(),
                      status: "contacted",
                    })
                  }
                  className="inline-flex h-11 items-center gap-2 rounded-xl bg-main px-4 text-sm font-black text-white transition hover:bg-mainHover disabled:cursor-not-allowed disabled:opacity-70"
                >
                  <Icon name="send" className="h-4 w-4" />
                  {saving ? "Saving..." : "Send reply"}
                </button>
              </div>
            </>
          ) : (
            <p className="mt-5 text-sm font-semibold text-slate-500">
              Select an inquiry to reply.
            </p>
          )}
        </section>
      </div>
    </DashboardShell>
  );
}
