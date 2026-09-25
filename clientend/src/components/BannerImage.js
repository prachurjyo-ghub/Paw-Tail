"use client";

import { useState } from "react";

import { getBannerImageUrl } from "@/lib/bannerApi";
import { Skeleton } from "@/components/ui/skeleton";

export default function BannerImage({
  imageUrl,
  src,
  alt = "Banner",
  priority = false,
  className = "h-full w-full object-cover",
  wrapperClassName = "",
}) {
  const resolvedSrc = src || getBannerImageUrl(imageUrl);
  const [loadedSrc, setLoadedSrc] = useState("");
  const isLoaded = loadedSrc === resolvedSrc;

  if (!resolvedSrc) {
    return null;
  }

  return (
    <div className={`relative overflow-hidden ${wrapperClassName}`}>
      {!isLoaded ? (
        <Skeleton className="absolute inset-0 h-full w-full rounded-none" />
      ) : null}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={resolvedSrc}
        alt={alt}
        loading={priority ? "eager" : "lazy"}
        decoding="async"
        onLoad={() => setLoadedSrc(resolvedSrc)}
        className={`${className} transition-opacity duration-300 ${
          isLoaded ? "opacity-100" : "opacity-0"
        }`}
      />
    </div>
  );
}
