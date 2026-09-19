"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  PiArrowDownBold,
  PiArrowRightBold,
  PiBoneBold,
  PiCaretLeftBold,
  PiCaretRightBold,
  PiCatFill,
  PiCreditCard,
  PiDogFill,
  PiHeadset,
  PiPawPrintFill,
  PiTruck,
} from "react-icons/pi";

import styles from "./HomeHero.module.css";

const SLIDES = [
  {
    src: "/home-pet-banner.png",
    alt: "Dog, cat, fish and rabbit with PawTail essentials",
    caption: "The full PawTail family — one basket",
  },
  {
    src: "/home-pet-banner-food.png",
    alt: "Aquarium, bird and small-pet food collection",
    caption: "Food and care for every companion",
  },
  {
    src: "/home-pet-banner-small-pets.png",
    alt: "Dog and cat with premium pet food and accessories",
    caption: "Everyday essentials, thoughtfully selected",
  },
];

const PARTICLES = [
  ["paw", "5%", 18, 18, -18, -34, 0.08],
  ["bone", "13%", 26, 24, 12, 44, 0.09],
  ["cat", "22%", 17, 21, -10, -28, 0.07],
  ["paw", "31%", 30, 27, 22, 35, 0.06],
  ["dog", "40%", 21, 20, -24, -45, 0.07],
  ["bone", "49%", 19, 25, 16, 30, 0.08],
  ["paw", "58%", 25, 22, -16, -38, 0.06],
  ["cat", "66%", 22, 29, 20, 42, 0.07],
  ["bone", "75%", 29, 26, -26, -25, 0.08],
  ["dog", "84%", 18, 23, 15, 38, 0.07],
  ["paw", "92%", 27, 31, -12, -40, 0.08],
  ["bone", "97%", 16, 19, 18, 34, 0.06],
  ["dog", "2%", 14, 26, 20, 46, 0.08],
  ["cat", "9%", 21, 34, -26, -42, 0.07],
  ["paw", "18%", 15, 23, 8, 32, 0.1],
  ["bone", "27%", 22, 31, -14, -48, 0.08],
  ["dog", "36%", 16, 28, 18, 38, 0.07],
  ["paw", "45%", 20, 36, -20, -35, 0.09],
  ["cat", "54%", 14, 25, 12, 45, 0.08],
  ["bone", "63%", 18, 33, -16, -36, 0.08],
  ["paw", "71%", 15, 22, 24, 40, 0.1],
  ["dog", "80%", 22, 35, -12, -44, 0.07],
  ["cat", "89%", 16, 27, 16, 35, 0.08],
  ["bone", "95%", 21, 30, -22, -32, 0.09],
];

const PARTICLE_ICONS = {
  paw: PiPawPrintFill,
  bone: PiBoneBold,
  dog: PiDogFill,
  cat: PiCatFill,
};

const STATS = [
  ["12,000+", "Happy pets"],
  ["4.9/5", "Avg. rating"],
  ["500+", "Products"],
  ["64", "Districts served"],
];

