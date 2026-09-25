"use client";

import { useEffect, useState } from "react";

import Container from "@/components/Container";
import { apiRequest } from "@/lib/api";

export default function CustomerReviews() {
  const [reviews, setReviews] = useState([]);

  useEffect(() => {
    let alive = true;

    apiRequest("/reviews/get-reviews")
      .then((data) => {
        if (!alive) return;

        const nextReviews = (data.reviews || []).slice(0, 3).map((review) => ({
          name: review.customerName,
          location: review.product?.name || "Verified buyer",
          rating: Number(review.rating || 0).toFixed(1),
          text: review.comment,
        }));

        setReviews(nextReviews);
      })
      .catch(() => {
        if (alive) setReviews([]);
      });

    return () => {
      alive = false;
    };
  }, []);

  if (!reviews.length) {
    return null;
  }

  return (
    <section className="bg-white py-8 sm:py-12 border-b border-neutral-100">
      <Container>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-2xl font-black leading-tight text-[#173f31] sm:text-3xl">
              Happy Pets, Happy Parents
            </h2>
            <p className="mt-1 text-sm font-medium text-[#5d6b65]">
              Real reviews from our awesome community
            </p>
          </div>
          <div className="hidden md:flex gap-1 text-2xl text-[#ee9322]">
            ★★★★★
          </div>
        </div>

        <div className="flex overflow-x-auto snap-x snap-mandatory pb-4 sm:pb-0 md:grid md:grid-cols-3 gap-4 sm:gap-5 hide-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0">
          {reviews.map(({ name, location, rating, text }) => (
            <article
              key={`${name}-${location}`}
              className="snap-center min-w-[280px] sm:min-w-0 flex-shrink-0 flex flex-col justify-between rounded-[20px] bg-[#fbf7f1] p-5 transition-transform hover:-translate-y-1"
            >
              <div>
                <div className="flex items-center gap-1 text-lg text-[#ee9322] mb-3">
                  {Array.from({ length: Math.round(Number(rating)) }).map((_, index) => (
                    <span key={index}>★</span>
                  ))}
                </div>
                <p className="text-[13px] sm:text-[14px] font-semibold leading-relaxed text-[#173f31] italic">
                  &ldquo;{text}&rdquo;
                </p>
              </div>
              
              <div className="mt-4 flex items-center justify-between gap-3 border-t border-[#173f31]/10 pt-4">
                <div>
                  <h3 className="text-[14px] font-extrabold text-[#173f31] leading-tight">{name}</h3>
                  <p className="text-[11px] font-semibold text-[#5d6b65] leading-tight mt-0.5 line-clamp-1">{location}</p>
                </div>
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#173f31] text-[11px] font-black text-white">
                  {rating}
                </span>
              </div>
            </article>
          ))}
        </div>
      </Container>
    </section>
  );
}
