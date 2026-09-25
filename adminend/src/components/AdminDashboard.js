"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import DashboardShell, { Badge, Icon } from "@/components/DashboardShell";
import { adminApi } from "@/lib/adminApi";
import { getOrdersFromApi, formatTk } from "@/lib/orderApi";

const quickActions = [
  ["Add Product", "/dashboard/products/create", "cart"],
  ["Create Category", "/dashboard/categories/create", "folder"],
  ["Add Brand", "/dashboard/brands/create", "tag"],
  ["View Payments", "/dashboard/payment-details", "card"],
];

function HeaderPanel({ todayRevenue }) {
  return (
    <div className="rounded-[22px] border border-slate-200 bg-white px-4 py-5 shadow-lg shadow-slate-200/60 md:rounded-[28px] md:px-8 md:py-7">
      <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <p className="text-sm font-black uppercase tracking-[0.35em] text-main">
            Overview
          </p>
          <h1 className="mt-2 text-2xl font-black tracking-tight text-slate-950 md:mt-3 md:text-4xl">
            Dashboard
          </h1>
          <p className="mt-4 max-w-4xl text-sm font-semibold leading-7 text-slate-400 md:text-base">
            Monitor store performance, orders, inventory, and admin tasks from
            one clean command center.
          </p>
        </div>

        <div className="rounded-2xl bg-mainSoft px-5 py-4">
          <p className="text-xs font-black uppercase tracking-[0.25em] text-main">
            Today
          </p>
          <p className="mt-2 text-2xl font-black text-slate-950">{formatTk(todayRevenue)}</p>
        </div>
      </div>
    </div>
  );
}

