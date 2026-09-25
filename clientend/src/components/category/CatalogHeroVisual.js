import Image from "next/image";

import CategoryIcon from "@/components/CategoryIcon";

export default function CatalogHeroVisual({
  imageUrl,
  icon,
  slug,
  name,
  imageFit = "cover",
}) {
  return (
    <div className="relative z-10 mx-auto flex h-[82px] w-[82px] items-center justify-center overflow-hidden rounded-full border-[3px] border-white/15 bg-[linear-gradient(145deg,rgba(255,255,255,0.13),rgba(255,255,255,0.04))] shadow-[0_12px_28px_rgba(0,0,0,0.2)] sm:h-[96px] sm:w-[96px] lg:h-[160px] lg:w-[160px] lg:border-4 lg:shadow-[0_16px_40px_rgba(0,0,0,0.22)]">
      {imageUrl ? (
        <Image
          src={imageUrl}
          alt={name}
          fill
          sizes="160px"
          className={imageFit === "contain" ? "object-contain p-3 lg:p-5" : "object-cover"}
        />
      ) : (
        <CategoryIcon
          icon={icon}
          slug={slug}
          name={name}
          className="h-9 w-9 text-[#f4a24c] sm:h-10 sm:w-10 lg:h-16 lg:w-16"
          strokeWidth={1.7}
        />
      )}
    </div>
  );
}
