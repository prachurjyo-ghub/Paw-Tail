"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";

import DashboardShell, { Badge } from "@/components/DashboardShell";
import { useToast } from "@/components/ui/toast";
import { adminApi } from "@/lib/adminApi";

function formatDate(value) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function mapAccount(account) {
  return {
    id: account.id || account._id,
    name: account.name || "Unnamed account",
    email: account.email || "—",
    phone: account.phone || "—",
    role: account.role || "user",
    joined: formatDate(account.createdAt),
    isVerified: Boolean(account.isVerified),
    addressCount: account.addressCount || 0,
  };
}

export default function CustomerManagementDashboard() {
  const { showToast } = useToast();
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadAccounts = useCallback(async () => {
    setLoading(true);

    try {
      const data = await adminApi("/users/accounts");
      setAccounts((data.accounts || []).map(mapAccount));
    } catch (error) {
      showToast({
        tone: "danger",
        title: "Could not load accounts.",
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadAccounts();
  }, [loadAccounts]);

  const summaryCards = useMemo(
    () => [
      {
        title: "Total Users",
        value: String(accounts.length).padStart(2, "0"),
        description: "All client and admin accounts in the system.",
        accent: "from-accent to-accentSoft",
        ring: "ring-accent/20",
      },
      {
        title: "Admin Users",
        value: String(accounts.filter((item) => item.role === "admin").length).padStart(2, "0"),
        description: "Accounts with admin dashboard access.",
        accent: "from-mainHover to-main",
        ring: "ring-main/20",
      },
      {
        title: "Verified Users",
        value: String(accounts.filter((item) => item.isVerified).length).padStart(2, "0"),
        description: "Customers who completed email verification.",
        accent: "from-main to-main/70",
        ring: "ring-main/15",
      },
    ],
    [accounts]
  );

  return (
    <DashboardShell activeItem="Customers">
      <div className="rounded-[24px] border border-neutral-200 bg-white px-5 py-4 shadow-lg shadow-main/5 md:px-6">
        <div>
          <p className="text-sm font-black uppercase tracking-[0.35em] text-main/70">
            Customers
          </p>
          <h1 className="mt-2 text-2xl font-black tracking-tight text-main md:text-3xl">
            Customers
          </h1>
          <p className="mt-1.5 max-w-2xl text-sm font-semibold leading-6 text-slate-500">
            Review client and admin accounts, contact details, join dates, roles,
            and verification status from one place.
          </p>
        </div>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {summaryCards.map((card) => (
          <article
            key={card.title}
            className={`relative overflow-hidden rounded-[20px] border border-neutral-200 bg-white p-4 shadow-md shadow-main/5 ring-1 ${card.ring}`}
          >
            <div className={`absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r ${card.accent}`} />
            <p className="text-sm font-extrabold text-slate-500">{card.title}</p>
            <p className="mt-2 text-[1.75rem] font-black tracking-tight text-main">
              {card.value}
            </p>
            <p className="mt-1.5 text-xs font-semibold leading-5 text-slate-400">
              {card.description}
            </p>
          </article>
        ))}
      </div>

      <div className="mt-5 overflow-hidden rounded-[24px] border border-neutral-200 bg-white shadow-lg shadow-main/5">
        <div className="hidden items-center justify-between border-b border-[#e4ece7] bg-gradient-to-b from-[#fbfdfc] to-white px-4 py-2.5 lg:flex">
          <h3 className="text-[11.5px] font-bold uppercase tracking-[0.1em] text-[#6b7f78]">Customer Directory</h3>
          <span className="text-[11px] text-[#6b7f78]">{accounts.length} accounts</span>
        </div>
        <div className="space-y-3 p-3 md:hidden">
          {loading ? (
            <p className="py-10 text-center text-sm font-black text-main">Loading customers...</p>
          ) : accounts.length ? accounts.map((account) => (
            <Link
              key={account.id}
              href={`/dashboard/customer-management/${account.id}`}
              className="block rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-black text-main">{account.name}</p>
                  <p className="mt-1 truncate text-xs font-semibold text-slate-400">{account.email}</p>
                </div>
                <Badge tone={account.isVerified ? "green" : "yellow"}>
                  {account.isVerified ? "Verified" : "Unverified"}
                </Badge>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2 rounded-xl bg-mainSoft/40 p-3 text-center">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Role</p>
                  <p className="mt-1 truncate text-xs font-black text-slate-700">{account.role === "admin" ? "Admin" : "Client"}</p>
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Addresses</p>
                  <p className="mt-1 text-xs font-black text-slate-700">{account.addressCount}</p>
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Joined</p>
                  <p className="mt-1 truncate text-xs font-black text-slate-700">{account.joined}</p>
                </div>
              </div>
            </Link>
          )) : (
            <p className="py-10 text-center text-sm font-bold text-slate-500">No accounts found.</p>
          )}
        </div>
        <div className="hidden overflow-x-auto md:block">
          <table className="w-full min-w-[960px] border-collapse text-left">
            <thead className="bg-mainSoft/50">
              <tr className="border-b border-neutral-100 text-xs font-black uppercase tracking-[0.3em] text-slate-400">
                <th className="px-8 py-5">Customer</th>
                <th className="px-8 py-5">Role</th>
                <th className="px-8 py-5">Phone</th>
                <th className="px-8 py-5">Joined</th>
                <th className="px-8 py-5 text-center">Addresses</th>
                <th className="px-8 py-5 text-center">Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-8 py-10 text-center text-sm font-black text-main"
                  >
                    Loading customers...
                  </td>
                </tr>
              ) : accounts.length ? (
                accounts.map((account) => (
                  <tr
                    key={account.id}
                    className="border-b border-neutral-100 last:border-b-0"
                  >
                    <td className="px-8 py-6">
                      <Link
                        href={`/dashboard/customer-management/${account.id}`}
                        className="text-sm font-black text-main hover:underline"
                      >
                        {account.name}
                      </Link>
                      <p className="mt-1 text-xs font-semibold text-slate-400">
                        {account.email}
                      </p>
                    </td>
                    <td className="px-8 py-6">
                      <Badge tone={account.role === "admin" ? "blue" : "gray"}>
                        {account.role === "admin" ? "Admin" : "Client"}
                      </Badge>
                    </td>
                    <td className="px-8 py-6 text-sm font-semibold text-slate-600">
                      {account.phone}
                    </td>
                    <td className="px-8 py-6 text-sm font-semibold text-slate-500">
                      {account.joined}
                    </td>
                    <td className="px-8 py-6 text-center text-sm font-black text-slate-700">
                      {account.addressCount}
                    </td>
                    <td className="px-8 py-6 text-center">
                      <Badge tone={account.isVerified ? "green" : "yellow"}>
                        {account.isVerified ? "Verified" : "Not verified"}
                      </Badge>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={5}
                    className="px-8 py-10 text-center text-sm font-bold text-slate-500"
                  >
                    No accounts found.
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
