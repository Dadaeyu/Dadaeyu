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
    <div className="min-h-[calc(100dvh-8rem)] flex items-center justify-center py-8">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <Logo />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
          {subtitle && <p className="text-sm text-gray-500 mt-2">{subtitle}</p>}
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm space-y-5">
          {children}
        </div>

        {footer ?? (
          <p className="text-center mt-6 text-sm text-gray-500">
            <Link href="/" className="hover:text-brand-600">
              둘러보기 (비로그인)
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}
