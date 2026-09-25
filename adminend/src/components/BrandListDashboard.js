"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import DashboardShell, { Icon } from "@/components/DashboardShell";
import { useToast } from "@/components/ui/toast";
import { adminApi } from "@/lib/adminApi";

function BrandToggle({ on, onToggle }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={on}
      className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-1 text-[10px] font-black uppercase tracking-wide transition ${
        on
          ? "border-main/25 bg-mainSoft text-main"
          : "border-slate-300 bg-slate-100 text-slate-500"
      }`}
    >
      <span className="relative inline-flex h-4 w-9 items-center">
        <span className="absolute inset-0 rounded-full bg-white/55" />
        <span
          className={`absolute inline-flex h-3.5 w-3.5 items-center justify-center rounded-full text-white transition-transform ${
            on ? "translate-x-5 bg-main" : "translate-x-0.5 bg-slate-500"
          }`}
        >
          <Icon name={on ? "check" : "x"} className="h-2 w-2" />
        </span>
      </span>
      {on ? "On" : "Off"}
    </button>
  );
}

function normalizeAnimals(value) {
  if (Array.isArray(value)) {
    return value.filter(Boolean);
  }

  return [];
}

export default function BrandListDashboard() {
  const { showToast, confirm } = useToast();
  const [brands, setBrands] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;

    async function loadBrands() {
      try {
        const data = await adminApi("/brands/get-brands");
        if (alive) {
          setBrands(data.brands || []);
        }
      } catch (error) {
        showToast({
          tone: "danger",
          title: error.message || "Failed to load brands.",
        });
      } finally {
        if (alive) {
          setLoading(false);
        }
      }
    }

    void loadBrands();

    return () => {
      alive = false;
    };
  }, [showToast]);

  const visibleBrands = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return brands;
    }

    return brands.filter((brand) => {
      const animals = normalizeAnimals(brand.animalNames).join(" ").toLowerCase();
      return [brand.name, brand.slug, animals].some((value) =>
        String(value || "").toLowerCase().includes(query)
      );
    });
  }, [brands, search]);

  const toggleStatus = (brand) => {
    adminApi(`/brands/active-on-off-brand/${brand.slug}`, {
      method: "PATCH",
      body: JSON.stringify({ isActive: !brand.isActive }),
    })
      .then((data) => {
        setBrands((prev) =>
          prev.map((item) => (item.slug === brand.slug ? data.brand : item))
        );
        showToast({
          tone: "success",
          title: `Brand ${!brand.isActive ? "activated" : "deactivated"}.`,
        });
      })
      .catch((error) => {
        showToast({
          tone: "danger",
          title: error.message || "Failed to update brand.",
        });
      });
  };

  const deleteBrand = (brand) => {
    confirm({
      title: `Delete ${brand.name}?`,
      description: "This will soft delete the brand on the backend.",
      confirmLabel: "Delete",
      tone: "danger",
      onConfirm: () => {
        adminApi(`/brands/delete-brand/${brand.slug}`, { method: "DELETE" })
          .then(() => {
            setBrands((prev) =>
              prev.filter((item) => item.slug !== brand.slug)
            );
            showToast({ tone: "success", title: "Brand deleted." });
          })
          .catch((error) => {
            showToast({
              tone: "danger",
              title: error.message || "Failed to delete brand.",
            });
          });
      },
    });
  };

  return (
    <DashboardShell activeItem="Brands">
      <div className="rounded-[24px] border border-neutral-200 bg-white px-5 py-5 shadow-lg shadow-main/5 md:px-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.35em] text-main/70">
              Brands
            </p>
            <h1 className="mt-2 text-2xl font-black tracking-tight text-main md:text-3xl">
              Brand List
            </h1>
            <p className="mt-1.5 max-w-3xl text-sm font-semibold leading-6 text-slate-500">
              Live brand data from the backend.
            </p>
          </div>

          <div className="w-full max-w-md">
            <div className="flex justify-end">
              <Link
                href="/dashboard/brands/create"
                className="inline-flex h-9 items-center rounded-xl bg-main px-4 text-xs font-black text-white transition hover:bg-mainHover"
              >
                Create Brand
              </Link>
            </div>
            <label className="mt-3 block text-xs font-bold uppercase tracking-wide text-main/80">
              Search brands
            </label>
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by brand name or slug"
              className="mt-1.5 h-11 w-full rounded-xl border border-neutral-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none placeholder:text-slate-300 focus:border-main"
            />
          </div>
        </div>
      </div>

      <div className="mt-5 overflow-hidden rounded-[24px] border border-neutral-200 bg-white shadow-lg shadow-main/5">
        <div className="hidden items-center justify-between border-b border-[#e4ece7] bg-gradient-to-b from-[#fbfdfc] to-white px-4 py-2.5 lg:flex">
          <h3 className="text-[11.5px] font-bold uppercase tracking-[0.1em] text-[#6b7f78]">Brand Directory</h3>
          <span className="text-[11px] text-[#6b7f78]">{visibleBrands.length} brands</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead className="bg-mainSoft/30">
              <tr className="border-b border-neutral-100 text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">
                <th className="px-4 py-3">Brand</th>
                <th className="px-3 py-3">Animals</th>
                <th className="px-3 py-3">Slug</th>
                <th className="px-3 py-3 text-center">Status</th>
                <th className="px-3 py-3">Updated</th>
                <th className="px-3 py-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-sm font-semibold text-slate-500">
                    Loading brands...
                  </td>
                </tr>
              ) : visibleBrands.length ? (
                visibleBrands.map((item) => (
                  <tr key={item._id || item.slug} className="border-b border-neutral-100 last:border-b-0">
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-3">
                        <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-mainSoft text-[10px] font-black text-main">
                          {(item.name || "?")
                            .split(" ")
                            .slice(0, 2)
                            .map((part) => part[0])
                            .join("")
                            .toUpperCase()}
                        </span>
                        <span className="truncate text-sm font-black text-main">{item.name}</span>
                      </div>
                    </td>
                    <td className="px-3 py-3.5 text-sm font-semibold text-slate-600">
                      {normalizeAnimals(item.animalNames).join(", ") || "All"}
                    </td>
                    <td className="px-3 py-3.5 text-sm font-semibold text-slate-500">{item.slug}</td>
                    <td className="px-3 py-3.5 text-center">
                      <BrandToggle on={item.isActive} onToggle={() => toggleStatus(item)} />
                    </td>
                    <td className="px-3 py-3.5 text-xs font-semibold text-slate-500">
                      {item.updatedAt ? new Date(item.updatedAt).toLocaleDateString() : "-"}
                    </td>
                    <td className="px-3 py-3.5">
                      <div className="flex items-center justify-center gap-2">
                        <Link
                          href={`/dashboard/brands/update?slug=${encodeURIComponent(item.slug)}`}
                          className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-main/20 bg-mainSoft text-main transition hover:bg-mainSoft/70"
                          aria-label={`Edit ${item.name}`}
                        >
                          <Icon name="edit" className="h-3.5 w-3.5" />
                        </Link>
                        <button
                          type="button"
                          onClick={() => deleteBrand(item)}
                          className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-red-100 bg-red-50 text-red-500 transition hover:bg-red-100"
                          aria-label={`Delete ${item.name}`}
                        >
                          <Icon name="trash" className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-sm font-semibold text-slate-500">
                    No brands found.
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
