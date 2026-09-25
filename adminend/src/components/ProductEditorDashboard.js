"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import DashboardShell from "@/components/DashboardShell";
import { getApiBaseUrl } from "@/lib/apiBaseUrl";
import {
  getMediaRetentionToken,
  resolveMediaUrl,
} from "@/lib/media";
import { useToast } from "@/components/ui/toast";
import { adminApi } from "@/lib/adminApi";

const REQUEST_TIMEOUT_MS = 12000;
const MEDIA_MUTATION_TIMEOUT_MS = 120000;

const fetchWithTimeout = async (
  url,
  options = {},
  timeoutMs = REQUEST_TIMEOUT_MS
) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, {
      credentials: "include",
      ...options,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeoutId);
  }
};

const getApiErrorMessage = (error, fallback) => {
  if (error?.name === "AbortError") {
    return "The request took too long. Check the backend connection and try smaller images.";
  }
  return error?.message || fallback;
};

const resolveImageUrl = (_apiBaseUrl, imagePath) =>
  resolveMediaUrl(imagePath, { legacyFolder: "products", width: 500 });

const emptyForm = {
  name: "",
  description: "",
  category: "",
  animal: "",
  brand: "",
  price: "",
  discountPrice: "",
  stockQuantity: "",
  tags: "",
};

const createEmptyVariant = () => ({
  clientId: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  label: "",
  price: "",
  stockQuantity: "",
});

const mapVariantsFromProduct = (product) => {
  const basePrice = Number(product.price) || 0;

  return (product.variants || []).map((variant) => ({
    clientId: variant._id || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    _id: variant._id,
    label: variant.value || variant.name || "",
    price: String(basePrice + Number(variant.priceAdjustment || 0)),
    stockQuantity: String(variant.stockQuantity ?? 0),
  }));
};

const buildVariantsPayload = (variants, basePrice) =>
  variants
    .filter((variant) => variant.label.trim())
    .map((variant) => ({
      ...(variant._id ? { _id: variant._id } : {}),
      name: "Size",
      value: variant.label.trim(),
      priceAdjustment: Math.max(0, Number(variant.price) - basePrice),
      stockQuantity: Number(variant.stockQuantity) || 0,
      isActive: true,
    }));

function Field({ label, children }) {
  return (
    <div>
      <label className="block text-xs font-black uppercase tracking-wide text-main/80">
        {label}
      </label>
      <div className="mt-1.5">{children}</div>
    </div>
  );
}

function SelectField({ label, value, onChange, options, placeholder, disabled, name }) {
  return (
    <Field label={label}>
      <select
        name={name}
        value={value}
        onChange={onChange}
        disabled={disabled}
        className="h-11 w-full rounded-xl border border-neutral-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none placeholder:text-slate-300 focus:border-main disabled:cursor-not-allowed disabled:bg-slate-50"
      >
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </Field>
  );
}

