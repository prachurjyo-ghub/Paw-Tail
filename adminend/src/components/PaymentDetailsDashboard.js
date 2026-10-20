"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import DashboardShell, { Badge, Icon } from "@/components/DashboardShell";
import { useToast } from "@/components/ui/toast";
import {
  getOrdersFromApi,
  updateOrderPaymentStatusOnApi,
} from "@/lib/orderApi";

function parseTk(value) {
  return Number(String(value || "").replace(/[^\d.-]/g, "")) || 0;
}

function formatCount(value) {
  return String(value).padStart(2, "0");
}

function formatTk(amount) {
  const value = Number(amount) || 0;
  return `Tk ${value.toLocaleString("en-US")}`;
}

function getPaymentCards(payments) {
  const paid = payments.filter((order) => order.billStatus === "Paid");
  const unpaid = payments.filter((order) => order.billStatus !== "Paid");
  const paidTotal = paid.reduce((sum, order) => sum + parseTk(order.total), 0);
  const unpaidTotal = unpaid.reduce((sum, order) => sum + parseTk(order.total), 0);

  return [
    {
      title: "Total Paid",
      value: formatTk(paidTotal),
      helper: "Money already received from customers.",
      tone: "paid",
    },
    {
      title: "Total Unpaid",
      value: formatTk(unpaidTotal),
      helper: "Money not received yet.",
      tone: "due",
    },
    {
      title: "Paid Orders",
      value: formatCount(paid.length),
      helper: "Orders with cleared payment.",
      tone: "paid",
    },
    {
      title: "Unpaid Orders",
      value: formatCount(unpaid.length),
      helper: "Orders still waiting for payment.",
      tone: "due",
    },
  ];
}

function statusTone(status) {
  if (status === "Delivered") return "green";
  if (status === "Cancelled") return "gray";
  if (status === "Pending") return "yellow";
  return "blue";
}

