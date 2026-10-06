export const statusStyles = {
  Pending: "bg-amber-100 text-amber-700",
  Confirmed: "bg-sky-100 text-sky-700",
  Delivered: "bg-mainSoft text-main",
  "In Transit": "bg-accent/15 text-accent",
  Shipping: "bg-accent/15 text-accent",
  Shipped: "bg-accent/15 text-accent",
  Processing: "bg-amber-100 text-amber-700",
  Cancelled: "bg-red-100 text-red-700",
};

export function formatBDT(amount) {
  return new Intl.NumberFormat("en-BD", {
    style: "currency",
    currency: "BDT",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function getInitials(name) {
  return (name || "")
    .trim()
    .split(/\s+/)
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}
