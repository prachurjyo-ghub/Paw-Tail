"use client";

import { useEffect, useMemo, useState } from "react";

import DashboardShell, { Badge, Icon } from "@/components/DashboardShell";
import { useToast } from "@/components/ui/toast";
import { adminApi } from "@/lib/adminApi";

const EMPTY_CARD = {
  isActive: true,
  kicker: "",
  title: "",
  description: "",
  code: "",
  amountLabel: "",
  amountSuffix: "",
  buttonLabel: "",
  buttonHref: "/categories",
  stampRingText: "",
  barcodeLabel: "",
  endsAt: "",
  showCountdown: false,
};

const toLocalInput = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

const normalizeDeal = (deal = {}) => ({
  sectionKicker: deal.sectionKicker || "",
  sectionTitle: deal.sectionTitle || "",
  sectionSubtitle: deal.sectionSubtitle || "",
  deskTitle: deal.deskTitle || "",
  deskSubtitle: deal.deskSubtitle || "",
  thirdCode: deal.thirdCode || "",
  thirdCodeActive: deal.thirdCodeActive !== false,
  cardA: {
    ...EMPTY_CARD,
    ...deal.cardA,
    endsAt: toLocalInput(deal.cardA?.endsAt),
    showCountdown: deal.cardA?.showCountdown !== false,
  },
  cardB: {
    ...EMPTY_CARD,
    ...deal.cardB,
    endsAt: toLocalInput(deal.cardB?.endsAt),
    showCountdown: Boolean(deal.cardB?.showCountdown),
  },
});

function Counter({ value = "", max }) {
  const length = String(value || "").length;
  const over = length > max;
  return (
    <span className={`text-[10px] font-bold ${over ? "text-rose-600" : "text-slate-400"}`}>
      {length}/{max}
    </span>
  );
}

function Field({
  label,
  value,
  onChange,
  max,
  type = "text",
  as = "input",
  hint,
  required,
}) {
  return (
    <label className="block">
      <span className="flex items-center justify-between gap-2">
        <span className="text-xs font-black uppercase tracking-[0.18em] text-main/75">
          {label}
          {required ? " *" : ""}
        </span>
        {max ? <Counter value={value} max={max} /> : null}
      </span>
      {as === "textarea" ? (
        <textarea
          value={value}
          maxLength={max}
          onChange={(e) => onChange(e.target.value)}
          rows={3}
          className="mt-1.5 w-full rounded-xl border border-neutral-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-700 outline-none focus:border-main"
        />
      ) : (
        <input
          type={type}
          value={value}
          maxLength={type === "datetime-local" ? undefined : max}
          onChange={(e) => onChange(e.target.value)}
          className="mt-1.5 h-11 w-full rounded-xl border border-neutral-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none focus:border-main"
        />
      )}
      {hint ? <p className="mt-1 text-[11px] font-semibold text-slate-400">{hint}</p> : null}
    </label>
  );
}

