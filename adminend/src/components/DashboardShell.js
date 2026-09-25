"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useAdminAuth } from "@/components/AuthGate";
import LogoutButton from "@/components/LogoutButton";
import BrandLogo from "@/components/BrandLogo";
import AdminGlobalSearch from "@/components/AdminGlobalSearch";

const navGroups = [
  {
    title: "Overview",
    items: [{ label: "Dashboard", icon: "grid", href: "/dashboard" }],
  },
  {
    title: "Sales",
    items: [
      { label: "Orders", icon: "cart", href: "/dashboard/orders" },
      { label: "Invoices", icon: "invoice", href: "/dashboard/invoices" },
      { label: "Payments", icon: "card", href: "/dashboard/payment-details" },
      { label: "Delivery", icon: "truck", href: "/dashboard/delivery" },
      { label: "Order History", icon: "clock", href: "/dashboard/order-history" },
    ],
  },
  {
    title: "Customers",
    items: [
      { label: "Customers", icon: "users", href: "/dashboard/customer-management" },
      { label: "Inquiries", icon: "chat", href: "/dashboard/inquiries" },
      { label: "Reviews", icon: "star", href: "/dashboard/reviews" },
    ],
  },
  {
    title: "Catalog",
    items: [
      { label: "Products", icon: "cart", href: "/dashboard/products" },
      { label: "Categories", icon: "folder", href: "/dashboard/categories" },
      { label: "Brands", icon: "tag", href: "/dashboard/brands" },
    ],
  },
  {
    title: "Marketing",
    items: [
      { label: "Promo Deals", icon: "ticket", href: "/dashboard/promo-codes" },
      { label: "Banners", icon: "image", href: "/dashboard/banners" },
    ],
  },
  {
    title: "Reports",
    items: [
      { label: "Sales Reports", icon: "chart", href: "/dashboard/sales-report" },
    ],
  },
  {
    title: "Account",
    items: [
      { label: "My Profile", icon: "user", href: "/dashboard/profile" },
      { label: "Settings", icon: "settings", href: "/dashboard/settings" },
      { label: "Logout", icon: "logout", action: "logout" },
    ],
  },
];

