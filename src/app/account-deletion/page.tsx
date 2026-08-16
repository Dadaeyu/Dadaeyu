import type { Metadata } from "next";
import {
  EmailRequestCard,
  ItemListSection,
  LegalPageShell,
  OrderedSteps
} from "@/components/legal/LegalPageShell";
import { accountDeletionPolicy } from "@/lib/legal/policyContent";

const accountDeletionToc = [
  {
    id: "app-steps",
    title: "앱에서 계정 삭제하기"
  },
  {
    id: "email-request",
    title: accountDeletionPolicy.emailRequest.title
  },
  {
    id: "deleted-items",
    title: "삭제 또는 익명 처리되는 정보"
  },
  {
    id: "retained-items",
    title: "탈퇴 후 남을 수 있는 정보"
  },
  {
    id: "notices",
    title: "계정 삭제 전 확인 사항"
  }
] as const;

export const metadata: Metadata = {
  title: "회원 탈퇴 및 계정 삭제 안내 | 다대유",
  description: accountDeletionPolicy.description
};

export default function AccountDeletionPage() {
  return (
    <LegalPageShell
      eyebrow={accountDeletionPolicy.eyebrow}
      title={accountDeletionPolicy.title}
      description={accountDeletionPolicy.description}
      sections={accountDeletionToc}
      renderPolicySections={false}
    >
      <OrderedSteps
        id="app-steps"
        title="앱에서 계정 삭제하기"
        steps={accountDeletionPolicy.appSteps}
      />
      <EmailRequestCard {...accountDeletionPolicy.emailRequest} />
      <div className="space-y-5">
        <ItemListSection
          id="deleted-items"
          title="삭제 또는 익명 처리되는 정보"
          items={accountDeletionPolicy.deletedItems}
        />
        <ItemListSection
          id="retained-items"
          title="탈퇴 후 남을 수 있는 정보"
          items={accountDeletionPolicy.retainedItems}
        />
        <ItemListSection
          id="notices"
          title="계정 삭제 전 확인 사항"
          items={accountDeletionPolicy.notices}
          accent
        />
      </div>
    </LegalPageShell>
  );
}
