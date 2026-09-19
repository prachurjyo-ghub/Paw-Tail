"use client";

import { usePathname, useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import { getCurrentAdmin } from "@/lib/adminApi";

const AuthContext = createContext(null);

export function AuthGate({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const [admin, setAdmin] = useState(null);
  const [loading, setLoading] = useState(true);

  const cleanPath = useMemo(() => {
    if (!pathname) return "";
    return pathname.split("?")[0].replace(/\/+$/, "") || "/";
  }, [pathname]);

  const isLoginPath = cleanPath === "/login";

  const refreshAdmin = useCallback(async () => {
    try {
      const data = await getCurrentAdmin();
      if (data?.user?.role === "admin") {
        setAdmin(data.user);
        return data.user;
      }
      setAdmin(null);
      return null;
    } catch {
      setAdmin(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial authentication check on mount
  useEffect(() => {
    refreshAdmin();
  }, [refreshAdmin]);

  // Route protection effect
  useEffect(() => {
    if (loading) return;

    if (!admin && !isLoginPath) {
      router.replace("/login");
    } else if (admin && isLoginPath) {
      router.replace("/dashboard");
    }
  }, [admin, isLoginPath, loading, router]);

  const value = useMemo(
    () => ({
      admin,
      setAdmin,
      refreshAdmin,
      loading,
    }),
    [admin, refreshAdmin, loading]
  );

  // If user is on /login, render children immediately without blocking screen
  if (isLoginPath) {
    if (admin) {
      return null; // Will redirect to /dashboard
    }
    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
  }

  // If on a protected route and still loading auth check, show loading indicator
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-mainSoft/60">
        <div className="rounded-2xl border border-neutral-200 bg-white px-6 py-5 text-sm font-black text-main shadow-lg">
          Checking admin access...
        </div>
      </div>
    );
  }

  // If not logged in and not on login page, render nothing while redirecting
  if (!admin) {
    return null;
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAdminAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    return { admin: null, setAdmin: () => {}, refreshAdmin: async () => null, loading: false };
  }

  return context;
}
