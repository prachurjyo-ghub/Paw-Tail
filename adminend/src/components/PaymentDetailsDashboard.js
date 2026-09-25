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
      accent: "from-emerald-400 to-teal-300",
      ring: "ring-emerald-100",
    },
    {
      title: "Total Unpaid",
      value: formatTk(unpaidTotal),
      helper: "Money not received yet.",
      accent: "from-rose-500 via-orange-400 to-accent",
      ring: "ring-orange-100",
    },
    {
      title: "Paid Orders",
      value: formatCount(paid.length),
      helper: "Orders with cleared payment.",
      accent: "from-cyan-400 to-sky-300",
      ring: "ring-cyan-100",
    },
    {
      title: "Unpaid Orders",
      value: formatCount(unpaid.length),
      helper: "Orders still waiting for payment.",
      accent: "from-amber-400 to-orange-300",
      ring: "ring-amber-100",
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

        <label className="mt-7 flex h-14 items-center rounded-2xl border border-neutral-200 bg-white px-5 text-slate-400 shadow-inner shadow-main/5 lg:hidden">
          <Icon name="search" className="h-5 w-5" />
          <input
            type="search"
            aria-label="Search payment details"
            placeholder="Search by order ID, customer, phone, payment, voucher, or status..."
            value={searchText}
            onChange={(event) => setSearchText(event.target.value)}
            className="ml-3 w-full bg-transparent text-sm font-bold text-slate-700 outline-none placeholder:text-slate-300"
          />
        </label>
        <div className="mt-3 hidden items-center gap-2 border-t border-[#e4ece7] pt-3 lg:flex">
          <span className="mr-0.5 text-[10.5px] font-bold uppercase tracking-[0.09em] text-[#8a9e96]">Filters</span>
          <select value={paymentMethodFilter} onChange={(event) => setPaymentMethodFilter(event.target.value)} className="h-[30px] rounded-[7px] border border-[#e4ece7] bg-white px-2.5 text-xs text-[#3d554b] outline-none">
            <option value="All">All Methods</option>
            {[...new Set(payments.map((payment) => payment.payment).filter(Boolean))].map((method) => <option key={method} value={method}>{method}</option>)}
          </select>
          <select value={paymentStatusFilter} onChange={(event) => setPaymentStatusFilter(event.target.value)} className="h-[30px] rounded-[7px] border border-[#e4ece7] bg-white px-2.5 text-xs text-[#3d554b] outline-none">
            <option value="All">All Payment</option>
            <option value="Paid">Paid</option>
            <option value="Due">Unpaid</option>
          </select>
        </div>
      </div>

      <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <article
            key={card.title}
            className={`relative min-h-40 overflow-hidden rounded-[24px] border border-neutral-200 bg-white p-6 shadow-lg shadow-main/5 ring-1 ${card.ring}`}
          >
            <div className={`absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r ${card.accent}`} />
            <p className="text-sm font-extrabold text-slate-500">{card.title}</p>
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
        <div className="hidden items-center justify-between border-b border-[#e4ece7] bg-gradient-to-b from-[#fbfdfc] to-white px-4 py-2.5 lg:flex">
          <h3 className="text-[11.5px] font-bold uppercase tracking-[0.1em] text-[#6b7f78]">Payment Records</h3>
          <span className="text-[11px] text-[#6b7f78]">{filteredPayments.length} orders</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1280px] border-collapse text-left">
            <thead className="bg-white">
              <tr className="border-b border-slate-100 text-xs font-black uppercase tracking-[0.3em] text-slate-300">
                <th className="px-10 py-6">Customer</th>
                <th className="px-6 py-6">Order</th>
                <th className="px-6 py-6">Method</th>
                <th className="px-6 py-6 text-center">Subtotal</th>
                <th className="px-6 py-6 text-center">Promo</th>
                <th className="px-6 py-6 text-center">Delivery</th>
                <th className="px-6 py-6 text-center">Total</th>
                <th className="px-6 py-6 text-center">Payment</th>
                <th className="px-6 py-6 text-center">Order Status</th>
                <th className="px-8 py-6 text-center">Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredPayments.map((payment) => (
                <tr key={payment.mongoId} className="border-b border-slate-100 last:border-b-0">
                  <td className="px-10 py-7">
                    <p className="text-sm font-black text-slate-700">{payment.customer}</p>
                    <p className="mt-2 text-sm font-semibold text-slate-400">{payment.phone}</p>
                  </td>
                  <td className="px-6 py-7">
                    <p className="text-sm font-black text-main">{payment.id}</p>
                    <p className="mt-2 text-sm font-semibold text-slate-400">{payment.date}</p>
                  </td>
                  <td className="px-6 py-7 text-sm font-bold text-slate-500">
                    {payment.payment}
                  </td>
                  <td className="px-6 py-7 text-center text-sm font-black text-slate-700">
                    {payment.subtotal}
                  </td>
                  <td className="px-6 py-7 text-center">
                    {payment.discountAmount > 0 ? (
                      <div>
                        <p className="text-sm font-black text-emerald-700">
                          -{payment.discount}
                        </p>
                        {payment.promoCode ? (
                          <p className="mt-1 text-xs font-black uppercase tracking-[0.18em] text-slate-400">
                            {payment.promoCode}
                          </p>
                        ) : null}
                      </div>
                    ) : (
                      <span className="text-sm font-bold text-slate-300">-</span>
                    )}
                  </td>
                  <td className="px-6 py-7 text-center text-sm font-black text-slate-700">
                    {payment.delivery}
                  </td>
                  <td className="px-6 py-7 text-center text-sm font-black text-slate-800">
                    {payment.total}
                  </td>
                  <td className="px-6 py-7 text-center">
                    <Badge tone={payment.billStatus === "Paid" ? "green" : "yellow"}>
                      {payment.billStatus === "Paid" ? "Paid" : "Pending"}
                    </Badge>
                  </td>
                  <td className="px-6 py-7 text-center">
                    <Badge tone={statusTone(payment.orderStatus)}>
                      {payment.orderStatus}
                    </Badge>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex flex-col items-center gap-3">
                      <Link
                        href={`/dashboard/orders/${payment.mongoId}`}
                        className="inline-flex h-11 items-center rounded-2xl border border-main/20 bg-mainSoft/60 px-6 text-sm font-black text-main shadow-sm transition hover:bg-mainSoft"
                      >
                        View order
                      </Link>
                      {payment.billStatus !== "Paid" ? (
                        <button
                          type="button"
                          onClick={() => handleMarkPaid(payment)}
                          disabled={updatingId === payment.mongoId}
                          className="h-12 rounded-2xl bg-main px-8 text-sm font-black text-white shadow-md shadow-main/20 transition hover:bg-mainHover disabled:cursor-not-allowed disabled:opacity-60"
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
                    colSpan={10}
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
