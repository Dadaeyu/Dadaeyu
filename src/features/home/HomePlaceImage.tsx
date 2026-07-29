"use client";

/* eslint-disable @next/next/no-img-element */

import { useState } from "react";

export function HomePlaceImage({
  src,
  alt,
  className = ""
}: {
  src: string | null;
  alt: string;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div
        className={`text-brand-900 relative isolate overflow-hidden bg-[linear-gradient(145deg,#d8f4e9_0%,#7cd5bd_48%,#1f8f7e_100%)] ${className}`}
        role="img"
        aria-label={`${alt} 대표 이미지 준비 중`}
      >
        <span
          className="absolute -top-[12%] -right-[12%] h-[58%] w-[58%] rounded-full border border-white/35"
          aria-hidden="true"
        />
        <span
          className="absolute -top-[3%] -right-[3%] h-[36%] w-[36%] rounded-full border border-white/30"
          aria-hidden="true"
        />
        <span
          className="bg-brand-900/[0.12] absolute -bottom-[18%] -left-[15%] h-[68%] w-[68%] rounded-full blur-2xl"
          aria-hidden="true"
        />
        <span className="absolute inset-x-0 bottom-0 z-10 p-5 sm:p-6">
          <span className="text-brand-900/60 block text-[0.65rem] font-bold tracking-[0.24em]">
            DAEJEON
          </span>
          <span className="mt-1 block max-w-[16ch] text-xl leading-tight font-semibold sm:text-2xl">
            {alt}
          </span>
        </span>
      </div>
    );
  }

  return (
    <img
      src={src.startsWith("/") ? src : `/api/home/image?src=${encodeURIComponent(src)}`}
      alt={alt}
      className={className}
      loading="lazy"
      decoding="async"
      onError={() => setFailed(true)}
    />
  );
}
