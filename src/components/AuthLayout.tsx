import Link from "next/link";
import Logo from "@/components/Logo";
import type { ReactNode } from "react";

interface AuthLayoutProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
}

export default function AuthLayout({ title, subtitle, children, footer }: AuthLayoutProps) {
  return (
    <div className="flex min-h-[calc(100dvh-8rem)] items-center justify-center py-8">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mb-4 flex justify-center">
            <Logo />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
          {subtitle && <p className="mt-2 text-sm text-gray-500">{subtitle}</p>}
        </div>

        <div className="space-y-5 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          {children}
        </div>

        {footer ?? (
          <p className="mt-6 text-center text-sm text-gray-500">
            <Link href="/" className="hover:text-brand-600">
              둘러보기 (비로그인)
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}
