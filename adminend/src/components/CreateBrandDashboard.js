"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

import DashboardShell from "@/components/DashboardShell";
import { getApiBaseUrl } from "@/lib/apiBaseUrl";
import { adminApi } from "@/lib/adminApi";
import { resolveMediaUrl } from "@/lib/media";
import { useToast } from "@/components/ui/toast";

const REQUEST_TIMEOUT_MS = 12000;

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

const resolveImageUrl = (_apiBaseUrl, imagePath) =>
  resolveMediaUrl(imagePath, { legacyFolder: "brands", width: 500 });

const emptyForm = {
  name: "",
};

export default function CreateBrandDashboard({ mode = "create" }) {
  const isUpdate = mode === "update";
  const searchParams = useSearchParams();
  const slug = searchParams.get("slug");
  const { showToast } = useToast();
  const apiBaseUrl = getApiBaseUrl();
  const [form, setForm] = useState(emptyForm);
  const [animals, setAnimals] = useState([]);
  const [animalsLoading, setAnimalsLoading] = useState(true);
  const [selectedAnimalNames, setSelectedAnimalNames] = useState([]);
  const [animalPicker, setAnimalPicker] = useState("");
  const [existingImage, setExistingImage] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [active, setActive] = useState(true);
  const [loading, setLoading] = useState(isUpdate && !!slug);

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
    let alive = true;

    adminApi("/animals/get-animals?includeInactive=true")
      .then((data) => {
        if (!alive) return;
        setAnimals(data.animals || []);
      })
      .catch((error) => {
        if (!alive) return;
        showToast({
          tone: "danger",
          title: error.message || "Failed to load animals.",
        });
      })
      .finally(() => {
        if (alive) {
          setAnimalsLoading(false);
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

    adminApi("/brands/get-brands?includeInactive=true")
      .then((data) => {
        const match = (data.brands || []).find((item) => item.slug === slug);
        if (!match) {
          throw new Error("Brand not found");
        }

        setForm({
          name: match.name || "",
        });
        setSelectedAnimalNames(
          Array.isArray(match.animalNames)
            ? match.animalNames.filter(Boolean)
            : []
        );
        setExistingImage(match.image || "");
        setActive(match.isActive !== false);
      })
      .catch((error) => {
        showToast({
          tone: "danger",
          title: error.message || "Failed to load brand.",
        });
      })
      .finally(() => setLoading(false));
  }, [isUpdate, slug, showToast]);

  const title = useMemo(() => (isUpdate ? "Update Brand" : "Create Brand"), [isUpdate]);
  const shownImage = imagePreview || resolveImageUrl(apiBaseUrl, existingImage);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleImageChange = (event) => {
    const file = event.target.files?.[0];
    setImageFile(file || null);
  };

  const addAnimal = () => {
    const name = animalPicker.trim();
    if (!name) return;

    setSelectedAnimalNames((prev) =>
      prev.some((item) => item.toLowerCase() === name.toLowerCase())
        ? prev
        : [...prev, name]
    );
    setAnimalPicker("");
  };

  const removeAnimal = (name) => {
    setSelectedAnimalNames((prev) => prev.filter((item) => item !== name));
  };

  const availableAnimals = useMemo(
    () =>
      animals.filter(
        (animal) =>
          !selectedAnimalNames.some(
            (name) => name.toLowerCase() === (animal.name || "").toLowerCase()
          )
      ),
    [animals, selectedAnimalNames]
  );

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!form.name.trim()) {
      showToast({ tone: "warning", title: "Brand name is required." });
      return;
    }

    setIsSubmitting(true);

    try {
      const formData = new FormData();
      formData.append("name", form.name.trim());
      formData.append("animalNames", selectedAnimalNames.join(", "));
      if (imageFile) {
        formData.append("image", imageFile);
      }

      const response = await fetchWithTimeout(
        isUpdate && slug
          ? `${apiBaseUrl}/brands/update-brand/${slug}`
          : `${apiBaseUrl}/brands/create-brand`,
        {
          method: isUpdate ? "PATCH" : "POST",
          body: formData,
        }
      );

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.message || "Failed to save brand.");
      }

      showToast({
        tone: "success",
        title: isUpdate ? "Brand updated successfully." : "Brand created successfully.",
      });
    } catch (error) {
      showToast({
        tone: "danger",
        title: getApiErrorMessage(error, "Failed to save brand."),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleActive = () => {
    if (!slug) {
      return;
    }

    adminApi(`/brands/active-on-off-brand/${slug}`, {
      method: "PATCH",
      body: JSON.stringify({ isActive: !active }),
    })
      .then((data) => {
        setActive(data.brand?.isActive ?? !active);
        showToast({ tone: "success", title: "Brand visibility updated." });
      })
      .catch((error) => {
        showToast({
          tone: "danger",
          title: error.message || "Failed to update visibility.",
        });
      });
  };

  return (
    <DashboardShell activeItem="Brands">
      <div className="mb-4">
        <Link
          href="/dashboard/brands"
          className="inline-flex h-9 items-center gap-2 rounded-xl border border-main/20 bg-mainSoft px-3 text-sm font-black text-main transition hover:bg-mainSoft/70"
        >
          <span aria-hidden="true">&larr;</span>
          Back to brands
        </Link>
      </div>

      <div className="admin-page-head rounded-[24px] border border-neutral-200 bg-white px-5 py-5 shadow-lg shadow-main/5 md:px-6">
        <p className="text-sm font-black uppercase tracking-[0.35em] text-main/70">
          Brands
        </p>
        <h1 className="mt-2 text-2xl font-black tracking-tight text-main md:text-3xl">
          {title}
        </h1>
        <p className="mt-1.5 max-w-3xl text-sm font-semibold leading-6 text-slate-500">
          {loading ? "Loading brand..." : "Connected to the backend brand routes."}
        </p>
      </div>

      <div className="mt-5 grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="rounded-[24px] border border-neutral-200 bg-white p-5 shadow-lg shadow-main/5">
          <form onSubmit={handleSubmit} className="space-y-4">
            <Field
              label="Brand name"
              name="name"
              value={form.name}
              onChange={handleChange}
              placeholder="Whiskas"
            />

            <div>
              <label className="block text-xs font-black uppercase tracking-wide text-main/80">
                Animals
              </label>
              <div className="mt-1.5 flex gap-2">
                <select
                  value={animalPicker}
                  onChange={(event) => setAnimalPicker(event.target.value)}
                  disabled={animalsLoading || !availableAnimals.length}
                  className="h-11 min-w-0 flex-1 rounded-xl border border-neutral-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none focus:border-main disabled:cursor-not-allowed disabled:bg-slate-50"
                >
                  <option value="">
                    {animalsLoading
                      ? "Loading animals..."
                      : availableAnimals.length
                        ? "Select an animal"
                        : "No more animals to add"}
                  </option>
                  {availableAnimals.map((animal) => (
                    <option key={animal._id} value={animal.name}>
                      {animal.name}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={addAnimal}
                  disabled={!animalPicker || animalsLoading}
                  className="h-11 shrink-0 rounded-xl border border-main/20 bg-mainSoft px-4 text-sm font-black text-main transition hover:bg-mainSoft/70 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Add
                </button>
              </div>
              {selectedAnimalNames.length ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {selectedAnimalNames.map((name) => (
                    <span
                      key={name}
                      className="inline-flex items-center gap-2 rounded-full bg-mainSoft px-3 py-1.5 text-sm font-black text-main"
                    >
                      {name}
                      <button
                        type="button"
                        onClick={() => removeAnimal(name)}
                        className="text-main/70 transition hover:text-main"
                        aria-label={`Remove ${name}`}
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              ) : (
                <p className="mt-2 text-sm font-semibold text-slate-500">
                  Choose one or more animals for this brand.
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-black uppercase tracking-wide text-main/80">
                Brand image
              </label>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleImageChange}
                className="mt-1.5 block w-full text-sm font-semibold text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-mainSoft file:px-3 file:py-2 file:text-sm file:font-black file:text-main"
              />
              {shownImage ? (
                <div className="mt-3 overflow-hidden rounded-xl border border-neutral-200 bg-mainSoft/30 p-3">
                  <Image
                    src={shownImage}
                    alt="Brand preview"
                    width={120}
                    height={120}
                    unoptimized={shownImage.startsWith("blob:")}
                    className="h-28 w-28 rounded-lg object-cover"
                  />
                </div>
              ) : null}
            </div>

            <div className="flex items-center gap-3 pt-1">
              <label className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600">
                <input
                  type="checkbox"
                  checked={active}
                  onChange={toggleActive}
                  disabled={!isUpdate || !slug}
                  className="h-4 w-4 accent-[#173F31] disabled:cursor-not-allowed"
                />
                Brand is active
              </label>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="submit"
                disabled={isSubmitting || loading}
                className="h-10 rounded-xl bg-main px-4 text-sm font-black text-white transition hover:bg-mainHover disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isSubmitting ? "Saving..." : isUpdate ? "Update Brand" : "Create Brand"}
              </button>
              <Link
                href="/dashboard/brands"
                className="text-sm font-black text-slate-500 transition hover:text-main"
              >
                Cancel
              </Link>
            </div>
          </form>
        </div>

        <div className="space-y-4">
          <div className="rounded-[24px] border border-neutral-200 bg-white p-5 shadow-lg shadow-main/5">
            <p className="text-xs font-black uppercase tracking-[0.3em] text-main/60">
              Brand Note
            </p>
            <ul className="mt-3 space-y-2 text-sm font-semibold leading-6 text-slate-500">
              <li>Select animals from the dropdown — only existing animals are listed.</li>
              <li>Upload a logo or brand image (max 4MB).</li>
              <li>Active state updates through the backend toggle route.</li>
            </ul>
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}

function Field({ label, name, value, onChange, placeholder }) {
  return (
    <div>
      <label className="block text-xs font-black uppercase tracking-wide text-main/80">
        {label}
      </label>
      <input
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="mt-1.5 h-11 w-full rounded-xl border border-neutral-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none placeholder:text-slate-300 focus:border-main"
      />
    </div>
  );
}
