import MiddleBar from "@/components/MiddleBar";
import Navbar from "@/components/Navbar";
import TopBar from "@/components/TopBar";
import MobileBottomNav from "@/components/MobileBottomNav";
import { getBrandNavbarView } from "@/lib/brandApi";
import { getCategoryAnimalsView, getCategoryNavbarView } from "@/lib/categoryApi";

export default async function Header() {
  const [animals, categories, brands] = await Promise.all([
    getCategoryAnimalsView(),
    getCategoryNavbarView(),
    getBrandNavbarView(),
  ]);

  return (
    <>
      <TopBar />
      <div className="sticky top-0 z-50 bg-white">
        <MiddleBar />
        <Navbar animals={animals} categories={categories} brands={brands} />
      </div>
      <MobileBottomNav />
    </>
  );
}
