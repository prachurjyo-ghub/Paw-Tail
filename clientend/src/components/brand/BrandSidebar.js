import Link from "next/link";
import Image from "next/image";

function BrandInitials({ name }) {
  return (
    <span className="text-[10px] font-black text-main">
      {(name || "?")
        .split(" ")
        .slice(0, 2)
        .map((part) => part[0])
        .join("")
        .toUpperCase()}
    </span>
  );
}

export default function BrandSidebar({ brands = [], activeBrand, className = "hidden lg:flex", priceCeiling = 2000,
  maxPrice = priceCeiling, inStockOnly = false, hasActiveFilters = false,
  onMaxPriceChange, onInStockChange, onClear }) {
  return (
    <aside className={`flex-col gap-2.5 lg:sticky lg:top-[18px] ${className}`}>
      <div className="rounded-[18px] bg-white p-4">
        <div className="mb-1 flex items-center justify-between">
          <h2 className="text-[16px] font-extrabold tracking-[-0.02em] text-[#173f31]">Refine</h2>
          <button
            className="cursor-pointer border-0 bg-transparent text-[12.5px] font-bold text-[#ee9322] disabled:cursor-default disabled:opacity-35"
            type="button"
            disabled={!hasActiveFilters}
            onClick={onClear}
          >
            Clear all
          </button>
        </div>
      </div>

      <div className="rounded-[18px] bg-white p-4">
        <h3 className="mb-3 text-[13px] font-extrabold uppercase tracking-[0.04em] text-[#173f31]">
          Brands
        </h3>
        <div className="flex max-h-[300px] flex-col gap-2 overflow-y-auto pr-2 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-[#173f31]/10">
          {brands.map((brand) => {
            const isActive = brand.slug === activeBrand.slug;
            const href = `/brands/${brand.slug}`;

            return (
              <Link
                key={brand.slug}
                href={href}
                className={`flex cursor-pointer items-center gap-3 rounded-[14px] border-[1.5px] p-[10px] text-left transition-[0.15s] hover:border-[#173f31] ${
                  isActive
                    ? "border-[#173f31] bg-[#173f31] text-white"
                    : "border-[#e4ddd2] bg-white text-[#173f31]"
                }`}
              >
                <div className="flex h-6 w-6 shrink-0 items-center justify-center overflow-hidden rounded-md bg-[#eef8f2]">
                  {brand.imageUrl ? (
                    <Image
                      src={brand.imageUrl}
                      alt={brand.name}
                      width={24}
                      height={24}
                      className="h-full w-full object-contain mix-blend-multiply"
                    />
                  ) : (
                    <BrandInitials name={brand.name} />
                  )}
                </div>
                <b className="block text-[12.5px] font-extrabold line-clamp-1">{brand.name}</b>
              </Link>
            );
          })}
        </div>
      </div>

      <div className="rounded-[18px] bg-white p-4">
        <h3 className="mb-3 text-[13px] font-extrabold uppercase tracking-[0.04em] text-[#173f31]">
          Price (৳)
        </h3>
        <div className="mb-2 flex justify-between text-[12.5px] font-bold text-[#173f31]">
          <span>৳0</span>
          <span>৳{priceCeiling}</span>
        </div>
        <input
          type="range"
          min="0"
          max={priceCeiling}
          step="10"
          value={maxPrice}
          onChange={(event) => onMaxPriceChange?.(event.target.value)}
          aria-label="Maximum product price"
          className="w-full cursor-pointer accent-[#ee9322]"
        />
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          <button type="button" onClick={() => onMaxPriceChange?.(400)} className={`cursor-pointer rounded-full border-[1.5px] px-2.5 py-1.5 text-[11.5px] font-bold ${Number(maxPrice) === 400 ? "border-[#173f31] bg-[#173f31] text-white" : "border-[#e4ddd2] bg-white text-[#173f31] hover:border-[#173f31]"}`}>
            Under ৳400
          </button>
          <button type="button" onClick={() => onMaxPriceChange?.(900)} className={`cursor-pointer rounded-full border-[1.5px] px-2.5 py-1.5 text-[11.5px] font-bold ${Number(maxPrice) === 900 ? "border-[#173f31] bg-[#173f31] text-white" : "border-[#e4ddd2] bg-white text-[#173f31] hover:border-[#173f31]"}`}>
            Under ৳900
          </button>
          <button type="button" onClick={() => onMaxPriceChange?.(priceCeiling)} className={`cursor-pointer rounded-full border-[1.5px] px-2.5 py-1.5 text-[11.5px] font-bold ${Number(maxPrice) >= priceCeiling ? "border-[#173f31] bg-[#173f31] text-white" : "border-[#e4ddd2] bg-white text-[#173f31] hover:border-[#173f31]"}`}>
            Any
          </button>
        </div>
      </div>

      <div className="rounded-[18px] bg-white p-4">
        <div className="flex items-center justify-between gap-2.5 text-[13.5px] font-bold text-[#173f31]">
          <span>In stock only</span>
          <button
            className={`relative h-[24px] w-[42px] cursor-pointer rounded-full border-0 transition-colors after:absolute after:top-[3px] after:h-[18px] after:w-[18px] after:rounded-full after:bg-white after:transition-[0.15s] after:content-[''] ${inStockOnly ? "bg-[#173f31] after:left-1/2" : "bg-[#d9d3c8] after:left-[3px]"}`}
            type="button"
            role="switch"
            aria-checked={inStockOnly}
            aria-label="Show in-stock products only"
            onClick={() => onInStockChange?.(!inStockOnly)}
          />
        </div>
      </div>
    </aside>
  );
}
