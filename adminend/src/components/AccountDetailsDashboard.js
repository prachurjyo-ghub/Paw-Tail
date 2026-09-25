"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import DashboardShell, { Badge, Icon } from "@/components/DashboardShell";
import { useToast } from "@/components/ui/toast";
import { adminApi } from "@/lib/adminApi";
import { resolveMediaUrl } from "@/lib/media";
import { formatTk, mapBackendOrderToAdminRow } from "@/lib/orderApi";

function formatDate(value) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatAddress(address = {}) {
  const parts = [
    address.line || address.address,
    address.area,
    address.city,
    address.postal || address.postalCode,
  ].filter(Boolean);
  return parts.join(", ") || "—";
}

function getImageUrl(src) {
  return (
    resolveMediaUrl(src, {
      legacyFolder: "users",
      width: 240,
      crop: "fill",
    }) || null
  );
}

export default function AccountDetailsDashboard({ accountId }) {
  const { showToast } = useToast();
  const [account, setAccount] = useState(null);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadAccount = useCallback(async () => {
    setLoading(true);

    try {
      const data = await adminApi(`/users/accounts/${accountId}`);
      setAccount(data.account || null);
      setOrders((data.orders || []).map(mapBackendOrderToAdminRow));
    } catch (error) {
      showToast({
        tone: "danger",
        title: "Could not load account details.",
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  }, [accountId, showToast]);

  useEffect(() => {
    loadAccount();
  }, [loadAccount]);

  const totals = useMemo(() => {
    const amount = orders.reduce((sum, order) => {
      return sum + Number(String(order.total).replace(/[^\d.]/g, "") || 0);
    }, 0);

    return {
      orders: orders.length,
      spent: amount,
      delivered: orders.filter((order) => order.orderStatus === "Delivered").length,
    };
  }, [orders]);

  return (
    <DashboardShell activeItem="Customers">
      <div className="rounded-[24px] border border-neutral-200 bg-white px-5 py-5 shadow-lg shadow-main/5 md:px-6">
        <Link
          href="/dashboard/customer-management"
          className="inline-flex items-center gap-2 text-sm font-black text-main hover:underline"
        >
          <Icon name="log-in" className="h-4 w-4 rotate-180" />
          Back to accounts
        </Link>
        <p className="mt-4 text-sm font-black uppercase tracking-[0.35em] text-main/70">
          Account Details
        </p>
        <h1 className="mt-2 text-2xl font-black tracking-tight text-main md:text-3xl">
          {account?.name || "Account profile"}
        </h1>
        <p className="mt-1.5 max-w-3xl text-sm font-semibold leading-6 text-slate-500">
          Personal information, saved addresses, and complete order history for
          this account.
        </p>
      </div>

      {loading ? (
        <div className="mt-5 rounded-[24px] border border-neutral-200 bg-white p-8 text-center text-sm font-black text-main shadow-lg shadow-main/5">
          Loading account...
        </div>
      ) : account ? (
        <>
          <div className="mt-5 grid gap-3 md:grid-cols-3">
            <SummaryCard title="Orders" value={totals.orders} />
            <SummaryCard title="Delivered" value={totals.delivered} />
            <SummaryCard title="Total Spent" value={formatTk(totals.spent)} />
          </div>

          <div className="mt-5 grid gap-5 xl:grid-cols-[0.8fr_1.2fr]">
            <section className="rounded-[24px] border border-neutral-200 bg-white p-5 shadow-lg shadow-main/5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-black uppercase tracking-[0.35em] text-main/70">
                    Personal Info
                  </p>
                  <div className="mt-2 flex items-center gap-3">
                    {account.profilePic ? (
                      <span
                        role="img"
                        aria-label={`${account.name} profile`}
                        className="h-12 w-12 shrink-0 rounded-2xl border border-neutral-200 bg-cover bg-center"
                        style={{ backgroundImage: `url(${getImageUrl(account.profilePic)})` }}
                      />
                    ) : null}
                    <h2 className="text-xl font-black text-main">{account.name}</h2>
                  </div>
                </div>
                <Badge tone={account.role === "admin" ? "blue" : "gray"}>
                  {account.role === "admin" ? "Admin" : "Client"}
                </Badge>
              </div>

              <div className="mt-5 space-y-3">
                <InfoRow label="Email" value={account.email} />
                <InfoRow label="Phone" value={account.phone || "—"} />
                <InfoRow
                  label="Account ID"
                  value={account.id || "—"}
                />
                <InfoRow
                  label="Verification"
                  value={account.isVerified ? "Verified" : "Not verified"}
                />
                <InfoRow label="Joined" value={formatDate(account.createdAt)} />
                <InfoRow label="Updated" value={formatDate(account.updatedAt)} />
              </div>
            </section>

            <section className="rounded-[24px] border border-neutral-200 bg-white p-5 shadow-lg shadow-main/5">
              <p className="text-sm font-black uppercase tracking-[0.35em] text-main/70">
                Addresses
              </p>
              <div className="mt-5 grid gap-3">
                {account.address?.length ? (
                  account.address.map((address, index) => (
                    <article
                      key={address.id || `${address.label}-${index}`}
                      className="rounded-2xl border border-neutral-200 bg-mainSoft/20 p-4"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-black text-main">
                          {address.label || `Address ${index + 1}`}
                        </p>
                        {address.isDefault ? (
                          <Badge tone="green">Default</Badge>
                        ) : null}
                      </div>
                      <p className="mt-2 text-sm font-semibold text-slate-600">
                        {address.name || account.name} · {address.phone || account.phone || "—"}
                      </p>
                      <p className="mt-1 text-sm font-semibold text-slate-500">
                        {formatAddress(address)}
                      </p>
                    </article>
                  ))
                ) : (
                  <p className="rounded-2xl border border-dashed border-neutral-200 p-6 text-center text-sm font-bold text-slate-500">
                    No saved addresses.
                  </p>
                )}
              </div>
            </section>
          </div>

          <section className="mt-5 overflow-hidden rounded-[24px] border border-neutral-200 bg-white shadow-lg shadow-main/5">
            <div className="border-b border-neutral-100 px-5 py-4">
              <p className="text-sm font-black uppercase tracking-[0.35em] text-main/70">
                Order History
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[920px] border-collapse text-left">
                <thead className="bg-mainSoft/40">
                  <tr className="border-b border-neutral-100 text-xs font-black uppercase tracking-[0.25em] text-slate-400">
                    <th className="px-5 py-4">Order</th>
                    <th className="px-5 py-4">Date</th>
                    <th className="px-5 py-4">Payment</th>
                    <th className="px-5 py-4">Status</th>
                    <th className="px-5 py-4">Total</th>
                    <th className="px-5 py-4">Items</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.length ? (
                    orders.map((order) => (
                      <tr
                        key={order.mongoId || order.id}
                        className="border-b border-neutral-100 last:border-b-0"
                      >
                        <td className="px-5 py-5">
                          <Link
                            href={`/dashboard/orders/${order.mongoId || order.id}`}
                            className="text-sm font-black text-main hover:underline"
                          >
                            {order.id}
                          </Link>
                          <p className="mt-1 text-xs font-semibold text-slate-400">
                            {order.address}
                          </p>
                        </td>
                        <td className="px-5 py-5 text-sm font-semibold text-slate-600">
                          {order.date}
                        </td>
                        <td className="px-5 py-5">
                          <p className="text-sm font-black text-slate-700">
                            {order.payment}
                          </p>
                          <p className="mt-1 text-xs font-semibold text-slate-400">
                            {order.paymentStatus}
                          </p>
                        </td>
                        <td className="px-5 py-5">
                          <Badge tone={order.orderStatus === "Delivered" ? "green" : "blue"}>
                            {order.orderStatus}
                          </Badge>
                        </td>
                        <td className="px-5 py-5">
                          <p className="text-sm font-black text-slate-800">
                            {order.total}
                          </p>
                          <p className="mt-1 text-xs font-semibold text-slate-400">
                            Discount {order.discount}
                          </p>
                        </td>
                        <td className="px-5 py-5 text-sm font-semibold text-slate-600">
                          {order.items.map((item) => item.name).join(", ") || "—"}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-5 py-10 text-center text-sm font-bold text-slate-500"
                      >
                        No orders found for this account.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </>
      ) : (
        <div className="mt-5 rounded-[24px] border border-neutral-200 bg-white p-8 text-center text-sm font-bold text-slate-500 shadow-lg shadow-main/5">
          Account not found.
        </div>
      )}
    </DashboardShell>
  );
}

function SummaryCard({ title, value }) {
  return (
    <article className="rounded-[20px] border border-neutral-200 bg-white p-4 shadow-md shadow-main/5">
      <p className="text-sm font-extrabold text-slate-500">{title}</p>
      <p className="mt-2 text-2xl font-black text-main">{value}</p>
    </article>
  );
}

function InfoRow({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-neutral-200 bg-white px-4 py-3">
      <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">
        {label}
      </p>
      <p className="text-right text-sm font-black text-main">{value}</p>
    </div>
  );
}