export function Icon({ name, className = "h-5 w-5" }) {
  const common = {
    className,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    "aria-hidden": "true",
  };

  const paths = {
    menu: (
      <>
        <path d="M4 7h16" />
        <path d="M4 12h16" />
        <path d="M4 17h16" />
      </>
    ),
    search: (
      <>
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-3.5-3.5" />
      </>
    ),
    bell: (
      <>
        <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
        <path d="M10 21h4" />
      </>
    ),
    check: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="m9 12 2 2 4-5" />
      </>
    ),
    grid: (
      <>
        <rect x="4" y="4" width="6" height="6" rx="1.5" />
        <rect x="14" y="4" width="6" height="6" rx="1.5" />
        <rect x="4" y="14" width="6" height="6" rx="1.5" />
        <rect x="14" y="14" width="6" height="6" rx="1.5" />
      </>
    ),
    invoice: (
      <>
        <path d="M7 3h8l4 4v14H7z" />
        <path d="M15 3v5h5" />
        <path d="M10 13h6" />
        <path d="M10 17h4" />
      </>
    ),
    cart: (
      <>
        <path d="M3 5h2l2.2 10.5a2 2 0 0 0 2 1.5h7.9a2 2 0 0 0 2-1.5L21 8H6" />
        <circle cx="10" cy="20" r="1" />
        <circle cx="18" cy="20" r="1" />
      </>
    ),
    users: (
      <>
        <path d="M16 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2" />
        <circle cx="9.5" cy="7" r="4" />
        <path d="M22 21v-2a4 4 0 0 0-3-3.9" />
        <path d="M16 3.1a4 4 0 0 1 0 7.8" />
      </>
    ),
    chat: (
      <path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z" />
    ),
    card: (
      <>
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <path d="M3 10h18" />
        <path d="M7 15h4" />
      </>
    ),
    chart: (
      <>
        <path d="M5 20V10" />
        <path d="M12 20V4" />
        <path d="M19 20v-7" />
        <rect x="3" y="10" width="4" height="10" rx="1" />
        <rect x="10" y="4" width="4" height="16" rx="1" />
        <rect x="17" y="13" width="4" height="7" rx="1" />
      </>
    ),
    clock: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </>
    ),
    folder: (
      <path d="M3 7a2 2 0 0 1 2-2h5l2 2h7a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    ),
    tag: (
      <>
        <path d="M20 13 11 4H5v6l9 9a2 2 0 0 0 3 0l3-3a2 2 0 0 0 0-3z" />
        <path d="M8 7h.01" />
      </>
    ),
    megaphone: (
      <>
        <path d="m3 11 18-5v12L3 14z" />
        <path d="M7 15v4a2 2 0 0 0 2 2h1" />
      </>
    ),
    ticket: (
      <>
        <path d="M4 7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v2a2 2 0 0 0 0 4v2a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-2a2 2 0 0 0 0-4z" />
        <path d="M12 7v10" />
      </>
    ),
    image: (
      <>
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <path d="m7 13 3-3 4 4 2-2 3 3" />
        <circle cx="8" cy="9" r="1.2" />
      </>
    ),
    star: (
      <path d="m12 3 2.6 5.3 5.8.8-4.2 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8-4.2-4.1 5.8-.8z" />
    ),
    user: (
      <>
        <circle cx="12" cy="8" r="4" />
        <path d="M4 21a8 8 0 0 1 16 0" />
      </>
    ),
    lock: (
      <>
        <rect x="5" y="10" width="14" height="10" rx="2" />
        <path d="M8 10V7a4 4 0 0 1 8 0v3" />
      </>
    ),
    "log-in": (
      <>
        <path d="M10 17H5a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h5" />
        <path d="m15 7 5 5-5 5" />
        <path d="M20 12H9" />
      </>
    ),
    logout: (
      <>
        <path d="M14 17h5a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-5" />
        <path d="m9 7-5 5 5 5" />
        <path d="M4 12h11" />
      </>
    ),
    settings: (
      <>
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
      </>
    ),
    trash: (
      <>
        <path d="M3 6h18" />
        <path d="M8 6V4h8v2" />
        <path d="M19 6l-1 14H6L5 6" />
        <path d="M10 10v6" />
        <path d="M14 10v6" />
      </>
    ),
    x: (
      <>
        <path d="M18 6 6 18" />
        <path d="m6 6 12 12" />
      </>
    ),
    edit: (
      <>
        <path d="M3 21h6" />
        <path d="M14.5 4.5a2.1 2.1 0 0 1 3 3L8 17l-4 1 1-4z" />
      </>
    ),
    send: (
      <>
        <path d="m22 2-7 20-4-9-9-4z" />
        <path d="m22 2-11 11" />
      </>
    ),
    download: (
      <>
        <path d="M12 3v12" />
        <path d="m7 10 5 5 5-5" />
        <path d="M5 21h14" />
      </>
    ),
    truck: (
      <>
        <path d="M3 7h11v9H3z" />
        <path d="M14 10h4l3 3v3h-7z" />
        <circle cx="7" cy="18" r="2" />
        <circle cx="18" cy="18" r="2" />
      </>
    ),
  };

  return <svg {...common}>{paths[name]}</svg>;
}

export function Badge({ children, tone }) {
  const tones = {
    green: "bg-emerald-100 text-emerald-700",
    yellow: "bg-amber-100 text-amber-700",
    gray: "bg-slate-100 text-slate-600",
    blue: "bg-mainSoft text-main",
  };

  return (
    <span className={`admin-badge inline-flex min-w-16 items-center justify-center rounded-full px-3 py-1 text-xs font-bold ${tones[tone]}`}>
      {children}
    </span>
  );
}

