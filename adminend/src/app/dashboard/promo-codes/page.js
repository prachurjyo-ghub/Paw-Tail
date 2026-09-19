"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import DashboardShell, { Badge, Icon } from "@/components/DashboardShell";
import { useToast } from "@/components/ui/toast";
import { adminApi } from "@/lib/adminApi";

const getDefaultDate = (daysFromNow = 0) => {
  const date = new Date();
  date.setDate(date.getDate() + daysFromNow);
  return date.toISOString().slice(0, 10);
};

const initialForm = {
  name: "",
  discountType: "percentage",
  discountValue: "10",
  minOrder: "0",
  maxAmount: "",
  scopeType: "all",
  productIds: [],
  categoryIds: [],
  userIds: [],
  itemIds: [],
  totalUsageLimit: "",
  usageLimitPerUser: "1",
  startDate: getDefaultDate(),
  expiryDate: getDefaultDate(30),
};

const scopeLabels = {
  all: "All items",
  items: "Selected items",
  categories: "Categories",
  products: "Products",
  users: "Users",
  "new-users": "New users",
};

const scopeIdFields = {
  products: "productIds",
  items: "itemIds",
  categories: "categoryIds",
  users: "userIds",
};

function toNumber(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeScopeIds(ids = []) {
  return ids.map((id) => String(id?._id || id));
}

function formatScopeSummary(promo) {
  const scopeType = promo.scopeType || promo.scope?.type || "all";
  const label = scopeLabels[scopeType] || "All items";
  const idField = scopeIdFields[scopeType];
  const count = idField
    ? (promo[idField] || promo.scope?.[idField] || []).length
    : 0;

  if (!count) {
    return label;
  }

  return `${label} (${count})`;
}

const normalizePromoCode = (item) => ({
  id: item._id || item.id,
  name: item.name,
  discountType: item.discountType,
  discountValue: item.discountValue,
  minOrder: item.minOrder,
  maxAmount: item.maxAmount,
  scope: item.scope || { type: "all" },
  scopeType: item.scope?.type || "all",
  productIds: normalizeScopeIds(item.scope?.productIds),
  categoryIds: normalizeScopeIds(item.scope?.categoryIds),
  userIds: normalizeScopeIds(item.scope?.userIds),
  itemIds: normalizeScopeIds(item.scope?.itemIds),
  totalUsageLimit: item.totalUsageLimit,
  usageCount: item.usageCount || 0,
  usageLimitPerUser: item.usageLimitPerUser || 1,
  startDate: item.startDate ? new Date(item.startDate).toISOString().slice(0, 10) : "",
  expiryDate: item.expiryDate ? new Date(item.expiryDate).toISOString().slice(0, 10) : "",
  isActive: !!item.isActive,
});

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

function formatDate(value) {
  if (!value) return "";
  return new Date(value).toISOString().slice(0, 10);
}

function mapPromo(promoCode) {
  return normalizePromoCode({
    ...promoCode,
    _id: promoCode._id || promoCode.id,
  });
}

function buildScopePayload(form) {
  const scope = { type: form.scopeType };

  if (form.scopeType === "products") {
    scope.productIds = form.productIds;
  } else if (form.scopeType === "items") {
    scope.itemIds = form.itemIds;
  } else if (form.scopeType === "categories") {
    scope.categoryIds = form.categoryIds;
  } else if (form.scopeType === "users") {
    scope.userIds = form.userIds;
  }

  return scope;
}

function buildPayload(form) {
  return {
    name: form.name.trim().toUpperCase(),
    discountType: form.discountType,
    discountValue: toNumber(form.discountValue, 0),
    minOrder: toNumber(form.minOrder, 0),
    maxAmount: form.maxAmount === "" ? null : toNumber(form.maxAmount, null),
    scope: buildScopePayload(form),
    totalUsageLimit:
      form.totalUsageLimit === "" ? null : toNumber(form.totalUsageLimit, null),
    usageLimitPerUser: toNumber(form.usageLimitPerUser, 1),
    startDate: form.startDate,
    expiryDate: form.expiryDate,
    isActive: true,
  };
}

function getFormFromPromo(promo) {
  return {
    name: promo.name || "",
    discountType: promo.discountType || "percentage",
    discountValue: String(promo.discountValue ?? "10"),
    minOrder: String(promo.minOrder ?? "0"),
    maxAmount: promo.maxAmount === null || promo.maxAmount === undefined ? "" : String(promo.maxAmount),
    scopeType: promo.scopeType || promo.scope?.type || "all",
    productIds: normalizeScopeIds(promo.productIds || promo.scope?.productIds),
    categoryIds: normalizeScopeIds(promo.categoryIds || promo.scope?.categoryIds),
    userIds: normalizeScopeIds(promo.userIds || promo.scope?.userIds),
    itemIds: normalizeScopeIds(promo.itemIds || promo.scope?.itemIds),
    totalUsageLimit:
      promo.totalUsageLimit === null || promo.totalUsageLimit === undefined
        ? ""
        : String(promo.totalUsageLimit),
    usageLimitPerUser: String(promo.usageLimitPerUser ?? "1"),
    startDate: formatDate(promo.startDate),
    expiryDate: formatDate(promo.expiryDate),
  };
}

function ScopeTargetPicker({
  label,
  description,
  options,
  selectedIds,
  onChange,
  loading,
  emptyMessage,
}) {
  const [search, setSearch] = useState("");

  const filteredOptions = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) {
      return options;
    }

    return options.filter((option) => option.label.toLowerCase().includes(query));
  }, [options, search]);

  const toggleOption = (id) => {
    const nextIds = selectedIds.includes(id)
      ? selectedIds.filter((value) => value !== id)
      : [...selectedIds, id];
    onChange(nextIds);
  };

  return (
    <div className="sm:col-span-2">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.22em] text-main/75">
            {label}
          </p>
          <p className="mt-1 text-xs font-semibold text-slate-500">{description}</p>
        </div>
        <p className="text-xs font-black text-main">{selectedIds.length} selected</p>
      </div>

      <input
        type="search"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        placeholder="Search..."
        className="mt-3 h-11 w-full rounded-xl border border-neutral-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none transition placeholder:text-slate-300 focus:border-main"
      />

      <div className="mt-3 max-h-56 overflow-y-auto rounded-xl border border-neutral-200 bg-neutral-50/60">
        {loading ? (
          <p className="px-4 py-6 text-center text-sm font-semibold text-slate-500">
            Loading options...
          </p>
        ) : filteredOptions.length ? (
          <ul className="divide-y divide-neutral-200">
            {filteredOptions.map((option) => {
              const checked = selectedIds.includes(option.id);

              return (
                <li key={option.id}>
                  <label className="flex cursor-pointer items-start gap-3 px-4 py-3 transition hover:bg-white">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleOption(option.id)}
                      className="mt-1 h-4 w-4 rounded border-neutral-300 text-main focus:ring-main"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-black text-slate-700">
                        {option.label}
                      </span>
                      {option.hint ? (
                        <span className="mt-0.5 block text-xs font-semibold text-slate-400">
                          {option.hint}
                        </span>
                      ) : null}
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="px-4 py-6 text-center text-sm font-semibold text-slate-500">
            {emptyMessage}
          </p>
        )}
      </div>
    </div>
  );
}

function PromoTable({ title, items, onToggle, onDelete, onEdit, busyId }) {
  if (!items.length) {
    return (
      <section className="rounded-[24px] border border-dashed border-neutral-200 bg-white p-8 text-center text-sm font-bold text-slate-500">
        No promo codes yet.
      </section>
    );
  }

  return (
    <section className="overflow-hidden rounded-[24px] border border-neutral-200 bg-white shadow-lg shadow-main/5">
      <div className="border-b border-neutral-100 px-5 py-4">
        <p className="text-sm font-black uppercase tracking-[0.35em] text-main/70">
          {title}
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[920px] border-collapse text-left">
          <thead className="bg-mainSoft/30">
            <tr className="border-b border-neutral-100 text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
              <th className="px-4 py-3">Code</th>
              <th className="px-4 py-3">Discount</th>
              <th className="px-4 py-3">Scope</th>
              <th className="px-4 py-3">Usage</th>
              <th className="px-4 py-3 text-center">State</th>
              <th className="px-4 py-3 text-center">Action</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className="border-b border-neutral-100 last:border-b-0">
                <td className="px-4 py-4">
                  <p className="text-sm font-black text-main">{item.name}</p>
                  <p className="mt-1 text-[11px] font-semibold text-slate-400">
                    {item.id}
                  </p>
                </td>
                <td className="px-4 py-4">
                  <p className="text-sm font-black text-slate-700">
                    {item.discountType === "percentage"
                      ? `${item.discountValue}%`
                      : `৳ ${item.discountValue}`}
                  </p>
                  <p className="mt-1 text-[11px] font-semibold text-slate-400">
                    Min ৳ {item.minOrder}
                    {item.maxAmount ? ` · Max ৳ ${item.maxAmount}` : ""}
                  </p>
                </td>
                <td className="px-4 py-4">
                  <p className="text-sm font-semibold text-slate-600">
                    {formatScopeSummary(item)}
                  </p>
                  <p className="mt-1 text-[11px] font-semibold text-slate-400">
                    {item.usageLimitPerUser} use per customer
                  </p>
                </td>
                <td className="px-4 py-4">
                  <p className="text-sm font-black text-slate-700">
                    {item.usageCount}/{item.totalUsageLimit ?? "∞"}
                  </p>
                  <p className="mt-1 text-[11px] font-semibold text-slate-400">
                    {item.startDate} to {item.expiryDate}
                  </p>
                </td>
                <td className="px-4 py-4 text-center">
                  <button
                    type="button"
                    onClick={() => onToggle(item)}
                    disabled={busyId === item.id}
                    className="inline-flex disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <Badge tone={item.isActive ? "green" : "gray"}>
                      {item.isActive ? "Active" : "Paused"}
                    </Badge>
                  </button>
                </td>
                <td className="px-4 py-4 text-center">
                  <div className="flex items-center justify-center gap-2">
                    <button
                      type="button"
                      className="inline-flex h-8 items-center gap-1 rounded-lg border border-main/15 bg-mainSoft px-3 text-xs font-black text-main transition hover:bg-mainSoft/70"
                      onClick={() => onEdit(item)}
                    >
                      <Icon name="edit" className="h-3.5 w-3.5" />
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => onDelete(item)}
                      disabled={busyId === item.id}
                      className="inline-flex h-8 items-center gap-1 rounded-lg border border-red-100 bg-red-50 px-3 text-xs font-black text-red-600 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <Icon name="trash" className="h-3.5 w-3.5" />
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default function PromoCodesPage() {
  const { showToast, confirm } = useToast();
  const [promoCodes, setPromoCodes] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [scopeOptionsLoading, setScopeOptionsLoading] = useState(false);
  const [productOptions, setProductOptions] = useState([]);
  const [categoryOptions, setCategoryOptions] = useState([]);
  const [userOptions, setUserOptions] = useState([]);
  const createRef = useRef(null);

  const summary = useMemo(() => {
    const active = promoCodes.filter((item) => item.isActive).length;
    return { active, total: promoCodes.length };
  }, [promoCodes]);

  const loadPromoCodes = useCallback(async () => {
    setLoading(true);

    try {
      const data = await adminApi("/promo-codes/get-promo-codes");
      setPromoCodes((data.promoCodes || []).map(mapPromo));
    } catch (error) {
      showToast({
        tone: "danger",
        title: "Could not load promo codes.",
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadPromoCodes();
  }, [loadPromoCodes]);

  useEffect(() => {
    if (!showCreate) {
      return;
    }

    let alive = true;
    setScopeOptionsLoading(true);

    Promise.all([
      adminApi("/categories/get-categories?includeInactive=true"),
      adminApi("/products/get-products?limit=100"),
      adminApi("/users/accounts"),
    ])
      .then(([categoriesData, productsData, accountsData]) => {
        if (!alive) return;

        setCategoryOptions(
          (categoriesData.categories || []).map((category) => ({
            id: String(category._id),
            label: category.name,
            hint: category.isActive ? "Active category" : "Inactive category",
          }))
        );

        setProductOptions(
          (productsData.products || []).map((product) => ({
            id: String(product._id),
            label: product.name,
            hint: [product.category?.name, product.brand?.name].filter(Boolean).join(" · "),
          }))
        );

        setUserOptions(
          (accountsData.accounts || [])
            .filter((account) => account.role !== "admin")
            .map((account) => ({
              id: String(account.id || account._id),
              label: account.name || account.email,
              hint: account.email,
            }))
        );
      })
      .catch((error) => {
        showToast({
          tone: "danger",
          title: "Could not load promo scope options.",
          description: error.message,
        });
      })
      .finally(() => {
        if (alive) {
          setScopeOptionsLoading(false);
        }
      });

    return () => {
      alive = false;
    };
  }, [showCreate, showToast]);

  const scopePickerConfig = useMemo(() => {
    if (form.scopeType === "products" || form.scopeType === "items") {
      return {
        label: form.scopeType === "products" ? "Select products" : "Select items",
        description: "Customer cart must include at least one of these products.",
        options: productOptions,
        selectedIds: form.scopeType === "products" ? form.productIds : form.itemIds,
        onChange: (nextIds) =>
          setForm((prev) =>
            prev.scopeType === "products"
              ? { ...prev, productIds: nextIds }
              : { ...prev, itemIds: nextIds }
          ),
        emptyMessage: "No products found.",
      };
    }

    if (form.scopeType === "categories") {
      return {
        label: "Select categories",
        description: "Customer cart must include at least one product from these categories.",
        options: categoryOptions,
        selectedIds: form.categoryIds,
        onChange: (nextIds) => setForm((prev) => ({ ...prev, categoryIds: nextIds })),
        emptyMessage: "No categories found.",
      };
    }

    if (form.scopeType === "users") {
      return {
        label: "Select customers",
        description: "Only these customer accounts can use this promo code.",
        options: userOptions,
        selectedIds: form.userIds,
        onChange: (nextIds) => setForm((prev) => ({ ...prev, userIds: nextIds })),
        emptyMessage: "No customer accounts found.",
      };
    }

    return null;
  }, [categoryOptions, form, productOptions, userOptions]);

  const handleChange = (event) => {
    const { name, value } = event.target;

    if (name === "scopeType") {
      setForm((prev) => ({
        ...prev,
        scopeType: value,
        productIds: [],
        categoryIds: [],
        userIds: [],
        itemIds: [],
      }));
      return;
    }

    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const scrollToCreate = () => {
    setShowCreate(true);
    setEditingId(null);
    setForm(initialForm);
    setTimeout(() => {
      createRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 0);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!form.name.trim()) {
      showToast({ tone: "warning", title: "Promo code name is required." });
      return;
    }

    if (form.scopeType === "products" && !form.productIds.length) {
      showToast({ tone: "warning", title: "Select at least one product." });
      return;
    }

    if (form.scopeType === "items" && !form.itemIds.length) {
      showToast({ tone: "warning", title: "Select at least one item." });
      return;
    }

    if (form.scopeType === "categories" && !form.categoryIds.length) {
      showToast({ tone: "warning", title: "Select at least one category." });
      return;
    }

    if (form.scopeType === "users" && !form.userIds.length) {
      showToast({ tone: "warning", title: "Select at least one customer." });
      return;
    }

    setSubmitting(true);

    try {
      const payload = buildPayload(form);
      const data = editingId
        ? await adminApi(`/promo-codes/update-promo-codes/${editingId}`, {
            method: "PATCH",
            body: JSON.stringify(payload),
          })
        : await adminApi("/promo-codes/post-promo-codes", {
            method: "POST",
            body: JSON.stringify(payload),
          });

      const nextPromo = mapPromo(data.promoCode);
      setPromoCodes((prev) =>
        editingId
          ? prev.map((item) => (item.id === editingId ? nextPromo : item))
          : [nextPromo, ...prev]
      );
      setForm(initialForm);
      setEditingId(null);
      setShowCreate(false);
      showToast({
        tone: "success",
        title: editingId ? "Promo code updated." : "Promo code created.",
      });
    } catch (error) {
      showToast({
        tone: "danger",
        title: editingId ? "Could not update promo code." : "Could not create promo code.",
        description: error.message,
      });
    } finally {
      setSubmitting(false);
    }
  };

  const togglePromo = async (promo) => {
    setBusyId(promo.id);

    try {
      const data = await adminApi(`/promo-codes/active-on-off-promo-codes/${promo.id}`, {
        method: "PATCH",
        body: JSON.stringify({ isActive: !promo.isActive }),
      });
      const nextPromo = mapPromo(data.promoCode);
      setPromoCodes((prev) =>
        prev.map((item) => (item.id === promo.id ? nextPromo : item))
      );
      showToast({ tone: "success", title: "Promo status updated." });
    } catch (error) {
      showToast({
        tone: "danger",
        title: "Could not update promo status.",
        description: error.message,
      });
    } finally {
      setBusyId(null);
    }
  };

  const deletePromo = (promo) => {
    confirm({
      title: `Delete ${promo.name}?`,
      description: "This removes the code from the database.",
      confirmLabel: "Delete",
      tone: "danger",
      onConfirm: async () => {
        setBusyId(promo.id);

        try {
          await adminApi(`/promo-codes/delete-promo-codes/${promo.id}`, {
            method: "DELETE",
          });
          setPromoCodes((prev) => prev.filter((item) => item.id !== promo.id));
          showToast({ tone: "success", title: "Promo code deleted." });
        } catch (error) {
          showToast({
            tone: "danger",
            title: "Could not delete promo code.",
            description: error.message,
          });
        } finally {
          setBusyId(null);
        }
      },
    });
  };

  const editPromo = (promo) => {
    setForm(getFormFromPromo(promo));
    setEditingId(promo.id);
    setShowCreate(true);
    setTimeout(() => {
      createRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 0);
  };

  return (
    <DashboardShell activeItem="Promo Codes">
      <div className="rounded-[24px] border border-neutral-200 bg-white px-5 py-5 shadow-lg shadow-main/5 md:px-6">
        <p className="text-sm font-black uppercase tracking-[0.35em] text-main/70">
          Marketing
        </p>
        <h1 className="mt-2 text-2xl font-black tracking-tight text-main md:text-3xl">
          Promo Codes
        </h1>
        <p className="mt-1.5 max-w-3xl text-sm font-semibold leading-6 text-slate-500">
          Create, pause, edit, and delete promo codes connected to checkout.
        </p>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2">
        <article className="rounded-[20px] border border-neutral-200 bg-white p-4 shadow-md shadow-main/5 ring-1 ring-main/15">
          <div className="mb-2 h-1.5 rounded-full bg-gradient-to-r from-main to-main/70" />
          <p className="text-sm font-extrabold text-slate-500">Active Codes</p>
          <p className="mt-1 text-3xl font-black text-main">{summary.active}</p>
        </article>
        <article className="rounded-[20px] border border-neutral-200 bg-white p-4 shadow-md shadow-main/5 ring-1 ring-slate-200">
          <div className="mb-2 h-1.5 rounded-full bg-gradient-to-r from-slate-400 to-slate-300" />
          <p className="text-sm font-extrabold text-slate-500">Total Codes</p>
          <p className="mt-1 text-3xl font-black text-main">{summary.total}</p>
        </article>
      </div>

      <div className="mt-5 space-y-5">
        <div className="flex justify-end">
          <button
            type="button"
            onClick={scrollToCreate}
            className="inline-flex h-11 items-center gap-2 rounded-xl bg-main px-4 text-sm font-black text-white transition hover:bg-mainHover"
          >
            <Icon name="send" className="h-4 w-4" />
            Create code
          </button>
        </div>

        {showCreate ? (
          <section
            ref={createRef}
            id="create-code"
            className="rounded-[24px] border border-neutral-200 bg-white p-5 shadow-lg shadow-main/5"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-black uppercase tracking-[0.35em] text-main/70">
                  {editingId ? "Edit Code" : "Create Code"}
                </p>
                <h2 className="mt-2 text-xl font-black text-main">
                  {editingId ? "Update promo code" : "New promo code"}
                </h2>
              </div>
              <Icon name="ticket" className="h-6 w-6 text-main/70" />
            </div>

            <form onSubmit={handleSubmit} className="mt-5 grid gap-4 sm:grid-cols-2">
              <Field
                label="Code name"
                name="name"
                value={form.name}
                onChange={handleChange}
                placeholder="WELCOME10"
              />
              <Field
                label="Discount type"
                name="discountType"
                value={form.discountType}
                onChange={handleChange}
                as="select"
                options={[
                  ["percentage", "Percentage"],
                  ["amount", "Amount"],
                ]}
              />
              <Field
                label="Discount value"
                name="discountValue"
                value={form.discountValue}
                onChange={handleChange}
                type="number"
                min="0"
              />
              <Field
                label="Minimum order"
                name="minOrder"
                value={form.minOrder}
                onChange={handleChange}
                type="number"
                min="0"
              />
              <Field
                label="Max amount"
                name="maxAmount"
                value={form.maxAmount}
                onChange={handleChange}
                type="number"
                min="0"
              />
              <Field
                label="Scope"
                name="scopeType"
                value={form.scopeType}
                onChange={handleChange}
                as="select"
                options={Object.entries(scopeLabels).map(([value, label]) => [
                  value,
                  label,
                ])}
              />
              <Field
                label="Usage limit per user"
                name="usageLimitPerUser"
                value={form.usageLimitPerUser}
                onChange={handleChange}
                type="number"
                min="1"
              />
              <Field
                label="Total usage limit"
                name="totalUsageLimit"
                value={form.totalUsageLimit}
                onChange={handleChange}
                type="number"
                min="1"
              />
              <Field
                label="Start date"
                name="startDate"
                value={form.startDate}
                onChange={handleChange}
                type="date"
              />
              <Field
                label="Expiry date"
                name="expiryDate"
                value={form.expiryDate}
                onChange={handleChange}
                type="date"
              />

              {scopePickerConfig ? (
                <ScopeTargetPicker
                  label={scopePickerConfig.label}
                  description={scopePickerConfig.description}
                  options={scopePickerConfig.options}
                  selectedIds={scopePickerConfig.selectedIds}
                  onChange={scopePickerConfig.onChange}
                  loading={scopeOptionsLoading}
                  emptyMessage={scopePickerConfig.emptyMessage}
                />
              ) : null}

              {form.scopeType === "new-users" ? (
                <div className="sm:col-span-2 rounded-xl border border-main/15 bg-mainSoft/40 px-4 py-3 text-sm font-semibold text-slate-600">
                  This code only works for customers placing their first order.
                </div>
              ) : null}

              <div className="sm:col-span-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreate(false);
                    setEditingId(null);
                    setForm(initialForm);
                  }}
                  className="inline-flex h-11 items-center rounded-xl border border-neutral-200 bg-white px-4 text-sm font-black text-slate-600 transition hover:bg-neutral-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex h-11 items-center gap-2 rounded-xl bg-main px-4 text-sm font-black text-white transition hover:bg-mainHover disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Icon name="check" className="h-4 w-4" />
                  {submitting ? "Saving..." : "Save code"}
                </button>
              </div>
            </form>
          </section>
        ) : null}

        {loading ? (
          <section className="rounded-[24px] border border-neutral-200 bg-white p-8 text-center text-sm font-black text-main shadow-lg shadow-main/5">
            Loading promo codes...
          </section>
        ) : (
          <PromoTable
            title="Promo list"
            items={promoCodes}
            onToggle={togglePromo}
            onDelete={deletePromo}
            onEdit={editPromo}
            busyId={busyId}
          />
        )}
      </div>
    </DashboardShell>
  );
}
