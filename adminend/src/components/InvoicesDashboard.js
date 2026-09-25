"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

import DashboardShell, { Badge, Icon } from "@/components/DashboardShell";
import { useToast } from "@/components/ui/toast";
import {
  formatInvoiceDate,
  formatTk,
  getInvoicesFromApi,
} from "@/lib/invoiceApi";

function orderStatusTone(status) {
  const tones = {
    Pending: "yellow",
    Confirmed: "blue",
    Processing: "blue",
    Shipped: "blue",
    Delivered: "green",
    Cancelled: "gray",
  };
  return tones[status] || "gray";
}

export default function InvoicesDashboard() {
  const { showToast } = useToast();
  const [invoices, setInvoices] = useState([]);
  const [summary, setSummary] = useState({ total: 0, revenue: 0 });
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [orderStatus, setOrderStatus] = useState("");

  const load = async (params = {}) => {
    setLoading(true);
    try {
      const data = await getInvoicesFromApi({
        q: params.q ?? q,
        orderStatus: params.orderStatus ?? orderStatus,
      });
      setInvoices(data.invoices);
      setSummary(data.summary);
    } catch (error) {
      showToast({
        tone: "danger",
        title: error.message || "Failed to load invoices.",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const cards = useMemo(
    () => [
      {
        title: "Paid invoices",
        value: String(summary.total).padStart(2, "0"),
        description: "Invoices available for paid orders only.",
        accent: "from-main to-main/70",
      },
      {
        title: "Invoice revenue",
        value: formatTk(summary.revenue),
        description: "Sum of grand totals on paid invoices.",
        accent: "from-accent to-accentSoft",
      },
    ],
    [summary]
  );

  return (
    <DashboardShell activeItem="Invoices">
      <div className="rounded-[24px] border border-neutral-200 bg-white px-5 py-5 shadow-lg shadow-main/5 md:px-6">
        <p className="text-sm font-black uppercase tracking-[0.35em] text-main/70">
          Billing
        </p>
        <h1 className="mt-2 text-2xl font-black tracking-tight text-main md:text-3xl">
          Invoices
        </h1>
        <p className="mt-1.5 max-w-3xl text-sm font-semibold leading-6 text-slate-500">
          Print-ready invoices generated from paid orders. Unpaid orders do not
          appear here.
        </p>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        {cards.map((card) => (
          <div
            key={card.title}
            className={`rounded-[24px] bg-gradient-to-br ${card.accent} p-5 text-white shadow-lg shadow-main/10`}
          >
            <p className="text-xs font-black uppercase tracking-[0.28em] text-white/70">
              {card.title}
            </p>
            <p className="mt-3 text-3xl font-black tracking-tight">{card.value}</p>
            <p className="mt-2 text-sm font-semibold text-white/80">
              {card.description}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-5 rounded-[24px] border border-neutral-200 bg-white p-4 shadow-lg shadow-main/5 md:p-5">
        <form
          className="flex flex-col gap-3 md:flex-row md:items-end"
          onSubmit={(event) => {
            event.preventDefault();
            load({ q, orderStatus });
          }}
        >
          <label className="flex-1 lg:hidden">
            <span className="text-xs font-black uppercase tracking-[0.22em] text-main/75">
              Search
            </span>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Order #, customer, phone..."
              className="mt-1.5 h-11 w-full rounded-xl border border-neutral-200 bg-white px-4 text-sm font-semibold text-slate-700 outline-none focus:border-main"
            />
          </label>
          <label className="md:w-48">
            <span className="text-xs font-black uppercase tracking-[0.22em] text-main/75">
              Order status
            </span>
            <select
              value={orderStatus}
              onChange={(e) => setOrderStatus(e.target.value)}
              className="mt-1.5 h-11 w-full rounded-xl border border-neutral-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none focus:border-main"
            >
              <option value="">All</option>
              <option value="Pending">Pending</option>
              <option value="Confirmed">Confirmed</option>
              <option value="Processing">Processing</option>
              <option value="Shipped">Shipped</option>
              <option value="Delivered">Delivered</option>
            </select>
          </label>
          <button
            type="submit"
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-main px-5 text-sm font-black text-white transition hover:bg-mainHover"
          >
            <Icon name="search" className="h-4 w-4" />
            Filter
          </button>
        </form>
      </div>

      <div className="mt-5 overflow-hidden rounded-[24px] border border-neutral-200 bg-white shadow-lg shadow-main/5">
        <div className="hidden items-center justify-between border-b border-[#e4ece7] bg-gradient-to-b from-[#fbfdfc] to-white px-4 py-2.5 lg:flex">
          <h3 className="text-[11.5px] font-bold uppercase tracking-[0.1em] text-[#6b7f78]">Paid Invoices</h3>
          <span className="text-[11px] text-[#6b7f78]">{invoices.length} invoices</span>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left">
            <thead className="bg-mainSoft/50 text-xs font-black uppercase tracking-[0.18em] text-main/70">
              <tr>
                <th className="px-5 py-4">Invoice</th>
                <th className="px-5 py-4">Customer</th>
                <th className="px-5 py-4">Date</th>
                <th className="px-5 py-4">Status</th>
                <th className="px-5 py-4">Total</th>
                <th className="px-5 py-4">Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-5 py-8 text-sm font-semibold text-slate-500">
                    Loading invoices...
                  </td>
                </tr>
              ) : invoices.length ? (
                invoices.map((invoice) => (
                  <tr
                    key={invoice.id}
                    className="border-t border-neutral-100 text-sm font-semibold text-slate-600"
                  >
                    <td className="px-5 py-4">
                      <p className="font-black text-main">{invoice.invoiceNumber}</p>
                      <p className="mt-1 text-xs text-slate-400">
                        Order {invoice.orderNumber}
                      </p>
                    </td>
                    <td className="px-5 py-4">
                      <p className="font-black text-main">{invoice.customerName}</p>
                      <p className="mt-1 text-xs text-slate-400">
                        {invoice.customerPhone}
                      </p>
                    </td>
                    <td className="px-5 py-4">{formatInvoiceDate(invoice.createdAt)}</td>
                    <td className="px-5 py-4">
                      <Badge tone={orderStatusTone(invoice.orderStatus)}>
                        {invoice.orderStatus}
                      </Badge>
                    </td>
                    <td className="px-5 py-4 font-black text-main">
                      {formatTk(invoice.grandTotal)}
                    </td>
                    <td className="px-5 py-4">
                      <Link
                        href={`/dashboard/invoices/${invoice.orderId}`}
                        className="inline-flex h-9 items-center gap-2 rounded-xl bg-mainSoft px-3 text-xs font-black text-main transition hover:bg-main hover:text-white"
                      >
                        <Icon name="invoice" className="h-3.5 w-3.5" />
                        View / Print
                      </Link>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-5 py-8 text-sm font-semibold text-slate-500">
                    No paid invoices found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardShell>
  );
}
