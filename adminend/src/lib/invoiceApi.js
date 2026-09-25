import { adminApi } from "@/lib/adminApi";

export const formatTk = (amount) => {
  const value = Number(amount) || 0;
  return `Tk ${value.toLocaleString("en-US")}`;
};

export const formatInvoiceDate = (date) => {
  if (!date) return "—";
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return "—";
  return parsed.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

export async function getInvoicesFromApi(params = {}) {
  const query = new URLSearchParams();
  if (params.q) query.set("q", params.q);
  if (params.orderStatus) query.set("orderStatus", params.orderStatus);
  const suffix = query.toString() ? `?${query.toString()}` : "";
  const data = await adminApi(`/invoices/get-invoices${suffix}`);
  return {
    invoices: data.invoices || [],
    summary: data.summary || { total: 0, revenue: 0 },
  };
}

export async function getInvoiceFromApi(orderId) {
  const data = await adminApi(`/invoices/get-invoice/${orderId}`);
  return data.invoice;
}
