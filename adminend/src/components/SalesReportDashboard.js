"use client";

import { useEffect, useMemo, useState } from "react";

import DashboardShell, { Badge } from "@/components/DashboardShell";
import { useToast } from "@/components/ui/toast";
import { adminApi } from "@/lib/adminApi";

const cardStyles = [
  ["from-cyan-400 to-sky-300", "bg-cyan-400"],
  ["from-emerald-400 to-teal-300", "bg-emerald-400"],
  ["from-violet-500 to-fuchsia-300", "bg-violet-400"],
  ["from-amber-400 to-orange-300", "bg-amber-400"],
  ["from-cyan-400 to-sky-300", "bg-cyan-400"],
  ["from-violet-500 to-fuchsia-300", "bg-violet-400"],
  ["from-rose-500 via-orange-400 to-accent", "bg-accent"],
  ["from-emerald-400 to-teal-300", "bg-emerald-400"],
];

const mixColors = ["bg-main", "bg-cyan-400", "bg-accent", "bg-violet-400", "bg-emerald-400"];
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

  const palette = ["#173f31", "#22c1e8", "#f28c38", "#a78bfa", "#34d399"];
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
    return [["No sales", "BDT 0", 8, 8]];
  }

  return rows.map(([label, total]) => {
    const height = Math.max(10, Math.round((total / max) * 88));
    return [label, shortMoney(total), height, Math.max(8, height - 18)];
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
        ["Revenue", money(totalRevenue), `${paidOrders.length} paid orders in range`],
        ["Sales Profit", money(totalRevenue), "Net collected revenue; cost data is not stored"],
        ["Gross Profit", money(totalRevenue), "Cost-of-goods data is not available"],
        ["Net Profit", money(totalRevenue - 0), "After recorded procurement spend"],
        ["Orders Closed", String(revenueOrders.length), `${cancelledOrders.length} cancelled orders`],
        ["Discounts", money(discounts), "Promo discounts applied in this range"],
        ["Procurement Spend", money(0), "Supplier invoice data is not stored"],
        ["Due Revenue", money(dueRevenue), `${unpaidOrders.length} unpaid orders`],
      ].map(([title, value, helper], index) => ({
        title,
        value,
        helper,
        accent: cardStyles[index][0],
        marker: cardStyles[index][1],
      })),
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
    <div className="rounded-[28px] border border-neutral-200 bg-white px-6 py-7 shadow-lg shadow-main/5 md:px-8">
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_520px] xl:items-end">
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
          <p className="mt-5 text-sm font-black text-slate-600">
            Active range: {rangeLabel(anchorDate, reportType)}
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
          <label>
            <span className="text-sm font-black text-slate-600">Report Type</span>
            <select
              value={reportType}
              onChange={(event) => onReportTypeChange(event.target.value)}
              className="mt-2 h-12 w-full rounded-xl border border-cyan-200 bg-white px-4 text-sm font-black text-slate-700 outline-none shadow-sm focus:border-cyan-400"
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
              className="mt-2 h-12 w-full rounded-xl border border-neutral-200 bg-white px-4 text-sm font-black text-slate-700 outline-none shadow-sm focus:border-main"
            />
          </label>
          <button
            type="button"
            onClick={() => window.print()}
            className="mt-7 h-12 rounded-xl bg-[#268ccd] px-6 text-sm font-black text-white shadow-md shadow-sky-700/20 transition hover:bg-[#1f78af]"
          >
            Export Report
          </button>
        </div>
      </div>
    </div>
  );
}

function MetricCards({ cards }) {
  const primaryCards = cards.slice(0, 5);
  const secondaryCards = cards.slice(5);

  return (
    <div className="mt-6 space-y-5">
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-5">
        {primaryCards.map((card) => (
          <MetricCard key={card.title} card={card} />
        ))}
      </div>
      <div className="grid gap-5 md:grid-cols-3">
        {secondaryCards.map((card) => (
          <MetricCard key={card.title} card={card} />
        ))}
      </div>
    </div>
  );
}

function MetricCard({ card }) {
  return (
    <article className="relative flex min-h-44 flex-col overflow-hidden rounded-[24px] border border-neutral-200 bg-white p-5 shadow-lg shadow-main/5">
      <div className={`absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r ${card.accent}`} />
      <p className="text-sm font-black text-slate-500">{card.title}</p>
      <p className="mt-4 whitespace-nowrap text-[clamp(1.35rem,1.55vw,2rem)] font-black leading-tight tracking-tight text-slate-950">
        {card.value}
      </p>
      <p className="mt-auto pr-14 pt-7 text-sm font-bold leading-6 text-slate-400">
        {card.helper}
      </p>
      <span
        className={`absolute bottom-5 right-5 h-12 w-12 rounded-2xl ${card.marker} shadow-lg opacity-95`}
      />
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
            <span className="h-3 w-3 rounded-full bg-cyan-400" />
            Revenue
          </span>
          <span className="inline-flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-emerald-400" />
            Net
          </span>
        </div>
      </div>

      <div className="mt-8 grid min-h-72 gap-4 rounded-2xl bg-mainSoft/35 px-4 pb-5 pt-8 sm:grid-cols-7">
        {flowPoints.map(([label, amount, sales, profit]) => (
          <div key={label} className="flex min-w-0 flex-col items-center justify-end gap-3">
            <div className="flex h-44 w-full items-end justify-center gap-2">
              <div
                className="w-5 rounded-t-full bg-cyan-400 shadow-lg shadow-cyan-200"
                style={{ height: `${sales}%` }}
              />
              <div
                className="w-5 rounded-t-full bg-emerald-400 shadow-lg shadow-emerald-200"
                style={{ height: `${profit}%` }}
              />
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
      <div className="border-b border-neutral-100 px-6 py-5">
        <p className="text-lg font-black text-slate-950">Top Selling Products</p>
        <p className="mt-1 text-sm font-bold text-slate-400">
          Revenue contribution by item
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-left">
          <thead>
            <tr className="border-b border-neutral-100 text-xs font-black uppercase tracking-[0.25em] text-slate-300">
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
                <tr key={product} className="border-b border-neutral-100 last:border-b-0">
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
      <div className="border-b border-neutral-100 px-6 py-5">
        <p className="text-lg font-black text-slate-950">Orders in Range</p>
        <p className="mt-1 text-sm font-bold text-slate-400">
          Backend orders included in this report period
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[920px] text-left">
          <thead>
            <tr className="border-b border-neutral-100 text-xs font-black uppercase tracking-[0.25em] text-slate-300">
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
                <tr key={id} className="border-b border-neutral-100 last:border-b-0">
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
