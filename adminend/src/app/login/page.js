"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  FiArrowRight,
  FiCheck,
  FiEye,
  FiEyeOff,
  FiLock,
  FiMail,
  FiPackage,
  FiShield,
  FiShoppingBag,
} from "react-icons/fi";

import BrandLogo from "@/components/BrandLogo";
import ThemeToggle from "@/components/ThemeToggle";
import { useToast } from "@/components/ui/toast";
import { useAdminAuth } from "@/components/AuthGate";
import { loginAdmin } from "@/lib/adminApi";
import { saveAdminSession } from "@/lib/adminSession";

const initialForm = {
  email: "",
  password: "",
};

const controlRoomItems = [
  { icon: FiShoppingBag, label: "Orders", detail: "Track every purchase" },
  { icon: FiPackage, label: "Catalog", detail: "Keep products in sync" },
  { icon: FiShield, label: "Access", detail: "Protected admin tools" },
];

export default function LoginPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const { setAdmin } = useAdminAuth();
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (loading) return;

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
        email
          .split("@")[0]
          .replace(/[._-]/g, " ")
          .replace(/\b\w/g, (character) => character.toUpperCase());

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
      showToast({ tone: "success", title: "Welcome back." });
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
    <main className="admin-login relative min-h-screen overflow-hidden text-slate-950">
      <div className="pointer-events-none absolute -right-28 -top-32 h-80 w-80 rounded-full bg-accent/10 blur-3xl lg:hidden" />
      <ThemeToggle className="fixed right-5 top-5 z-30 shadow-lg" />

      <div className="mx-auto grid min-h-screen max-w-[1600px] lg:grid-cols-[1.05fr_0.95fr]">
        <section className="relative hidden min-h-screen overflow-hidden bg-main px-12 py-10 text-white lg:flex lg:flex-col xl:px-20 xl:py-14">
          <div className="pointer-events-none absolute inset-0 opacity-25 [background-image:radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.22)_1px,transparent_0)] [background-size:30px_30px]" />
          <div className="pointer-events-none absolute -left-40 bottom-[-18rem] h-[38rem] w-[38rem] rounded-full border-[90px] border-white/[0.035]" />
          <div className="pointer-events-none absolute -right-32 top-20 h-80 w-80 rounded-full bg-accent/20 blur-[100px]" />

          <div className="relative z-10 flex items-center justify-between">
            <BrandLogo size="md" className="[&_div_span]:!text-white" />
            <span className="login-hero-pill rounded-full border px-4 py-2 text-[11px] font-bold uppercase tracking-[0.22em] backdrop-blur-sm">
              Admin workspace
            </span>
          </div>

          <div className="relative z-10 my-auto max-w-2xl py-16">
            <div className="login-operation-pill mb-7 inline-flex items-center gap-2 rounded-full bg-accent px-3.5 py-2 text-xs font-extrabold uppercase tracking-[0.16em] shadow-lg shadow-black/10">
              <span className="h-2 w-2 rounded-full bg-main" />
              Store operations
            </div>
            <h1 className="max-w-xl text-5xl font-black leading-[1.05] tracking-[-0.055em] xl:text-6xl">
              Your store,
              <br />
              under one roof.
            </h1>
            <p className="mt-6 max-w-lg text-base font-medium leading-7 text-white/65 xl:text-lg">
              Manage products, orders, customers, and daily decisions from one
              calm command center built for PawTail.
            </p>

            <div className="mt-12 grid max-w-2xl grid-cols-3 gap-3">
              {controlRoomItems.map(({ icon: ItemIcon, label, detail }) => (
                <article
                  key={label}
                  className="login-feature-card rounded-2xl border p-4 backdrop-blur-sm transition hover:-translate-y-0.5 xl:p-5"
                >
                  <span className="login-feature-icon flex h-9 w-9 items-center justify-center rounded-xl bg-accent">
                    <ItemIcon className="h-[18px] w-[18px]" aria-hidden="true" />
                  </span>
                  <p className="mt-4 text-sm font-extrabold">{label}</p>
                  <p className="login-feature-card__detail mt-1 text-xs leading-5">{detail}</p>
                </article>
              ))}
            </div>
          </div>

          <div className="relative z-10 flex items-center gap-2 text-xs font-semibold text-white/65">
            <FiCheck className="h-4 w-4 text-accent" aria-hidden="true" />
            Private access for authorized PawTail administrators
          </div>
        </section>

        <section className="flex min-h-screen items-center px-5 py-8 sm:px-10 lg:px-16 xl:px-24">
          <div className="mx-auto w-full max-w-[470px]">
            <div className="mb-12 flex items-center justify-between lg:hidden">
              <BrandLogo size="sm" />
              <span className="login-mobile-badge rounded-full border px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-[0.18em] shadow-sm">
                Admin
              </span>
            </div>

            <div className="login-auth-card rounded-[30px] border p-7 sm:p-9 lg:p-10">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-mainSoft text-main">
                <FiLock className="h-5 w-5" aria-hidden="true" />
              </div>
              <p className="mt-7 text-xs font-extrabold uppercase tracking-[0.22em] text-accent">
                Secure admin access
              </p>
              <h2 className="mt-2 text-3xl font-black tracking-[-0.045em] text-main sm:text-[2.45rem]">
                Welcome back
              </h2>
              <p className="mt-3 text-sm font-medium leading-6 text-slate-500">
                Sign in with your administrator credentials to continue to the
                PawTail dashboard.
              </p>

              <form onSubmit={handleSubmit} className="mt-9 space-y-5">
                <Field
                  label="Email address"
                  name="email"
                  type="email"
                  value={form.email}
                  onChange={handleChange}
                  placeholder="admin@pawtail.com"
                  autoComplete="email"
                  icon={FiMail}
                />

                <label className="block">
                  <span className="text-[13px] font-extrabold text-[#29483e]">
                    Password
                  </span>
                  <div className="login-field mt-2 flex h-[54px] overflow-hidden rounded-2xl border transition">
                    <span className="flex w-12 shrink-0 items-center justify-center text-slate-400">
                      <FiLock className="h-[18px] w-[18px]" aria-hidden="true" />
                    </span>
                    <input
                      name="password"
                      type={showPassword ? "text" : "password"}
                      value={form.password}
                      onChange={handleChange}
                      placeholder="Enter your password"
                      autoComplete="current-password"
                      className="h-full min-w-0 flex-1 bg-transparent pr-2 text-[15px] font-semibold text-slate-700 outline-none placeholder:font-medium placeholder:text-slate-300"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      aria-label={showPassword ? "Hide password" : "Show password"}
                      aria-pressed={showPassword}
                      className="flex h-full w-12 shrink-0 items-center justify-center text-slate-400 transition hover:bg-mainSoft/60 hover:text-main focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-main"
                    >
                      {showPassword ? (
                        <FiEyeOff className="h-[18px] w-[18px]" aria-hidden="true" />
                      ) : (
                        <FiEye className="h-[18px] w-[18px]" aria-hidden="true" />
                      )}
                    </button>
                  </div>
                </label>

                <div className="flex items-center gap-2 rounded-xl bg-mainSoft/60 px-3.5 py-3 text-xs font-semibold text-main/70">
                  <FiShield className="h-4 w-4 shrink-0 text-main" aria-hidden="true" />
                  Your session is encrypted and protected.
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="group inline-flex h-[54px] w-full items-center justify-center gap-2 rounded-2xl bg-main px-5 text-sm font-extrabold text-white shadow-[0_12px_26px_rgba(23,63,49,0.2)] transition hover:-translate-y-0.5 hover:bg-mainHover hover:shadow-[0_16px_30px_rgba(23,63,49,0.24)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-main/20 disabled:cursor-not-allowed disabled:translate-y-0 disabled:opacity-60"
                >
                  {loading ? (
                    <>
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/35 border-t-white" />
                      Signing in...
                    </>
                  ) : (
                    <>
                      Sign in to dashboard
                      <FiArrowRight
                        className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
                        aria-hidden="true"
                      />
                    </>
                  )}
                </button>
              </form>
            </div>

            <p className="mt-7 text-center text-xs font-medium text-slate-400">
              PawTail Admin Console <span aria-hidden="true">·</span> Authorized
              access only
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}

function Field({
  label,
  name,
  type,
  value,
  onChange,
  placeholder,
  autoComplete,
  icon: FieldIcon,
}) {
  return (
    <label className="block">
      <span className="text-[13px] font-extrabold text-[#29483e]">{label}</span>
      <div className="login-field mt-2 flex h-[54px] overflow-hidden rounded-2xl border transition">
        <span className="flex w-12 shrink-0 items-center justify-center text-slate-400">
          <FieldIcon className="h-[18px] w-[18px]" aria-hidden="true" />
        </span>
        <input
          name={name}
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          autoComplete={autoComplete}
          className="h-full min-w-0 flex-1 bg-transparent pr-4 text-[15px] font-semibold text-slate-700 outline-none placeholder:font-medium placeholder:text-slate-300"
        />
      </div>
    </label>
  );
}
