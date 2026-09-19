"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import DashboardShell from "@/components/DashboardShell";
import CategoryIcon, { findIconMatch } from "@/components/CategoryIcon";
import IconPicker from "@/components/IconPicker";
import { getApiBaseUrl } from "@/lib/apiBaseUrl";
import { useToast } from "@/components/ui/toast";

const REQUEST_TIMEOUT_MS = 12000;
const suggestedCategories = ["Dog Food", "Cat Food", "Bird Toys", "Fish Care", "Rabbit Hay"];

const fetchWithTimeout = async (url, options = {}) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

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
    return "Backend request timeout. Please verify backend is running on port 3000.";
  }
  return error?.message || fallback;
};

const getAssetOrigin = (apiBaseUrl) => apiBaseUrl.replace(/\/api\/v1\/?$/, "");

const resolveImageUrl = (apiBaseUrl, imagePath) => {
  if (!imagePath) return "";
  if (imagePath.startsWith("http://") || imagePath.startsWith("https://")) {
    return imagePath;
  }
  return `${getAssetOrigin(apiBaseUrl)}${imagePath.startsWith("/") ? imagePath : `/${imagePath}`}`;
};

export default function CreateCategoryDashboard() {
  const { showToast } = useToast();
  const router = useRouter();
  const apiBaseUrl = getApiBaseUrl();
  const searchParams = useSearchParams();
  const mode = searchParams.get("mode");
  const editSlug = searchParams.get("slug");
  const isUpdate = mode === "update" && !!editSlug;

  const [animals, setAnimals] = useState([]);
  const [animalName, setAnimalName] = useState("");
  const [name, setName] = useState("");
  const [logoType, setLogoType] = useState("icon"); // "icon" | "image"
  const [selectedIcon, setSelectedIcon] = useState("bone");
  const [existingImage, setExistingImage] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const [loading, setLoading] = useState(false);

  const imagePreview = useMemo(() => {
    if (!imageFile) return "";
    return URL.createObjectURL(imageFile);
  }, [imageFile]);

  useEffect(() => {
    return () => {
      if (imagePreview) {
        URL.revokeObjectURL(imagePreview);
      }
    };
  }, [imagePreview]);

  useEffect(() => {
    const loadFormData = async () => {
      try {
        const animalsResponse = await fetchWithTimeout(
          `${apiBaseUrl}/animals/get-animals?includeInactive=true`,
          { cache: "no-store" }
        );
        const animalsData = await animalsResponse.json();
        if (!animalsResponse.ok || !animalsData.success) {
          throw new Error(animalsData.message || "Failed to load animals");
        }
        setAnimals(animalsData.animals || []);

        if (isUpdate) {
          const categoriesResponse = await fetchWithTimeout(
            `${apiBaseUrl}/categories/get-categories?includeInactive=true`,
            { cache: "no-store" }
          );
          const categoriesData = await categoriesResponse.json();
          if (!categoriesResponse.ok || !categoriesData.success) {
            throw new Error(categoriesData.message || "Failed to load category details");
          }

          const found = (categoriesData.categories || []).find((item) => item.slug === editSlug);
          if (!found) {
            throw new Error("Category not found");
          }

          setName(found.name || "");
          setAnimalName(found.animalName || "");
          if (found.image) {
            setExistingImage(found.image);
            setLogoType("image");
          } else {
            setSelectedIcon(found.icon || findIconMatch(found.name) || "paw");
            setLogoType("icon");
          }
        }
      } catch (error) {
        showToast({
          tone: "danger",
          title: getApiErrorMessage(error, "Failed loading animals."),
        });
      }
    };

    loadFormData();
  }, [apiBaseUrl, editSlug, isUpdate, showToast]);

  const handleNameChange = (val) => {
    setName(val);
    if (logoType === "icon") {
      const match = findIconMatch(val);
      if (match) {
        setSelectedIcon(match);
      }
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!name.trim() || !animalName.trim()) {
      showToast({
        tone: "danger",
        title: "Category name and animal are required.",
      });
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("name", name.trim());
      formData.append("animalName", animalName.trim());

      if (logoType === "icon") {
        formData.append("icon", selectedIcon || "paw");
        formData.append("image", "");
      } else {
        if (imageFile) {
          formData.append("image", imageFile);
        } else if (existingImage) {
          formData.append("image", existingImage);
        }
        formData.append("icon", "🐾");
      }

      const response = await fetchWithTimeout(
        isUpdate
          ? `${apiBaseUrl}/categories/update-category/${encodeURIComponent(editSlug)}`
          : `${apiBaseUrl}/categories/create-category`,
        {
          method: isUpdate ? "PATCH" : "POST",
          body: formData,
        }
      );

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.message || `Failed to ${isUpdate ? "update" : "create"} category`);
      }

      showToast({
        tone: "success",
        title: `Category ${isUpdate ? "updated" : "created"} successfully.`,
      });
      router.push("/dashboard/categories");
    } catch (error) {
      showToast({
        tone: "danger",
        title: getApiErrorMessage(error, `${isUpdate ? "Update" : "Create"} failed.`),
      });
    } finally {
      setLoading(false);
    }
  };

  const title = isUpdate ? "Update Category" : "Create Category";
  const shownImage = imagePreview || resolveImageUrl(apiBaseUrl, existingImage);

  return (
    <DashboardShell activeItem="Categories">
      <div className="mb-4">
        <Link
          href="/dashboard/categories"
          className="inline-flex h-9 items-center gap-2 rounded-xl border border-main/20 bg-mainSoft px-3 text-sm font-black text-main transition hover:bg-mainSoft/70"
        >
          <span aria-hidden="true">&larr;</span>
          Back to categories
        </Link>
      </div>

      <div className="rounded-[24px] border border-neutral-200 bg-white px-5 py-5 shadow-lg shadow-main/5 md:px-6">
        <p className="text-sm font-black uppercase tracking-[0.35em] text-main/70">
          Categories
        </p>
        <h1 className="mt-2 text-2xl font-black tracking-tight text-main md:text-3xl">
          {title}
        </h1>
        <p className="mt-1.5 max-w-3xl text-sm font-semibold leading-6 text-slate-500">
          {isUpdate
            ? "Update category details and icon/image presentation."
            : "Add a category under a selected animal with your choice of minimal icon or custom image."}
        </p>
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[1.25fr_0.75fr]">
        <div className="rounded-[24px] border border-neutral-200 bg-white p-5 shadow-lg shadow-main/5 sm:p-6">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-black uppercase tracking-wide text-main/80">
                Parent Animal
              </label>
              <select
                value={animalName}
                onChange={(event) => setAnimalName(event.target.value)}
                className="mt-1.5 h-11 w-full rounded-xl border border-neutral-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none focus:border-main"
              >
                <option value="">Select an animal</option>
                {animals.map((item) => (
                  <option key={item._id} value={item.name}>
                    {item.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-black uppercase tracking-wide text-main/80">
                Category Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(event) => handleNameChange(event.target.value)}
                placeholder="e.g. Dog Food, Parrot Toys, Hay"
                className="mt-1.5 h-11 w-full rounded-xl border border-neutral-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none placeholder:text-slate-300 focus:border-main"
              />
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                <span className="text-[11px] font-bold text-slate-400">Quick ideas:</span>
                {suggestedCategories.map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => handleNameChange(item)}
                    className="rounded-md bg-neutral-100 px-2 py-0.5 text-[11px] font-bold text-slate-600 transition hover:bg-neutral-200"
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>

            {/* Logo Presentation Mode Selection */}
            <div>
              <label className="block text-xs font-black uppercase tracking-wide text-main/80">
                Logo Presentation Type
              </label>
              <div className="mt-2 flex rounded-xl border border-neutral-200 bg-neutral-50 p-1">
                <button
                  type="button"
                  onClick={() => setLogoType("icon")}
                  className={`flex-1 rounded-lg py-2 text-xs font-black transition ${
                    logoType === "icon"
                      ? "bg-main text-white shadow-xs"
                      : "text-slate-600 hover:text-main"
                  }`}
                >
                  ✨ Minimal Vector Icon (Recommended)
                </button>
                <button
                  type="button"
                  onClick={() => setLogoType("image")}
                  className={`flex-1 rounded-lg py-2 text-xs font-black transition ${
                    logoType === "image"
                      ? "bg-main text-white shadow-xs"
                      : "text-slate-600 hover:text-main"
                  }`}
                >
                  🖼️ Custom Image Upload
                </button>
              </div>
            </div>

            {/* Icon Picker Mode */}
            {logoType === "icon" ? (
              <div>
                <label className="mb-2 block text-xs font-black uppercase tracking-wide text-main/80">
                  Select Minimal Vector Logo
                </label>
                <IconPicker
                  selectedIcon={selectedIcon}
                  onSelectIcon={(iconId) => setSelectedIcon(iconId)}
                  entityName={name}
                />
              </div>
            ) : (
              /* Image Upload Mode */
              <div>
                <label className="block text-xs font-black uppercase tracking-wide text-main/80">
                  Category Image Upload
                </label>
                <label className="mt-1.5 flex min-h-28 cursor-pointer items-center justify-center rounded-xl border border-dashed border-main/25 bg-mainSoft/30 px-4 text-center text-sm font-semibold text-slate-600 transition hover:border-main/45 hover:bg-mainSoft/50">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(event) => setImageFile(event.target.files?.[0] || null)}
                    className="sr-only"
                  />
                  {shownImage ? (
                    <span className="flex items-center gap-3">
                      <span className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full bg-white shadow-sm">
                        <Image
                          src={shownImage}
                          alt="Category preview"
                          width={64}
                          height={64}
                          className="h-full w-full object-cover"
                        />
                      </span>
                      <span className="text-left">
                        <span className="block font-black text-main">
                          {imageFile ? imageFile.name : "Current image"}
                        </span>
                        <span className="block text-xs text-slate-500">
                          Click to replace the image
                        </span>
                      </span>
                    </span>
                  ) : (
                    <span>
                      <span className="block font-black text-main">Upload category image</span>
                      <span className="block text-xs text-slate-500">PNG, JPG, WEBP</span>
                    </span>
                  )}
                </label>
              </div>
            )}

            <div className="flex flex-wrap items-center gap-3 pt-3">
              <button
                type="submit"
                disabled={loading}
                className="h-10 rounded-xl bg-main px-5 text-sm font-black text-white transition hover:bg-mainHover disabled:cursor-not-allowed disabled:opacity-70"
              >
                {loading ? (isUpdate ? "Updating..." : "Creating...") : title}
              </button>
              <Link
                href="/dashboard/categories"
                className="text-sm font-black text-slate-500 transition hover:text-main"
              >
                Cancel
              </Link>
            </div>
          </form>
        </div>

        {/* Live Preview Panel */}
        <div className="space-y-4">
          <div className="rounded-[24px] border border-neutral-200 bg-white p-5 shadow-lg shadow-main/5">
            <p className="text-xs font-black uppercase tracking-[0.3em] text-main/60">
              Live Preview
            </p>
            <p className="mt-1 text-xs text-slate-500">
              How this subcategory icon and label will look:
            </p>

            <div className="mt-4 flex items-center justify-center rounded-2xl bg-[#fbf7f1] p-6">
              <div className="flex h-[155px] w-[170px] flex-col items-center justify-center rounded-2xl border border-neutral-200/80 bg-white p-4 text-center shadow-[0_4px_20px_rgba(23,63,49,0.04)]">
                {logoType === "image" && shownImage ? (
                  <span className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full bg-mainSoft">
                    <Image
                      src={shownImage}
                      alt={name || "Preview"}
                      width={48}
                      height={48}
                      className="h-full w-full object-cover"
                    />
                  </span>
                ) : (
                  <CategoryIcon
                    icon={selectedIcon}
                    name={name}
                    className="h-12 w-12 text-main"
                    strokeWidth={1.8}
                  />
                )}

                <h3 className="mt-3 text-base font-bold tracking-tight text-main">
                  {name.trim() || "Category Name"}
                </h3>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
