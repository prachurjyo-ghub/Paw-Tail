import Link from "next/link";

function PriceFilter({ priceCeiling, maxPrice, onMaxPriceChange }) {
  const priceOptions = [400, 900].filter((value) => value < priceCeiling);

  return (
    <div className="rounded-[18px] bg-white p-4">
      <h3 className="mb-3 text-[13px] font-extrabold uppercase tracking-[0.04em] text-[#173f31]">Price (৳)</h3>
      <div className="mb-2 flex justify-between text-[12.5px] font-bold text-[#173f31]">
        <span>৳0</span><span>৳{priceCeiling}</span>
      </div>
      <input type="range" min="0" max={priceCeiling} step="10" value={maxPrice}
        onChange={(event) => onMaxPriceChange?.(event.target.value)}
        aria-label="Maximum product price" className="w-full cursor-pointer accent-[#ee9322]" />
      <div className="mt-2.5 flex flex-wrap gap-1.5">
        {priceOptions.map((value) => (
          <button key={value} type="button" onClick={() => onMaxPriceChange?.(value)}
            className={`cursor-pointer rounded-full border-[1.5px] px-2.5 py-1.5 text-[11.5px] font-bold ${Number(maxPrice) === value ? "border-[#173f31] bg-[#173f31] text-white" : "border-[#e4ddd2] bg-white text-[#173f31] hover:border-[#173f31]"}`}>
            Under ৳{value}
          </button>
        ))}
        <button type="button" onClick={() => onMaxPriceChange?.(priceCeiling)}
          className={`cursor-pointer rounded-full border-[1.5px] px-2.5 py-1.5 text-[11.5px] font-bold ${Number(maxPrice) >= priceCeiling ? "border-[#173f31] bg-[#173f31] text-white" : "border-[#e4ddd2] bg-white text-[#173f31] hover:border-[#173f31]"}`}>
          Any
        </button>
      </div>
    </div>
  );
}

export default function CategorySidebar({ categories = [], activeCategory, className = "hidden lg:flex", priceCeiling = 2000,
  maxPrice = priceCeiling, inStockOnly = false, hasActiveFilters = false, onMaxPriceChange, onInStockChange, onClear }) {
  return (
    <aside className={`flex-col gap-2.5 lg:sticky lg:top-[18px] ${className}`}>
      <div className="rounded-[18px] bg-white p-4">
        <div className="mb-1 flex items-center justify-between">
          <h2 className="text-[16px] font-extrabold tracking-[-0.02em] text-[#173f31]">Refine</h2>
          <button className="cursor-pointer border-0 bg-transparent text-[12.5px] font-bold text-[#ee9322] disabled:cursor-default disabled:opacity-35"
            type="button" disabled={!hasActiveFilters} onClick={onClear}>Clear all</button>
        </div>
      </div>

      <div className="rounded-[18px] bg-white p-4">
        <h3 className="mb-3 text-[13px] font-extrabold uppercase tracking-[0.04em] text-[#173f31]">Categories</h3>
        <div className="grid grid-cols-2 gap-2">
          {categories.map((category) => {
            const isActive = category.slug === activeCategory.slug;
            return (
              <Link key={category.slug} href={`/categories/${category.slug}`}
                className={`cursor-pointer rounded-[14px] border-[1.5px] p-[10px_8px_9px] text-left transition-[0.15s] hover:border-[#173f31] ${isActive ? "border-[#173f31] bg-[#173f31] text-white" : "border-[#e4ddd2] bg-white text-[#173f31]"}`}>
                <b className="block text-[12.5px] font-extrabold">{category.name}</b>
              </Link>
            );
          })}
        </div>
      </div>

      <PriceFilter priceCeiling={priceCeiling} maxPrice={maxPrice} onMaxPriceChange={onMaxPriceChange} />

      <div className="rounded-[18px] bg-white p-4">
        <div className="flex items-center justify-between gap-2.5 text-[13.5px] font-bold text-[#173f31]">
          <span>In stock only</span>
          <button className={`relative h-[24px] w-[42px] cursor-pointer rounded-full border-0 transition-colors after:absolute after:top-[3px] after:h-[18px] after:w-[18px] after:rounded-full after:bg-white after:transition-[0.15s] after:content-[''] ${inStockOnly ? "bg-[#173f31] after:left-1/2" : "bg-[#d9d3c8] after:left-[3px]"}`}
            type="button" role="switch" aria-checked={inStockOnly} aria-label="Show in-stock products only"
            onClick={() => onInStockChange?.(!inStockOnly)} />
        </div>
      </div>
    </aside>
  );
}
