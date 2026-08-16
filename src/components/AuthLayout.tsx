import Link from "next/link";
import Logo from "@/components/Logo";
import { LegalLinks } from "@/components/legal/LegalLinks";
import type { ReactNode } from "react";

interface AuthLayoutProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
}

export default function AuthLayout({ title, subtitle, children, footer }: AuthLayoutProps) {
  return (
    <div className="flex min-h-[calc(100dvh-8rem)] items-center justify-center px-1 py-8">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mb-4 flex justify-center">
            <Logo />
          </div>
          <h1 className="text-ink text-2xl font-bold tracking-[-0.02em]">{title}</h1>
          {subtitle && <p className="text-stone mt-2 text-sm">{subtitle}</p>}
        </div>

        <div className="border-hairline-soft bg-background space-y-5 rounded-2xl border p-5 shadow-sm sm:p-6">
          {children}
        </div>

        <div className="mt-6 space-y-3">
          {footer ?? (
            <p className="text-stone text-center text-sm">
              <Link href="/" className="hover:text-brand-600">
                둘러보기 (비로그인)
              </Link>
            </p>
          )}
          <LegalLinks />
        </div>
      </div>
    </div>
  );
}
