"use client";

import { useMemo, useState } from "react";
import CategoryIcon, { AVAILABLE_ICONS, findIconMatch } from "@/components/CategoryIcon";

const CATEGORY_TABS = [
  { id: "all", label: "All Icons" },
  { id: "animals", label: "Animals" },
  { id: "botanical", label: "Botanical & Plants" },
  { id: "food", label: "Food & Treats" },
  { id: "care", label: "Health & Care" },
  { id: "supplies", label: "Supplies & Gear" },
];

export default function IconPicker({ selectedIcon, onSelectIcon, entityName = "" }) {
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("all");

  const autoSuggestedIcon = useMemo(() => {
    return findIconMatch(entityName);
  }, [entityName]);

  const filteredIcons = useMemo(() => {
    const query = search.trim().toLowerCase();

    return AVAILABLE_ICONS.filter((item) => {
      const matchesTab = activeTab === "all" || item.category === activeTab;
      if (!matchesTab) return false;

      if (!query) return true;

      return (
        item.id.toLowerCase().includes(query) ||
        item.label.toLowerCase().includes(query) ||
        item.keywords.some((k) => k.toLowerCase().includes(query))
      );
    });
  }, [search, activeTab]);

  return (
    <div className="space-y-3.5">
      {/* Auto Suggestion Banner if entity name matches an icon and not currently selected */}
      {autoSuggestedIcon && selectedIcon !== autoSuggestedIcon && (
        <div className="flex items-center justify-between rounded-xl border border-accent/20 bg-accent/5 px-3.5 py-2.5">
          <div className="flex items-center gap-2.5 text-xs font-semibold text-main">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent/15 text-accent">
              <CategoryIcon icon={autoSuggestedIcon} className="h-4 w-4" />
            </span>
            <span>
              Suggested icon for <strong className="font-black text-main">&ldquo;{entityName}&rdquo;</strong>:
            </span>
          </div>
          <button
            type="button"
            onClick={() => onSelectIcon(autoSuggestedIcon)}
            className="rounded-lg bg-main px-2.5 py-1 text-xs font-bold text-white transition hover:bg-mainHover"
          >
            Apply Icon
          </button>
        </div>
      )}

      {/* Search & Tabs */}
      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search icons (e.g., Camellia, Dog, Fish, Flower, Treat)..."
          className="h-9 w-full rounded-xl border border-neutral-200 bg-white px-3 text-xs font-semibold text-slate-700 outline-none placeholder:text-slate-300 focus:border-main sm:max-w-xs"
        />

        <div className="flex flex-wrap items-center gap-1 overflow-x-auto pb-1 text-xs sm:pb-0">
          {CATEGORY_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`rounded-lg px-2.5 py-1 text-[11px] font-bold transition ${
                activeTab === tab.id
                  ? "bg-main text-white"
                  : "bg-neutral-100 text-slate-600 hover:bg-neutral-200"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Icons Grid */}
      <div className="grid max-h-56 grid-cols-4 gap-2 overflow-y-auto rounded-xl border border-neutral-200/80 bg-neutral-50/50 p-2.5 sm:grid-cols-6 md:grid-cols-7 lg:grid-cols-8">
        {filteredIcons.map((item) => {
          const isSelected = selectedIcon === item.id;

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectIcon(item.id)}
              className={`group flex flex-col items-center justify-center rounded-xl p-2 text-center transition-all ${
                isSelected
                  ? "border-2 border-main bg-mainSoft text-main shadow-xs ring-2 ring-main/10"
                  : "border border-neutral-200/60 bg-white text-slate-700 hover:border-main/40 hover:bg-white hover:shadow-xs"
              }`}
              title={item.label}
            >
              <span className={`transition-transform duration-200 group-hover:scale-110 ${isSelected ? "text-main" : "text-slate-700 group-hover:text-main"}`}>
                <CategoryIcon icon={item.id} className="h-6 w-6" strokeWidth={1.8} />
              </span>
              <span className="mt-1 line-clamp-1 text-[10px] font-bold tracking-tight">
                {item.label}
              </span>
            </button>
          );
        })}

        {filteredIcons.length === 0 && (
          <div className="col-span-full py-8 text-center text-xs font-semibold text-slate-400">
            No icons found matching &ldquo;{search}&rdquo;. Try another term or choose &ldquo;Paw Print&rdquo;.
          </div>
        )}
      </div>
    </div>
  );
}
