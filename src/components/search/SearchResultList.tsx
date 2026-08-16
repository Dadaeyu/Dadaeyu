"use client";

import Image from "next/image";
import { Heart, MapPin, Star } from "lucide-react";
import type { SearchPlace } from "@/lib/search/kakaoSearch";

// DB(tourism)/카카오 검색 결과 목록. usePlaceSearch()의 searchPlaces를 그대로 넘기면 된다.
export default function SearchResultList({
  places,
  onSelect
}: {
  places: SearchPlace[];
  onSelect: (id: string) => void;
}) {
  return (
    <>
      {places.map((sp) => (
        <button
          key={sp.id}
          onClick={() => onSelect(sp.id)}
          className="group w-full border-b border-gray-50 px-4 py-3 text-left transition-colors hover:bg-gray-50"
        >
          <div className="flex items-start gap-2">
            {sp.image ? (
              <Image
                src={sp.image}
                alt={sp.name}
                width={40}
                height={40}
                unoptimized
                className="h-10 w-10 shrink-0 rounded-lg object-cover"
              />
            ) : (
              <div
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${sp.source === "kakao" ? "bg-cyan-50" : "bg-gray-100"}`}
              >
                <MapPin
                  className={`h-4 w-4 ${sp.source === "kakao" ? "text-cyan-400" : "text-gray-300"}`}
                />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="group-hover:text-brand-700 truncate text-sm font-medium text-gray-800 transition-colors">
                {sp.name}
              </p>
              {sp.address && <p className="mt-0.5 truncate text-xs text-gray-400">{sp.address}</p>}
              {sp.source === "kakao" && sp.category && (
                <p className="mt-0.5 truncate text-xs text-cyan-600">
                  {sp.category.split(" > ").pop()}
                </p>
              )}
              {(sp.average_rating !== undefined || sp.like_count !== undefined) && (
                <div className="mt-0.5 flex items-center gap-3 text-xs text-gray-500">
                  {sp.average_rating !== undefined && (
                    <div className="flex items-center gap-1">
                      <Star
                        className={`h-3 w-3 ${
                          sp.average_rating != null
                            ? "fill-yellow-400 text-yellow-400"
                            : "text-gray-300"
                        }`}
                      />
                      <span>
                        {sp.average_rating != null ? sp.average_rating.toFixed(1) : "0.0"}
                      </span>
                    </div>
                  )}
                  {sp.like_count !== undefined && (
                    <div className="flex items-center gap-1">
                      <Heart
                        className={`h-3 w-3 ${sp.like_count > 0 ? "fill-red-400 text-red-400" : "text-gray-300"}`}
                      />
                      <span>{sp.like_count}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </button>
      ))}
    </>
  );
}
