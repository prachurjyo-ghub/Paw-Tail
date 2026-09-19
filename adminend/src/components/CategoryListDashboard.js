"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import CategoryIcon from "@/components/CategoryIcon";
import DashboardShell, { Icon } from "@/components/DashboardShell";
import { getApiBaseUrl } from "@/lib/apiBaseUrl";
import { useToast } from "@/components/ui/toast";

const getAssetOrigin = (apiBaseUrl) => apiBaseUrl.replace(/\/api\/v1\/?$/, "");

const resolveImageUrl = (apiBaseUrl, imagePath) => {
  if (!imagePath) return "";
  if (imagePath.startsWith("http://") || imagePath.startsWith("https://")) {
    return imagePath;
  }
  return `${getAssetOrigin(apiBaseUrl)}${imagePath.startsWith("/") ? imagePath : `/${imagePath}`}`;
};

const REQUEST_TIMEOUT_MS = 12000;

const fetchWithTimeout = async (url, options = {}) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    return await fetch(url, { credentials: "include", ...options, signal: controller.signal });
  } finally {
    clearTimeout(timeoutId);
  }
};

const getApiErrorMessage = (error, fallback) => {
  if (error?.name === "AbortError") {
    return "Backend request timeout. Please verify backend is running on port 3000.";
  }
  return error?.message || fallback;
};

const formatDate = (date) => {
  if (!date) return "—";
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return "—";
  return parsed.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

function StatusToggle({ on = true, onToggle }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={on}
      className={`inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-wide ${
        on ? "text-main" : "text-red-600"
      }`}
    >
      <span className="relative inline-flex h-7 w-14 items-center">
        <span
          className={`absolute inset-0 rounded-full border transition-colors ${
            on ? "border-main/25 bg-mainSoft" : "border-red-200 bg-red-100"
          }`}
        />
        <span
          className={`absolute inline-flex h-5 w-5 items-center justify-center rounded-full text-white shadow-sm transition-transform ${
            on ? "translate-x-8 bg-main" : "translate-x-1 bg-red-500"
          }`}
        >
          <Icon name={on ? "check" : "x"} className="h-2.5 w-2.5" />
        </span>
      </span>
      <span>{on ? "On" : "Off"}</span>
    </button>
  );
}

