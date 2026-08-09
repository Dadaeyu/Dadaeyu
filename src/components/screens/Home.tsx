"use client";

import { useRef, useState } from "react";
import Chatbot from "@/components/Chatbot";
import { HomeHero, HomeNeedsPicker } from "@/features/home/HomeHero";
import { HomePlaceDialog } from "@/features/home/HomePlaceDialog";
import { HomeRecommendations } from "@/features/home/HomeRecommendations";
import { homeNeedIdsToChatNeeds } from "@/features/home/homeData";
import { useHomeExperience } from "@/features/home/useHomeExperience";

export default function Home() {
  const [chatOpen, setChatOpen] = useState(false);
  const chatTriggerRef = useRef<HTMLElement | null>(null);
  const experience = useHomeExperience();

  const openChat = () => {
    chatTriggerRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setChatOpen(true);
  };

  const closeChat = () => {
    setChatOpen(false);
    window.requestAnimationFrame(() => {
      if (chatTriggerRef.current?.isConnected) chatTriggerRef.current.focus();
    });
  };

  return (
    <div className="mx-auto max-w-6xl space-y-4 overflow-x-clip pb-24 sm:space-y-8 md:pb-8">
      <HomeHero experience={experience} onOpenChat={openChat} />

      <div className="border-hairline overflow-hidden rounded-[1.25rem] border bg-white shadow-[0_18px_44px_-40px_rgba(15,44,41,0.72)]">
        <HomeNeedsPicker experience={experience} />
        <HomeRecommendations experience={experience} />
      </div>

      {experience.selectedPlace ? (
        <HomePlaceDialog
          place={experience.selectedPlace}
          selectedNeedIds={experience.selectedNeedIds}
          onClose={experience.closePlace}
        />
      ) : null}

      {chatOpen ? (
        <Chatbot
          onClose={closeChat}
          accessibilityNeeds={homeNeedIdsToChatNeeds(experience.selectedNeedIds)}
        />
      ) : null}
    </div>
  );
}
