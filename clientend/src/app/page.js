import AskFarzanaSection from "@/components/AskFarzanaSection";
import CategoryDealsBanner from "@/components/CategoryDealsBanner";
import FeaturedProducts from "@/components/FeaturedProducts";
import HomeBannerCarousel from "@/components/HomeBannerCarousel";
import PopularBrands from "@/components/PopularBrands";
import PromoDealsSection from "@/components/PromoDealsSection";
import ShopByPetType from "@/components/ShopByPetType";
import SliderBannerCarousel from "@/components/SliderBannerCarousel";
import WhyChooseUs from "@/components/WhyChooseUs";
import { fetchBanners, fetchSliderBanners } from "@/lib/bannerApi";

export default async function Home() {
  const [heroBanners, promoBanners, sliderBanners] = await Promise.all([
    fetchBanners("hero-banner"),
    fetchBanners("promo-banner", { homepageOnly: true }),
    fetchSliderBanners(),
  ]);

  return (
    <main className="bg-white">
      <HomeBannerCarousel initialHeroBanners={heroBanners} />
      <ShopByPetType />
      <FeaturedProducts />
      <PromoDealsSection />
      <PopularBrands />
      <CategoryDealsBanner initialPromoBanners={promoBanners} />
      <WhyChooseUs />
      <AskFarzanaSection />
      <SliderBannerCarousel initialBanners={sliderBanners} />
    </main>
  );
}