function Sidebar({ activeItem, collapsed }) {
  const { admin } = useAdminAuth();
  const adminInitials = getAdminInitials(admin);

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-30 hidden flex-col border-r border-[#e4ece7] bg-white transition-[width] duration-200 lg:flex ${
        collapsed ? "w-[60px]" : "w-[210px]"
      }`}
    >
      <div className={`flex h-14 shrink-0 items-center border-b border-[#e4ece7] ${collapsed ? "justify-center px-2" : "px-3.5"}`}>
        <BrandLogo size="xs" showText={!collapsed} className={collapsed ? "gap-0" : "gap-2.5"} />
      </div>

      <nav className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-1.5 pb-1.5 pt-1 admin-desktop-nav">
        {navGroups.filter((group) => group.items.length > 0).map((group) => (
          <div key={group.title} className="mb-0.5">
            <p className={`px-2 pb-1 pt-3 text-[10.5px] font-bold uppercase tracking-[0.13em] text-[#8a9e96] ${collapsed ? "sr-only" : ""}`}>{group.title}</p>
            <div>
              {group.items.map((item) => {
                const isActive = item.label === activeItem;
                const className = `admin-desktop-nav-link relative my-px flex h-9 items-center rounded-lg text-[13px] font-medium transition ${
                  collapsed ? "justify-center px-0" : "gap-2.5 px-3"
                } ${
                  isActive
                    ? "active bg-[#eef7f2] font-semibold text-[#144336]"
                    : "text-[#3d554b] hover:bg-[#eef7f2] hover:text-[#144336]"
                }`;

                if (item.action === "logout") {
                  return (
                    <LogoutButton
                      key={`${group.title}-${item.label}`}
                      variant="nav"
                      className={`${className} w-full`}
                      icon={<Icon name={item.icon} className="h-[18px] w-[18px] shrink-0" />}
                      showLabel={!collapsed}
                    />
                  );
                }

                if (!item.href || item.href === "#") {
                  return (
                    <button
                      type="button"
                      key={`${group.title}-${item.label}`}
                      className={`${className} w-full cursor-not-allowed opacity-50`}
                      disabled
                    >
                      <Icon name={item.icon} className="h-[18px] w-[18px] shrink-0" />
                      {!collapsed ? <span>{item.label}</span> : null}
                    </button>
                  );
                }

                return (
                  <Link
                    href={item.href}
                    key={`${group.title}-${item.label}`}
                    className={className}
                  >
                    <Icon name={item.icon} className="h-[18px] w-[18px] shrink-0" />
                    {!collapsed ? <span>{item.label}</span> : null}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className={`shrink-0 border-t border-[#e4ece7] px-2 py-2 ${collapsed ? "flex justify-center" : ""}`}>
        <Link href="/dashboard/profile" className={`flex items-center ${collapsed ? "justify-center" : "gap-2 px-1"}`}>
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-accent to-[#ea7c25] text-[11px] font-bold text-white">
            {adminInitials || "A"}
          </span>
          {!collapsed ? (
            <span className="min-w-0 leading-tight">
              <strong className="block truncate text-[11.5px] font-bold text-[#132b24]">{admin?.name || "Admin"}</strong>
              <span className="block truncate text-[10.5px] text-[#6b7f78]">{admin?.email || "Administrator"}</span>
            </span>
          ) : null}
        </Link>
      </div>
    </aside>
  );
}

function getAdminInitials(admin) {
  const name = admin?.name || admin?.email?.split("@")[0] || "Admin";

  return name
    .split(/\s+/)
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function Topbar({ onToggleSidebar }) {
  const { admin } = useAdminAuth();
  const adminInitials = getAdminInitials(admin);

  return (
    <header className="sticky top-0 z-20 flex h-12 items-center gap-2.5 border-b border-[#e4ece7] bg-[#f4f8f5]/90 px-[18px] backdrop-blur-[10px]">
      <button type="button" onClick={onToggleSidebar} aria-label="Toggle sidebar" className="flex h-[30px] w-[30px] items-center justify-center rounded-[7px] text-[#3d554b] transition hover:bg-[#eef7f2] hover:text-[#144336]">
        <Icon name="menu" className="h-4 w-4" />
      </button>

      <AdminGlobalSearch />

      <div className="ml-auto flex items-center gap-1.5">
        <button type="button" aria-label="Notifications" className="relative flex h-8 w-8 items-center justify-center rounded-[7px] border border-[#e4ece7] bg-white text-[#3d554b] transition hover:bg-[#eef7f2] hover:text-[#144336]">
          <Icon name="bell" className="h-4 w-4" />
          <span className="absolute right-1 top-1 h-[7px] w-[7px] rounded-full border-2 border-white bg-accent" />
        </button>
        <div className="flex h-8 overflow-hidden rounded-full border border-[#e4ece7] bg-white text-[#3d554b]">
          <Link
            href="/dashboard/profile"
            className="flex items-center gap-1.5 py-[3px] pl-[3px] pr-2.5 text-[11.5px] font-semibold transition hover:bg-[#eef7f2]"
          >
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-accent to-[#ea7c25] text-[10.5px] font-bold text-white">
              {adminInitials || "A"}
            </span>
            <span>Profile</span>
          </Link>
        </div>
        <LogoutButton variant="icon" />
      </div>
    </header>
  );
}

const mobilePrimaryItems = [
  { label: "Home", activeLabel: "Dashboard", icon: "grid", href: "/dashboard" },
  { label: "Orders", activeLabel: "Orders", icon: "cart", href: "/dashboard/orders" },
  { label: "Customers", activeLabel: "Customers", icon: "users", href: "/dashboard/customer-management" },
  { label: "Products", activeLabel: "Products", icon: "folder", href: "/dashboard/products" },
];

function MobileTopbar({ onOpenMenu }) {
  const { admin } = useAdminAuth();
  const adminInitials = getAdminInitials(admin);

  return (
    <header className="sticky top-0 z-30 flex h-15 items-center justify-between border-b border-slate-200 bg-white/95 px-3 backdrop-blur lg:hidden">
      <BrandLogo size="sm" />
      <div className="flex items-center gap-2">
        <button
          type="button"
          aria-label="Notifications"
          className="relative flex h-10 w-10 items-center justify-center rounded-xl text-main"
        >
          <Icon name="bell" className="h-5 w-5" />
          <span className="absolute right-1.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[9px] font-black text-white">
            1
          </span>
        </button>
        <Link
          href="/dashboard/profile"
          aria-label="Open admin profile"
          className="flex h-10 w-10 items-center justify-center rounded-full bg-accent text-xs font-black text-main shadow-sm"
        >
          {adminInitials || "A"}
        </Link>
        <button
          type="button"
          onClick={onOpenMenu}
          aria-label="Open admin menu"
          className="flex h-10 w-10 items-center justify-center rounded-xl text-main"
        >
          <Icon name="menu" className="h-6 w-6" />
        </button>
      </div>
    </header>
  );
}

function MobileBottomNavigation({ activeItem, menuOpen, onOpenMenu }) {
  const moreIsActive =
    menuOpen || !mobilePrimaryItems.some((item) => item.activeLabel === activeItem);

  return (
    <nav
      aria-label="Primary admin navigation"
      className="fixed inset-x-0 bottom-0 z-40 grid h-16 grid-cols-5 border-t border-slate-200 bg-white/95 px-1 pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_24px_rgba(23,63,49,0.08)] backdrop-blur lg:hidden"
    >
      {mobilePrimaryItems.map((item) => {
        const isActive = activeItem === item.activeLabel && !menuOpen;
        return (
          <Link
            key={item.label}
            href={item.href}
            className={`flex min-w-0 flex-col items-center justify-center gap-1 rounded-xl text-[10px] font-black transition ${
              isActive ? "bg-mainSoft text-main" : "text-slate-500"
            }`}
          >
            <Icon name={item.icon} className="h-5 w-5" />
            <span className="truncate">{item.label}</span>
          </Link>
        );
      })}
      <button
        type="button"
        onClick={onOpenMenu}
        aria-expanded={menuOpen}
        aria-controls="mobile-admin-menu"
        className={`flex min-w-0 flex-col items-center justify-center gap-1 rounded-xl text-[10px] font-black transition ${
          moreIsActive ? "bg-mainSoft text-main" : "text-slate-500"
        }`}
      >
        <Icon name="menu" className="h-5 w-5" />
        <span>More</span>
      </button>
    </nav>
  );
}

function MobileMenu({ activeItem, open, onClose }) {
  useEffect(() => {
    if (!open) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const handleEscape = (event) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleEscape);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      id="mobile-admin-menu"
      className="fixed inset-0 z-50 bg-slate-950/35 lg:hidden"
      onClick={onClose}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="mobile-menu-title"
        onClick={(event) => event.stopPropagation()}
        className="absolute inset-y-0 left-0 flex w-[70vw] flex-col border-r border-slate-200 bg-white shadow-2xl"
      >
        <div className="flex h-14 shrink-0 items-center justify-between border-b border-slate-200 px-3">
          <div id="mobile-menu-title"><BrandLogo size="sm" /></div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close admin menu"
            className="flex h-9 w-9 items-center justify-center rounded-lg text-main"
          >
            <Icon name="x" className="h-4 w-4" />
          </button>
        </div>

        <nav
          aria-label="All admin pages"
          className="grid min-h-0 flex-1 grid-rows-[repeat(18,minmax(0,1fr))] gap-0.5 px-2 py-2"
        >
          {navGroups.flatMap((group) => group.items).map((item) => {
            const isActive = activeItem === item.label;
            const itemClassName = `flex min-h-0 w-full items-center gap-2 rounded-lg px-2.5 text-left text-[11px] font-extrabold leading-none transition ${
              isActive ? "bg-mainSoft text-main" : "text-slate-600 active:bg-slate-100"
            }`;

            if (item.action === "logout") {
              return (
                <LogoutButton
                  key={item.label}
                  variant="nav"
                  className={itemClassName}
                  icon={<Icon name={item.icon} className="h-4 w-4 shrink-0" />}
                />
              );
            }

            return (
              <Link key={item.label} href={item.href} onClick={onClose} className={itemClassName}>
                <Icon name={item.icon} className="h-4 w-4 shrink-0" />
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </section>
    </div>
  );
}

function DesktopPawBackground() {
  const pawPath = "M35 45c0-6-4-11-9-11s-8 5-8 11 4 11 9 11 8-5 8-11Zm23 0c0-6 4-11 9-11s8 5 8 11-4 11-9 11-8-5-8-11ZM25 25c0-5-3-9-7-9s-6 4-6 9 3 9 7 9 6-4 6-9Zm42 0c0-5 3-9 7-9s6 4 6 9-3 9-7 9-6-4-6-9ZM50 20c0-5-3-9-7-9s-7 4-7 9 3 9 7 9 7-4 7-9Zm0 22c-12 0-21 9-21 20 0 8 7 13 15 13 3 0 4-2 6-2s3 2 6 2c8 0 15-5 15-13 0-11-9-20-21-20Z";

  return (
    <div className="pointer-events-none fixed inset-0 z-0 hidden overflow-hidden lg:block" aria-hidden="true">
      <svg className="absolute right-[60px] top-10 h-40 w-40 -rotate-[18deg] fill-[#1a5744] opacity-[0.03]" viewBox="0 0 100 100"><path d={pawPath} /></svg>
      <svg className="absolute bottom-20 left-60 h-[120px] w-[120px] rotate-[22deg] fill-accent opacity-[0.03]" viewBox="0 0 100 100"><path d={pawPath} /></svg>
      <svg className="absolute right-[28%] top-[45%] h-20 w-20 rotate-45 fill-[#1f6b53] opacity-[0.025]" viewBox="0 0 100 100"><path d={pawPath} /></svg>
    </div>
  );
}

export default function DashboardShell({ activeItem, children, notice }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [desktopSidebarCollapsed, setDesktopSidebarCollapsed] = useState(false);
  const closeMobileMenu = useCallback(() => setMobileMenuOpen(false), []);

  return (
    <main className="admin-shell min-h-screen bg-[#f4f8f5] text-[#132b24]">
      <DesktopPawBackground />
      <div className="relative z-[1] flex min-h-screen">
        <Sidebar activeItem={activeItem} collapsed={desktopSidebarCollapsed} />
        <div className={`flex min-w-0 flex-1 flex-col transition-[margin] duration-200 ${desktopSidebarCollapsed ? "lg:ml-[60px]" : "lg:ml-[210px]"}`}>
          <div className="hidden lg:block"><Topbar onToggleSidebar={() => setDesktopSidebarCollapsed((current) => !current)} /></div>
          <MobileTopbar onOpenMenu={() => setMobileMenuOpen(true)} />
          {notice ? (
            <div className="pointer-events-none fixed right-5 top-8 z-30 hidden rounded-xl border border-emerald-100 bg-emerald-50 px-5 py-4 text-sm font-black text-emerald-700 shadow-lg shadow-emerald-100/70 md:flex md:min-w-80 md:items-center md:gap-3">
              <Icon name="check" className="h-5 w-5 text-emerald-600" />
              {notice}
            </div>
          ) : null}
          <section className="admin-content flex-1 px-3 pb-24 pt-4 md:px-5 md:py-6 lg:px-[18px] lg:py-3.5">{children}</section>
          <footer className="hidden border-t border-[#e4ece7] px-[18px] py-3 text-[10.5px] font-medium text-[#6b7f78] lg:flex lg:items-center lg:justify-between">
            <p>Powered by PawTail · Copyright © 2026 Paw Tail. All rights reserved.</p>
            <div className="flex gap-2.5">
              <a href="#" className="hover:text-[#144336]">Terms</a>
              <a href="#" className="hover:text-[#144336]">Policy</a>
            </div>
          </footer>
        </div>
      </div>
      <MobileBottomNavigation
        activeItem={activeItem}
        menuOpen={mobileMenuOpen}
        onOpenMenu={() => setMobileMenuOpen(true)}
      />
      <MobileMenu
        activeItem={activeItem}
        open={mobileMenuOpen}
        onClose={closeMobileMenu}
      />
    </main>
  );
}
