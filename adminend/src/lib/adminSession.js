export const ADMIN_SESSION_KEY = "adminflow-admin-session";

export const DEFAULT_ADMIN_PROFILE = {
  name: "Admin User",
  email: "",
  phone: "",
  role: "Administrator",
  title: "Administrator",
  bio: "Signed in from the admin console.",
  location: "",
  timezone: "",
  status: "Active",
  initials: "AU",
  lastLogin: "",
};

function canUseStorage() {
  return typeof window !== "undefined" && !!window.localStorage;
}

export function loadAdminSession() {
  if (!canUseStorage()) {
    return DEFAULT_ADMIN_PROFILE;
  }

  try {
    const raw = window.localStorage.getItem(ADMIN_SESSION_KEY);
    if (!raw) {
      return DEFAULT_ADMIN_PROFILE;
    }

    return { ...DEFAULT_ADMIN_PROFILE, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_ADMIN_PROFILE;
  }
}

export function saveAdminSession(session) {
  if (!canUseStorage()) {
    return;
  }

  window.localStorage.setItem(
    ADMIN_SESSION_KEY,
    JSON.stringify({ ...DEFAULT_ADMIN_PROFILE, ...session })
  );
}

export function clearAdminSession() {
  if (!canUseStorage()) {
    return;
  }

  window.localStorage.removeItem(ADMIN_SESSION_KEY);
}
