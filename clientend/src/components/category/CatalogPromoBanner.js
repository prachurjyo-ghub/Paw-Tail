import BannerImage from "@/components/BannerImage";

export default function CatalogPromoBanner({ banners = [] }) {
  const banner = banners.find((item) => item?.imageUrl);

  if (!banner) return null;

  return (
    <section
      aria-label={banner.name || "Promotional banner"}
      className="mb-[22px] aspect-[5/1] w-full overflow-hidden rounded-[24px] bg-white shadow-[0_12px_36px_rgba(23,63,49,0.08)]"
    >
      <BannerImage
        imageUrl={banner.imageUrl}
        alt={banner.name || "Promotional banner"}
        wrapperClassName="h-full w-full"
        className="h-full w-full object-cover"
      />
    </section>
  );
}
