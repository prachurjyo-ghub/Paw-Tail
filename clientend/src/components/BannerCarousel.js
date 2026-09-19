"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import BannerImage from "@/components/BannerImage";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { apiRequest } from "@/lib/api";
import { mapBannerToSlide } from "@/lib/bannerApi";

const toSlides = (banners = []) =>
  banners.map(mapBannerToSlide).filter((slide) => slide?.src);

const EMPTY_BANNERS = [];

export default function BannerCarousel({
  initialBanners = EMPTY_BANNERS,
  bannerType,
  autoPlayMs = 0,
  slideAspectClassName = "aspect-[5/2] w-full sm:aspect-[21/8] md:max-h-[420px] md:min-h-[220px]",
  sectionClassName = "relative z-0 mt-4 w-full bg-white px-4 py-4 sm:px-6 lg:px-8",
}) {
  const [bannerSlides, setBannerSlides] = useState(toSlides(initialBanners));
  const [carouselApi, setCarouselApi] = useState(null);

  useEffect(() => {
    let alive = true;

    const loadSlides = async () => {
      try {
        if (initialBanners.length) {
          if (!alive) return;
          setBannerSlides(toSlides(initialBanners));
          return;
        }

        const data = await apiRequest("/banners/get-banners");
        const banners = (data.banners || []).filter(
          (banner) => !bannerType || banner.bannerType === bannerType
        );

        if (!alive) return;
        setBannerSlides(toSlides(banners));
      } catch {
        if (alive) setBannerSlides([]);
      }
    };

    loadSlides();

    return () => {
      alive = false;
    };
  }, [initialBanners, bannerType]);

  const slides = useMemo(() => bannerSlides, [bannerSlides]);
  const carouselOptions = useMemo(
    () => ({ align: "start", loop: slides.length > 1 }),
    [slides.length]
  );

  useEffect(() => {
    if (!carouselApi || !autoPlayMs || slides.length <= 1) {
      return undefined;
    }

    const timer = window.setInterval(() => {
      carouselApi.scrollNext();
    }, autoPlayMs);

    return () => window.clearInterval(timer);
  }, [carouselApi, autoPlayMs, slides.length]);

  if (!slides.length) {
    return null;
  }

  return (
    <section className={sectionClassName}>
      <div className="mx-auto w-full max-w-7xl">
        <Carousel
          setApi={setCarouselApi}
          opts={carouselOptions}
          className="w-full"
        >
          <CarouselContent>
            {slides.map((slide, index) => (
              <CarouselItem key={slide.id || `${slide.src}-${index}`}>
                <Slide
                  slide={slide}
                  priority={index === 0}
                  aspectClassName={slideAspectClassName}
                />
              </CarouselItem>
            ))}
          </CarouselContent>
          {slides.length > 1 ? (
            <>
              <CarouselPrevious />
              <CarouselNext />
            </>
          ) : null}
        </Carousel>
      </div>
    </section>
  );
}

function Slide({ slide, priority, aspectClassName }) {
  const image = (
    <div className="relative w-full overflow-hidden rounded-xl border border-neutral-200 bg-neutral-50 shadow-sm">
      <div className={aspectClassName}>
        <BannerImage
          src={slide.src}
          alt={slide.alt}
          priority={priority}
          wrapperClassName="h-full w-full"
        />
      </div>
    </div>
  );

  if (slide.href) {
    return (
      <Link href={slide.href} className="block">
        {image}
      </Link>
    );
  }

  return image;
}
