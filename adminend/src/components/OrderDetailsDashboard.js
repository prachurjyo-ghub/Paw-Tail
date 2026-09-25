"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";

import DashboardShell, { Badge } from "@/components/DashboardShell";
import { useToast } from "@/components/ui/toast";
import {
  getOrderByIdFromApi,
  orderStatusOptions,
  paymentStatusOptions,
  UNPAID_DELIVERY_MESSAGE,
  canMarkOrderDelivered,
  updateOrderPaymentStatusOnApi,
  updateOrderStatusOnApi,
} from "@/lib/orderApi";

function statusTone(status) {
  const tones = {
    Pending: "yellow",
    Processing: "blue",
    Shipping: "blue",
    Delivered: "green",
    Cancelled: "gray",
    Due: "yellow",
    Paid: "green",
  };

  return tones[status] || "gray";
}

function InfoCard({ title, children }) {
  return (
    <section className="rounded-[24px] border border-neutral-200 bg-white p-5 shadow-lg shadow-main/5">
      <p className="text-xs font-black uppercase tracking-[0.25em] text-main/70">
        {title}
      </p>
      <div className="mt-4 space-y-2">{children}</div>
    </section>
  );
}

export default function OrderDetailsDashboard() {
  const { showToast } = useToast();
  const router = useRouter();
  const params = useParams();
  const orderId = params?.orderId;
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    const loadOrder = async () => {
      if (!orderId) return;
      setLoading(true);
      try {
        const data = await getOrderByIdFromApi(orderId);
        setOrder(data);
      } catch (error) {
        showToast({
          tone: "danger",
          title: error.message || "Failed to load order details.",
        });
        setOrder(null);
      } finally {
        setLoading(false);
      }
    };

    loadOrder();
  }, [orderId, showToast]);

  async function handleOrderStatusChange(nextStatus) {
    if (!order) return;

    if (nextStatus === "Delivered" && !canMarkOrderDelivered(order)) {
      showToast({
        tone: "danger",
        title: UNPAID_DELIVERY_MESSAGE,
      });
      return;
    }

    setUpdating(true);
    try {
      const updated = await updateOrderStatusOnApi(order.mongoId, nextStatus);
      setOrder(updated);
      showToast({
        tone: "success",
        title: `Order status updated to ${nextStatus}.`,
      });
    } catch (error) {
      showToast({
        tone: "danger",
        title: error.message || "Failed to update order status.",
      });
    } finally {
      setUpdating(false);
    }
  }

  async function handlePaymentStatusChange(nextPaymentStatus) {
    if (!order) return;
    setUpdating(true);
    try {
      const updated = await updateOrderPaymentStatusOnApi(
        order.mongoId,
        nextPaymentStatus
      );
      setOrder(updated);

      if (nextPaymentStatus === "Paid") {
        showToast({
          tone: "success",
          title: "Payment marked as paid.",
          description: "This order will stay active until it is delivered or cancelled.",
        });
        router.push("/dashboard/orders");
        return;
      }

      showToast({
        tone: "success",
        title: "Payment marked as unpaid.",
      });
      router.push("/dashboard/orders");
    } catch (error) {
      showToast({
        tone: "danger",
        title: error.message || "Failed to update payment status.",
      });
    } finally {
      setUpdating(false);
    }
  }

  if (loading) {
    return (
      <DashboardShell activeItem="Orders">
        <div className="rounded-[28px] border border-neutral-200 bg-white p-8 text-sm font-semibold text-slate-500 shadow-lg shadow-main/5">
          Loading order details...
        </div>
      </DashboardShell>
    );
  }

  if (!order) {
    return (
      <DashboardShell activeItem="Orders">
        <div className="rounded-[28px] border border-neutral-200 bg-white p-8 shadow-lg shadow-main/5">
          <p className="text-sm font-black uppercase tracking-[0.35em] text-main/70">
            Order Details
          </p>
          <h1 className="mt-3 text-3xl font-black text-main">Order not found</h1>
          <Link
            href="/dashboard/orders"
            className="mt-6 inline-flex h-11 items-center rounded-xl bg-main px-5 text-sm font-black text-white"
          >
            Back to Orders
          </Link>
        </div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell activeItem="Orders">
      <div className="rounded-[28px] border border-neutral-200 bg-white px-6 py-7 shadow-lg shadow-main/5 md:px-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.35em] text-main/70">
              Order Details
            </p>
            <h1 className="mt-3 text-3xl font-black tracking-tight text-main md:text-4xl">
              {order.id}
            </h1>
            <p className="mt-3 text-sm font-semibold text-slate-400">
              Placed on {order.date}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge tone={statusTone(order.orderStatus)}>{order.orderStatus}</Badge>
            <Badge tone={statusTone(order.billStatus)}>{order.billStatus}</Badge>
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-3">
        <InfoCard title="Customer">
          <p className="text-lg font-black text-slate-800">{order.customer}</p>
          <p className="text-sm font-bold text-slate-500">{order.phone}</p>
          <p className="text-sm font-bold text-slate-500">{order.email}</p>
        </InfoCard>

        <InfoCard title="Payment">
          <p className="text-lg font-black text-slate-800">{order.payment}</p>
          <p className="text-sm font-bold text-slate-500">
            Bill status: {order.billStatus}
          </p>
          <label className="mt-4 block text-xs font-black uppercase tracking-[0.2em] text-main/70">
            Payment status
          </label>
          <select
            aria-label="Update payment status"
            value={order.billStatus === "Paid" ? "Paid" : "Pending"}
            disabled={updating}
            onChange={(event) => handlePaymentStatusChange(event.target.value)}
            className="mt-2 h-11 w-full rounded-xl border border-neutral-200 bg-white px-3 text-sm font-black text-main outline-none transition focus:border-main disabled:opacity-60"
          >
            {paymentStatusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </InfoCard>

        <InfoCard title="Delivery Address">
          <p className="text-lg font-black text-slate-800">
            {order.shippingName || order.customer}
          </p>
          <p className="text-sm font-bold text-slate-500">
            {order.shippingPhone || order.phone}
          </p>
          <p className="text-sm font-bold text-slate-500">{order.city}</p>
          <p className="text-sm font-bold leading-6 text-slate-500">{order.address}</p>
          {order.notes ? (
            <p className="text-sm font-bold text-slate-500">{order.notes}</p>
          ) : null}
        </InfoCard>
      </div>

      <div className="mt-6 overflow-hidden rounded-[28px] border border-neutral-200 bg-white shadow-lg shadow-main/5">
        <div className="border-b border-neutral-100 px-6 py-5">
          <p className="text-lg font-black text-slate-950">Products</p>
          <p className="mt-1 text-sm font-bold text-slate-400">
            Quantity, price, discount, discounted price, and item total.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-left">
            <thead>
              <tr className="border-b border-neutral-100 text-xs font-black uppercase tracking-[0.22em] text-slate-300">
                <th className="px-6 py-5">Product</th>
                <th className="px-5 py-5">SKU</th>
                <th className="px-5 py-5 text-center">Quantity</th>
                <th className="px-5 py-5">Price</th>
                <th className="px-5 py-5">Discount</th>
                <th className="px-5 py-5">Discounted Price</th>
                <th className="px-6 py-5 text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {order.items.map((item) => (
                <tr key={item.key} className="border-b border-neutral-100 last:border-b-0">
                  <td className="px-6 py-5 text-sm font-black text-slate-800">{item.name}</td>
                  <td className="px-5 py-5 text-sm font-bold text-slate-500">{item.sku}</td>
                  <td className="px-5 py-5 text-center text-sm font-black text-main">{item.quantity}</td>
                  <td className="px-5 py-5 text-sm font-bold text-slate-600">{item.price}</td>
                  <td className="px-5 py-5 text-sm font-bold text-accent">{item.discount}</td>
                  <td className="px-5 py-5 text-sm font-black text-slate-800">{item.discountedPrice}</td>
                  <td className="px-6 py-5 text-right text-sm font-black text-slate-800">{item.total}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="rounded-[24px] border border-neutral-200 bg-white p-5 shadow-lg shadow-main/5">
          <p className="text-lg font-black text-slate-950">Order Status</p>
          <p className="mt-2 text-sm font-bold leading-6 text-slate-400">
            Update fulfillment status while the order is still in the active queue.
          </p>
          <label className="mt-4 block text-xs font-black uppercase tracking-[0.2em] text-main/70">
            Status
          </label>
          <select
            aria-label="Update order status"
            value={order.orderStatus}
            disabled={updating}
            onChange={(event) => handleOrderStatusChange(event.target.value)}
            className="mt-2 h-11 w-full rounded-xl border border-neutral-200 bg-white px-3 text-sm font-black text-main outline-none transition focus:border-main disabled:opacity-60"
          >
            {orderStatusOptions.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </div>

        <div className="rounded-[24px] border border-neutral-200 bg-white p-5 shadow-lg shadow-main/5">
          <p className="text-lg font-black text-slate-950">Payment Summary</p>
          <div className="mt-5 space-y-3">
            <div className="flex justify-between text-sm font-bold text-slate-500">
              <span>Subtotal</span>
              <span>{order.subtotal}</span>
            </div>
            {order.discountAmount > 0 ? (
              <div className="flex justify-between text-sm font-bold text-emerald-700">
                <span>
                  Discount{order.promoCode ? ` (${order.promoCode})` : ""}
                </span>
                <span>-{order.discount}</span>
              </div>
            ) : null}
            <div className="flex justify-between text-sm font-bold text-slate-500">
              <span>Delivery ({order.deliveryZone})</span>
              <span>{order.delivery}</span>
            </div>
            <div className="flex justify-between border-t border-neutral-200 pt-3 text-xl font-black text-main">
              <span>Total</span>
              <span>{order.total}</span>
            </div>
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