function RevenuePanel({ revenueBars }) {
  return (
    <section className="rounded-[24px] border border-slate-200 bg-white p-6 shadow-lg shadow-slate-200/60">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-lg font-black text-slate-950">Weekly Revenue</p>
          <p className="mt-1 text-sm font-bold text-slate-400">
            Sales movement for this week
          </p>
        </div>
      </div>

      <div className="mt-8 flex h-72 items-end gap-4 rounded-2xl bg-mainSoft/45 px-4 pb-4 pt-8">
        {revenueBars.map(([day, height]) => (
          <div key={day} className="flex min-w-0 flex-1 flex-col items-center gap-3">
            <div className="flex h-48 w-full items-end">
              <div
                className="w-full rounded-t-xl bg-gradient-to-t from-main to-accent shadow-lg shadow-main/10"
                style={{ height: `${height}%` }}
              />
            </div>
            <p className="text-xs font-black text-slate-500">{day}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function ActivityPanel({ healthData }) {
  return (
    <section className="rounded-[24px] border border-slate-200 bg-white p-6 shadow-lg shadow-slate-200/60">
      <p className="text-lg font-black text-slate-950">Store Health</p>
      <p className="mt-1 text-sm font-bold text-slate-400">
        Current operational snapshot
      </p>

      <div className="mt-7 space-y-5">
        {healthData.map(([label, value, width, tone]) => (
          <div key={label}>
            <div className="flex items-center justify-between">
              <p className="text-sm font-black text-slate-700">{label}</p>
              <Badge tone={tone}>{String(value).padStart(2, "0")}</Badge>
            </div>
            <div className="mt-3 h-3 rounded-full bg-slate-100">
              <div className={`h-3 rounded-full bg-main`} style={{ width: width }} />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export default function AdminDashboard() {
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    async function loadData() {
      try {
        const [ordersData, productsData, usersData] = await Promise.all([
          getOrdersFromApi(),
          adminApi("/products/get-products?limit=1000"),
          adminApi("/users/accounts")
        ]);
        if (alive) {
          setOrders(ordersData || []);
          setProducts(productsData.products || []);
          setUsers(usersData.accounts || []);
        }
      } catch (err) {
        console.error("Dashboard fetch error", err);
      } finally {
        if (alive) setLoading(false);
      }
    }
    loadData();
    return () => { alive = false; };
  }, []);

  const {
    metrics,
    recentOrders,
    lowStock,
    revenueBars,
    todayRevenue,
    healthData
  } = useMemo(() => {
    let totalRevenue = 0;
    let todayRev = 0;
    const now = new Date();
    const todayStr = now.toDateString();
    
    const last7Days = Array.from({ length: 7 }).map((_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      return { dateStr: d.toDateString(), day: d.toLocaleDateString("en-US", { weekday: "short" }), total: 0 };
    });

    let paidOrdersCount = 0;
    let pendingPaymentsCount = 0;
    let cancelledOrdersCount = 0;
    let waitingToShipCount = 0;

    orders.forEach(order => {
      const isPaid = order.paymentStatus === "Paid" || order.billStatus === "Paid";
      if (isPaid) paidOrdersCount++;
      if (order.paymentStatus === "PENDING" || order.paymentStatus === "Unpaid") pendingPaymentsCount++;
      if (order.orderStatus === "Cancelled") cancelledOrdersCount++;
      if (order.orderStatus === "Processing") waitingToShipCount++;

      const orderTotal = parseFloat(String(order.total).replace(/[^0-9.]/g, '')) || 0;
      
      if (order.orderStatus === "Delivered" || isPaid) {
        totalRevenue += orderTotal;
      }

      if (!order.date) return;
      const orderDate = new Date(order.date);
      if (isNaN(orderDate.getTime())) return;
      
      if (orderDate.toDateString() === todayStr) {
        todayRev += orderTotal;
      }

      const dayMatch = last7Days.find(d => d.dateStr === orderDate.toDateString());
      if (dayMatch) {
        dayMatch.total += orderTotal;
      }
    });

    const maxWeekly = Math.max(...last7Days.map(d => d.total), 1);
    const revenueBarsData = last7Days.map(d => [d.day, Math.round((d.total / maxWeekly) * 100)]);

    const lowStockItems = products.filter(p => (p.stockQuantity ?? 0) < 10);
    const metricsData = [
      ["Total Revenue", formatTk(totalRevenue), "Lifetime paid/delivered", "bg-main"],
      ["Orders", String(orders.length).padStart(2, "0"), `${waitingToShipCount} processing`, "bg-accent"],
      ["Products", String(products.length).padStart(2, "0"), `${lowStockItems.length} low stock items`, "bg-sky-500"],
      ["Customers", String(users.length).padStart(2, "0"), "Registered accounts", "bg-emerald-500"],
    ];

    const healthDataResult = [
      ["Paid Orders", paidOrdersCount, `${Math.min(100, Math.round((paidOrdersCount / Math.max(orders.length, 1)) * 100))}%`, "green"],
      ["Pending Payments", pendingPaymentsCount, `${Math.min(100, Math.round((pendingPaymentsCount / Math.max(orders.length, 1)) * 100))}%`, "yellow"],
      ["Low Stock", lowStockItems.length, `${Math.min(100, Math.round((lowStockItems.length / Math.max(products.length, 1)) * 100))}%`, "blue"],
      ["Cancelled Orders", cancelledOrdersCount, `${Math.min(100, Math.round((cancelledOrdersCount / Math.max(orders.length, 1)) * 100))}%`, "gray"],
    ];

    const recent = orders.slice(0, 5).map(order => [
      order.id, 
      order.customer, 
      order.total, 
      order.paymentStatus, 
      order.orderStatus
    ]);

    const lowStockFormatted = lowStockItems.slice(0, 5).map(p => [
      p.name, 
      `${p.stockQuantity ?? 0} left`, 
      p.category?.name || "Uncategorized"
    ]);

    return {
      metrics: metricsData,
      recentOrders: recent,
      lowStock: lowStockFormatted,
      revenueBars: revenueBarsData,
      todayRevenue: todayRev,
      healthData: healthDataResult
    };
  }, [orders, products, users]);

  if (loading) {
    return (
      <DashboardShell activeItem="Dashboard">
        <div className="flex h-[60vh] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-main" />
        </div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell activeItem="Dashboard">
      <HeaderPanel todayRevenue={todayRevenue} />

      <div className="mt-4 grid grid-cols-2 gap-3 md:mt-6 md:gap-4 xl:grid-cols-4">
        {metrics.map(([title, value, helper, color]) => (
          <article
            key={title}
            className="relative overflow-hidden rounded-[18px] border border-slate-200 bg-white p-4 shadow-lg shadow-slate-200/60 md:rounded-[22px] md:p-5"
          >
            <div className={`absolute inset-x-0 top-0 h-1.5 ${color}`} />
            <p className="text-sm font-black text-slate-500">{title}</p>
            <p className="mt-3 text-2xl font-black tracking-tight text-slate-950 md:mt-4 md:text-3xl">
              {value}
            </p>
            <p className="mt-3 text-xs font-bold leading-5 text-slate-400">
              {helper}
            </p>
          </article>
        ))}
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.7fr)_minmax(320px,0.8fr)]">
        <RevenuePanel revenueBars={revenueBars} />
        <ActivityPanel healthData={healthData} />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.9fr)]">
        <section className="overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-lg shadow-slate-200/60">
          <div className="border-b border-slate-100 px-6 py-5">
            <p className="text-lg font-black text-slate-950">Recent Orders</p>
            <p className="mt-1 text-sm font-bold text-slate-400">
              Latest customer activity
            </p>
          </div>
          <div className="space-y-3 p-4 md:hidden">
            {recentOrders.length === 0 ? (
              <p className="py-6 text-center text-sm font-bold text-slate-400">No recent orders found.</p>
            ) : recentOrders.map(([id, customer, total, payment, status]) => (
              <div key={id} className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-black text-main">{id}</p>
                    <p className="mt-1 truncate text-xs font-bold text-slate-500">{customer}</p>
                  </div>
                  <Badge tone={status === "Delivered" ? "green" : status === "Processing" ? "blue" : "gray"}>{status}</Badge>
                </div>
                <div className="mt-3 flex items-center justify-between border-t border-slate-200/70 pt-3">
                  <Badge tone={payment === "Paid" ? "green" : "yellow"}>{payment}</Badge>
                  <p className="text-sm font-black text-slate-900">{total}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[720px] text-left">
              <thead>
                <tr className="border-b border-slate-100 text-xs font-black uppercase tracking-[0.25em] text-slate-300">
                  <th className="px-6 py-5">Order</th>
                  <th className="px-5 py-5">Customer</th>
                  <th className="px-5 py-5">Total</th>
                  <th className="px-5 py-5 text-center">Payment</th>
                  <th className="px-5 py-5 text-center">Status</th>
                </tr>
              </thead>
              <tbody>
                {recentOrders.length === 0 && (
                  <tr>
                    <td colSpan="5" className="py-8 text-center text-sm font-bold text-slate-400">
                      No recent orders found.
                    </td>
                  </tr>
                )}
                {recentOrders.map(([id, customer, total, payment, status]) => (
                  <tr key={id} className="border-b border-slate-100 last:border-b-0">
                    <td className="px-6 py-5 text-sm font-black text-main">{id}</td>
                    <td className="px-5 py-5 text-sm font-black text-slate-700">{customer}</td>
                    <td className="px-5 py-5 text-sm font-black text-slate-800">{total}</td>
                    <td className="px-5 py-5 text-center">
                      <Badge tone={payment === "Paid" ? "green" : "yellow"}>{payment}</Badge>
                    </td>
                    <td className="px-5 py-5 text-center">
                      <Badge tone={status === "Delivered" ? "green" : status === "Processing" ? "blue" : "gray"}>
                        {status}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <div className="space-y-6">
          <section className="rounded-[24px] border border-slate-200 bg-white p-6 shadow-lg shadow-slate-200/60">
            <p className="text-lg font-black text-slate-950">Quick Actions</p>
            <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
              {quickActions.map(([label, href, icon]) => (
                <Link
                  key={label}
                  href={href}
                  className="flex h-12 items-center gap-3 rounded-xl border border-slate-200 px-4 text-sm font-black text-main transition hover:bg-mainSoft"
                >
                  <Icon name={icon} className="h-5 w-5" />
                  {label}
                </Link>
              ))}
            </div>
          </section>

          <section className="rounded-[24px] border border-slate-200 bg-white p-6 shadow-lg shadow-slate-200/60">
            <p className="text-lg font-black text-slate-950">Low Stock</p>
            <div className="mt-5 space-y-4">
              {lowStock.length === 0 && (
                <p className="text-sm font-bold text-slate-400">Inventory looks healthy!</p>
              )}
              {lowStock.map(([name, stock, category]) => (
                <div key={name} className="rounded-2xl bg-mainSoft/55 p-4">
                  <p className="text-sm font-black text-slate-800">{name}</p>
                  <p className="mt-1 text-xs font-bold text-slate-500">
                    {category} | {stock}
                  </p>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </DashboardShell>
  );
}
