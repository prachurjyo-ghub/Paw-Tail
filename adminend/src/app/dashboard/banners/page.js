"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import DashboardShell, { Badge, Icon } from "@/components/DashboardShell";
import { useToast } from "@/components/ui/toast";
import { adminApi } from "@/lib/adminApi";
import {
  buildBannerFormData,
  createBannerOnApi,
  deleteBannerOnApi,
  getBannerImageUrl,
  getBannersFromApi,
  toggleBannerActiveOnApi,
  updateBannerOnApi,
} from "@/lib/bannerApi";

const initialForm = {
  name: "",
  bannerType: "hero-banner",
  animalSlug: "",
  categorySlug: "",
  targetPages: [],
  showCatalogHeader: true,
};

function Metric({ title, value, note }) {
  return (
    <article className="rounded-[20px] border border-neutral-200 bg-white p-4 shadow-md shadow-main/5 ring-1 ring-main/15">
      <div className="mb-2 h-1.5 rounded-full bg-gradient-to-r from-main to-main/70" />
      <p className="text-sm font-extrabold text-slate-500">{title}</p>
      <p className="mt-1 text-3xl font-black text-main">{value}</p>
      <p className="mt-1 text-xs font-semibold text-slate-400">{note}</p>
    </article>
  );
}

function HeroBannerPreview({ banners, onEdit, onDelete, onCreate }) {
  const heroBanners = banners
    .filter((banner) => banner.bannerType === "hero-banner")
    .slice(0, 3);
  const slots = Array.from({ length: 3 }, (_, index) => heroBanners[index] || null);

  return (
    <section className="mt-5 rounded-[24px] border border-neutral-200 bg-white p-5 shadow-lg shadow-main/5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-black uppercase tracking-[0.3em] text-main/70">
            Homepage hero preview
          </p>
          <p className="mt-1 text-xs font-semibold text-slate-500">
            These are the three fixed hero slots. Empty slots use the storefront&apos;s built-in image.
          </p>
        </div>
        <Badge tone="green">
          {heroBanners.filter((banner) => banner.isActive).length} active
        </Badge>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-3">
        {slots.map((banner, index) => (
          <article
            key={banner?._id || banner?.id || `empty-${index}`}
            className="overflow-hidden rounded-2xl border border-main/10 bg-mainSoft/30"
          >
            <div className="relative aspect-[8/3] bg-mainSoft/60">
              {banner?.imageUrl ? (
                <Image
                  src={getBannerImageUrl(banner.imageUrl)}
                  alt={banner.name || `Hero banner ${index + 1}`}
                  fill
                  sizes="(max-width: 1024px) 100vw, 33vw"
                  className={`object-cover ${banner.isActive ? "" : "grayscale opacity-50"}`}
                />
              ) : (
                <div className="flex h-full items-center justify-center text-xs font-black uppercase tracking-widest text-main/35">
                  Storefront default
                </div>
              )}
              <span className="absolute left-2 top-2 rounded-full bg-white/90 px-2 py-1 text-[10px] font-black text-main shadow-sm">
                Slot {index + 1}
              </span>
            </div>
            <div className="px-3 py-3">
              <div className="flex items-center justify-between gap-3">
                <p className="truncate text-xs font-black text-main">
                  {banner?.name || "Default hero image"}
                </p>
                <span className={`text-[10px] font-black uppercase ${banner?.isActive ? "text-emerald-600" : "text-slate-400"}`}>
                  {banner ? (banner.isActive ? "Active" : "Hidden") : "Default"}
                </span>
              </div>
              <div className="mt-2.5 flex gap-2">
                <button
                  type="button"
                  onClick={() => (banner ? onEdit(banner) : onCreate())}
                  className="inline-flex h-8 flex-1 items-center justify-center rounded-lg bg-main px-3 text-xs font-black text-white transition hover:bg-mainHover"
                >
                  {banner ? "Replace image" : "Upload image"}
                </button>
                {banner ? (
                  <button
                    type="button"
                    onClick={() => onDelete(banner)}
                    className="inline-flex h-8 items-center justify-center rounded-lg border border-red-100 bg-red-50 px-3 text-xs font-black text-red-600 transition hover:bg-red-100"
                  >
                    Delete
                  </button>
                ) : null}
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function Field({
  label,
  name,
  value,
  onChange,
  type = "text",
  as = "input",
  options = [],
  min,
  placeholder,
}) {
  return (
    <label className="block">
      <span className="text-xs font-black uppercase tracking-[0.22em] text-main/75">
        {label}
      </span>
      {as === "select" ? (
        <select
          name={name}
          value={value}
          onChange={onChange}
          className="mt-1.5 h-11 w-full rounded-xl border border-neutral-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-main"
        >
          {options.map(([optionValue, optionLabel]) => (
            <option key={optionValue} value={optionValue}>
              {optionLabel}
            </option>
          ))}
        </select>
      ) : (
        <input
          name={name}
          value={value}
          onChange={onChange}
          type={type}
          min={min}
          placeholder={placeholder}
          className="mt-1.5 h-11 w-full rounded-xl border border-neutral-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none transition placeholder:text-slate-300 focus:border-main"
        />
      )}
    </label>
  );
}

function BannerSection({ items, targetLabels, onToggle, onDelete, onEdit }) {
  if (!items.length) return null;

  return (
    <section className="overflow-hidden rounded-[24px] border border-neutral-200 bg-white shadow-lg shadow-main/5">
      <div className="border-b border-neutral-100 px-5 py-4">
        <p className="text-sm font-black uppercase tracking-[0.35em] text-main/70">Saved banners</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] border-collapse text-left">
          <thead className="bg-mainSoft/30">
            <tr className="border-b border-neutral-100 text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
              <th className="px-4 py-3">Banner</th>
              <th className="px-4 py-3">Placement</th>
              <th className="px-4 py-3 text-center">State</th>
              <th className="px-4 py-3 text-center">Action</th>
            </tr>
          </thead>
          <tbody>
            {items.map((banner) => {
              const bannerId = banner._id || banner.id;

              return (
              <tr key={bannerId} className="border-b border-neutral-100 last:border-b-0">
                <td className="px-4 py-4">
                  <p className="text-sm font-black text-main">{banner.name}</p>
                  <p className="mt-1 text-[11px] font-black uppercase tracking-wide text-accent">
                    {banner.bannerType === "hero-banner" ? "Hero" : "Promotional"}
                  </p>
                  <p className="mt-1 text-[11px] font-semibold text-slate-400">
                    {bannerId}
                  </p>
                </td>
                <td className="px-4 py-4">
                  <p className="max-w-xs text-xs font-bold leading-5 text-slate-500">
                    {banner.targetPages?.length
                      ? banner.targetPages
                          .map((target) => targetLabels[target] || target)
                          .join(", ")
                      : "Homepage hero"}
                  </p>
                </td>
                <td className="px-4 py-4 text-center">
                  <button type="button" onClick={() => onToggle(banner)} className="inline-flex">
                    <Badge tone={banner.isActive ? "green" : "gray"}>
                      {banner.isActive ? "Active" : "Hidden"}
                    </Badge>
                  </button>
                </td>
                <td className="px-4 py-4 text-center">
                  <div className="flex items-center justify-center gap-2">
                    <button
                      type="button"
                      className="inline-flex h-8 items-center gap-1 rounded-lg border border-main/15 bg-mainSoft px-3 text-xs font-black text-main transition hover:bg-mainSoft/70"
                      onClick={() => onEdit(banner)}
                    >
                      <Icon name="edit" className="h-3.5 w-3.5" />
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => onDelete(banner)}
                      className="inline-flex h-8 items-center gap-1 rounded-lg border border-red-100 bg-red-50 px-3 text-xs font-black text-red-600 transition hover:bg-red-100"
                    >
                      <Icon name="trash" className="h-3.5 w-3.5" />
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default function BannersPage() {
  const { showToast, confirm } = useToast();
  const [banners, setBanners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState("");
  const [editingId, setEditingId] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [animals, setAnimals] = useState([]);
  const [categories, setCategories] = useState([]);
  const createRef = useRef(null);

  const loadBanners = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await getBannersFromApi();
      setBanners(rows.filter((banner) =>
        banner.bannerType === "hero-banner" ||
        (banner.bannerType === "promo-banner" && banner.targetPages?.length)
      ));
    } catch (error) {
      showToast({
        tone: "danger",
        title: error.message || "Failed to load banners.",
      });
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadBanners();
  }, [loadBanners]);

  useEffect(() => {
    let alive = true;

    Promise.all([
      adminApi("/animals/get-animals"),
      adminApi("/categories/get-categories"),
    ])
      .then(([animalData, categoryData]) => {
        if (!alive) return;
        setAnimals(animalData.animals || []);
        setCategories(categoryData.categories || []);
      })
      .catch((error) => {
        if (alive) {
          showToast({
            tone: "danger",
            title: error.message || "Could not load banner target pages.",
          });
        }
      });

    return () => {
      alive = false;
    };
  }, [showToast]);

  useEffect(() => {
    if (!imageFile) {
      setImagePreview("");
      return;
    }

    const objectUrl = URL.createObjectURL(imageFile);
    setImagePreview(objectUrl);

    return () => URL.revokeObjectURL(objectUrl);
  }, [imageFile]);

  const targetLabels = useMemo(
    () => Object.fromEntries([
      ...animals.map((animal) => [`animal:${animal.slug}`, `${animal.name} overview`]),
      ...categories.map((category) => [`category:${category.slug}`, `${category.animalName} / ${category.name}`]),
    ]),
    [animals, categories]
  );
  const selectedAnimal = animals.find((animal) => animal.slug === form.animalSlug);
  const subcategoryOptions = categories.filter((category) => {
    const animalName = String(selectedAnimal?.name || "").trim().toLowerCase();
    const categoryAnimal = String(category.animalName || "").trim().toLowerCase();
    return animalName && (
      categoryAnimal === animalName ||
      categoryAnimal === `${animalName}s` ||
      `${categoryAnimal}s` === animalName
    );
  });
  const summary = useMemo(
    () => ({
      active: banners.filter((banner) => banner.isActive).length,
      total: banners.length,
    }),
    [banners]
  );

  const resetForm = () => {
    setForm(initialForm);
    setImageFile(null);
    setEditingId("");
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({
      ...prev,
      [name]: value,
      ...(name === "animalSlug" ? { categorySlug: "" } : {}),
      ...(name === "bannerType"
        ? {
            animalSlug: "",
            categorySlug: "",
            targetPages: [],
            showCatalogHeader: true,
          }
        : {}),
    }));
  };

  const addTargetPage = () => {
    if (!form.animalSlug) {
      showToast({ tone: "warning", title: "Select a category first." });
      return;
    }

    const targetPage = form.categorySlug
      ? `category:${form.categorySlug}`
      : `animal:${form.animalSlug}`;

    if (form.targetPages.includes(targetPage)) {
      showToast({ tone: "warning", title: "That page is already selected." });
      return;
    }

    setForm((current) => ({
      ...current,
      targetPages: [...current.targetPages, targetPage],
      animalSlug: "",
      categorySlug: "",
    }));
  };

  const removeTargetPage = (targetPage) => {
    setForm((current) => ({
      ...current,
      targetPages: current.targetPages.filter((page) => page !== targetPage),
    }));
  };

  const scrollToCreate = () => {
    setShowCreate(true);
    resetForm();
  };

  const createHeroBanner = () => {
    scrollToCreate();
    window.requestAnimationFrame(() => {
      createRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  const startEdit = (banner) => {
    const bannerId = banner._id || banner.id;
    setShowCreate(true);
    setEditingId(bannerId);
    setForm({
      name: banner.name || "",
      bannerType: banner.bannerType,
      animalSlug: "",
      categorySlug: "",
      targetPages: banner.targetPages || [],
      showCatalogHeader: banner.showCatalogHeader !== false,
    });
    setImageFile(null);
    setImagePreview(getBannerImageUrl(banner.imageUrl));
    createRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!form.name.trim()) {
      showToast({ tone: "warning", title: "Banner name is required." });
      return;
    }

    if (form.bannerType === "promo-banner" && !form.targetPages.length) {
      showToast({ tone: "warning", title: "Add at least one page for this promotional banner." });
      return;
    }

    if (!editingId && !imageFile) {
      showToast({ tone: "warning", title: "Banner image is required." });
      return;
    }

    setSaving(true);
    try {
      const payload = buildBannerFormData({
        name: form.name,
        bannerType: form.bannerType,
        slideNumber: 1,
        targetPages:
          form.bannerType === "promo-banner"
            ? form.targetPages
            : [],
        showCatalogHeader:
          form.bannerType === "promo-banner" ? form.showCatalogHeader : true,
        imageFile,
      });

      if (editingId) {
        await updateBannerOnApi(editingId, payload);
        showToast({ tone: "success", title: "Banner updated." });
      } else {
        await createBannerOnApi(payload);
        showToast({ tone: "success", title: "Banner created." });
      }

      resetForm();
      setShowCreate(false);
      await loadBanners();
    } catch (error) {
      showToast({
        tone: "danger",
        title: error.message || "Could not save banner.",
      });
    } finally {
      setSaving(false);
    }
  };

  const toggleBanner = async (banner) => {
    const bannerId = banner._id || banner.id;

    try {
      const updated = await toggleBannerActiveOnApi(bannerId, !banner.isActive);
      setBanners((current) =>
        current.map((row) =>
          (row._id || row.id) === (updated._id || updated.id) ? updated : row
        )
      );
      showToast({
        tone: "success",
        title: updated.isActive ? "Banner activated." : "Banner hidden.",
      });
    } catch (error) {
      showToast({
        tone: "danger",
        title: error.message || "Could not update banner status.",
      });
    }
  };

  const deleteBanner = (banner) => {
    const bannerId = banner._id || banner.id;

    confirm({
      title: `Delete ${banner.name || "this banner"}?`,
      description: "This banner and its image will be removed.",
      confirmLabel: "Delete",
      tone: "danger",
      onConfirm: async () => {
        try {
          await deleteBannerOnApi(bannerId);
          setBanners((current) =>
            current.filter((row) => (row._id || row.id) !== bannerId)
          );
          if (editingId === bannerId) {
            resetForm();
          }
          showToast({ tone: "success", title: "Banner deleted." });
        } catch (error) {
          showToast({
            tone: "danger",
            title: error.message || "Could not delete banner.",
          });
        }
      },
    });
  };

  return (
    <DashboardShell activeItem="Banners">
      <div
        ref={createRef}
        className="rounded-[24px] border border-neutral-200 bg-white px-5 py-5 shadow-lg shadow-main/5 md:px-6"
      >
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.35em] text-main/70">
              Marketing
            </p>
            <h1 className="mt-2 text-2xl font-black tracking-tight text-main md:text-3xl">
              Banners
            </h1>
            <p className="mt-1.5 max-w-3xl text-sm font-semibold leading-6 text-slate-500">
              Manage the three homepage hero images and promotional images for catalog pages.
            </p>
          </div>
          {!showCreate ? (
            <button
              type="button"
              onClick={scrollToCreate}
              className="inline-flex h-11 shrink-0 items-center gap-2 self-start rounded-xl bg-main px-4 text-sm font-black text-white transition hover:bg-mainHover"
            >
              <Icon name="send" className="h-4 w-4" />
              Create banner
            </button>
          ) : null}
        </div>

        {showCreate ? (
          <section id="create-banner" className="mt-6 border-t border-neutral-100 pt-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-black uppercase tracking-[0.35em] text-main/70">
                  {editingId ? "Edit Banner" : "Create Banner"}
                </p>
                <h2 className="mt-2 text-xl font-black text-main">
                  {editingId ? "Update banner entry" : "New banner entry"}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowCreate(false);
                  resetForm();
                }}
                className="inline-flex h-9 items-center rounded-xl border border-neutral-200 px-3 text-xs font-black text-slate-500 transition hover:bg-mainSoft hover:text-main"
              >
                Close
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-5 grid gap-4 sm:grid-cols-2">
              <Field
                label="Title"
                name="name"
                value={form.name}
                onChange={handleChange}
                placeholder="Holiday Pet Sale"
              />
              <Field
                label="Banner type"
                name="bannerType"
                value={form.bannerType}
                onChange={handleChange}
                as="select"
                options={[
                  ["hero-banner", "Homepage hero"],
                  ["promo-banner", "Promotional page banner"],
                ]}
              />

              {form.bannerType === "promo-banner" ? (
                <div className="rounded-2xl border border-main/10 bg-mainSoft/25 p-4 sm:col-span-2">
                  <p className="text-xs font-black uppercase tracking-[0.22em] text-main/75">
                    Show on pages
                  </p>
                  <p className="mt-1 text-xs font-semibold text-slate-500">
                    Choose a category page or one of its subcategory pages, then add it. Repeat to use the same banner on multiple pages.
                  </p>
                  <div className="mt-3 grid gap-3 md:grid-cols-[1fr_1fr_auto] md:items-end">
                    <Field
                      label="Category"
                      name="animalSlug"
                      value={form.animalSlug}
                      onChange={handleChange}
                      as="select"
                      options={[
                        ["", "Select category"],
                        ...animals.map((animal) => [animal.slug, animal.name]),
                      ]}
                    />
                    <Field
                      label="Subcategory (optional)"
                      name="categorySlug"
                      value={form.categorySlug}
                      onChange={handleChange}
                      as="select"
                      options={[
                        ["", form.animalSlug ? "Main category page" : "Select category first"],
                        ...subcategoryOptions.map((category) => [category.slug, category.name]),
                      ]}
                    />
                    <button
                      type="button"
                      onClick={addTargetPage}
                      className="inline-flex h-11 items-center justify-center rounded-xl bg-main px-5 text-sm font-black text-white transition hover:bg-mainHover"
                    >
                      Add page
                    </button>
                  </div>

                  {form.targetPages.length ? (
                    <div className="mt-4 flex flex-wrap gap-2" aria-label="Selected banner pages">
                      {form.targetPages.map((targetPage) => (
                        <span
                          key={targetPage}
                          className="inline-flex items-center gap-2 rounded-full border border-main/15 bg-white py-1.5 pl-3 pr-1.5 text-xs font-black text-main"
                        >
                          {targetLabels[targetPage] || targetPage}
                          <button
                            type="button"
                            onClick={() => removeTargetPage(targetPage)}
                            className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-mainSoft text-main transition hover:bg-red-50 hover:text-red-600"
                            aria-label={`Remove ${targetLabels[targetPage] || targetPage}`}
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-3 text-xs font-bold text-slate-400">No pages added yet.</p>
                  )}

                  <div className="mt-4 flex items-center justify-between gap-4 rounded-xl border border-main/10 bg-white p-3.5">
                    <div>
                      <p className="text-sm font-black text-main">Show green category header</p>
                      <p className="mt-0.5 text-xs font-semibold text-slate-500">
                        Turn this off to show only the page name above the promotional banner.
                      </p>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={form.showCatalogHeader}
                      onClick={() =>
                        setForm((current) => ({
                          ...current,
                          showCatalogHeader: !current.showCatalogHeader,
                        }))
                      }
                      className={`relative h-7 w-12 shrink-0 rounded-full transition ${
                        form.showCatalogHeader ? "bg-main" : "bg-neutral-300"
                      }`}
                    >
                      <span
                        className={`absolute left-1 top-1 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${
                          form.showCatalogHeader ? "translate-x-5" : "translate-x-0"
                        }`}
                      />
                      <span className="sr-only">
                        {form.showCatalogHeader ? "Disable" : "Enable"} green category header
                      </span>
                    </button>
                  </div>
                </div>
              ) : null}

              <div className="sm:col-span-2">
                <span className="text-xs font-black uppercase tracking-[0.22em] text-main/75">
                  Banner image {editingId ? "(optional on update)" : ""}
                </span>
                <p className="mt-1 text-xs font-semibold text-slate-500">
                  {form.bannerType === "hero-banner"
                    ? "Required ratio: 8:3. Recommended size: 2048 × 768 px. Maximum three hero banners."
                    : "Required ratio: 5:1. Recommended size: 2000 × 400 px."}
                </p>
                <div className="mt-1.5 flex flex-wrap items-center gap-3">
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={(event) =>
                      setImageFile(event.target.files?.[0] || null)
                    }
                    className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-mainSoft file:px-3 file:py-2 file:text-sm file:font-black file:text-main"
                  />
                  {imagePreview ? (
                    <div
                      className={`relative w-full max-w-xl overflow-hidden rounded-xl border border-neutral-200 bg-neutral-50 ${
                        form.bannerType === "hero-banner" ? "aspect-[8/3]" : "aspect-[5/1]"
                      }`}
                    >
                      <Image
                        src={imagePreview}
                        alt="Banner preview"
                        fill
                        unoptimized={imagePreview.startsWith("blob:")}
                        className="object-cover"
                      />
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="flex justify-end gap-2 sm:col-span-2">
                {editingId ? (
                  <button
                    type="button"
                    onClick={resetForm}
                    className="inline-flex h-11 items-center rounded-xl border border-neutral-200 px-4 text-sm font-black text-main transition hover:bg-mainSoft"
                  >
                    Cancel edit
                  </button>
                ) : null}
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex h-11 items-center gap-2 rounded-xl bg-main px-4 text-sm font-black text-white transition hover:bg-mainHover disabled:cursor-not-allowed disabled:bg-neutral-300"
                >
                  <Icon name="check" className="h-4 w-4" />
                  {saving ? "Saving..." : editingId ? "Update banner" : "Save banner"}
                </button>
              </div>
            </form>
          </section>
        ) : null}
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2">
        <Metric
          title="Active banners"
          value={summary.active}
          note="Currently visible on the storefront."
        />
        <Metric
          title="Total banners"
          value={summary.total}
          note="All saved banners in the system."
        />
      </div>

      {!loading ? (
        <HeroBannerPreview
          banners={banners}
          onEdit={startEdit}
          onDelete={deleteBanner}
          onCreate={createHeroBanner}
        />
      ) : null}

      <div className="mt-5 space-y-5">
        {loading ? (
          <div className="rounded-[24px] border border-neutral-200 bg-white p-8 text-center text-sm font-bold text-slate-500">
            Loading page banners...
          </div>
        ) : banners.length ? (
          <BannerSection
            items={banners}
            targetLabels={targetLabels}
            onToggle={toggleBanner}
            onEdit={startEdit}
            onDelete={deleteBanner}
          />
        ) : (
          <div className="rounded-[24px] border border-dashed border-main/20 bg-white p-8 text-center text-sm font-bold text-slate-500">
            No page banners have been created yet.
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
