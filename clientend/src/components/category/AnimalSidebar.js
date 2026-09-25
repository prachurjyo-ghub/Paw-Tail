import Link from "next/link";
import { slugifyCategory } from "@/lib/catalogUtils";

const pillClass = (active) =>
  `cursor-pointer rounded-full border-[1.5px] px-2.5 py-1.5 text-[11.5px] font-bold ${
    active
      ? "border-[#173f31] bg-[#173f31] text-white"
      : "border-[#e4ddd2] bg-white text-[#173f31] hover:border-[#173f31]"
  }`;

export default function AnimalSidebar({ animal, activeSubcategory, brands = [], className = "hidden lg:flex",
  priceCeiling = 2000, maxPrice = priceCeiling, inStockOnly = false, selectedBrand = "",
  selectedLifeStage = "", hasActiveFilters = false, onMaxPriceChange, onInStockChange,
  onBrandChange, onLifeStageChange, onClear }) {
  const normalizedBrands = brands.map((brand) => {
    if (typeof brand === "string") return { key: brand, label: brand };
    const label = brand?.name || brand?.slug || "";
    return label ? { key: brand?.slug || brand?._id || label, label } : null;
  }).filter(Boolean);
  const priceOptions = [400, 900].filter((value) => value < priceCeiling);

  return (
    <aside className={`flex-col gap-2.5 lg:sticky lg:top-[18px] ${className}`}>
      <div className="rounded-[18px] bg-white p-4">
        <div className="mb-1 flex items-center justify-between">
          <h2 className="text-[16px] font-extrabold tracking-[-0.02em] text-[#173f31]">Refine</h2>
          <button type="button" disabled={!hasActiveFilters} onClick={onClear}
            className="cursor-pointer border-0 bg-transparent text-[12.5px] font-bold text-[#ee9322] disabled:cursor-default disabled:opacity-35">Clear all</button>
        </div>
      </div>

      <div className="rounded-[18px] bg-white p-4">
        <h3 className="mb-3 text-[13px] font-extrabold uppercase tracking-[0.04em] text-[#173f31]">Shop</h3>
        <div className="grid grid-cols-2 gap-2">
          {animal.categories.map((category, index) => {
            const isActive = category === activeSubcategory;
            const href = index === 0 ? `/animals/${animal.slug}` : `/animals/${animal.slug}?sub=${slugifyCategory(category)}`;
            return (
              <Link key={category} href={href}
                className={`cursor-pointer rounded-[14px] border-[1.5px] p-[10px_8px_9px] text-left transition-[0.15s] hover:border-[#173f31] ${isActive ? "border-[#173f31] bg-[#173f31] text-white" : "border-[#e4ddd2] bg-white text-[#173f31]"}`}>
                <b className="block text-[12.5px] font-extrabold">{category}</b>
              </Link>
            );
          })}
        </div>
      </div>

      <div className="rounded-[18px] bg-white p-4">
        <h3 className="mb-3 text-[13px] font-extrabold uppercase tracking-[0.04em] text-[#173f31]">Life stage</h3>
        <div className="grid grid-cols-3 gap-1.5">
          {["Puppy", "Adult", "Senior"].map((stage) => (
            <button key={stage} type="button" onClick={() => onLifeStageChange?.(selectedLifeStage === stage ? "" : stage)}
              className={pillClass(selectedLifeStage === stage)}>{stage}</button>
          ))}
        </div>
      </div>

      <div className="rounded-[18px] bg-white p-4">
        <h3 className="mb-3 text-[13px] font-extrabold uppercase tracking-[0.04em] text-[#173f31]">Price (৳)</h3>
        <div className="mb-2 flex justify-between text-[12.5px] font-bold text-[#173f31]"><span>৳0</span><span>৳{priceCeiling}</span></div>
        <input type="range" min="0" max={priceCeiling} step="10" value={maxPrice}
          onChange={(event) => onMaxPriceChange?.(event.target.value)} aria-label="Maximum product price"
          className="w-full cursor-pointer accent-[#ee9322]" />
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          {priceOptions.map((value) => <button key={value} type="button" onClick={() => onMaxPriceChange?.(value)} className={pillClass(Number(maxPrice) === value)}>Under ৳{value}</button>)}
          <button type="button" onClick={() => onMaxPriceChange?.(priceCeiling)} className={pillClass(Number(maxPrice) >= priceCeiling)}>Any</button>
        </div>
      </div>

      <div className="rounded-[18px] bg-white p-4">
        <h3 className="mb-3 text-[13px] font-extrabold uppercase tracking-[0.04em] text-[#173f31]">Brand</h3>
        <div className="flex flex-wrap gap-1.5">
          {normalizedBrands.length ? normalizedBrands.map((brand) => (
            <button key={brand.key} type="button" onClick={() => onBrandChange?.(selectedBrand === brand.label ? "" : brand.label)}
              className={pillClass(selectedBrand === brand.label)}>{brand.label}</button>
          )) : <span className="text-[12px] font-medium text-[#5d6b65]">No brands</span>}
        </div>
      </div>

      <div className="rounded-[18px] bg-white p-4">
        <div className="flex items-center justify-between gap-2.5 text-[13.5px] font-bold text-[#173f31]">
          <span>In stock only</span>
          <button type="button" role="switch" aria-checked={inStockOnly} aria-label="Show in-stock products only"
            onClick={() => onInStockChange?.(!inStockOnly)}
            className={`relative h-[24px] w-[42px] cursor-pointer rounded-full border-0 transition-colors after:absolute after:top-[3px] after:h-[18px] after:w-[18px] after:rounded-full after:bg-white after:transition-[0.15s] after:content-[''] ${inStockOnly ? "bg-[#173f31] after:left-1/2" : "bg-[#d9d3c8] after:left-[3px]"}`} />
        </div>
      </div>
    </aside>
  );
}
