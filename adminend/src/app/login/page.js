"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { useToast } from "@/components/ui/toast";
import { useAdminAuth } from "@/components/AuthGate";
import { loginAdmin } from "@/lib/adminApi";
import { saveAdminSession } from "@/lib/adminSession";

const initialForm = {
  email: "",
  password: "",
  remember: true,
};

export default function LoginPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const { setAdmin } = useAdminAuth();
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (event) => {
    const { name, type, checked, value } = event.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (loading) {
      return;
    }

    if (!form.email.trim() || !form.password.trim()) {
      showToast({ tone: "warning", title: "Enter email and password." });
      return;
    }

    setLoading(true);

    try {
      const data = await loginAdmin({
        email: form.email.trim().toLowerCase(),
        password: form.password,
      });
      const user = data.user || {};
      const email = user.email || form.email.trim().toLowerCase();
      const displayName =
        user.name ||
        email.split("@")[0].replace(/[._-]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

      saveAdminSession({
        name: displayName,
        email,
        role: user.role || "Administrator",
        title: "Administrator",
        bio: "Signed in from the admin console.",
        status: "Active",
        lastLogin: new Date().toLocaleString("en-GB", {
          dateStyle: "long",
          timeStyle: "short",
        }),
        initials: displayName
          .split(/\s+/)
          .map((part) => part[0])
          .join("")
          .slice(0, 2)
          .toUpperCase(),
      });

      setAdmin(user);
      showToast({ tone: "success", title: "Logged in." });
      router.replace("/dashboard");
    } catch (error) {
      showToast({
        tone: "danger",
        title: "Login failed",
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-mainSoft/70 via-white to-white px-4 py-10 text-slate-950">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-2xl items-center">
        <section className="w-full rounded-[28px] border border-neutral-200 bg-white p-6 shadow-2xl shadow-main/5">
          <p className="text-sm font-black uppercase tracking-[0.35em] text-main/70">
            Login
          </p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <Field
              label="Email"
              name="email"
              type="email"
              value={form.email}
              onChange={handleChange}
              placeholder="admin@example.com"
            />
            <label className="block">
              <span className="text-xs font-black uppercase tracking-[0.22em] text-main/75">
                Password
              </span>
              <div className="mt-1.5 flex h-12 overflow-hidden rounded-xl border border-neutral-200 bg-white transition focus-within:border-main">
                <input
                  name="password"
                  type={showPassword ? "text" : "password"}
                  value={form.password}
                  onChange={handleChange}
                  placeholder="Enter password"
                  className="h-full min-w-0 flex-1 px-4 text-sm font-semibold text-slate-700 outline-none placeholder:text-slate-300"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="h-full px-4 text-xs font-black uppercase tracking-[0.16em] text-main/75 transition hover:bg-mainSoft/60 hover:text-main"
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </label>

            <label className="flex items-center gap-3 rounded-2xl border border-neutral-200 px-4 py-3">
              <input
                type="checkbox"
                name="remember"
                checked={form.remember}
                onChange={handleChange}
                className="h-4 w-4 rounded border-slate-300 text-main focus:ring-main"
              />
              <span className="text-sm font-semibold text-slate-600">
                Keep me signed in on this device
              </span>
            </label>

            <button
              type="submit"
              disabled={loading}
              className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-main px-4 text-sm font-black text-white transition hover:bg-mainHover disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Signing in..." : "Sign in"}
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}

function Field({ label, name, type, value, onChange, placeholder }) {
  return (
    <label className="block">
      <span className="text-xs font-black uppercase tracking-[0.22em] text-main/75">
        {label}
      </span>
      <input
        name={name}
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="mt-1.5 h-12 w-full rounded-xl border border-neutral-200 bg-white px-4 text-sm font-semibold text-slate-700 outline-none transition placeholder:text-slate-300 focus:border-main"
      />
    </label>
  );
}
