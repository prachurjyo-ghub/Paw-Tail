"use client";

import { useState } from "react";
import Link from "next/link";

import DashboardShell, { Icon } from "@/components/DashboardShell";
import { useToast } from "@/components/ui/toast";

const initialSecurity = {
  currentPassword: "",
  newPassword: "",
  confirmPassword: "",
};

export default function SettingsPage() {
  const { showToast } = useToast();
  const [security, setSecurity] = useState(initialSecurity);

  const handleSecurityChange = (event) => {
    const { name, value } = event.target;
    setSecurity((prev) => ({ ...prev, [name]: value }));
  };

  const changePassword = () => {
    if (!security.currentPassword || !security.newPassword) {
      showToast({ tone: "warning", title: "Fill in the password fields first." });
      return;
    }

    if (security.newPassword !== security.confirmPassword) {
      showToast({ tone: "danger", title: "New passwords do not match." });
      return;
    }

    setSecurity(initialSecurity);
    showToast({ tone: "success", title: "Password updated." });
  };

  return (
    <DashboardShell activeItem="Settings">
      <div className="rounded-[24px] border border-neutral-200 bg-white px-5 py-5 shadow-lg shadow-main/5 md:px-6">
        <p className="text-sm font-black uppercase tracking-[0.35em] text-main/70">
          Account
        </p>
        <h1 className="mt-2 text-2xl font-black tracking-tight text-main md:text-3xl">
          Settings
        </h1>
        <p className="mt-1.5 max-w-3xl text-sm font-semibold leading-6 text-slate-500">
          Manage security and account preferences. Profile details live under My
          Profile.
        </p>
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[1fr_0.85fr]">
        <section className="rounded-[24px] border border-neutral-200 bg-white p-5 shadow-lg shadow-main/5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.35em] text-main/70">
                Security
              </p>
              <h2 className="mt-2 text-xl font-black text-main">Change password</h2>
            </div>
            <Icon name="lock" className="h-6 w-6 text-main/70" />
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-3">
            <Field
              label="Current password"
              name="currentPassword"
              value={security.currentPassword}
              onChange={handleSecurityChange}
              type="password"
            />
            <Field
              label="New password"
              name="newPassword"
              value={security.newPassword}
              onChange={handleSecurityChange}
              type="password"
            />
            <Field
              label="Confirm password"
              name="confirmPassword"
              value={security.confirmPassword}
              onChange={handleSecurityChange}
              type="password"
            />
          </div>

          <button
            type="button"
            onClick={changePassword}
            className="mt-4 inline-flex h-11 items-center gap-2 rounded-xl bg-main px-4 text-sm font-black text-white transition hover:bg-mainHover"
          >
            <Icon name="send" className="h-4 w-4" />
            Update password
          </button>
        </section>

        <aside className="rounded-[24px] border border-neutral-200 bg-white p-5 shadow-lg shadow-main/5">
          <p className="text-sm font-black uppercase tracking-[0.35em] text-main/70">
            Quick links
          </p>
          <h2 className="mt-2 text-xl font-black text-main">Account tools</h2>
          <div className="mt-5 space-y-3">
            <Link
              href="/dashboard/profile"
              className="flex h-11 items-center justify-between rounded-xl border border-neutral-200 px-4 text-sm font-black text-main transition hover:bg-mainSoft/60"
            >
              My Profile
              <Icon name="user" className="h-4 w-4" />
            </Link>
            <Link
              href="/dashboard"
              className="flex h-11 items-center justify-between rounded-xl border border-neutral-200 px-4 text-sm font-black text-main transition hover:bg-mainSoft/60"
            >
              Dashboard
              <Icon name="grid" className="h-4 w-4" />
            </Link>
          </div>
        </aside>
      </div>
    </DashboardShell>
  );
}

function Field({ label, name, value, onChange, type = "text" }) {
  return (
    <label className="block">
      <span className="text-xs font-black uppercase tracking-[0.22em] text-main/75">
        {label}
      </span>
      <input
        name={name}
        value={value}
        onChange={onChange}
        type={type}
        className="mt-1.5 h-11 w-full rounded-xl border border-neutral-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none transition placeholder:text-slate-300 focus:border-main"
      />
    </label>
  );
}
