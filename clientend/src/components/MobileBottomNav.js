"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  HiOutlineHome,
  HiHome,
  HiOutlineSquares2X2,
  HiSquares2X2,
  HiOutlineChatBubbleLeftRight,
  HiChatBubbleLeftRight,
  HiOutlineUser,
  HiUser,
} from "react-icons/hi2";
import { useAuth } from "@/context/AuthContext";

export default function MobileBottomNav() {
  const pathname = usePathname();
  const { user, loaded } = useAuth();

  const navItems = [
    {
      label: "Home",
      href: "/",
      IconOutline: HiOutlineHome,
      IconSolid: HiHome,
    },
    {
      label: "Explore",
      href: "/categories",
      IconOutline: HiOutlineSquares2X2,
      IconSolid: HiSquares2X2,
    },
    {
      label: "Contact",
      href: "/contact",
      IconOutline: HiOutlineChatBubbleLeftRight,
      IconSolid: HiChatBubbleLeftRight,
    },
    {
      label: "Profile",
      href: user ? "/profile" : "#profile-login",
      IconOutline: HiOutlineUser,
      IconSolid: HiUser,
    },
  ];

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 flex h-16 items-center justify-between rounded-2xl bg-main px-2 lg:hidden shadow-lg shadow-main/30 border border-mainSoft/20">
      {navItems.map((item) => {
        const isActive =
          pathname === item.href ||
          (item.href !== "/" && pathname.startsWith(item.href));
        const Icon = isActive ? item.IconSolid : item.IconOutline;

        return (
          <Link
            key={item.label}
            href={item.href}
            onClick={(event) => {
              if (item.label !== "Profile" || user) return;
              event.preventDefault();
              if (!loaded) return;
              window.dispatchEvent(new CustomEvent("pawtail:open-login"));
            }}
            className={`flex flex-col items-center justify-center gap-1 w-[4.5rem] h-12 rounded-xl transition-all duration-300 ${
              isActive
                ? "bg-accent text-mainHover font-bold"
                : "text-white/80 hover:text-white hover:bg-white/10"
            }`}
          >
            <Icon className="text-xl sm:text-2xl" />
            <span className="text-[10px] font-semibold">{item.label}</span>
          </Link>
        );
      })}
    </div>
  );
}
