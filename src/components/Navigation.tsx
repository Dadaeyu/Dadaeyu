"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Map, Route, Users, User, ShieldCheck } from "lucide-react";

const navItems = [
  { path: "/", label: "홈", icon: Home },
  { path: "/map", label: "지도", icon: Map },
  { path: "/course", label: "코스", icon: Route },
  { path: "/community", label: "커뮤니티", icon: Users },
  { path: "/mypage", label: "마이페이지", icon: User }
];

const adminItem = { path: "/admin", label: "관리", icon: ShieldCheck };

function useIsActive() {
  const pathname = usePathname();
  return (path: string) =>
    path === "/" ? pathname === "/" : pathname === path || pathname.startsWith(path + "/");
}

export function DesktopNav() {
  const isActive = useIsActive();
  return (
    <nav className="hidden items-center gap-1 md:flex">
      {navItems.map(({ path, label, icon: Icon }) => (
        <Link
          key={path}
          href={path}
          className={`flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-semibold transition-all ${
            isActive(path)
              ? "text-brand-700 bg-brand-50 shadow-brand-500/10 shadow-sm"
              : "hover:text-brand-600 text-gray-500 hover:bg-gray-50"
          }`}
        >
          <Icon className="h-4 w-4" />
          <span>{label}</span>
        </Link>
      ))}
      <div className="mx-1 h-5 w-px bg-gray-200" />
      <Link
        href={adminItem.path}
        className={`flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-semibold transition-all ${
          isActive(adminItem.path)
            ? "bg-indigo-50 text-indigo-700 shadow-sm"
            : "text-gray-400 hover:bg-indigo-50 hover:text-indigo-600"
        }`}
      >
        <adminItem.icon className="h-4 w-4" />
        <span>{adminItem.label}</span>
      </Link>
    </nav>
  );
}

export function MobileNav() {
  const isActive = useIsActive();
  return (
    <nav className="fixed right-0 bottom-0 left-0 z-50 border-t border-gray-200 bg-white/95 shadow-[0_-2px_12px_rgba(0,0,0,0.05)] backdrop-blur-md md:hidden">
      <div className="flex items-center justify-around py-1.5">
        {[...navItems, adminItem].map(({ path, label, icon: Icon }) => {
          const active = isActive(path);
          return (
            <Link
              key={path}
              href={path}
              className={`relative flex flex-col items-center gap-1 rounded-xl px-3 py-1.5 transition-colors ${active ? "text-brand-600" : "hover:text-brand-500 text-gray-400"}`}
            >
              {active && <span className="bg-brand-500 absolute -top-0.5 h-1 w-6 rounded-full" />}
              <Icon className="h-5 w-5" />
              <span className="text-[11px] font-medium">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