function CardEditor({
  title,
  badge,
  card,
  limits,
  onChange,
  showCountdownFields,
}) {
  const set = (key, value) => onChange({ ...card, [key]: value });

  return (
    <section className="rounded-[24px] border border-neutral-200 bg-white p-5 shadow-lg shadow-main/5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-black uppercase tracking-[0.28em] text-main/70">
            {badge}
          </p>
          <h2 className="mt-1 text-xl font-black text-main">{title}</h2>
        </div>
        <label className="inline-flex items-center gap-2 rounded-full border border-neutral-200 bg-mainSoft/40 px-3 py-2 text-xs font-black text-main">
          <input
            type="checkbox"
            checked={Boolean(card.isActive)}
            onChange={(e) => set("isActive", e.target.checked)}
            className="h-4 w-4 accent-main"
          />
          {card.isActive ? "Active on homepage" : "Hidden on homepage"}
        </label>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <Field
          label="Kicker"
          value={card.kicker}
          max={limits.kicker}
          onChange={(v) => set("kicker", v)}
          required
        />
        <Field
          label="Title"
          value={card.title}
          max={limits.title}
          onChange={(v) => set("title", v)}
          required
        />
        <div className="md:col-span-2">
          <Field
            label="Description"
            value={card.description}
            max={limits.description}
            as="textarea"
            onChange={(v) => set("description", v)}
            required
          />
        </div>
        <Field
          label="Promo code"
          value={card.code}
          max={limits.code}
          onChange={(v) => set("code", v.toUpperCase())}
          hint="Must also exist as a checkout PromoCode to redeem."
          required
        />
        <Field
          label="Amount label"
          value={card.amountLabel}
          max={limits.amountLabel}
          onChange={(v) => set("amountLabel", v)}
          hint="Stamp / big number, e.g. 30% or ৳0"
        />
        <Field
          label="Amount suffix"
          value={card.amountSuffix}
          max={limits.amountSuffix}
          onChange={(v) => set("amountSuffix", v)}
          hint="Optional, e.g. delivery"
        />
        <Field
          label="Button label"
          value={card.buttonLabel}
          max={limits.buttonLabel}
          onChange={(v) => set("buttonLabel", v)}
          required
        />
        <Field
          label="Button link"
          value={card.buttonHref}
          max={limits.buttonHref}
          onChange={(v) => set("buttonHref", v)}
          required
        />
        <Field
          label="Stamp ring text"
          value={card.stampRingText}
          max={limits.stampRingText}
          onChange={(v) => set("stampRingText", v)}
        />
        <Field
          label="Barcode label"
          value={card.barcodeLabel}
          max={limits.barcodeLabel}
          onChange={(v) => set("barcodeLabel", v)}
        />
      </div>

      {showCountdownFields ? (
        <div className="mt-4 grid gap-4 rounded-2xl border border-amber-100 bg-amber-50/60 p-4 md:grid-cols-2">
          <label className="inline-flex items-center gap-2 text-xs font-black text-amber-900">
            <input
              type="checkbox"
              checked={Boolean(card.showCountdown)}
              onChange={(e) => set("showCountdown", e.target.checked)}
              className="h-4 w-4 accent-main"
            />
            Show countdown timer
          </label>
          <Field
            label="Ends at"
            type="datetime-local"
            value={card.endsAt}
            onChange={(v) => set("endsAt", v)}
            hint="Required when countdown is enabled"
            required={Boolean(card.showCountdown)}
          />
        </div>
      ) : null}
    </section>
  );
}