export default function ProductEditorDashboard({ mode = "create" }) {
  const isUpdate = mode === "update";
  const router = useRouter();
  const searchParams = useSearchParams();
  const slug = searchParams.get("slug");
  const { showToast } = useToast();
  const apiBaseUrl = getApiBaseUrl();
  const [form, setForm] = useState(emptyForm);
  const [existingImages, setExistingImages] = useState([]);
  const [imageFiles, setImageFiles] = useState([]);
  const [loading, setLoading] = useState(isUpdate && !!slug);
  const [optionsLoading, setOptionsLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [offerEnabled, setOfferEnabled] = useState(false);
  const [markStockOut, setMarkStockOut] = useState(false);
  const [isActive, setIsActive] = useState(true);
  const [isFeatured, setIsFeatured] = useState(false);
  const [categories, setCategories] = useState([]);
  const [animals, setAnimals] = useState([]);
  const [brands, setBrands] = useState([]);
  const [variants, setVariants] = useState([]);

  const imagePreviews = useMemo(
    () => imageFiles.map((file) => URL.createObjectURL(file)),
    [imageFiles]
  );

  useEffect(() => {
    return () => {
      imagePreviews.forEach((preview) => URL.revokeObjectURL(preview));
    };
  }, [imagePreviews]);

  useEffect(() => {
    let alive = true;

    Promise.all([
      adminApi("/categories/get-categories"),
      adminApi("/brands/get-brands"),
      adminApi("/animals/get-animals"),
    ])
      .then(([categoryData, brandData, animalData]) => {
        if (!alive) {
          return;
        }

        setCategories(categoryData.categories || categoryData.data?.categories || []);
        setBrands(brandData.brands || brandData.data?.brands || []);
        setAnimals(animalData.animals || animalData.data?.animals || []);
      })
      .catch((error) => {
        showToast({
          tone: "danger",
          title: error.message || "Failed to load dropdown options.",
        });
      })
      .finally(() => {
        if (alive) {
          setOptionsLoading(false);
        }
      });

    return () => {
      alive = false;
    };
  }, [showToast]);

  useEffect(() => {
    if (!isUpdate || !slug) {
      return;
    }

    adminApi(`/products/get-product/${slug}?includeInactive=true`)
      .then((data) => {
        const product = data.product;
        if (!product) {
          throw new Error("Product not found");
        }

        setForm({
          name: product.name || "",
          description: product.description || "",
          category: product.category?.slug || product.category?.name || "",
          animal: product.animal?.slug || product.animal?.name || "",
          brand: product.brand?.slug || product.brand?.name || "",
          price: String(product.price ?? ""),
          discountPrice: String(product.discountPrice ?? ""),
          stockQuantity: String(product.stockQuantity ?? ""),
          tags: (product.tags || []).join(", "),
        });
        setExistingImages(product.images || []);
        setImageFiles([]);
        setVariants(mapVariantsFromProduct(product));
        setOfferEnabled(!!product.isOfferEnabled);
        setMarkStockOut(!!product.isOutOfStock);
        setIsActive(!!product.isActive);
        setIsFeatured(!!product.isFeatured);
      })
      .catch((error) => {
        showToast({
          tone: "danger",
          title: error.message || "Failed to load product.",
        });
      })
      .finally(() => setLoading(false));
  }, [isUpdate, slug, showToast]);

  const title = useMemo(
    () => (isUpdate ? "Update Product" : "Create Product"),
    [isUpdate]
  );

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleImageChange = (event) => {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;
    setImageFiles((prev) => [...prev, ...files]);
    event.target.value = "";
  };

  const removeExistingImage = (imagePath) => {
    setExistingImages((prev) => prev.filter((item) => item !== imagePath));
  };

  const removeNewImage = (index) => {
    setImageFiles((prev) => prev.filter((_, itemIndex) => itemIndex !== index));
  };

  const addVariant = () => {
    setVariants((prev) => [...prev, createEmptyVariant()]);
  };

  const updateVariant = (clientId, field, value) => {
    setVariants((prev) =>
      prev.map((variant) =>
        variant.clientId === clientId ? { ...variant, [field]: value } : variant
      )
    );
  };

  const removeVariant = (clientId) => {
    setVariants((prev) => prev.filter((variant) => variant.clientId !== clientId));
  };

  const previewImage =
    imagePreviews[0] ||
    resolveImageUrl(apiBaseUrl, existingImages[0]) ||
    "";

  const saveProduct = async () => {
    if (
      !form.name.trim() ||
      !form.description.trim() ||
      !form.category.trim() ||
      !form.brand.trim()
    ) {
      showToast({
        tone: "warning",
        title: "Name, description, category, and brand are required.",
      });
      return;
    }

    if (!form.price) {
      showToast({
        tone: "warning",
        title: "Price is required.",
      });
      return;
    }

    const activeVariants = variants.filter((variant) => variant.label.trim());
    if (form.stockQuantity === "" || Number(form.stockQuantity) < 0) {
      showToast({
        tone: "warning",
        title: "Base pack stock quantity is required.",
      });
      return;
    }

    if (activeVariants.length) {
      const invalidVariant = activeVariants.find(
        (variant) =>
          !variant.price ||
          Number(variant.price) < 0 ||
          variant.stockQuantity === "" ||
          Number(variant.stockQuantity) < 0
      );

      if (invalidVariant) {
        showToast({
          tone: "warning",
          title: "Each size option needs a label, price, and stock quantity.",
        });
        return;
      }
    }

    setSaving(true);

    try {
      const basePrice = Number(form.price);
      const variantPayload = buildVariantsPayload(activeVariants, basePrice);
      const formData = new FormData();
      formData.append("name", form.name.trim());
      formData.append("description", form.description.trim());
      formData.append("category", form.category.trim());
      formData.append("animal", form.animal.trim());
      formData.append("brand", form.brand.trim());
      formData.append("price", String(Number(form.price)));
      if (form.discountPrice) {
        formData.append("discountPrice", String(Number(form.discountPrice)));
      }
      formData.append(
        "stockQuantity",
        String(
          markStockOut
            ? 0
            : Number(form.stockQuantity)
        )
      );
      formData.append("tags", form.tags);
      formData.append("variants", JSON.stringify(variantPayload));
      formData.append("isActive", String(isActive));
      formData.append("isFeatured", String(isFeatured));
      formData.append("isOfferEnabled", String(offerEnabled));

      if (isUpdate) {
        formData.append(
          "existingImages",
          JSON.stringify(
            existingImages.map(getMediaRetentionToken).filter(Boolean)
          )
        );
      }

      imageFiles.forEach((file) => {
        formData.append("images", file);
      });

      const response = await fetchWithTimeout(
        isUpdate && slug
          ? `${apiBaseUrl}/products/update-product/${slug}`
          : `${apiBaseUrl}/products/create-product`,
        {
          method: isUpdate ? "PATCH" : "POST",
          body: formData,
        },
        MEDIA_MUTATION_TIMEOUT_MS
      );

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.message || "Failed to save product.");
      }

      if (data.product?.images) {
        setExistingImages(data.product.images);
        setImageFiles([]);
      }

      if (data.product) {
        setVariants(mapVariantsFromProduct(data.product));
      }

      showToast({
        tone: "success",
        title: isUpdate ? "Product updated successfully." : "Product created successfully.",
      });

      if (!isUpdate) {
        router.replace("/dashboard/products");
      }
    } catch (error) {
      showToast({
        tone: "danger",
        title: getApiErrorMessage(error, "Failed to save product."),
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <DashboardShell activeItem="Products">
      <div className="mb-4">
        <Link
          href="/dashboard/products"
          className="inline-flex h-9 items-center gap-2 rounded-xl border border-main/20 bg-mainSoft px-3 text-sm font-black text-main transition hover:bg-mainSoft/70"
        >
          <span aria-hidden="true">&larr;</span>
          Back to products
        </Link>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-4">
          <div className="admin-page-head rounded-[24px] border border-neutral-200 bg-white p-5 shadow-lg shadow-main/5">
            <p className="text-sm font-black uppercase tracking-[0.35em] text-main/70">
              Products
            </p>
            <h1 className="mt-2 text-2xl font-black tracking-tight text-main md:text-3xl">
              {title}
            </h1>
            <p className="mt-1.5 max-w-3xl text-sm font-semibold leading-6 text-slate-500">
              {loading ? "Loading product..." : "Connected to the backend product routes."}
            </p>
          </div>

          <div className="rounded-[24px] border border-neutral-200 bg-white p-5 shadow-lg shadow-main/5">
            <div className="space-y-4">
              <Field label="Product Name">
                <input
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  type="text"
                  placeholder="Premium Puppy Food"
                  className="h-11 w-full rounded-xl border border-neutral-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none placeholder:text-slate-300 focus:border-main"
                />
              </Field>

              <Field label="Description">
                <textarea
                  name="description"
                  value={form.description}
                  onChange={handleChange}
                  rows={4}
                  placeholder="Describe the product, benefits, ingredients, or use case."
                  className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 outline-none placeholder:text-slate-300 focus:border-main"
                />
              </Field>

              <div className="grid gap-3 md:grid-cols-2">
                <SelectField
                  label="Category"
                  name="category"
                  value={form.category}
                  onChange={handleChange}
                  disabled={optionsLoading}
                  placeholder={optionsLoading ? "Loading categories..." : "Select category"}
                  options={categories.map((category) => ({
                    value: category.slug || category._id,
                    label: category.name || category.slug,
                  }))}
                />
                <SelectField
                  label="Animal"
                  name="animal"
                  value={form.animal}
                  onChange={handleChange}
                  disabled={optionsLoading}
                  placeholder={optionsLoading ? "Loading animals..." : "Select animal"}
                  options={animals.map((animal) => ({
                    value: animal.slug || animal._id,
                    label: animal.name || animal.slug,
                  }))}
                />
                <SelectField
                  label="Brand"
                  name="brand"
                  value={form.brand}
                  onChange={handleChange}
                  disabled={optionsLoading}
                  placeholder={optionsLoading ? "Loading brands..." : "Select brand"}
                  options={brands.map((brand) => ({
                    value: brand.slug || brand._id,
                    label: brand.name || brand.slug,
                  }))}
                />
                <Field label="Base Price (BDT)">
                  <input
                    name="price"
                    value={form.price}
                    onChange={handleChange}
                    type="number"
                    min="0"
                    placeholder="450"
                    className="h-11 w-full rounded-xl border border-neutral-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none placeholder:text-slate-300 focus:border-main"
                  />
                </Field>
                <Field label="Discount Price">
                  <input
                    name="discountPrice"
                    value={form.discountPrice}
                    onChange={handleChange}
                    type="number"
                    placeholder="400"
                    className="h-11 w-full rounded-xl border border-neutral-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none placeholder:text-slate-300 focus:border-main"
                  />
                </Field>
                  <Field label="Base Pack Stock">
                    <input
                      name="stockQuantity"
                      value={form.stockQuantity}
                      onChange={handleChange}
                      type="number"
                      min="0"
                      disabled={markStockOut}
                      placeholder="24"
                      className="h-11 w-full rounded-xl border border-neutral-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none placeholder:text-slate-300 focus:border-main disabled:cursor-not-allowed disabled:bg-slate-50"
                    />
                  </Field>
                <Field label="Tags">
                  <input
                    name="tags"
                    value={form.tags}
                    onChange={handleChange}
                    type="text"
                    placeholder="food, puppy, dog"
                    className="h-11 w-full rounded-xl border border-neutral-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none placeholder:text-slate-300 focus:border-main"
                  />
                </Field>
              </div>

              <div className="rounded-2xl border border-neutral-200 bg-mainSoft/20 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-black uppercase tracking-wide text-main/80">
                      Size / weight options
                    </p>
                    <p className="mt-1 text-sm font-semibold text-slate-500">
                      Add options like 1 KG, 5 KG with their own price and stock.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={addVariant}
                    className="h-10 rounded-xl border border-main/20 bg-white px-4 text-sm font-black text-main transition hover:bg-mainSoft/70"
                  >
                    Add option
                  </button>
                </div>

                {variants.length ? (
                  <div className="mt-4 space-y-3">
                    {variants.map((variant, index) => (
                      <div
                        key={variant.clientId}
                        className="grid gap-3 rounded-xl border border-neutral-200 bg-white p-4 md:grid-cols-[1.2fr_0.8fr_0.8fr_auto]"
                      >
                        <div>
                          <label className="block text-[11px] font-black uppercase tracking-wide text-main/70">
                            Option {index + 1}
                          </label>
                          <input
                            value={variant.label}
                            onChange={(event) =>
                              updateVariant(variant.clientId, "label", event.target.value)
                            }
                            placeholder="5 KG"
                            className="mt-1.5 h-11 w-full rounded-xl border border-neutral-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none placeholder:text-slate-300 focus:border-main"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-black uppercase tracking-wide text-main/70">
                            Price (BDT)
                          </label>
                          <input
                            value={variant.price}
                            onChange={(event) =>
                              updateVariant(variant.clientId, "price", event.target.value)
                            }
                            type="number"
                            min="0"
                            placeholder="500"
                            className="mt-1.5 h-11 w-full rounded-xl border border-neutral-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none placeholder:text-slate-300 focus:border-main"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-black uppercase tracking-wide text-main/70">
                            Stock
                          </label>
                          <input
                            value={variant.stockQuantity}
                            onChange={(event) =>
                              updateVariant(
                                variant.clientId,
                                "stockQuantity",
                                event.target.value
                              )
                            }
                            type="number"
                            min="0"
                            placeholder="20"
                            className="mt-1.5 h-11 w-full rounded-xl border border-neutral-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none placeholder:text-slate-300 focus:border-main"
                          />
                        </div>
                        <div className="flex items-end">
                          <button
                            type="button"
                            onClick={() => removeVariant(variant.clientId)}
                            className="h-11 rounded-xl border border-red-100 bg-red-50 px-4 text-sm font-black text-red-600 transition hover:bg-red-100"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="mt-4 text-sm font-semibold text-slate-500">
                    No size options yet. Use the single stock field above, or add options here.
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-black uppercase tracking-wide text-main/80">
                  Product images
                </label>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  multiple
                  onChange={handleImageChange}
                  className="mt-1.5 block w-full text-sm font-semibold text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-mainSoft file:px-3 file:py-2 file:text-sm file:font-black file:text-main"
                />
                {existingImages.length || imageFiles.length ? (
                  <div className="mt-3 flex flex-wrap gap-3">
                    {existingImages.map((imagePath) => (
                      <div
                        key={getMediaRetentionToken(imagePath)}
                        className="relative overflow-hidden rounded-xl border border-neutral-200 bg-mainSoft/30 p-2"
                      >
                        <Image
                          src={resolveImageUrl(apiBaseUrl, imagePath)}
                          alt="Product image"
                          width={88}
                          height={88}
                          className="h-20 w-20 rounded-lg object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => removeExistingImage(imagePath)}
                          className="absolute right-1 top-1 rounded-full bg-white/90 px-2 text-xs font-black text-red-600"
                          aria-label="Remove image"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                    {imagePreviews.map((preview, index) => (
                      <div
                        key={preview}
                        className="relative overflow-hidden rounded-xl border border-neutral-200 bg-mainSoft/30 p-2"
                      >
                        <Image
                          src={preview}
                          alt="New product image"
                          width={88}
                          height={88}
                          unoptimized={preview.startsWith("blob:")}
                          className="h-20 w-20 rounded-lg object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => removeNewImage(index)}
                          className="absolute right-1 top-1 rounded-full bg-white/90 px-2 text-xs font-black text-red-600"
                          aria-label="Remove new image"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="mt-2 text-sm font-semibold text-slate-500">
                    Upload one or more product images (max 4MB each).
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-[24px] border border-neutral-200 bg-white p-5 shadow-lg shadow-main/5">
            <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-mainSoft/30 p-2">
              <div className="flex h-44 items-center justify-center rounded-xl bg-white">
                {previewImage ? (
                  <Image
                    src={previewImage}
                    alt="Product preview"
                    width={176}
                    height={176}
                    unoptimized={previewImage.startsWith("blob:")}
                    className="h-40 w-40 rounded-lg object-contain"
                  />
                ) : (
                  <span className="text-sm font-black text-main">Product Image Preview</span>
                )}
              </div>
            </div>
          </div>

          <div className="rounded-[24px] border border-neutral-200 bg-white p-5 shadow-lg shadow-main/5">
            <div className="space-y-3">
              <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                <input
                  type="checkbox"
                  checked={offerEnabled}
                  onChange={() => setOfferEnabled((v) => !v)}
                  className="h-4 w-4 accent-[#173F31]"
                />
                Offer is enabled
              </label>
              <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                <input
                  type="checkbox"
                  checked={markStockOut}
                  onChange={() => setMarkStockOut((v) => !v)}
                  className="h-4 w-4 accent-[#173F31]"
                />
                Mark as stock out
              </label>
              <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={() => setIsActive((v) => !v)}
                  className="h-4 w-4 accent-[#173F31]"
                />
                Product is active
              </label>
              <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                <input
                  type="checkbox"
                  checked={isFeatured}
                  onChange={() => setIsFeatured((v) => !v)}
                  className="h-4 w-4 accent-[#173F31]"
                />
                Feature on homepage
              </label>
            </div>
          </div>

          <div className="rounded-[24px] border border-neutral-200 bg-white p-5 shadow-lg shadow-main/5">
            <p className="text-xs font-black uppercase tracking-[0.3em] text-main/60">
              Pricing Note
            </p>
            <ul className="mt-3 space-y-2 text-sm font-semibold leading-6 text-slate-500">
              <li>Add size or weight options with separate prices and stock counts.</li>
              <li>The base pack stays purchasable with its base price and stock.</li>
              <li>Extra size options use their own exact prices and stock counts.</li>
            </ul>
          </div>

          <div className="rounded-[24px] border border-neutral-200 bg-white p-4 shadow-lg shadow-main/5">
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={saveProduct}
                disabled={saving || loading}
                className="h-10 rounded-xl bg-main px-4 text-sm font-black text-white transition hover:bg-mainHover disabled:cursor-not-allowed disabled:opacity-70"
              >
                {saving ? "Saving..." : isUpdate ? "Update Product" : "Create Product"}
              </button>
              <Link
                href="/dashboard/products"
                className="text-sm font-black text-slate-500 transition hover:text-main"
              >
                Cancel
              </Link>
            </div>
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
