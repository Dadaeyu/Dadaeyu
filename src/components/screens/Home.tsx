"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronRight, Sparkles, TrendingUp, MapPin, Calendar, BookOpen } from "lucide-react";
import Chatbot from "@/components/Chatbot";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious
} from "@/components/ui/carousel";

export default function Home() {
  const [chatOpen, setChatOpen] = useState(false);
  const themes = [
    { id: 1, name: "빵지순례", icon: "🥐", color: "bg-amber-100 text-amber-700" },
    { id: 2, name: "먹거리", icon: "🍴", color: "bg-red-100 text-red-700" },
    { id: 3, name: "액티비티", icon: "⚡", color: "bg-blue-100 text-blue-700" },
    { id: 4, name: "과학", icon: "🔬", color: "bg-purple-100 text-purple-700" },
    { id: 5, name: "자연힐링", icon: "🌿", color: "bg-brand-100 text-brand-700" },
    { id: 6, name: "문화예술", icon: "🎨", color: "bg-pink-100 text-pink-700" },
    { id: 7, name: "역사근대", icon: "🏛️", color: "bg-indigo-100 text-indigo-700" },
    { id: 8, name: "축제", icon: "🎪", color: "bg-orange-100 text-orange-700" }
  ];

  const hotPlaces = [
    { id: 1, name: "대전 엑스포 과학공원", tag: "과학", rating: 4.8 },
    { id: 2, name: "성심당", tag: "빵지순례", rating: 4.9 },
    { id: 3, name: "한밭수목원", tag: "자연힐링", rating: 4.7 },
    { id: 5, name: "대청호 오백리길", tag: "자연힐링", rating: 4.6 }
  ];

  const bestCourses = [
    { id: 1, title: "대전 하루 완전 정복 코스", duration: "1일", places: 8, rating: 4.9 },
    { id: 2, title: "자연 속 힐링 여행", duration: "2일", places: 6, rating: 4.8 },
    { id: 3, title: "문화와 예술을 찾아서", duration: "1일", places: 5, rating: 4.7 }
  ];

  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <section className="from-navy-700 via-navy-600 to-brand-500 shadow-navy-600/20 relative overflow-hidden rounded-3xl bg-gradient-to-br p-7 text-white shadow-lg md:p-9">
        {/* decorative glow */}
        <div className="bg-brand-300/25 pointer-events-none absolute -top-12 -right-10 h-48 w-48 rounded-full blur-3xl" />
        <div className="bg-navy-300/30 pointer-events-none absolute -bottom-14 -left-8 h-44 w-44 rounded-full blur-3xl" />
        <div className="relative">
          <span className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold ring-1 ring-white/25 backdrop-blur-sm">
            <span className="text-gold-300">✦</span> 누구나 함께 떠나는 대전 여행
          </span>
          <h2 className="mb-2 text-2xl leading-tight font-bold md:text-3xl">
            대전, 모두를 위한 여행
          </h2>
          <p className="mb-5 text-sm text-white/80 md:text-base">
            장애물 없이 즐기는 무장애 여행 가이드, 다대유
          </p>
          <Link
            href="/map"
            className="text-navy-700 hover:bg-gold-50 hover:text-navy-800 inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3 font-bold shadow-md transition-colors"
          >
            <MapPin className="h-5 w-5" />
            지금 둘러보기
          </Link>
        </div>
      </section>

      {/* Themes Section */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-bold text-gray-800">테마별 여행</h3>
        </div>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {themes.map((theme) => (
            <Link
              key={theme.id}
              href={`/map?theme=${theme.name}`}
              className={`${theme.color} rounded-xl p-4 transition-shadow hover:shadow-md`}
            >
              <div className="mb-2 text-3xl">{theme.icon}</div>
              <div className="font-semibold">{theme.name}</div>
            </Link>
          ))}
        </div>
      </section>

      {/* Hot Places Section */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="text-gold-500 h-5 w-5" />
            <h3 className="text-lg font-bold text-gray-800">이번 달 핫플레이스</h3>
          </div>
          <Link href="/map?filter=hot" className="text-brand-600 hover:text-brand-700 text-sm">
            전체보기 <ChevronRight className="inline h-4 w-4" />
          </Link>
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {hotPlaces.map((place) => (
            <Link
              key={place.id}
              href={`/map?place=${place.id}`}
              className="rounded-xl border border-gray-200 bg-white p-4 transition-shadow hover:shadow-md"
            >
              <div className="mb-2 flex items-start justify-between">
                <h4 className="font-semibold text-gray-800">{place.name}</h4>
                <div className="flex items-center gap-1 text-sm">
                  <span className="text-yellow-500">★</span>
                  <span className="text-gray-700">{place.rating}</span>
                </div>
              </div>
              <span className="bg-brand-100 text-brand-700 inline-block rounded px-2 py-1 text-xs">
                {place.tag}
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* Best Courses Section */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="text-brand-600 h-5 w-5" />
            <h3 className="text-lg font-bold text-gray-800">이번 달 베스트 코스</h3>
          </div>
          <Link href="/course" className="text-brand-600 hover:text-brand-700 text-sm">
            전체보기 <ChevronRight className="inline h-4 w-4" />
          </Link>
        </div>
        <div className="space-y-3">
          {bestCourses.map((course) => (
            <Link
              key={course.id}
              href={`/course/${course.id}`}
              className="block rounded-xl border border-gray-200 bg-white p-4 transition-shadow hover:shadow-md"
            >
              <div className="mb-2 flex items-start justify-between">
                <h4 className="font-semibold text-gray-800">{course.title}</h4>
                <div className="flex items-center gap-1 text-sm">
                  <span className="text-yellow-500">★</span>
                  <span className="text-gray-700">{course.rating}</span>
                </div>
              </div>
              <div className="flex gap-3 text-sm text-gray-600">
                <span>{course.duration}</span>
                <span>•</span>
                <span>{course.places}곳</span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Tips Section */}
      <section className="bg-brand-50 rounded-xl p-6">
        <h3 className="mb-3 text-lg font-bold text-gray-800">무장애 여행 팁</h3>
        <div className="space-y-2">
          <a
            href="https://djid.or.kr/main.do"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between rounded-lg bg-white p-3 transition-shadow hover:shadow-sm"
          >
            <span className="text-sm text-gray-700">복지시설 안내</span>
            <ChevronRight className="h-4 w-4 text-gray-400" />
          </a>
          <button className="flex w-full items-center justify-between rounded-lg bg-white p-3 transition-shadow hover:shadow-sm">
            <span className="text-sm text-gray-700">교통정보</span>
            <ChevronRight className="h-4 w-4 text-gray-400" />
          </button>
        </div>
      </section>

      {/* Events Carousel */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-rose-500" />
            <h3 className="text-lg font-bold text-gray-800">진행 중인 이벤트</h3>
          </div>
        </div>
        <Carousel opts={{ align: "start", loop: true }} className="w-full">
          <CarouselContent className="-ml-3">
            {[
              {
                id: 1,
                title: "무장애 여행 사진 공모전",
                period: "2026.05.01 – 06.30",
                badge: "진행중",
                badgeColor: "bg-brand-100 text-brand-700",
                bg: "from-brand-400 to-brand-500",
                emoji: "📸",
                desc: "대전 무장애 여행 사진을 제출하고 상금을 받아가세요!"
              },
              {
                id: 2,
                title: "접근성 관광지 탐방 투어",
                period: "2026.06.07 – 06.08",
                badge: "선착순",
                badgeColor: "bg-orange-100 text-orange-700",
                bg: "from-orange-400 to-amber-500",
                emoji: "🚌",
                desc: "가이드와 함께하는 무장애 관광지 탐방 1박 2일 투어"
              },
              {
                id: 3,
                title: "여름 힐링 여행 할인 프로모션",
                period: "2026.06.01 – 08.31",
                badge: "D-93",
                badgeColor: "bg-blue-100 text-blue-700",
                bg: "from-blue-400 to-cyan-500",
                emoji: "🏖️",
                desc: "무장애 시설 이용 시 최대 30% 할인 혜택을 드립니다."
              },
              {
                id: 4,
                title: "보조기기 체험 행사",
                period: "2026.06.14",
                badge: "무료",
                badgeColor: "bg-purple-100 text-purple-700",
                bg: "from-purple-400 to-violet-500",
                emoji: "🦽",
                desc: "최신 이동 보조기기를 직접 체험해볼 수 있는 기회!"
              }
            ].map((ev) => (
              <CarouselItem
                key={ev.id}
                className="basis-4/5 pl-3 sm:basis-3/5 md:basis-2/5 lg:basis-1/3"
              >
                <div className="cursor-pointer overflow-hidden rounded-2xl border border-gray-100 shadow-sm transition-shadow hover:shadow-md">
                  <div
                    className={`h-28 bg-gradient-to-br ${ev.bg} flex items-center justify-center`}
                  >
                    <span className="text-5xl">{ev.emoji}</span>
                  </div>
                  <div className="bg-white p-3">
                    <div className="mb-1 flex items-center justify-between">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-semibold ${ev.badgeColor}`}
                      >
                        {ev.badge}
                      </span>
                      <span className="text-xs text-gray-400">{ev.period}</span>
                    </div>
                    <p className="mb-1 text-sm leading-snug font-bold text-gray-800">{ev.title}</p>
                    <p className="line-clamp-2 text-xs leading-relaxed text-gray-500">{ev.desc}</p>
                  </div>
                </div>
              </CarouselItem>
            ))}
          </CarouselContent>
          <CarouselPrevious className="-left-3 hidden sm:flex" />
          <CarouselNext className="-right-3 hidden sm:flex" />
        </Carousel>
      </section>

      {/* Articles & Reviews Carousel */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <BookOpen className="h-5 w-5 text-indigo-500" />
            <h3 className="text-lg font-bold text-gray-800">여행 기사 &amp; 후기</h3>
            <span className="from-gold-100 to-brand-100 text-gold-700 border-gold-200 flex items-center gap-1 rounded-full border bg-gradient-to-r px-2.5 py-0.5 text-xs font-bold">
              ✦ AI 요약
            </span>
          </div>
        </div>
        <Carousel opts={{ align: "start" }} className="w-full">
          <CarouselContent className="-ml-3">
            {[
              {
                id: 1,
                type: "기사",
                title: "휠체어로 즐기는 대전 하루 코스",
                author: "대전일보",
                date: "2026.05.20",
                emoji: "📰",
                color: "text-blue-600",
                bg: "bg-blue-50",
                rating: null,
                desc: "엑스포 과학공원부터 성심당까지, 휠체어 이용자를 위한 완벽한 하루 동선을 소개합니다."
              },
              {
                id: 2,
                type: "후기",
                title: "한밭수목원, 유모차도 거뜬해요",
                author: "여행러버",
                date: "2026.05.18",
                emoji: "🌿",
                color: "text-brand-600",
                bg: "bg-brand-50",
                rating: 5,
                desc: "두 돌 아이와 함께 방문했는데 전구간 평탄해서 정말 편하게 즐겼어요!"
              },
              {
                id: 3,
                type: "기사",
                title: "대전 무장애 관광 인프라 현황",
                author: "충청투데이",
                date: "2026.05.10",
                emoji: "🏙️",
                color: "text-indigo-600",
                bg: "bg-indigo-50",
                rating: null,
                desc: "대전시가 추진 중인 무장애 관광 인프라 확충 사업의 현재 진행 상황을 살펴봅니다."
              },
              {
                id: 4,
                type: "후기",
                title: "유성온천, 어르신과 함께 최고!",
                author: "효도여행",
                date: "2026.05.05",
                emoji: "♨️",
                color: "text-amber-600",
                bg: "bg-amber-50",
                rating: 4,
                desc: "80대 부모님 모시고 다녀왔어요. 수중 리프트 덕분에 온천도 즐기실 수 있었어요."
              },
              {
                id: 5,
                type: "기사",
                title: "대청호 오백리길 데크 구간 확장",
                author: "대전시",
                date: "2026.04.28",
                emoji: "🏞️",
                color: "text-cyan-600",
                bg: "bg-cyan-50",
                rating: null,
                desc: "대청호 오백리길 무장애 데크로드 구간이 기존 2km에서 5km로 확장됩니다."
              }
            ].map((item) => (
              <CarouselItem
                key={item.id}
                className="basis-4/5 pl-3 sm:basis-3/5 md:basis-2/5 lg:basis-1/3"
              >
                <div className="cursor-pointer overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm transition-shadow hover:shadow-md">
                  <div className={`${item.bg} flex items-center gap-3 px-4 py-4`}>
                    <span className="text-3xl">{item.emoji}</span>
                    <span
                      className={`rounded-full bg-white px-2 py-0.5 text-xs font-bold ${item.color}`}
                    >
                      {item.type}
                    </span>
                  </div>
                  <div className="p-3">
                    <p className="mb-1 text-sm leading-snug font-bold text-gray-800">
                      {item.title}
                    </p>
                    <p className="mb-2 line-clamp-2 text-xs leading-relaxed text-gray-500">
                      {item.desc}
                    </p>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs text-gray-400">{item.author}</span>
                        <span className="text-gray-200">·</span>
                        <span className="text-xs text-gray-400">{item.date}</span>
                      </div>
                      {item.rating && (
                        <div className="flex items-center gap-0.5">
                          {Array.from({ length: item.rating }).map((_, i) => (
                            <span key={i} className="text-xs text-yellow-400">
                              ★
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </CarouselItem>
            ))}
          </CarouselContent>
          <CarouselPrevious className="-left-3 hidden sm:flex" />
          <CarouselNext className="-right-3 hidden sm:flex" />
        </Carousel>
      </section>

      {/* Chatbot */}
      {chatOpen && <Chatbot onClose={() => setChatOpen(false)} />}
      <button
        onClick={() => setChatOpen((v) => !v)}
        className={`shadow-navy-600/30 fixed right-4 bottom-24 z-40 rounded-full p-4 text-white shadow-lg transition-all hover:scale-105 md:bottom-8 ${
          chatOpen ? "bg-navy-700" : "from-navy-600 to-brand-500 bg-gradient-to-br hover:shadow-xl"
        }`}
        aria-label={chatOpen ? "채팅창 닫기" : "채팅창 열기"}
      >
        <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
          />
        </svg>
      </button>
    </div>
  );
}