export default function PromoDealsPage() {
  const { showToast } = useToast();
  const [deal, setDeal] = useState(null);
  const [limits, setLimits] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let alive = true;
    adminApi("/promo-deals/admin/get-promo-deals")
      .then((data) => {
        if (!alive) return;
        setDeal(normalizeDeal(data.promoDeal));
        setLimits(data.limits);
      })
      .catch((error) => {
        showToast({
          tone: "danger",
          title: error.message || "Failed to load promo deals.",
        });
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [showToast]);

  const previewCodes = useMemo(() => {
    if (!deal) return [];
    const codes = [];
    if (deal.cardA.isActive && deal.cardA.code) codes.push(deal.cardA.code);
    if (deal.cardB.isActive && deal.cardB.code) codes.push(deal.cardB.code);
    if (deal.thirdCodeActive && deal.thirdCode) codes.push(deal.thirdCode);
    return codes;
  }, [deal]);

  const activeCount = useMemo(() => {
    if (!deal) return 0;
    return Number(deal.cardA.isActive) + Number(deal.cardB.isActive);
  }, [deal]);

  const save = async () => {
    if (!deal) return;

    if (deal.cardA.showCountdown && !deal.cardA.endsAt) {
      showToast({
        tone: "danger",
        title: "Card A needs an end date when countdown is enabled.",
      });
      return;
    }

    setSaving(true);
    try {
      const payload = {
        ...deal,
        cardA: {
          ...deal.cardA,
          endsAt: deal.cardA.endsAt
            ? new Date(deal.cardA.endsAt).toISOString()
            : null,
        },
        cardB: {
          ...deal.cardB,
          endsAt: deal.cardB.endsAt
            ? new Date(deal.cardB.endsAt).toISOString()
            : null,
        },
      };
      const data = await adminApi("/promo-deals/admin/update-promo-deals", {
        method: "PUT",
        body: JSON.stringify(payload),
      });
      setDeal(normalizeDeal(data.promoDeal));
      setLimits(data.limits);
      showToast({ tone: "success", title: "Homepage promo deals saved." });
    } catch (error) {
      showToast({
        tone: "danger",
        title: error.message || "Failed to save promo deals.",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <DashboardShell activeItem="Promo Deals">
      <div className="rounded-[24px] border border-neutral-200 bg-white px-5 py-5 shadow-lg shadow-main/5 md:px-6">
        <p className="text-sm font-black uppercase tracking-[0.35em] text-main/70">
          Homepage
        </p>
        <h1 className="mt-2 text-2xl font-black tracking-tight text-main md:text-3xl">
          Promo Deals
        </h1>
        <p className="mt-1.5 max-w-3xl text-sm font-semibold leading-6 text-slate-500">
          Edit the homepage ticket cards. Turn a card off to hide it without
          breaking the layout. Redeem still requires a matching checkout promo
          code (API).
        </p>
      </div>

      {loading || !deal || !limits ? (
        <div className="mt-5 rounded-[24px] border border-neutral-200 bg-white p-8 text-sm font-semibold text-slate-500">
          Loading promo deals...
        </div>
      ) : (
        <>
          <div className="mt-5 grid gap-4 sm:grid-cols-3">
            <div className="rounded-[24px] bg-gradient-to-br from-main to-main/70 p-5 text-white">
              <p className="text-xs font-black uppercase tracking-[0.22em] text-white/70">
                Active cards
              </p>
              <p className="mt-3 text-3xl font-black">{activeCount}/2</p>
            </div>
            <div className="rounded-[24px] bg-gradient-to-br from-accent to-accentSoft p-5 text-white sm:col-span-2">
              <p className="text-xs font-black uppercase tracking-[0.22em] text-white/70">
                Desk codes preview
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {previewCodes.length ? (
                  previewCodes.map((code) => (
                    <Badge key={code} tone="green">
                      {code}
                    </Badge>
                  ))
                ) : (
                  <span className="text-sm font-semibold text-white/80">
                    No codes visible (section hidden if both cards off)
                  </span>
                )}
              </div>
            </div>
          </div>

          <section className="mt-5 rounded-[24px] border border-neutral-200 bg-white p-5 shadow-lg shadow-main/5">
            <h2 className="text-lg font-black text-main">Section copy</h2>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <Field
                label="Section kicker"
                value={deal.sectionKicker}
                max={limits.sectionKicker}
                onChange={(v) => setDeal({ ...deal, sectionKicker: v })}
              />
              <Field
                label="Section title"
                value={deal.sectionTitle}
                max={limits.sectionTitle}
                onChange={(v) => setDeal({ ...deal, sectionTitle: v })}
              />
              <div className="md:col-span-2">
                <Field
                  label="Section subtitle"
                  value={deal.sectionSubtitle}
                  max={limits.sectionSubtitle}
                  as="textarea"
                  onChange={(v) => setDeal({ ...deal, sectionSubtitle: v })}
                />
              </div>
            </div>
          </section>

          <div className="mt-5 grid gap-5 xl:grid-cols-2">
            <CardEditor
              title="Ticket A · Timer card"
              badge="Cream ticket"
              card={deal.cardA}
              limits={limits}
              showCountdownFields
              onChange={(cardA) => setDeal({ ...deal, cardA })}
            />
            <CardEditor
              title="Ticket B · Offer card"
              badge="Orange ticket"
              card={deal.cardB}
              limits={limits}
              showCountdownFields={false}
              onChange={(cardB) => setDeal({ ...deal, cardB })}
            />
          </div>

          <section className="mt-5 rounded-[24px] border border-neutral-200 bg-white p-5 shadow-lg shadow-main/5">
            <h2 className="text-lg font-black text-main">Voucher desk</h2>
            <p className="mt-1 text-sm font-semibold text-slate-500">
              Desk always shows codes from active cards, plus an optional third
              code.
            </p>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <Field
                label="Desk title"
                value={deal.deskTitle}
                max={limits.deskTitle}
                onChange={(v) => setDeal({ ...deal, deskTitle: v })}
              />
              <Field
                label="Third desk code"
                value={deal.thirdCode}
                max={limits.thirdCode}
                onChange={(v) =>
                  setDeal({ ...deal, thirdCode: v.toUpperCase() })
                }
              />
              <div className="md:col-span-2">
                <Field
                  label="Desk subtitle"
                  value={deal.deskSubtitle}
                  max={limits.deskSubtitle}
                  as="textarea"
                  onChange={(v) => setDeal({ ...deal, deskSubtitle: v })}
                />
              </div>
              <label className="inline-flex items-center gap-2 text-xs font-black text-main">
                <input
                  type="checkbox"
                  checked={Boolean(deal.thirdCodeActive)}
                  onChange={(e) =>
                    setDeal({ ...deal, thirdCodeActive: e.target.checked })
                  }
                  className="h-4 w-4 accent-main"
                />
                Show third desk code
              </label>
            </div>
          </section>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={save}
              disabled={saving}
              className="inline-flex h-11 items-center gap-2 rounded-xl bg-main px-5 text-sm font-black text-white transition hover:bg-mainHover disabled:opacity-60"
            >
              <Icon name="check" className="h-4 w-4" />
              {saving ? "Saving..." : "Save homepage deals"}
            </button>
            <p className="text-xs font-semibold text-slate-400">
              Checkout discount rules still use the PromoCode API — create matching
              codes via API/seed so redeem works.
            </p>
          </div>
        </>
      )}
    </DashboardShell>
  );
}
