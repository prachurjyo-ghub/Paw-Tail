"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import BrandLogo from "@/components/BrandLogo";
import { useToast } from "@/components/ui/toast";
import { useAdminAuth } from "@/components/AuthGate";
import { loginAdmin } from "@/lib/adminApi";

export default function LoginForm() {
  const router = useRouter();
  const { showToast } = useToast();
  const { setAdmin } = useAdminAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setLoading(true);

    try {
      const data = await loginAdmin({ email, password });
      if (data?.user) {
        setAdmin(data.user);
      }
      showToast({
        title: "Login successful",
        description: "Welcome back to Paw Tail admin.",
        tone: "success",
      });
      router.replace("/dashboard");
      router.refresh();
    } catch (error) {
      showToast({
        title: "Login failed",
        description: error.message,
        tone: "danger",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-b from-mainSoft via-white to-white px-4">
      <section className="w-full max-w-md rounded-[28px] border border-neutral-200 bg-white p-7 shadow-xl shadow-main/10">
        <div>
          <BrandLogo size="lg" />
          <p className="mt-3 text-sm font-bold text-slate-400">Admin login</p>
        </div>

        <form onSubmit={handleSubmit} className="mt-8 space-y-5">
          <label className="block">
            <span className="text-sm font-black text-slate-600">Email</span>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              className="mt-2 h-12 w-full rounded-xl border border-neutral-200 px-4 text-sm font-bold text-slate-700 outline-none transition focus:border-main"
              placeholder="admin@example.com"
            />
          </label>

          <label className="block">
            <span className="text-sm font-black text-slate-600">Password</span>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              className="mt-2 h-12 w-full rounded-xl border border-neutral-200 px-4 text-sm font-bold text-slate-700 outline-none transition focus:border-main"
              placeholder="Enter password"
            />
          </label>

          <button
            type="submit"
            disabled={loading}
            className="h-12 w-full rounded-xl bg-main text-sm font-black text-white shadow-md shadow-main/20 transition hover:bg-mainHover disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>
      </section>
    </main>
  );
}
