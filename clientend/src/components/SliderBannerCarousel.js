import BannerCarousel from "@/components/BannerCarousel";

const EMPTY_BANNERS = [];

export default function SliderBannerCarousel({ initialBanners = EMPTY_BANNERS }) {
  return (
    <BannerCarousel
      initialBanners={initialBanners}
      bannerType="slider-banner"
      sectionClassName="w-full bg-[#fbf7f1] px-4 py-10 sm:px-6 lg:px-8"
      slideAspectClassName="aspect-[16/7] w-full sm:aspect-[21/9] md:max-h-[320px] md:min-h-[180px]"
    />
  );
}
