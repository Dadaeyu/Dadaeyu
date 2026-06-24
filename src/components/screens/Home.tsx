"use client";

import { useState } from "react";
import Link from "next/link";
import {
  BookOpen,
  Calendar,
  ChevronRight,
  MapPin,
  MessageCircle,
  Sparkles,
  TrendingUp
} from "lucide-react";
import Chatbot from "@/components/Chatbot";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious
} from "@/components/ui/Carousel";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { SectionHeading } from "@/components/ui/SectionHeading";

export default function Home() {
  const [chatOpen, setChatOpen] = useState(false);
  const themes = [
    { id: 1, name: "빵지순례", icon: "🥐" },
    { id: 2, name: "먹거리", icon: "🍴" },
    { id: 3, name: "액티비티", icon: "⚡" },
    { id: 4, name: "과학", icon: "🔬" },
    { id: 5, name: "자연힐링", icon: "🌿" },
    { id: 6, name: "문화예술", icon: "🎨" },
    { id: 7, name: "역사근대", icon: "🏛️" },
    { id: 8, name: "축제", icon: "🎪" }
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
      {/* Hero Section — Mintlify sky 대기 그라데이션 밴드 (hero-band-sky) */}
      <section className="from-hero-sky-from to-hero-sky-to relative overflow-hidden rounded-lg bg-gradient-to-b p-7 md:p-9">
        {/* decorative clouds */}
        <div className="pointer-events-none absolute -top-10 -right-8 h-44 w-44 rounded-full bg-white/40 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-12 -left-10 h-40 w-40 rounded-full bg-white/50 blur-3xl" />
        <div className="relative">
          <span className="text-ink mb-3 inline-flex items-center gap-1.5 rounded-full bg-white/50 px-3 py-1 text-xs font-medium ring-1 ring-white/60 backdrop-blur-sm">
            <span className="text-mint-deep">✦</span> 누구나 함께 떠나는 대전 여행
          </span>
          <h2 className="text-ink mb-2 text-3xl leading-tight font-semibold tracking-tight md:text-4xl">
            대전, 모두를 위한 여행
          </h2>
          <p className="text-slate mb-6 text-sm md:text-base">
            장애물 없이 즐기는 무장애 여행 가이드, 다대유
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/map"
              className="bg-mint text-ink hover:bg-mint-deep inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium transition-colors"
            >
              <MapPin className="h-4 w-4" />
              지금 둘러보기
            </Link>
            <Link
              href="/course"
              className="text-ink inline-flex items-center gap-2 rounded-full bg-white/70 px-5 py-2.5 text-sm font-medium ring-1 ring-white/80 backdrop-blur-sm transition-colors hover:bg-white"
            >
              추천 코스 보기
            </Link>
          </div>
        </div>
      </section>

      {/* Themes Section */}
      <section>
        <SectionHeading title="테마별 여행" />
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {themes.map((theme) => (
            <Card key={theme.id} asChild variant="interactive" className="hover:bg-brand-50/50">
              <Link href={`/map?theme=${theme.name}`}>
                <div className="mb-2 text-3xl">{theme.icon}</div>
                <div className="text-ink text-sm font-medium">{theme.name}</div>
              </Link>
            </Card>
          ))}
        </div>
      </section>

      {/* Hot Places Section */}
      <section>
        <SectionHeading
          title="이번 달 핫플레이스"
          icon={<Sparkles className="text-brand-500 h-5 w-5" />}
          action={{ href: "/map?filter=hot", label: "전체보기" }}
        />
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {hotPlaces.map((place) => (
            <Card key={place.id} asChild variant="interactive">
              <Link href={`/map?place=${place.id}`}>
                <div className="mb-2 flex items-start justify-between">
                  <h4 className="text-ink font-medium">{place.name}</h4>
                  <div className="flex items-center gap-1 text-sm">
                    <span className="text-yellow-500">★</span>
                    <span className="text-slate">{place.rating}</span>
                  </div>
                </div>
                <Badge tone="brand" shape="tag">
                  {place.tag}
                </Badge>
              </Link>
            </Card>
          ))}
        </div>
      </section>

      {/* Best Courses Section */}
      <section>
        <SectionHeading
          title="이번 달 베스트 코스"
          icon={<TrendingUp className="text-brand-600 h-5 w-5" />}
          action={{ href: "/course", label: "전체보기" }}
        />
        <div className="space-y-3">
          {bestCourses.map((course) => (
            <Card key={course.id} asChild variant="interactive">
              <Link href={`/course/${course.id}`} className="block">
                <div className="mb-2 flex items-start justify-between">
                  <h4 className="text-ink font-medium">{course.title}</h4>
                  <div className="flex items-center gap-1 text-sm">
                    <span className="text-yellow-500">★</span>
                    <span className="text-slate">{course.rating}</span>
                  </div>
                </div>
                <div className="text-steel flex gap-3 text-sm">
                  <span>{course.duration}</span>
                  <span>•</span>
                  <span>{course.places}곳</span>
                </div>
              </Link>
            </Card>
          ))}
        </div>
      </section>

      {/* Tips Section */}
      <section className="bg-mint-soft/15 border-mint-soft/40 rounded-lg border p-6">
        <h3 className="text-ink mb-3 text-lg font-semibold">무장애 여행 팁</h3>
        <div className="space-y-2">
          <Card asChild variant="interactive" padding="sm">
            <a
              href="https://djid.or.kr/main.do"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between"
            >
              <span className="text-slate text-sm">복지시설 안내</span>
              <ChevronRight className="text-stone h-4 w-4" />
            </a>
          </Card>
          <Card asChild variant="interactive" padding="sm">
            <button className="flex w-full items-center justify-between">
              <span className="text-slate text-sm">교통정보</span>
              <ChevronRight className="text-stone h-4 w-4" />
            </button>
          </Card>
        </div>
      </section>

      {/* Events Carousel */}
      <section>
        <SectionHeading
          title="진행 중인 이벤트"
          icon={<Calendar className="text-orange h-5 w-5" />}
        />
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
                badgeColor: "bg-orange/10 text-orange-deep",
                bg: "from-orange to-orange-deep",
                emoji: "🚌",
                desc: "가이드와 함께하는 무장애 관광지 탐방 1박 2일 투어"
              },
              {
                id: 3,
                title: "여름 힐링 여행 할인 프로모션",
                period: "2026.06.01 – 08.31",
                badge: "D-93",
                badgeColor: "bg-navy-50 text-navy-700",
                bg: "from-navy-400 to-navy-600",
                emoji: "🏖️",
                desc: "무장애 시설 이용 시 최대 30% 할인 혜택을 드립니다."
              },
              {
                id: 4,
                title: "보조기기 체험 행사",
                period: "2026.06.14",
                badge: "무료",
                badgeColor: "bg-gold-100 text-gold-700",
                bg: "from-gold-300 to-gold-500",
                emoji: "🦽",
                desc: "최신 이동 보조기기를 직접 체험해볼 수 있는 기회!"
              }
            ].map((ev) => (
              <CarouselItem
                key={ev.id}
                className="basis-4/5 pl-3 sm:basis-3/5 md:basis-2/5 lg:basis-1/3"
              >
                <Card
                  variant="interactive"
                  padding="none"
                  className="cursor-pointer overflow-hidden"
                >
                  <div
                    className={`h-28 bg-gradient-to-br ${ev.bg} flex items-center justify-center`}
                  >
                    <span className="text-5xl">{ev.emoji}</span>
                  </div>
                  <div className="bg-white p-3">
                    <div className="mb-1 flex items-center justify-between">
                      <Badge tone="custom" className={ev.badgeColor}>
                        {ev.badge}
                      </Badge>
                      <span className="text-stone text-xs">{ev.period}</span>
                    </div>
                    <p className="text-ink mb-1 text-sm leading-snug font-semibold">{ev.title}</p>
                    <p className="text-steel line-clamp-2 text-xs leading-relaxed">{ev.desc}</p>
                  </div>
                </Card>
              </CarouselItem>
            ))}
          </CarouselContent>
          <CarouselPrevious className="-left-3 hidden sm:flex" />
          <CarouselNext className="-right-3 hidden sm:flex" />
        </Carousel>
      </section>

      {/* Articles & Reviews Carousel */}
      <section>
        <SectionHeading
          icon={<BookOpen className="text-navy-500 h-5 w-5" />}
          title={
            <span className="flex flex-wrap items-center gap-2">
              여행 기사 &amp; 후기
              <Badge tone="mintSoft" className="border-mint-soft border font-semibold">
                ✦ AI 요약
              </Badge>
            </span>
          }
        />
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
                color: "text-navy-600",
                bg: "bg-navy-50",
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
                color: "text-navy-600",
                bg: "bg-navy-50",
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
                color: "text-gold-600",
                bg: "bg-gold-50",
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
                color: "text-brand-600",
                bg: "bg-brand-50",
                rating: null,
                desc: "대청호 오백리길 무장애 데크로드 구간이 기존 2km에서 5km로 확장됩니다."
              }
            ].map((item) => (
              <CarouselItem
                key={item.id}
                className="basis-4/5 pl-3 sm:basis-3/5 md:basis-2/5 lg:basis-1/3"
              >
                <Card
                  variant="interactive"
                  padding="none"
                  className="cursor-pointer overflow-hidden"
                >
                  <div className={`${item.bg} flex items-center gap-3 px-4 py-4`}>
                    <span className="text-3xl">{item.emoji}</span>
                    <Badge tone="custom" className={`bg-white ${item.color} font-semibold`}>
                      {item.type}
                    </Badge>
                  </div>
                  <div className="p-3">
                    <p className="text-ink mb-1 text-sm leading-snug font-semibold">{item.title}</p>
                    <p className="text-steel mb-2 line-clamp-2 text-xs leading-relaxed">
                      {item.desc}
                    </p>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="text-stone text-xs">{item.author}</span>
                        <span className="text-hairline">·</span>
                        <span className="text-stone text-xs">{item.date}</span>
                      </div>
                      {item.rating && (
                        <div className="flex items-center gap-0.5">
                          {Array.from({ length: item.rating }).map((_, i) => (
                            <span key={i} className="text-xs text-yellow-500">
                              ★
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              </CarouselItem>
            ))}
          </CarouselContent>
          <CarouselPrevious className="-left-3 hidden sm:flex" />
          <CarouselNext className="-right-3 hidden sm:flex" />
        </Carousel>
      </section>

      {/* Chatbot */}
      {chatOpen && <Chatbot onClose={() => setChatOpen(false)} />}
      {!chatOpen && (
        <button
          onClick={() => setChatOpen(true)}
          className="bg-brand-500 text-primary hover:bg-brand-600 fixed right-4 bottom-24 z-40 grid h-14 w-14 place-items-center rounded-full shadow-lg transition-all hover:-translate-y-0.5 md:right-6 md:bottom-8"
          aria-label="채팅창 열기"
        >
          <MessageCircle className="h-7 w-7" aria-hidden="true" />
        </button>
      )}
    </div>
  );
}
