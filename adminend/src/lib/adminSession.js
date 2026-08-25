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

function getLocalStorage() {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

export function loadAdminSession() {
  const storage = getLocalStorage();
  if (!storage) {
    return DEFAULT_ADMIN_PROFILE;
  }

  try {
    const raw = storage.getItem(ADMIN_SESSION_KEY);
    if (!raw) {
      return DEFAULT_ADMIN_PROFILE;
    }

    return { ...DEFAULT_ADMIN_PROFILE, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_ADMIN_PROFILE;
  }
}

export function saveAdminSession(session) {
  const storage = getLocalStorage();
  if (!storage) {
    return;
  }

  storage.setItem(
    ADMIN_SESSION_KEY,
    JSON.stringify({ ...DEFAULT_ADMIN_PROFILE, ...session })
  );
}

export function clearAdminSession() {
  const storage = getLocalStorage();
  if (!storage) {
    return;
  }

  storage.removeItem(ADMIN_SESSION_KEY);
}
