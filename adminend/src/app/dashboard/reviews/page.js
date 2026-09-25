"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import DashboardShell, { Badge, Icon } from "@/components/DashboardShell";
import { useToast } from "@/components/ui/toast";
import {
  deleteReview,
  getReviewsFromApi,
  hideReview,
  normalizeReview,
  replyToReview,
} from "@/lib/reviewApi";

function stars(count) {
  return "★★★★★".slice(0, Math.max(0, Math.min(5, Number(count) || 0)));
}

export default function ReviewsPage() {
  const { showToast } = useToast();
  const [reviews, setReviews] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [replyText, setReplyText] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [statusFilter, setStatusFilter] = useState("");
  const [visibilityFilter, setVisibilityFilter] = useState("visible");
  const [q, setQ] = useState("");

  const loadReviews = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getReviewsFromApi({
        status: statusFilter || undefined,
        hidden:
          visibilityFilter === "hidden"
            ? true
            : visibilityFilter === "visible"
              ? false
              : undefined,
        q: q || undefined,
      });
      const nextReviews = data.map(normalizeReview);
      setReviews(nextReviews);
      setSelectedId((current) => {
        if (current && nextReviews.some((item) => item.id === current)) {
          return current;
        }
        return nextReviews[0]?.id || "";
      });
      const selected =
        nextReviews.find((item) => item.id === selectedId) || nextReviews[0];
      setReplyText(selected?.reply || "");
    } catch (error) {
      showToast({
        tone: "danger",
        title: error.message || "Failed to load reviews.",
      });
    } finally {
      setLoading(false);
    }
  }, [q, selectedId, showToast, statusFilter, visibilityFilter]);

  useEffect(() => {
    loadReviews();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectedReview = useMemo(
    () => reviews.find((item) => item.id === selectedId) || reviews[0] || null,
    [reviews, selectedId]
  );

  const selectReview = (id) => {
    const next = reviews.find((item) => item.id === id);
    if (!next) return;
    setSelectedId(id);
    setReplyText(next.reply);
  };

  const saveReply = async () => {
    if (!selectedReview) return;
    setSaving(true);
    try {
      const updated = await replyToReview(selectedReview.id, replyText.trim());
      const normalized = normalizeReview(updated);
      setReviews((current) =>
        current.map((item) => (item.id === normalized.id ? normalized : item))
      );
      setReplyText(normalized.reply);
      showToast({ tone: "success", title: "Reply saved." });
    } catch (error) {
      showToast({
        tone: "danger",
        title: error.message || "Failed to save reply.",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleHide = async (isHidden) => {
    if (!selectedReview) return;
    setSaving(true);
    try {
      const updated = await hideReview(selectedReview.id, isHidden);
      const normalized = normalizeReview(updated);
      setReviews((current) =>
        current.map((item) => (item.id === normalized.id ? normalized : item))
      );
      showToast({
        tone: "success",
        title: isHidden
          ? "Review hidden from storefront and averages."
          : "Review visible again.",
      });
      if (visibilityFilter !== "all") {
        await loadReviews();
      }
    } catch (error) {
      showToast({
        tone: "danger",
        title: error.message || "Failed to update visibility.",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedReview) return;
    if (!window.confirm("Delete this review permanently?")) return;
    setSaving(true);
    try {
      await deleteReview(selectedReview.id);
      showToast({ tone: "success", title: "Review deleted." });
      await loadReviews();
    } catch (error) {
      showToast({
        tone: "danger",
        title: error.message || "Failed to delete review.",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <DashboardShell activeItem="Reviews">
      <div className="rounded-[24px] border border-neutral-200 bg-white px-5 py-5 shadow-lg shadow-main/5 md:px-6">
        <p className="text-sm font-black uppercase tracking-[0.35em] text-main/70">
          Customer Voice
        </p>
        <h1 className="mt-2 text-2xl font-black tracking-tight text-main md:text-3xl">
          Reviews
        </h1>
        <p className="mt-1.5 max-w-3xl text-sm font-semibold leading-6 text-slate-500">
          Ratings go live immediately. Hide removes a review from the product
          page and from the average. Reply or delete as needed.
        </p>
      </div>

      <form
        className="mt-5 grid gap-3 rounded-[24px] border border-neutral-200 bg-white p-4 shadow-lg shadow-main/5 md:grid-cols-[1fr_160px_160px_auto]"
        onSubmit={(event) => {
          event.preventDefault();
          loadReviews();
        }}
      >
        <label>
          <span className="text-xs font-black uppercase tracking-[0.22em] text-main/75">
            Search
          </span>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Customer or review text"
            className="mt-1.5 h-11 w-full rounded-xl border border-neutral-200 px-4 text-sm font-semibold outline-none focus:border-main"
          />
        </label>
        <label>
          <span className="text-xs font-black uppercase tracking-[0.22em] text-main/75">
            Visibility
          </span>
          <select
            value={visibilityFilter}
            onChange={(e) => setVisibilityFilter(e.target.value)}
            className="mt-1.5 h-11 w-full rounded-xl border border-neutral-200 px-3 text-sm font-semibold outline-none focus:border-main"
          >
            <option value="visible">Visible</option>
            <option value="hidden">Hidden</option>
            <option value="all">All</option>
          </select>
        </label>
        <label>
          <span className="text-xs font-black uppercase tracking-[0.22em] text-main/75">
            Reply status
          </span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="mt-1.5 h-11 w-full rounded-xl border border-neutral-200 px-3 text-sm font-semibold outline-none focus:border-main"
          >
            <option value="">All</option>
            <option value="pending">Needs reply</option>
            <option value="replied">Replied</option>
          </select>
        </label>
        <button
          type="submit"
          className="mt-6 inline-flex h-11 items-center justify-center rounded-xl bg-main px-4 text-sm font-black text-white hover:bg-mainHover"
        >
          Apply
        </button>
      </form>

      <div className="mt-5 grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
        <section className="rounded-[24px] border border-neutral-200 bg-white shadow-lg shadow-main/5">
          <div className="border-b border-neutral-100 px-5 py-4">
            <p className="text-sm font-black uppercase tracking-[0.35em] text-main/70">
              Review list
            </p>
          </div>
          <div className="space-y-3 p-4">
            {loading ? (
              <p className="px-2 py-4 text-sm font-semibold text-slate-500">
                Loading reviews...
              </p>
            ) : reviews.length ? (
              reviews.map((review) => {
                const isActive = review.id === selectedId;
                return (
                  <button
                    type="button"
                    key={review.id}
                    onClick={() => selectReview(review.id)}
                    className={`w-full rounded-2xl border p-4 text-left transition ${
                      isActive
                        ? "border-main/30 bg-mainSoft shadow-inner"
                        : "border-neutral-200 bg-white hover:border-main/20 hover:bg-mainSoft/40"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-sm font-black text-main">
                          {review.customer}
                        </p>
                        <p className="mt-1 text-xs font-semibold text-slate-400">
                          {review.product}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <Badge tone={review.isHidden ? "gray" : "green"}>
                          {review.isHidden ? "Hidden" : "Public"}
                        </Badge>
                        <Badge tone={review.status === "replied" ? "blue" : "yellow"}>
                          {review.status === "replied" ? "Replied" : "No reply"}
                        </Badge>
                      </div>
                    </div>
                    <p className="mt-3 text-sm font-black text-amber-500">
                      {stars(review.rating)}
                    </p>
                    <p className="mt-3 line-clamp-2 text-sm font-semibold leading-6 text-slate-600">
                      {review.comment?.trim() || "Rating only"}
                    </p>
                  </button>
                );
              })
            ) : (
              <p className="px-2 py-4 text-sm font-semibold text-slate-500">
                No reviews match these filters.
              </p>
            )}
          </div>
        </section>

        <section className="rounded-[24px] border border-neutral-200 bg-white p-5 shadow-lg shadow-main/5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.35em] text-main/70">
                Manage
              </p>
              <h2 className="mt-2 text-xl font-black text-main">Selected review</h2>
            </div>
            <Icon name="star" className="h-6 w-6 text-main/70" />
          </div>

          {selectedReview ? (
            <>
              <div className="mt-5 rounded-2xl border border-neutral-200 bg-mainSoft/30 p-4">
                <p className="text-sm font-black text-main">
                  {selectedReview.customer}
                </p>
                <p className="mt-1 text-xs font-semibold text-slate-400">
                  {selectedReview.product}
                </p>
                <p className="mt-3 text-sm font-black text-amber-500">
                  {stars(selectedReview.rating)}
                </p>
                <p className="mt-3 text-sm font-semibold leading-6 text-slate-600">
                  {selectedReview.comment?.trim() || "Rating only"}
                </p>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {selectedReview.isHidden ? (
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => handleHide(false)}
                    className="inline-flex h-10 items-center rounded-xl bg-emerald-600 px-3 text-xs font-black text-white hover:bg-emerald-700 disabled:opacity-60"
                  >
                    Unhide
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => handleHide(true)}
                    className="inline-flex h-10 items-center rounded-xl bg-slate-700 px-3 text-xs font-black text-white hover:bg-slate-800 disabled:opacity-60"
                  >
                    Hide
                  </button>
                )}
                <button
                  type="button"
                  disabled={saving}
                  onClick={handleDelete}
                  className="inline-flex h-10 items-center rounded-xl border border-rose-200 bg-rose-50 px-3 text-xs font-black text-rose-700 hover:bg-rose-100 disabled:opacity-60"
                >
                  Delete
                </button>
              </div>

              <label className="mt-5 block">
                <span className="text-xs font-black uppercase tracking-[0.22em] text-main/75">
                  Reply text
                </span>
                <textarea
                  value={replyText}
                  onChange={(event) => setReplyText(event.target.value)}
                  rows={6}
                  className="mt-1.5 w-full rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-sm font-semibold leading-6 text-slate-700 outline-none transition placeholder:text-slate-300 focus:border-main"
                  placeholder="Write a short reply..."
                />
              </label>

              <div className="mt-4 flex items-center gap-2">
                <button
                  type="button"
                  onClick={saveReply}
                  disabled={saving}
                  className="inline-flex h-11 items-center gap-2 rounded-xl bg-main px-4 text-sm font-black text-white transition hover:bg-mainHover disabled:cursor-not-allowed disabled:opacity-70"
                >
                  <Icon name="send" className="h-4 w-4" />
                  {saving ? "Saving..." : "Save reply"}
                </button>
              </div>
            </>
          ) : (
            <p className="mt-5 text-sm font-semibold text-slate-500">
              Select a review to manage.
            </p>
          )}
        </section>
      </div>
    </DashboardShell>
  );
}
