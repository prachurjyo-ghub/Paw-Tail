"use client";

import { useEffect, useState } from "react";
import {
  HiOutlineEnvelope,
  HiOutlineExclamationCircle,
  HiOutlineEye,
  HiOutlineEyeSlash,
  HiOutlineLockClosed,
  HiOutlinePhone,
  HiOutlineUser,
  HiOutlineXMark,
} from "react-icons/hi2";

import PawPrintIcon from "@/components/icons/PawPrintIcon";
import { useAuth } from "@/context/AuthContext";

const tabs = [
  { id: "login", label: "Login" },
  { id: "signup", label: "Sign Up" },
];

const copy = {
  login: {
    badge: "WELCOME BACK",
    title: "Login",
    description: "Login to continue shopping for your pet family.",
    cta: "Login",
    footerText: "Don't have an account?",
    footerCta: "Sign Up",
    footerTarget: "signup",
  },
  signup: {
    badge: "CREATE ACCOUNT",
    title: "Sign Up",
    description:
      "Create your account to save favorites, manage orders, and shop faster.",
    cta: "Sign Up",
    footerText: "Already have an account?",
    footerCta: "Login",
    footerTarget: "login",
  },
  verify: {
    badge: "VERIFY EMAIL",
    title: "Verification Code",
    description: "Enter the 6-digit code we sent to your email.",
    cta: "Verify Account",
    footerText: "Wrong email?",
    footerCta: "Sign Up",
    footerTarget: "signup",
  },
};

