"use client";

import { useRef, useState } from "react";
import Chatbot from "@/components/Chatbot";
import { HomeFeaturedPlace, HomeHero, HomeNeedsPicker } from "@/features/home/HomeHero";
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
    <div className="mx-auto max-w-6xl space-y-7 overflow-x-clip pb-6 sm:space-y-9">
      <HomeHero experience={experience} onOpenChat={openChat} />

      <HomeFeaturedPlace experience={experience} />

      {experience.needsProfilePrompt ? <HomeNeedsPicker experience={experience} /> : null}

      <HomeRecommendations experience={experience} />

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