export default function HomeBannerCarousel() {
  const [activeSlide, setActiveSlide] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  const stageRef = useRef(null);
  const tiltRef = useRef(null);

  const showSlide = useCallback((index) => {
    setActiveSlide((index + SLIDES.length) % SLIDES.length);
  }, []);

  useEffect(() => {
    if (isPaused) return undefined;
    const timer = window.setInterval(
      () => setActiveSlide((current) => (current + 1) % SLIDES.length),
      5600,
    );
    return () => window.clearInterval(timer);
  }, [isPaused]);

  useEffect(() => {
    const stage = stageRef.current;
    const tilt = tiltRef.current;
    if (!stage || !tilt) return undefined;

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (reduceMotion) return undefined;

    const onMove = (event) => {
      const bounds = stage.getBoundingClientRect();
      const x = (event.clientX - bounds.left) / bounds.width - 0.5;
      const y = (event.clientY - bounds.top) / bounds.height - 0.5;
      tilt.style.transform = `rotateX(${(-y * 7).toFixed(2)}deg) rotateY(${(
        x * 10
      ).toFixed(2)}deg)`;
    };
    const onLeave = () => {
      tilt.style.transform = "rotateX(0deg) rotateY(0deg)";
    };

    stage.addEventListener("pointermove", onMove);
    stage.addEventListener("pointerleave", onLeave);
    return () => {
      stage.removeEventListener("pointermove", onMove);
      stage.removeEventListener("pointerleave", onLeave);
    };
  }, []);

  const scrollToCategories = () => {
    const target = document.getElementById("shop-by-category");
    if (!target) return;

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    if (reduceMotion) {
      target.scrollIntoView();
      return;
    }

    setIsExiting(true);
    window.setTimeout(() => {
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 160);
    window.setTimeout(() => setIsExiting(false), 950);
  };

  return (
    <section
      className={`${styles.hero} ${isExiting ? styles.heroExiting : ""}`}
      aria-labelledby="home-hero-title"
    >
      <div className={styles.gridTexture} />
      <div className={`${styles.glow} ${styles.glowOne}`} />
      <div className={`${styles.glow} ${styles.glowTwo}`} />
      <div className={`${styles.glow} ${styles.glowThree}`} />

      <div className={styles.particles} aria-hidden="true">
        {PARTICLES.map(([type, left, size, duration, rotation, sway, opacity], index) => {
          const Icon = PARTICLE_ICONS[type];
          return (
            <span
              key={`${type}-${index}`}
              className={styles.particle}
              style={{
                left,
                width: size,
                height: size,
                "--duration": `${duration}s`,
                "--delay": `${-(index * 2.7)}s`,
                "--rotation": `${rotation}deg`,
                "--sway": `${sway}px`,
                "--particle-opacity": opacity,
              }}
            >
              <Icon />
            </span>
          );
        })}
      </div>

      <div className={styles.inner}>
        <div className={styles.copy}>
          <div className={styles.eyebrow}>
            <span />
            Bangladesh&apos;s trusted pet store
            <strong>· since 2019</strong>
          </div>

          <h1 id="home-hero-title" className={styles.title}>
            Everything your pet
            <br />
            loves, delivered
            <br />
            with <em>love.</em>
          </h1>

          <p className={styles.description}>
            Premium food, tanks, cages, toys &amp; treats for{" "}
            <strong>dogs, cats, birds, fish, rabbits</strong> and every small
            friend in between — curated by pet experts, at your door in{" "}
            <strong>24–48 hours</strong>, anywhere in Bangladesh.
          </p>

          <div className={styles.actions}>
            <Link href="/categories" className={styles.primaryButton}>
              Shop best sellers <PiArrowRightBold />
            </Link>
            <Link href="/animals" className={styles.secondaryButton}>
              Browse categories <PiArrowDownBold />
            </Link>
          </div>

          <div className={styles.stats}>
            {STATS.map(([value, label]) => (
              <div key={label} className={styles.stat}>
                <strong>{value}</strong>
                <span>{label}</span>
              </div>
            ))}
          </div>
        </div>

        <div ref={stageRef} className={styles.stage}>
          <div ref={tiltRef} className={styles.tilt}>
            <div className={styles.orbit} />
            <div className={`${styles.orbit} ${styles.orbitInner}`} />

            <div
              className={styles.frame}
              onPointerEnter={() => setIsPaused(true)}
              onPointerLeave={() => setIsPaused(false)}
              aria-roledescription="carousel"
              aria-label="PawTail collections"
            >
              {SLIDES.map((slide, index) => (
                <figure
                  key={slide.src}
                  className={`${styles.slide} ${
                    index === activeSlide ? styles.activeSlide : ""
                  }`}
                  aria-hidden={index !== activeSlide}
                >
                  <Image
                    src={slide.src}
                    alt={slide.alt}
                    fill
                    sizes="(max-width: 1080px) 92vw, 52vw"
                    priority={index === 0}
                    loading={index === 0 ? "eager" : "lazy"}
                  />
                  <figcaption>
                    <i />
                    {slide.caption}
                  </figcaption>
                </figure>
              ))}

              <div className={styles.frameControls}>
                <span className={styles.counter}>
                  <b>0{activeSlide + 1}</b> / 0{SLIDES.length}
                </span>
                <div className={styles.arrows}>
                  <button
                    type="button"
                    onClick={() => showSlide(activeSlide - 1)}
                    aria-label="Previous banner"
                  >
                    <PiCaretLeftBold />
                  </button>
                  <button
                    type="button"
                    onClick={() => showSlide(activeSlide + 1)}
                    aria-label="Next banner"
                  >
                    <PiCaretRightBold />
                  </button>
                </div>
              </div>

              <div className={styles.dots} role="tablist">
                {SLIDES.map((slide, index) => (
                  <button
                    key={slide.src}
                    type="button"
                    role="tab"
                    aria-selected={index === activeSlide}
                    aria-label={`Show banner ${index + 1}`}
                    className={index === activeSlide ? styles.activeDot : ""}
                    onClick={() => showSlide(index)}
                  />
                ))}
              </div>

              <div className={styles.progress} key={activeSlide}>
                <span />
              </div>
            </div>

            <InfoChip
              className={styles.shippingChip}
              icon={PiTruck}
              title="Free shipping"
              text="on orders over ৳3,500"
            />
            <InfoChip
              className={styles.helpChip}
              icon={PiHeadset}
              title="24/7 vet help"
              text="chat with pet experts"
            />
            <InfoChip
              className={styles.paymentChip}
              icon={PiCreditCard}
              title="Cash on delivery"
              text="all 64 districts"
            />

            <div className={styles.coin} aria-hidden="true">
              <PiPawPrintFill />
            </div>

            <div className={styles.thumbnails}>
              {SLIDES.map((slide, index) => (
                <button
                  key={slide.src}
                  type="button"
                  className={index === activeSlide ? styles.activeThumb : ""}
                  onClick={() => showSlide(index)}
                  aria-label={`Show banner ${index + 1}`}
                >
                  <Image src={slide.src} alt="" fill sizes="180px" />
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <button
        type="button"
        className={styles.scrollCue}
        onClick={scrollToCategories}
      >
        <span />
        Scroll to explore
      </button>
    </section>
  );
}

function InfoChip({ className, icon: Icon, title, text }) {
  return (
    <div className={`${styles.chip} ${className}`}>
      <span className={styles.chipIcon}>
        <Icon />
      </span>
      <span>
        <strong>{title}</strong>
        <small>{text}</small>
      </span>
    </div>
  );
}