export default function LoginPopover({
  open,
  onClose,
  onForgotPassword,
  onSuccess,
  description,
  initialMode = "login",
}) {
  const { login, signup, verifyEmail } = useAuth();

  const [mode, setMode] = useState(initialMode);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const [attemptedEmail, setAttemptedEmail] = useState("");
  const [verificationEmail, setVerificationEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;

    const handleKey = (event) => {
      if (event.key === "Escape") onClose?.();
    };

    document.addEventListener("keydown", handleKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, onClose]);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;

      setMode(initialMode || "login");
      if (!open) {
        setError("");
        setAttemptedEmail("");
        setVerificationEmail("");
        setShowPassword(false);
        setShowConfirmPassword(false);
        setIsSubmitting(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [open, initialMode]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    const data = new FormData(event.currentTarget);

    try {
      if (mode === "login") {
        const email = String(data.get("email") || "").trim();
        const password = String(data.get("password") || "");
        await login(email, password);

        onClose?.();
        onSuccess?.("Login successful");
        return;
      }

      if (mode === "verify") {
        const code = String(data.get("code") || "").trim();
        await verifyEmail({ email: verificationEmail, code });

        onClose?.();
        onSuccess?.("Account created successfully");
        return;
      }

      const name = String(data.get("username") || "").trim();
      const email = String(data.get("email") || "").trim();
      const phoneInput = String(data.get("phone") || "").trim();
      const password = String(data.get("password") || "");
      const confirmPassword = String(data.get("confirmPassword") || "");

      if (password !== confirmPassword) {
        setError("Passwords do not match.");
        return;
      }

      const result = await signup({
        name,
        email,
        phone: phoneInput.startsWith("+880") ? phoneInput : `+880${phoneInput}`,
        password,
      });

      setVerificationEmail(result.email || email);
      setAttemptedEmail(result.email || email);
      setMode("verify");
    } catch (error) {
      if (mode === "login") {
        const email = String(data.get("email") || "").trim();
        setAttemptedEmail(email);
      }
      setError(error.message || "Something went wrong.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const switchMode = (next) => {
    setError("");
    setMode(next);
  };

  const handleForgotPassword = () => {
    onForgotPassword?.(attemptedEmail);
    onClose?.();
  };

  const active = copy[mode];
  const activeDescription =
    mode === "login" && description
      ? description
      : mode === "signup" && description
        ? description
        : active.description;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-hidden={!open}
      className={`fixed inset-0 z-50 flex items-center justify-center px-4 py-4 transition-opacity duration-300 ${
        open ? "opacity-100" : "pointer-events-none opacity-0"
      }`}
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-neutral-900/55 backdrop-blur-sm" />

      <div
        onClick={(event) => event.stopPropagation()}
        className={`relative z-10 w-full max-w-4xl overflow-hidden rounded-3xl bg-gradient-to-br from-mainSoft via-white to-white shadow-[0_24px_60px_rgba(15,23,42,0.25)] transition-all duration-300 ${
          open
            ? "translate-y-0 scale-100 opacity-100"
            : "translate-y-4 scale-95 opacity-0"
        }`}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-4 top-4 z-10 flex h-8 w-8 items-center justify-center rounded-full text-neutral-500 transition-colors duration-300 hover:bg-neutral-100 hover:text-neutral-800"
        >
          <HiOutlineXMark className="text-xl" />
        </button>

        <div className="grid gap-6 p-6 sm:p-8 md:grid-cols-2">
          <div className="hidden flex-col items-center justify-center text-center md:flex">
            <div className="relative flex h-52 w-52 items-center justify-center overflow-hidden rounded-3xl bg-accent">
              <PawPrintIcon className="absolute -left-4 -top-4 text-[6.5rem] text-main/15" />
              <PawPrintIcon className="absolute -bottom-5 -right-3 text-[5.5rem] text-main/15" />
              <PawPrintIcon className="text-[6rem] text-main" />
            </div>
            <h2 className="mt-5 text-2xl font-bold text-main">
              Create your pet care account
            </h2>
            <p className="mt-2 max-w-xs text-sm leading-6 text-neutral-600">
              Save favorites, track orders, and enjoy a smoother shopping
              experience for every pet.
            </p>
          </div>

          <div className="flex flex-col">
            <span className="inline-flex w-fit items-center rounded-full bg-mainSoft px-3 py-1 text-[10px] font-bold tracking-[0.18em] text-main">
              {active.badge}
            </span>

            <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-neutral-900">
              {active.title}
            </h1>

            <p className="mt-1.5 text-sm leading-6 text-neutral-600">
              {activeDescription}
              {mode === "verify" && verificationEmail ? (
                <span className="mt-1 block font-semibold text-main">
                  {verificationEmail}
                </span>
              ) : null}
            </p>

            {mode !== "verify" ? (
              <div className="mt-4 inline-flex w-fit gap-1 rounded-full bg-neutral-100 p-1">
              {tabs.map((tab) => {
                const isActive = mode === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => switchMode(tab.id)}
                    className={`min-w-20 rounded-full px-5 py-1.5 text-xs font-semibold transition-all duration-300 ${
                      isActive
                        ? "bg-main text-white shadow-sm"
                        : "text-neutral-700 hover:text-neutral-900"
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })}
              </div>
            ) : null}

            <form
              className="mt-4 flex flex-col gap-3"
              onSubmit={handleSubmit}
              noValidate
            >
              {mode === "verify" ? (
                <Field
                  label="Verification Code"
                  icon={HiOutlineLockClosed}
                  type="text"
                  name="code"
                  placeholder="Enter 6-digit code"
                />
              ) : null}

              {mode === "signup" ? (
                <Field
                  label="User Name"
                  icon={HiOutlineUser}
                  type="text"
                  name="username"
                  placeholder="Enter your username"
                />
              ) : null}

              {mode !== "verify" ? (
                <Field
                  label="Email"
                  icon={HiOutlineEnvelope}
                  type="email"
                  name="email"
                  placeholder="Enter your email"
                />
              ) : null}

              {mode === "signup" ? (
                <div>
                  <label className="block text-xs font-semibold text-neutral-900">
                    Phone
                  </label>
                  <div className="mt-1.5 flex w-full overflow-hidden rounded-xl border border-neutral-200 bg-white transition-colors duration-300 focus-within:border-main">
                    <span className="flex items-center gap-1.5 border-r border-neutral-200 bg-neutral-50 px-3 text-xs font-semibold text-neutral-700">
                      <span aria-hidden="true">🇧🇩</span>
                      +880
                    </span>
                    <div className="flex flex-1 items-center px-3">
                      <HiOutlinePhone className="text-sm text-neutral-400" />
                      <input
                        type="tel"
                        name="phone"
                        placeholder="1XXXXXXXXX"
                        className="ml-2 h-10 w-full bg-transparent text-sm text-neutral-800 outline-none placeholder:text-neutral-400"
                      />
                    </div>
                  </div>
                  <p className="mt-1 text-[11px] text-neutral-500">
                    Bangladeshi number only. We will send a verification OTP.
                  </p>
                </div>
              ) : null}

              {mode !== "verify" ? (
                <PasswordField
                  label="Password"
                  name="password"
                  placeholder="Enter your password"
                  show={showPassword}
                  onToggle={() => setShowPassword((value) => !value)}
                />
              ) : null}

              {mode === "signup" ? (
                <PasswordField
                  label="Confirm Password"
                  name="confirmPassword"
                  placeholder="Confirm your password"
                  show={showConfirmPassword}
                  onToggle={() => setShowConfirmPassword((value) => !value)}
                />
              ) : null}

              {error ? (
                <p className="flex items-start gap-2 rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
                  <HiOutlineExclamationCircle className="mt-0.5 text-base" />
                  <span>{error}</span>
                </p>
              ) : null}

              {error && mode === "login" && onForgotPassword ? (
                <p className="text-center text-xs text-neutral-600">
                  Can&apos;t remember?{" "}
                  <button
                    type="button"
                    onClick={handleForgotPassword}
                    className="font-semibold text-main transition-colors duration-300 hover:text-mainHover"
                  >
                    Forgot password?
                  </button>
                </p>
              ) : null}

              <button
                type="submit"
                disabled={isSubmitting}
                className="mt-1 flex h-11 w-full items-center justify-center rounded-xl bg-main text-sm font-semibold text-white transition-colors duration-300 hover:bg-mainHover"
              >
                {isSubmitting ? "Please wait..." : active.cta}
              </button>

              <p className="text-center text-xs text-neutral-600">
                {active.footerText}{" "}
                <button
                  type="button"
                  onClick={() => {
                    if (active.footerTarget === "signup") {
                      setVerificationEmail("");
                    }
                    switchMode(active.footerTarget);
                  }}
                  className="font-semibold text-main transition-colors duration-300 hover:text-mainHover"
                >
                  {active.footerCta}
                </button>
              </p>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, icon: Icon, type, name, placeholder, defaultValue }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-neutral-900">
        {label}
      </label>
      <div className="mt-1.5 flex w-full items-center rounded-xl border border-neutral-200 bg-white px-3 transition-colors duration-300 focus-within:border-main">
        {Icon ? <Icon className="text-sm text-neutral-400" /> : null}
        <input
          type={type}
          name={name}
          defaultValue={defaultValue}
          placeholder={placeholder}
          className="ml-2 h-10 w-full bg-transparent text-sm text-neutral-800 outline-none placeholder:text-neutral-400"
        />
      </div>
    </div>
  );
}

function PasswordField({
  label,
  name,
  placeholder,
  show,
  onToggle,
  defaultValue,
}) {
  return (
    <div>
      <label className="block text-xs font-semibold text-neutral-900">
        {label}
      </label>
      <div className="mt-1.5 flex w-full items-center rounded-xl border border-neutral-200 bg-white px-3 transition-colors duration-300 focus-within:border-main">
        <HiOutlineLockClosed className="text-sm text-neutral-400" />
        <input
          type={show ? "text" : "password"}
          name={name}
          defaultValue={defaultValue}
          placeholder={placeholder}
          className="ml-2 h-10 w-full bg-transparent text-sm text-neutral-800 outline-none placeholder:text-neutral-400"
        />
        <button
          type="button"
          onClick={onToggle}
          aria-label={show ? "Hide password" : "Show password"}
          className="ml-2 text-neutral-500 transition-colors duration-300 hover:text-neutral-800"
        >
          {show ? (
            <HiOutlineEyeSlash className="text-base" />
          ) : (
            <HiOutlineEye className="text-base" />
          )}
        </button>
      </div>
    </div>
  );
}