export default function PaymentDetailsDashboard() {
  const { showToast } = useToast();
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState("");
  const [paymentMethodFilter, setPaymentMethodFilter] = useState("All");
  const [paymentStatusFilter, setPaymentStatusFilter] = useState("All");
  const [updatingId, setUpdatingId] = useState("");

  useEffect(() => {
    async function loadPayments() {
      setLoading(true);
      try {
        const rows = await getOrdersFromApi();
        setPayments(rows);
      } catch (error) {
        showToast({
          tone: "danger",
          title: "Failed to load payment details.",
          description: error.message || "Please check backend server.",
        });
      } finally {
        setLoading(false);
      }
    }

    loadPayments();
  }, [showToast]);

  const filteredPayments = useMemo(() => {
    const query = searchText.trim().toLowerCase();
    return payments.filter((payment) => {
      const matchesSearch = !query || [
        payment.id,
        payment.customer,
        payment.phone,
        payment.payment,
        payment.billStatus,
        payment.orderStatus,
        payment.promoCode,
      ]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(query));
      const matchesMethod =
        paymentMethodFilter === "All" || payment.payment === paymentMethodFilter;
      const matchesStatus =
        paymentStatusFilter === "All" || payment.billStatus === paymentStatusFilter;
      return matchesSearch && matchesMethod && matchesStatus;
    });
  }, [payments, searchText, paymentMethodFilter, paymentStatusFilter]);

  const cards = useMemo(() => getPaymentCards(payments), [payments]);

  async function handleMarkPaid(payment) {
    setUpdatingId(payment.mongoId);
    try {
      const updated = await updateOrderPaymentStatusOnApi(payment.mongoId, "Paid");
      setPayments((current) =>
        current.map((row) => (row.mongoId === payment.mongoId ? updated : row))
      );
      showToast({
        tone: "success",
        title: `Order ${payment.id} marked as paid.`,
      });
    } catch (error) {
      showToast({
        tone: "danger",
        title: error.message || "Failed to update payment.",
      });
    } finally {
      setUpdatingId("");
    }
  }

  return (
    <DashboardShell activeItem="Payments">
      <div className="rounded-[28px] border border-neutral-200 bg-white px-6 py-7 shadow-lg shadow-main/5 md:px-8">
        <p className="text-sm font-black uppercase tracking-[0.35em] text-main/70">
          Payments
        </p>
        <h1 className="mt-3 text-3xl font-black tracking-tight text-main md:text-4xl">
          Payments
        </h1>
        <p className="mt-4 max-w-4xl text-sm font-semibold leading-7 text-slate-400 md:text-base">
          Track paid and unpaid orders before shipping. Promo discounts are
          included in the total due for each order.
        </p>

      </div>

      <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <article
            key={card.title}
            className="payment-metric-card relative min-h-40 overflow-hidden rounded-[24px] border border-neutral-200 bg-white p-6"
          >
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-extrabold text-slate-500">{card.title}</p>
              <span className={`payment-metric-dot payment-metric-dot--${card.tone}`} />
            </div>
            <p className="mt-5 text-3xl font-black tracking-tight text-slate-950">
              {card.value}
            </p>
            <p className="mt-4 text-sm font-semibold leading-6 text-slate-400">
              {card.helper}
            </p>
          </article>
        ))}
      </div>

      {loading ? (
        <div className="mt-8 rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm font-semibold text-slate-500">
          Loading payment details...
        </div>
      ) : null}

      <div className="mt-8 overflow-hidden rounded-[28px] border border-neutral-200 bg-white shadow-lg shadow-main/5">
        <div className="data-command-bar border-b px-5 py-4 lg:flex lg:items-center lg:justify-between lg:gap-5">
          <div className="mb-3 lg:mb-0">
            <div className="flex items-center gap-2.5">
              <h2 className="text-base font-black text-slate-900">Payment records</h2>
              <span className="data-count-pill">{filteredPayments.length}</span>
            </div>
            <p className="mt-1 text-xs font-semibold text-slate-400">Review balances and clear outstanding payments.</p>
          </div>
          <div className="grid gap-2 sm:grid-cols-[minmax(220px,1fr)_150px_150px] lg:w-[650px]">
            <label className="data-search-field flex h-10 items-center rounded-xl border px-3">
              <Icon name="search" className="h-4 w-4 shrink-0" />
              <input
                type="search"
                aria-label="Search payment details"
                placeholder="Search order, customer or phone"
                value={searchText}
                onChange={(event) => setSearchText(event.target.value)}
                className="ml-2 min-w-0 flex-1 border-0 bg-transparent p-0 text-xs font-semibold shadow-none outline-none"
              />
            </label>
            <select value={paymentMethodFilter} onChange={(event) => setPaymentMethodFilter(event.target.value)} className="h-10 rounded-xl border border-neutral-200 bg-white px-3 text-xs font-bold outline-none">
              <option value="All">All methods</option>
              {[...new Set(payments.map((payment) => payment.payment).filter(Boolean))].map((method) => <option key={method} value={method}>{method}</option>)}
            </select>
            <select value={paymentStatusFilter} onChange={(event) => setPaymentStatusFilter(event.target.value)} className="h-10 rounded-xl border border-neutral-200 bg-white px-3 text-xs font-bold outline-none">
              <option value="All">All payments</option>
              <option value="Paid">Paid</option>
              <option value="Due">Unpaid</option>
            </select>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="data-table payment-ledger-table w-full min-w-[920px] table-fixed border-collapse text-left">
            <colgroup>
              <col className="w-[25%]" />
              <col className="w-[13%]" />
              <col className="w-[19%]" />
              <col className="w-[12%]" />
              <col className="w-[17%]" />
              <col className="w-[14%]" />
            </colgroup>
            <thead>
              <tr>
                <th className="px-6 py-4">Order & customer</th>
                <th className="px-5 py-4">Method</th>
                <th className="px-5 py-4">Amount breakdown</th>
                <th className="px-5 py-4 text-right">Total</th>
                <th className="px-5 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredPayments.map((payment) => (
                <tr key={payment.mongoId}>
                  <td className="px-6 py-3.5">
                    <p className="text-sm font-black text-main">{payment.id}</p>
                    <p className="mt-1.5 text-sm font-black text-slate-700">{payment.customer}</p>
                    <p className="mt-1 text-xs font-semibold text-slate-400">{payment.phone} · {payment.date}</p>
                  </td>
                  <td className="px-5 py-3.5 text-sm font-bold text-slate-600">
                    {payment.payment}
                  </td>
                  <td className="px-5 py-3.5">
                    <dl className="amount-breakdown grid grid-cols-[auto_auto] gap-x-4 gap-y-1 text-xs">
                      <dt>Subtotal</dt><dd>{payment.subtotal}</dd>
                      <dt>Discount</dt><dd className={payment.discountAmount > 0 ? "text-emerald-700" : ""}>{payment.discountAmount > 0 ? `-${payment.discount}` : "—"}</dd>
                      <dt>Delivery</dt><dd>{payment.delivery}</dd>
                    </dl>
                    {payment.promoCode ? <p className="mt-2 text-[10px] font-black uppercase tracking-[0.12em] text-main">Code: {payment.promoCode}</p> : null}
                  </td>
                  <td className="px-5 py-3.5 text-right text-sm font-black text-slate-900">
                    {payment.total}
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex flex-col items-start gap-1.5">
                      <Badge tone={payment.billStatus === "Paid" ? "green" : "yellow"}>{payment.billStatus === "Paid" ? "Paid" : "Pending"}</Badge>
                      <Badge tone={statusTone(payment.orderStatus)}>{payment.orderStatus}</Badge>
                    </div>
                  </td>
                  <td className="px-6 py-3.5">
                    <div className="flex flex-col items-end gap-1.5">
                      <Link
                        href={`/dashboard/orders/${payment.mongoId}`}
                        className="admin-secondary-action inline-flex h-8 items-center rounded-lg border px-3 text-[11px] font-black transition"
                      >
                        View
                      </Link>
                      {payment.billStatus !== "Paid" ? (
                        <button
                          type="button"
                          onClick={() => handleMarkPaid(payment)}
                          disabled={updatingId === payment.mongoId}
                          className="h-8 rounded-lg bg-main px-3 text-[11px] font-black text-white transition hover:bg-mainHover disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {updatingId === payment.mongoId ? "Saving..." : "Mark paid"}
                        </button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
              {!loading && filteredPayments.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-8 py-10 text-center text-sm font-semibold text-slate-400"
                  >
                    No payment records found.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardShell>
  );
}
