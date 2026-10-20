"use client";

import { useEffect, useMemo, useState } from "react";

import DashboardShell, { Badge, Icon } from "@/components/DashboardShell";
import { useToast } from "@/components/ui/toast";
import { adminApi } from "@/lib/adminApi";

const mixColors = ["sales-mix-1", "sales-mix-2", "sales-mix-3", "sales-mix-4", "sales-mix-5"];
const paymentMethodLabels = {
  COD: "Cash on delivery",
  BKASH: "bKash",
  NAGAD: "Nagad",
  CARD: "Card",
  SSL_COMMERZ: "SSLCommerz",
};

function money(value = 0) {
  return `BDT ${Number(value || 0).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function shortMoney(value = 0) {
  return `BDT ${Number(value || 0).toLocaleString("en-US", {
    maximumFractionDigits: 0,
  })}`;
}

function dateInput(value) {
  return new Date(value).toISOString().slice(0, 10);
}

function displayDate(value) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "-";
  return parsed.toLocaleDateString("en-US", {
    month: "numeric",
    day: "numeric",
    year: "numeric",
  });
}

function rangeLabel(date, type) {
  const parsed = new Date(`${date}T00:00:00`);
  if (type === "Daily") return parsed.toLocaleDateString("en-US", { dateStyle: "long" });
  if (type === "Weekly") {
    const start = new Date(parsed);
    start.setDate(parsed.getDate() - parsed.getDay());
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    return `${displayDate(start)} to ${displayDate(end)}`;
  }
  if (type === "Yearly") return String(parsed.getFullYear());
  return parsed.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

function isInRange(value, anchorDate, reportType) {
  const date = new Date(value);
  const anchor = new Date(`${anchorDate}T00:00:00`);
  if (Number.isNaN(date.getTime()) || Number.isNaN(anchor.getTime())) return false;

  if (reportType === "Daily") {
    return date.toDateString() === anchor.toDateString();
  }

  if (reportType === "Weekly") {
    const start = new Date(anchor);
    start.setDate(anchor.getDate() - anchor.getDay());
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(start.getDate() + 7);
    return date >= start && date < end;
  }

  if (reportType === "Yearly") {
    return date.getFullYear() === anchor.getFullYear();
  }

  return (
    date.getFullYear() === anchor.getFullYear() &&
    date.getMonth() === anchor.getMonth()
  );
}

function getCategoryName(category, categoriesById) {
  const id = category?._id || category;
  return categoriesById.get(String(id)) || "Uncategorized";
}

function buildMix(entries, total) {
  const rows = [...entries]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  if (!rows.length) {
    return [{ label: "No sales", value: "0%", color: "bg-slate-300", amount: money(0) }];
  }

  return rows.map(([label, amount], index) => ({
    label,
    value: `${Math.round((amount / Math.max(total, 1)) * 100)}%`,
    color: mixColors[index % mixColors.length],
    amount: money(amount),
  }));
}

function chartGradient(data) {
  if (!data.length || data[0].label === "No sales") return "#e2e8f0";

  const palette = ["#174b5b", "#4e7884", "#c8873d", "#8a725d", "#709185"];
  let cursor = 0;
  const stops = data.map((item, index) => {
    const size = Number(item.value.replace("%", "")) || 0;
    const start = cursor;
    cursor += size * 3.6;
    return `${palette[index % palette.length]} ${start}deg ${cursor}deg`;
  });

  return `conic-gradient(${stops.join(", ")})`;
}

function buildFlowPoints(orders, reportType) {
  const buckets = new Map();

  orders.forEach((order) => {
    const date = new Date(order.createdAt);
    const key =
      reportType === "Yearly"
        ? date.toLocaleDateString("en-US", { month: "short" })
        : date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    buckets.set(key, (buckets.get(key) || 0) + Number(order.grandTotal || 0));
  });

  const rows = [...buckets.entries()].slice(-7);
  const max = Math.max(...rows.map(([, total]) => total), 1);

  if (!rows.length) {
    return [["No sales", "BDT 0", 8]];
  }

  return rows.map(([label, total]) => {
    const height = Math.max(10, Math.round((total / max) * 88));
    return [label, shortMoney(total), height];
  });
}

function useSalesData(reportType, anchorDate) {
  const { showToast } = useToast();
  const [orders, setOrders] = useState([]);
  const [categoriesById, setCategoriesById] = useState(new Map());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function loadData() {
      setLoading(true);
      try {
        const [ordersData, categoriesData] = await Promise.all([
          adminApi("/orders/get-orders", { cache: "no-store" }),
          adminApi("/categories/get-categories?includeInactive=true", { cache: "no-store" }),
        ]);

        if (!active) return;

        setOrders(ordersData.data?.orders || []);
        setCategoriesById(
          new Map(
            (categoriesData.categories || []).map((category) => [
              String(category._id),
              category.name,
            ])
          )
        );
      } catch (error) {
        if (!active) return;
        showToast({
          tone: "danger",
          title: "Failed to load sales report.",
          description: error.message,
        });
      } finally {
        if (active) setLoading(false);
      }
    }

    loadData();

    return () => {
      active = false;
    };
  }, [showToast]);

  return useMemo(() => {
    const rangeOrders = orders.filter((order) =>
      isInRange(order.createdAt, anchorDate, reportType)
    );
    const paidOrders = rangeOrders.filter((order) => order.paymentStatus === "Paid");
    const unpaidOrders = rangeOrders.filter((order) => order.paymentStatus !== "Paid");
    const cancelledOrders = rangeOrders.filter((order) => order.orderStatus === "Cancelled");
    const revenueOrders = paidOrders.filter((order) => order.orderStatus !== "Cancelled");
    const totalRevenue = revenueOrders.reduce(
      (sum, order) => sum + Number(order.grandTotal || 0),
      0
    );
    const dueRevenue = unpaidOrders.reduce(
      (sum, order) => sum + Number(order.grandTotal || 0),
      0
    );
    const discounts = rangeOrders.reduce(
      (sum, order) => sum + Number(order.promoDiscount || 0),
      0
    );
    const deliveryRevenue = rangeOrders.reduce(
      (sum, order) => sum + Number(order.deliveryCharge || 0),
      0
    );

    const categoryTotals = new Map();
    const productTotals = new Map();
    const productRows = new Map();

    revenueOrders.forEach((order) => {
      (order.items || []).forEach((item) => {
        const amount = Number(item.itemSubtotal || 0);
        const name = item.productName || "Unknown product";
        const category = getCategoryName(item.category, categoriesById);

        categoryTotals.set(category, (categoryTotals.get(category) || 0) + amount);
        productTotals.set(name, (productTotals.get(name) || 0) + amount);

        const current = productRows.get(name) || {
          product: name,
          category,
          sold: 0,
          revenue: 0,
        };
        current.sold += Number(item.quantity || 0);
        current.revenue += amount;
        productRows.set(name, current);
      });
    });

    const topProducts = [...productRows.values()]
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 8)
      .map((row) => [
        row.product,
        row.category,
        String(row.sold),
        money(row.revenue),
        money(row.revenue),
      ]);

    const recentSales = rangeOrders.slice(0, 10).map((order) => [
      order.orderNumber,
      order.userInfo?.name || "Unknown",
      displayDate(order.createdAt),
      paymentMethodLabels[order.paymentMethod] || order.paymentMethod || "-",
      order.paymentStatus || "Pending",
      order.orderStatus || "Pending",
      money(order.grandTotal),
    ]);

    return {
      loading,
      cards: [
        ["Collected Revenue", money(totalRevenue), `${paidOrders.length} paid orders in range`, "primary"],
        ["Paid Orders", String(paidOrders.length), "Payments successfully cleared", "positive"],
        ["Due Revenue", money(dueRevenue), `${unpaidOrders.length} orders awaiting payment`, "warning"],
        ["Discounts", money(discounts), "Promo value applied in this range", "neutral"],
        ["Closed Orders", String(revenueOrders.length), "Paid, non-cancelled orders", "neutral"],
        ["Cancelled", String(cancelledOrders.length), "Orders cancelled in this range", "muted"],
        ["Delivery Revenue", money(deliveryRevenue), "Delivery charges recorded", "neutral"],
      ].map(([title, value, helper, tone]) => ({ title, value, helper, tone })),
      flowPoints: buildFlowPoints(revenueOrders, reportType),
      categoryMix: buildMix(categoryTotals, totalRevenue),
      productMix: buildMix(productTotals, totalRevenue),
      topProducts,
      recentSales,
      centerLabel: shortMoney(totalRevenue),
    };
  }, [anchorDate, categoriesById, loading, orders, reportType]);
}

function ReportHeader({ reportType, anchorDate, onReportTypeChange, onAnchorDateChange }) {
  return (
    <div className="admin-page-head rounded-[28px] border border-neutral-200 bg-white px-6 py-7 shadow-lg shadow-main/5 md:px-8">
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_560px] xl:items-center">
        <div>
          <p className="text-sm font-black uppercase tracking-[0.35em] text-main/70">
            Reports
          </p>
          <h1 className="mt-3 text-3xl font-black tracking-tight text-main md:text-4xl">
            Sales Reports
          </h1>
          <p className="mt-4 max-w-4xl text-sm font-semibold leading-7 text-slate-400 md:text-base">
            Review daily, weekly, monthly, and yearly revenue, discounts,
            payment status, and top-selling products from backend orders.
          </p>
          <div className="mt-5 inline-flex items-center gap-2 rounded-full bg-mainSoft px-3.5 py-2 text-xs font-black text-main">
            <span className="h-2 w-2 rounded-full bg-main" />
            {rangeLabel(anchorDate, reportType)}
          </div>
        </div>

        <div className="report-control-panel grid gap-3 rounded-2xl border p-4 sm:grid-cols-[1fr_1fr_auto]">
          <label>
            <span className="text-sm font-black text-slate-600">Report Type</span>
            <select
              value={reportType}
              onChange={(event) => onReportTypeChange(event.target.value)}
              className="mt-2 h-11 w-full rounded-xl border border-neutral-200 bg-white px-3 text-sm font-black text-slate-700 outline-none focus:border-main"
            >
              <option>Daily</option>
              <option>Weekly</option>
              <option>Monthly</option>
              <option>Yearly</option>
            </select>
          </label>
          <label>
            <span className="text-sm font-black text-slate-600">Anchor Date</span>
            <input
              type="date"
              value={anchorDate}
              onChange={(event) => onAnchorDateChange(event.target.value)}
              className="mt-2 h-11 w-full rounded-xl border border-neutral-200 bg-white px-3 text-sm font-black text-slate-700 outline-none focus:border-main"
            />
          </label>
          <button
            type="button"
            onClick={() => window.print()}
            className="mt-7 inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-main px-5 text-sm font-black text-white shadow-sm transition hover:bg-mainHover"
          >
            <Icon name="download" className="h-4 w-4" /> Export
          </button>
        </div>
      </div>
    </div>
  );
}

function MetricCards({ cards }) {
  return (
    <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((card, index) => (
        <MetricCard key={card.title} card={card} featured={index === 0} />
      ))}
    </div>
  );
}

function MetricCard({ card, featured }) {
  return (
    <article className={`sales-metric-card sales-metric-card--${card.tone} flex min-h-40 flex-col rounded-[22px] border border-neutral-200 bg-white p-5 ${featured ? "sm:col-span-2 xl:col-span-1" : ""}`}>
      <div className="flex items-center justify-between gap-4">
        <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">{card.title}</p>
        <span className="sales-metric-indicator" aria-hidden="true" />
      </div>
      <p className="mt-5 whitespace-nowrap text-[clamp(1.3rem,1.55vw,1.85rem)] font-black leading-tight tracking-tight text-slate-950">
        {card.value}
      </p>
      <p className="mt-auto pt-5 text-xs font-semibold leading-5 text-slate-400">
        {card.helper}
      </p>
    </article>
  );
}

function FlowChart({ flowPoints }) {
  return (
    <section className="mt-6 rounded-[24px] border border-neutral-200 bg-white p-6 shadow-lg shadow-main/5">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-sm font-black uppercase tracking-[0.35em] text-main/70">
            Revenue Trends
          </p>
          <h2 className="mt-3 text-2xl font-black text-slate-950">
            Sales flow
          </h2>
        </div>
        <div className="flex gap-5 text-sm font-black text-slate-500">
          <span className="inline-flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-main" />
            Collected revenue
          </span>
        </div>
      </div>

      <div className="sales-flow-grid mt-8 grid min-h-72 gap-3 rounded-2xl px-4 pb-5 pt-8 sm:grid-cols-7">
        {flowPoints.map(([label, amount, sales]) => (
          <div key={label} className="flex min-w-0 flex-col items-center justify-end gap-3">
            <div className="flex h-44 w-full items-end justify-center">
              <div
                className="sales-flow-bar group relative w-8 rounded-t-lg"
                style={{ height: `${sales}%` }}
              >
                <span className="sales-flow-value absolute -top-7 left-1/2 -translate-x-1/2 whitespace-nowrap text-[10px] font-bold opacity-0 transition group-hover:opacity-100">{amount}</span>
              </div>
            </div>
            <div className="text-center">
              <p className="text-xs font-black text-slate-500">{label}</p>
              <p className="mt-1 text-[11px] font-bold text-slate-400">{amount}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function PieChartPanel({ title, subtitle, data, gradient, centerLabel }) {
  return (
    <section className="rounded-[24px] border border-neutral-200 bg-white p-6 shadow-lg shadow-main/5">
      <div>
        <p className="text-lg font-black text-slate-950">{title}</p>
        <p className="mt-1 text-sm font-bold text-slate-400">{subtitle}</p>
      </div>

      <div className="mt-7 grid gap-6 md:grid-cols-[220px_minmax(0,1fr)] md:items-center">
        <div className="relative mx-auto h-52 w-52 rounded-full shadow-inner" style={{ background: gradient }}>
          <div className="absolute inset-8 flex flex-col items-center justify-center rounded-full bg-white shadow-lg">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">
              Total
            </p>
            <p className="mt-2 text-xl font-black text-main">{centerLabel}</p>
          </div>
        </div>

        <div className="space-y-3">
          {data.map((item) => (
            <div
              key={item.label}
              className="flex items-center justify-between gap-4 rounded-2xl bg-mainSoft/35 px-4 py-3"
            >
              <div className="flex min-w-0 items-center gap-3">
                <span className={`h-3.5 w-3.5 shrink-0 rounded-full ${item.color}`} />
                <div className="min-w-0">
                  <p className="truncate text-sm font-black text-slate-700">{item.label}</p>
                  <p className="mt-0.5 text-xs font-bold text-slate-400">{item.amount}</p>
                </div>
              </div>
              <p className="text-sm font-black text-main">{item.value}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function TopProductsTable({ rows }) {
  return (
    <section className="overflow-hidden rounded-[24px] border border-neutral-200 bg-white shadow-lg shadow-main/5">
      <div className="data-command-bar border-b px-6 py-5">
        <p className="text-lg font-black text-slate-950">Top Selling Products</p>
        <p className="mt-1 text-sm font-bold text-slate-400">
          Revenue contribution by item
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="data-table w-full min-w-[760px] text-left">
          <thead>
            <tr>
              <th className="px-6 py-5">Product</th>
              <th className="px-5 py-5">Category</th>
              <th className="px-5 py-5 text-center">Sold</th>
              <th className="px-5 py-5">Revenue</th>
              <th className="px-5 py-5">Net</th>
            </tr>
          </thead>
          <tbody>
            {rows.length ? (
              rows.map(([product, category, sold, revenue, profit]) => (
                <tr key={product}>
                  <td className="px-6 py-5 text-sm font-black text-slate-800">{product}</td>
                  <td className="px-5 py-5 text-sm font-bold text-slate-500">{category}</td>
                  <td className="px-5 py-5 text-center text-sm font-black text-main">{sold}</td>
                  <td className="px-5 py-5 text-sm font-black text-slate-800">{revenue}</td>
                  <td className="px-5 py-5 text-sm font-black text-emerald-600">{profit}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="px-6 py-10 text-center text-sm font-bold text-slate-400">
                  No paid product sales in this range.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function RecentSalesTable({ rows }) {
  return (
    <section className="overflow-hidden rounded-[24px] border border-neutral-200 bg-white shadow-lg shadow-main/5">
      <div className="data-command-bar border-b px-6 py-5">
        <p className="text-lg font-black text-slate-950">Orders in Range</p>
        <p className="mt-1 text-sm font-bold text-slate-400">
          Backend orders included in this report period
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="data-table w-full min-w-[920px] text-left">
          <thead>
            <tr>
              <th className="px-6 py-5">Order ID</th>
              <th className="px-5 py-5">Customer</th>
              <th className="px-5 py-5">Date</th>
              <th className="px-5 py-5">Method</th>
              <th className="px-5 py-5 text-center">Payment</th>
              <th className="px-5 py-5 text-center">Status</th>
              <th className="px-6 py-5">Total</th>
            </tr>
          </thead>
          <tbody>
            {rows.length ? (
              rows.map(([id, customer, date, method, payment, status, total]) => (
                <tr key={id}>
                  <td className="px-6 py-5 text-sm font-black text-main">{id}</td>
                  <td className="px-5 py-5 text-sm font-black text-slate-700">{customer}</td>
                  <td className="px-5 py-5 text-sm font-bold text-slate-500">{date}</td>
                  <td className="px-5 py-5 text-sm font-bold text-slate-500">{method}</td>
                  <td className="px-5 py-5 text-center">
                    <Badge tone={payment === "Paid" ? "green" : "yellow"}>{payment}</Badge>
                  </td>
                  <td className="px-5 py-5 text-center">
                    <Badge tone={status === "Delivered" ? "green" : status === "Cancelled" ? "gray" : "blue"}>
                      {status}
                    </Badge>
                  </td>
                  <td className="px-6 py-5 text-sm font-black text-slate-800">{total}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={7} className="px-6 py-10 text-center text-sm font-bold text-slate-400">
                  No orders found in this range.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default function SalesReportDashboard() {
  const [reportType, setReportType] = useState("Monthly");
  const [anchorDate, setAnchorDate] = useState(() => dateInput(new Date()));
  const report = useSalesData(reportType, anchorDate);

  return (
    <DashboardShell activeItem="Sales Reports">
      <ReportHeader
        reportType={reportType}
        anchorDate={anchorDate}
        onReportTypeChange={setReportType}
        onAnchorDateChange={setAnchorDate}
      />

      {report.loading ? (
        <div className="mt-6 rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm font-semibold text-slate-500">
          Loading live sales report...
        </div>
      ) : null}

      <MetricCards cards={report.cards} />
      <FlowChart flowPoints={report.flowPoints} />

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <PieChartPanel
          title="Category Mix"
          subtitle="Revenue split by product category"
          data={report.categoryMix}
          centerLabel={report.centerLabel}
          gradient={chartGradient(report.categoryMix)}
        />
        <PieChartPanel
          title="Product Mix"
          subtitle="Top product revenue contribution"
          data={report.productMix}
          centerLabel={report.centerLabel}
          gradient={chartGradient(report.productMix)}
        />
      </div>

      <div className="mt-6 grid gap-6 2xl:grid-cols-2">
        <TopProductsTable rows={report.topProducts} />
        <RecentSalesTable rows={report.recentSales} />
      </div>
    </DashboardShell>
  );
}
