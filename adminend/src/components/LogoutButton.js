"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { HiOutlineArrowRightOnRectangle } from "react-icons/hi2";

import { useToast } from "@/components/ui/toast";
import { useAdminAuth } from "@/components/AuthGate";
import { logoutAdmin } from "@/lib/adminApi";
import { clearAdminSession } from "@/lib/adminSession";

export default function LogoutButton({
  variant = "default",
  className = "",
  icon = null,
  showLabel = true,
}) {
  const router = useRouter();
  const { showToast } = useToast();
  const { setAdmin } = useAdminAuth();
  const [loading, setLoading] = useState(false);

  async function handleLogout() {
    setLoading(true);

    try {
      await logoutAdmin();
      showToast({
        title: "Logged out",
        description: "Admin session ended.",
        tone: "success",
      });
      clearAdminSession();
      setAdmin(null);
      router.replace("/login");
    } catch (error) {
      showToast({
        title: "Logout failed",
        description: error.message,
        tone: "danger",
      });
    } finally {
      setLoading(false);
    }
  }

  if (variant === "icon") {
    return (
      <button
        type="button"
        onClick={handleLogout}
        disabled={loading}
        aria-label="Logout"
        title="Logout"
        className="flex h-8 w-8 items-center justify-center rounded-[7px] border border-[#e4ece7] bg-white text-[#3d554b] transition hover:border-red-200 hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? (
          <span className="text-xs font-bold">...</span>
        ) : (
          <HiOutlineArrowRightOnRectangle className="text-lg" />
        )}
      </button>
    );
  }

  if (variant === "nav") {
    return (
      <button
        type="button"
        onClick={handleLogout}
        disabled={loading}
        className={`${className} disabled:cursor-not-allowed disabled:opacity-60`}
      >
        {icon || <HiOutlineArrowRightOnRectangle className="h-5 w-5" />}
        {showLabel ? <span>{loading ? "Logging out..." : "Logout"}</span> : null}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={loading}
      className="flex h-12 items-center justify-center rounded-2xl border border-neutral-200 bg-white px-5 text-sm font-black text-main shadow-sm transition hover:bg-mainSoft disabled:cursor-not-allowed disabled:opacity-60"
    >
      {loading ? "Logging out..." : "Logout"}
    </button>
  );
}
