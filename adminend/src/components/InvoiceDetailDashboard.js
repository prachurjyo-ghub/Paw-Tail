"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

import DashboardShell, { Badge, Icon } from "@/components/DashboardShell";
import { useToast } from "@/components/ui/toast";
import {
  formatInvoiceDate,
  formatTk,
  getInvoiceFromApi,
} from "@/lib/invoiceApi";

export default function InvoiceDetailDashboard() {
  const { orderId } = useParams();
  const { showToast } = useToast();
  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;

    getInvoiceFromApi(orderId)
      .then((data) => {
        if (alive) setInvoice(data);
      })
      .catch((error) => {
        showToast({
          tone: "danger",
          title: error.message || "Failed to load invoice.",
        });
      })
      .finally(() => {
        if (alive) setLoading(false);
      });

    return () => {
      alive = false;
    };
  }, [orderId, showToast]);

  return (
    <DashboardShell activeItem="Invoices">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link
          href="/dashboard/invoices"
          className="inline-flex h-10 items-center gap-2 rounded-xl border border-neutral-200 bg-white px-4 text-sm font-black text-main transition hover:border-main hover:bg-mainSoft"
        >
          ← Back to invoices
        </Link>
        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex h-10 items-center gap-2 rounded-xl bg-main px-4 text-sm font-black text-white transition hover:bg-mainHover"
        >
          <Icon name="invoice" className="h-4 w-4" />
          Print invoice
        </button>
      </div>

      {loading ? (
        <div className="rounded-[24px] border border-neutral-200 bg-white p-8 text-sm font-semibold text-slate-500">
          Loading invoice...
        </div>
      ) : !invoice ? (
        <div className="rounded-[24px] border border-neutral-200 bg-white p-8 text-sm font-semibold text-slate-500">
          Invoice not found or order is not paid.
        </div>
      ) : (
        <div className="invoice-sheet mx-auto max-w-4xl rounded-[24px] border border-neutral-200 bg-white p-6 shadow-lg shadow-main/5 md:p-8 print:max-w-none print:rounded-none print:border-0 print:p-0 print:shadow-none">
          <div className="flex flex-wrap items-start justify-between gap-6 border-b border-neutral-200 pb-6">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.35em] text-main/70">
                PawTail
              </p>
              <h1 className="mt-2 text-3xl font-black text-main">Invoice</h1>
              <p className="mt-2 text-sm font-semibold text-slate-500">
                Pet essentials · Dhaka, Bangladesh
              </p>
            </div>
            <div className="text-right">
              <p className="text-lg font-black text-main">{invoice.invoiceNumber}</p>
              <p className="mt-1 text-sm font-semibold text-slate-500">
                Order {invoice.orderNumber}
              </p>
              <p className="mt-1 text-sm font-semibold text-slate-500">
                Issued {formatInvoiceDate(invoice.issuedAt)}
              </p>
              <div className="mt-3 flex justify-end gap-2">
                <Badge tone="green">Paid</Badge>
                <Badge tone="blue">{invoice.orderStatus}</Badge>
              </div>
            </div>
          </div>

          <div className="mt-6 grid gap-6 md:grid-cols-2">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.22em] text-main/70">
                Bill to
              </p>
              <p className="mt-2 text-base font-black text-main">
                {invoice.customerName}
              </p>
              <p className="mt-1 text-sm font-semibold text-slate-600">
                {invoice.customerEmail}
              </p>
              <p className="text-sm font-semibold text-slate-600">
                {invoice.customerPhone}
              </p>
            </div>
            <div>
              <p className="text-xs font-black uppercase tracking-[0.22em] text-main/70">
                Ship to
              </p>
              <p className="mt-2 text-base font-black text-main">
                {invoice.shippingAddress?.name || invoice.customerName}
              </p>
              <p className="mt-1 text-sm font-semibold leading-6 text-slate-600">
                {[
                  invoice.shippingAddress?.address,
                  invoice.shippingAddress?.area,
                  invoice.shippingAddress?.city,
                  invoice.shippingAddress?.postalCode,
                ]
                  .filter(Boolean)
                  .join(", ") || "—"}
              </p>
              <p className="mt-2 text-sm font-semibold text-slate-600">
                Payment: {invoice.paymentMethod}
              </p>
            </div>
          </div>

          <div className="mt-8 overflow-hidden rounded-2xl border border-neutral-200">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-mainSoft/60 text-xs font-black uppercase tracking-[0.16em] text-main/70">
                <tr>
                  <th className="px-4 py-3">Item</th>
                  <th className="px-4 py-3">Qty</th>
                  <th className="px-4 py-3">Unit</th>
                  <th className="px-4 py-3 text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {invoice.items.map((item) => (
                  <tr key={item.key} className="border-t border-neutral-100">
                    <td className="px-4 py-3 font-semibold text-slate-700">
                      <span className="font-black text-main">{item.productName}</span>
                      {item.variantName || item.weight ? (
                        <span className="mt-1 block text-xs text-slate-400">
                          {[item.variantName, item.weight].filter(Boolean).join(" · ")}
                        </span>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-600">
                      {item.quantity}
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-600">
                      {formatTk(item.finalUnitPrice)}
                    </td>
                    <td className="px-4 py-3 text-right font-black text-main">
                      {formatTk(item.itemSubtotal)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-6 flex justify-end">
            <div className="w-full max-w-sm space-y-2 rounded-2xl border border-neutral-200 bg-mainSoft/20 p-4 text-sm font-semibold text-slate-600">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span className="font-black text-main">{formatTk(invoice.subtotal)}</span>
              </div>
              {Number(invoice.promoDiscount) > 0 ? (
                <div className="flex justify-between">
                  <span>Promo{invoice.promoCode ? ` (${invoice.promoCode})` : ""}</span>
                  <span className="font-black text-main">
                    -{formatTk(invoice.promoDiscount)}
                  </span>
                </div>
              ) : null}
              <div className="flex justify-between">
                <span>Delivery</span>
                <span className="font-black text-main">
                  {formatTk(invoice.deliveryCharge)}
                </span>
              </div>
              <div className="flex justify-between border-t border-neutral-200 pt-2 text-base">
                <span className="font-black text-main">Grand total</span>
                <span className="font-black text-main">
                  {formatTk(invoice.grandTotal)}
                </span>
              </div>
            </div>
          </div>

          <p className="mt-8 text-center text-xs font-semibold text-slate-400">
            Thank you for shopping with PawTail. For support, contact the store
            team with this invoice number.
          </p>
        </div>
      )}
    </DashboardShell>
  );
}
