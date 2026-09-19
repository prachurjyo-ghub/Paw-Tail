import Link from "next/link";

export default function CategorySidebar({ categories = [], activeCategory }) {
  return (
    <aside className="sticky top-[18px] hidden flex-col gap-2.5 lg:flex">
      <div className="rounded-[18px] bg-white p-4">
        <div className="mb-1 flex items-center justify-between">
          <h2 className="text-[16px] font-extrabold tracking-[-0.02em] text-[#173f31]">Refine</h2>
          <button
            className="cursor-pointer border-0 bg-transparent text-[12.5px] font-bold text-[#ee9322] disabled:cursor-default disabled:opacity-35"
            type="button"
            disabled
          >
            Clear all
          </button>
        </div>
      </div>

      <div className="rounded-[18px] bg-white p-4">
        <h3 className="mb-3 text-[13px] font-extrabold uppercase tracking-[0.04em] text-[#173f31]">
          Categories
        </h3>
        <div className="grid grid-cols-2 gap-2">
          {categories.map((category) => {
            const isActive = category.slug === activeCategory.slug;
            const href = `/categories/${category.slug}`;

            return (
              <Link
                key={category.slug}
                href={href}
                className={`cursor-pointer rounded-[14px] border-[1.5px] p-[10px_8px_9px] text-left transition-[0.15s] hover:border-[#173f31] ${
                  isActive
                    ? "border-[#173f31] bg-[#173f31] text-white"
                    : "border-[#e4ddd2] bg-white text-[#173f31]"
                }`}
              >
                <b className="block text-[12.5px] font-extrabold line-clamp-1">{category.name}</b>
                <em className={`not-italic text-[11px] font-semibold ${isActive ? "opacity-80" : "opacity-70"}`}>
                  —
                </em>
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
          <span>৳2000</span>
        </div>
        <input
          type="range"
          min="0"
          max="2000"
          defaultValue="2000"
          className="w-full cursor-pointer accent-[#ee9322]"
        />
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          <button className="cursor-pointer rounded-full border-[1.5px] border-[#e4ddd2] bg-white px-2.5 py-1.5 text-[11.5px] font-bold text-[#173f31] hover:border-[#173f31]">
            Under ৳400
          </button>
          <button className="cursor-pointer rounded-full border-[1.5px] border-[#e4ddd2] bg-white px-2.5 py-1.5 text-[11.5px] font-bold text-[#173f31] hover:border-[#173f31]">
            Under ৳900
          </button>
          <button className="cursor-pointer rounded-full border-[1.5px] border-[#173f31] bg-[#173f31] px-2.5 py-1.5 text-[11.5px] font-bold text-white">
            Any
          </button>
        </div>
      </div>

      <div className="rounded-[18px] bg-white p-4">
        <div className="flex items-center justify-between gap-2.5 text-[13.5px] font-bold text-[#173f31]">
          <span>In stock only</span>
          <button
            className="relative h-[24px] w-[42px] cursor-pointer rounded-full border-0 bg-[#d9d3c8] transition-colors after:absolute after:left-[3px] after:top-[3px] after:h-[18px] after:w-[18px] after:rounded-full after:bg-white after:transition-[0.15s] after:content-['']"
            type="button"
          />
        </div>
      </div>
    </aside>
  );
}
