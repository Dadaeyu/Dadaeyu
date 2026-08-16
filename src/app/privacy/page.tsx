import type { Metadata } from "next";
import { LegalPageShell } from "@/components/legal/LegalPageShell";
import { privacyPolicy } from "@/lib/legal/policyContent";

export const metadata: Metadata = {
  title: "개인정보 처리방침 | 다대유",
  description: privacyPolicy.description
};

export default function PrivacyPage() {
  return (
    <LegalPageShell
      eyebrow={privacyPolicy.eyebrow}
      title={privacyPolicy.title}
      description={privacyPolicy.description}
      effectiveDate={privacyPolicy.effectiveDate}
      highlights={privacyPolicy.highlights}
      sections={privacyPolicy.sections}
    />
  );
}