export default function CategoryListDashboard() {
  const { showToast, confirm } = useToast();
  const apiBaseUrl = getApiBaseUrl();
  const [animalRows, setAnimalRows] = useState([]);
  const [categoryRows, setCategoryRows] = useState([]);
  const [searchText, setSearchText] = useState("");
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    try {
      const [animalsRes, categoriesRes] = await Promise.all([
        fetchWithTimeout(`${apiBaseUrl}/animals/get-animals?includeInactive=true`, {
          cache: "no-store",
        }),
        fetchWithTimeout(`${apiBaseUrl}/categories/get-categories?includeInactive=true`, {
          cache: "no-store",
        }),
      ]);

      const animalsJson = await animalsRes.json();
      const categoriesJson = await categoriesRes.json();

      if (!animalsRes.ok || !animalsJson.success) {
        throw new Error(animalsJson.message || "Failed to load animals");
      }
      if (!categoriesRes.ok || !categoriesJson.success) {
        throw new Error(categoriesJson.message || "Failed to load categories");
      }

      setAnimalRows(
        (animalsJson.animals || []).map((item) => ({
          id: item._id,
          name: item.name,
          slug: item.slug,
          icon: item.icon,
          image: item.image,
          active: !!item.isActive,
          updated: formatDate(item.updatedAt),
        }))
      );

      setCategoryRows(
        (categoriesJson.categories || []).map((item) => ({
          id: item._id,
          icon: item.icon,
          image: item.image,
          category: item.name,
          animal: item.animalName,
          slug: item.slug,
          status: item.isActive ? "On" : "Off",
          updated: formatDate(item.updatedAt),
        }))
      );
    } catch (error) {
      showToast({
        tone: "danger",
        title: "Failed to load category data.",
        description: getApiErrorMessage(error, "Please check backend server."),
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredAnimals = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    if (!q) return animalRows;
    return animalRows.filter(
      (item) =>
        item.name.toLowerCase().includes(q) || item.slug.toLowerCase().includes(q)
    );
  }, [animalRows, searchText]);

  const filteredCategories = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    if (!q) return categoryRows;
    return categoryRows.filter(
      (item) =>
        item.category.toLowerCase().includes(q) ||
        item.animal.toLowerCase().includes(q) ||
        item.slug.toLowerCase().includes(q)
    );
  }, [categoryRows, searchText]);

  const toggleAnimalStatus = async (id, nextValue) => {
    try {
      const response = await fetchWithTimeout(
        `${apiBaseUrl}/animals/active-on-off-animals/${id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isActive: nextValue }),
        }
      );
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.message || "Failed to toggle animal status");
      }

      setAnimalRows((prev) =>
        prev.map((item) => (item.id === id ? { ...item, active: nextValue } : item))
      );
      showToast({
        tone: "success",
        title: `Animal ${nextValue ? "activated" : "deactivated"}.`,
      });
    } catch (error) {
      showToast({ tone: "danger", title: getApiErrorMessage(error, "Toggle failed.") });
    }
  };

  const toggleCategoryStatus = async (slug, nextValue) => {
    try {
      const response = await fetchWithTimeout(
        `${apiBaseUrl}/categories/active-on-off-animals/${encodeURIComponent(slug)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isActive: nextValue }),
        }
      );
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.message || "Failed to toggle category status");
      }

      setCategoryRows((prev) =>
        prev.map((item) =>
          item.slug === slug ? { ...item, status: nextValue ? "On" : "Off" } : item
        )
      );
      showToast({
        tone: "success",
        title: `Category ${nextValue ? "activated" : "deactivated"}.`,
      });
    } catch (error) {
      showToast({ tone: "danger", title: getApiErrorMessage(error, "Toggle failed.") });
    }
  };

  const confirmDeleteAnimal = (id, name) => {
    const hasCategories = categoryRows.some(
      (item) =>
        (item.animal || "").trim().toLowerCase() === name.trim().toLowerCase()
    );

    if (hasCategories) {
      showToast({
        tone: "danger",
        title: "Cannot delete this animal.",
        description: "Remove or reassign its categories first.",
      });
      return;
    }

    confirm({
      title: "Delete this animal?",
      description: "This will soft-delete the animal in backend.",
      confirmLabel: "Confirm",
      cancelLabel: "Cancel",
      tone: "danger",
      onConfirm: async () => {
        try {
          const response = await fetchWithTimeout(
            `${apiBaseUrl}/animals/delete-animals/${id}`,
            {
            method: "DELETE",
            }
          );
          const data = await response.json();
          if (!response.ok || !data.success) {
            throw new Error(data.message || "Failed to delete animal");
          }
          setAnimalRows((prev) => prev.filter((item) => item.id !== id));
          showToast({ tone: "success", title: `${name} deleted.` });
        } catch (error) {
          showToast({
            tone: "danger",
            title: getApiErrorMessage(error, "Delete failed."),
          });
        }
      },
    });
  };

  const confirmDeleteCategory = (category) => {
    confirm({
      title: "Delete this category?",
      description:
        "This will soft-delete the category in backend. Categories with products cannot be deleted.",
      confirmLabel: "Confirm",
      cancelLabel: "Cancel",
      tone: "danger",
      onConfirm: async () => {
        try {
          const response = await fetchWithTimeout(
            `${apiBaseUrl}/categories/delete-category/${encodeURIComponent(slug)}`,
            { method: "DELETE" }
          );
          const data = await response.json();
          if (!response.ok || !data.success) {
            throw new Error(data.message || "Failed to delete category");
          }
          setCategoryRows((prev) => prev.filter((item) => item.slug !== slug));
          showToast({ tone: "success", title: "Category deleted." });
        } catch (error) {
          showToast({
            tone: "danger",
            title: getApiErrorMessage(error, "Delete failed."),
          });
        }
      },
    });
  };

  return (
    <DashboardShell activeItem="Categories">
      <div className="rounded-[24px] border border-neutral-200 bg-white px-5 py-5 shadow-lg shadow-main/5 md:px-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.35em] text-main/70">
              Categories
            </p>
            <h1 className="mt-2 text-2xl font-black tracking-tight text-main md:text-3xl">
              Category List
            </h1>
            <p className="mt-1.5 max-w-2xl text-sm font-semibold leading-6 text-slate-500">
              Review categories under each animal and turn each category on or off
              from one place.
            </p>
          </div>

          <div className="w-full max-w-md">
            <div className="flex items-center justify-end gap-2">
              <Link
                href="/dashboard/categories/create-animal"
                className="inline-flex h-9 items-center rounded-xl bg-main px-3 text-xs font-black text-white transition hover:bg-mainHover"
              >
                Create Animal
              </Link>
              <Link
                href="/dashboard/categories/create"
                className="inline-flex h-9 items-center rounded-xl bg-main px-3 text-xs font-black text-white transition hover:bg-mainHover"
              >
                Create Category
              </Link>
            </div>
            <label className="mt-3 block text-xs font-bold uppercase tracking-wide text-main/80">
              Search categories
            </label>
            <input
              type="search"
              value={searchText}
              onChange={(event) => setSearchText(event.target.value)}
              placeholder="Search by category, animal, slug, or ID"
              className="mt-1.5 h-11 w-full rounded-xl border border-neutral-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none placeholder:text-slate-300 focus:border-main"
            />
          </div>
        </div>
      </div>

      {loading ? (
        <div className="mt-4 rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm font-semibold text-slate-500">
          Loading animals and categories...
        </div>
      ) : null}

      <div className="mt-5 overflow-hidden rounded-[24px] border border-neutral-200 bg-white shadow-lg shadow-main/5">
        <div className="border-b border-neutral-100 bg-mainSoft/40 px-5 py-3">
          <p className="text-xs font-black uppercase tracking-[0.3em] text-main/60">
            Animals
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] border-collapse text-left">
            <thead className="bg-mainSoft/25">
              <tr className="border-b border-neutral-100 text-xs font-black uppercase tracking-[0.28em] text-slate-400">
                <th className="px-8 py-4">Animal</th>
                <th className="px-8 py-4">Slug</th>
                <th className="px-8 py-4 text-center">Status</th>
                <th className="px-8 py-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredAnimals.map((animal) => (
                <tr
                  key={animal.slug}
                  className="border-b border-neutral-100 last:border-b-0"
                >
                  <td className="px-8 py-5 text-sm font-black text-main">
                    <div className="flex items-center gap-3">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-mainSoft text-main shadow-xs">
                        {animal.image ? (
                          <Image
                            src={resolveImageUrl(apiBaseUrl, animal.image)}
                            alt={animal.name}
                            width={36}
                            height={36}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <CategoryIcon
                            icon={animal.icon}
                            slug={animal.slug}
                            name={animal.name}
                            className="h-5 w-5"
                          />
                        )}
                      </span>
                      <span>{animal.name}</span>
                    </div>
                  </td>
                  <td className="px-8 py-5 text-sm font-semibold text-slate-500">
                    {animal.slug}
                  </td>
                  <td className="px-8 py-5 text-center">
                    <StatusToggle
                      on={animal.active}
                      onToggle={() => toggleAnimalStatus(animal.id, !animal.active)}
                    />
                  </td>
                  <td className="px-8 py-5 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <Link
                        href={{
                          pathname: "/dashboard/categories/create-animal",
                          query: { mode: "update", id: animal.id },
                        }}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-main/20 bg-mainSoft text-main transition hover:bg-mainSoft/70"
                        aria-label={`Edit ${animal.name}`}
                      >
                        <Icon name="edit" className="h-3.5 w-3.5" />
                      </Link>
                      <button
                        type="button"
                        onClick={() => confirmDeleteAnimal(animal.id, animal.name)}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-red-100 bg-red-50 text-red-500 transition hover:bg-red-100"
                        aria-label={`Delete ${animal.name}`}
                      >
                        <Icon name="trash" className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-5 overflow-hidden rounded-[24px] border border-neutral-200 bg-white shadow-lg shadow-main/5">
        <div className="border-b border-neutral-100 bg-mainSoft/40 px-5 py-3">
          <p className="text-xs font-black uppercase tracking-[0.3em] text-main/60">
            Categories
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] border-collapse text-left">
            <thead className="bg-mainSoft/25">
              <tr className="border-b border-neutral-100 text-xs font-black uppercase tracking-[0.28em] text-slate-400">
                <th className="px-8 py-4">Image / Icon</th>
                <th className="px-8 py-4">Category</th>
                <th className="px-8 py-4">Animal</th>
                <th className="px-8 py-4">Slug</th>
                <th className="px-8 py-4 text-center">Status</th>
                <th className="px-8 py-4">Last Update</th>
                <th className="px-8 py-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredCategories.map((item) => (
                <tr
                  key={item.slug}
                  className="border-b border-neutral-100 last:border-b-0"
                >
                  <td className="px-8 py-5">
                    <span className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-xl bg-mainSoft text-main shadow-xs">
                      {item.image ? (
                        <Image
                          src={resolveImageUrl(apiBaseUrl, item.image)}
                          alt={item.category}
                          width={36}
                          height={36}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <CategoryIcon
                          icon={item.icon}
                          slug={item.slug}
                          name={item.category}
                          className="h-5 w-5"
                        />
                      )}
                    </span>
                  </td>
                  <td className="px-8 py-5 text-sm font-black text-main">{item.name}</td>
                  <td className="px-8 py-5 text-sm font-semibold text-slate-600">
                    {item.animalName}
                  </td>
                  <td className="px-8 py-5 text-sm font-semibold text-slate-500">
                    {item.slug}
                  </td>
                  <td className="px-8 py-5 text-center">
                    <StatusToggle
                      on={item.status === "On"}
                      onToggle={() => toggleCategoryStatus(item.slug, item.status !== "On")}
                    />
                  </td>
                  <td className="px-8 py-5 text-sm font-semibold text-slate-500">
                    {item.updatedAt
                      ? new Date(item.updatedAt).toLocaleDateString()
                      : loading
                        ? "Loading..."
                        : "—"}
                  </td>
                  <td className="px-8 py-5 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <Link
                        href={{
                          pathname: "/dashboard/categories/create",
                          query: { mode: "update", slug: item.slug },
                        }}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-main/20 bg-mainSoft text-main transition hover:bg-mainSoft/70"
                        aria-label={`Edit ${item.category}`}
                      >
                        <Icon name="edit" className="h-3.5 w-3.5" />
                      </Link>
                      <button
                        type="button"
                        onClick={() => confirmDeleteCategory(item.slug)}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-red-100 bg-red-50 text-red-500 transition hover:bg-red-100"
                        aria-label={`Delete ${item.category}`}
                      >
                        <Icon name="trash" className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardShell>
  );
}
