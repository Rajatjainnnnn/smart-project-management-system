import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

import { apiRequest, clearAuth, getStoredAuth } from "../lib/auth";

function getUnreadCount(data) {
  const notifications = Array.isArray(data) ? data : (data?.results ?? []);
  return notifications.length;
}

function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const profileMenuRef = useRef(null);
  const [auth, setAuth] = useState(getStoredAuth());
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(null);

  useEffect(() => {
    function updateAuth() {
      setAuth(getStoredAuth());
    }
    window.addEventListener("spms-auth-updated", updateAuth);
    return () => window.removeEventListener("spms-auth-updated", updateAuth);
  }, []);

  useEffect(() => {
    let active = true;
    apiRequest("/api/notifications/?unread=true")
      .then((data) => {
        if (active) setUnreadCount(getUnreadCount(data));
      })
      .catch(() => {
        if (active) setUnreadCount(null);
      });

    return () => {
      active = false;
    };
  }, [location.pathname]);

  useEffect(() => {
    function refreshUnreadCount() {
      apiRequest("/api/notifications/?unread=true")
        .then((data) => setUnreadCount(getUnreadCount(data)))
        .catch(() => setUnreadCount(null));
    }
    window.addEventListener("spms-notifications-updated", refreshUnreadCount);
    return () => window.removeEventListener("spms-notifications-updated", refreshUnreadCount);
  }, []);

  useEffect(() => {
    if (!profileMenuOpen) return undefined;

    function closeOnOutsideClick(event) {
      if (!profileMenuRef.current?.contains(event.target)) {
        setProfileMenuOpen(false);
      }
    }
    function closeOnEscape(event) {
      if (event.key === "Escape") setProfileMenuOpen(false);
    }

    document.addEventListener("pointerdown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [profileMenuOpen]);

  async function handleLogout() {
    try {
      if (auth?.refresh) {
        await apiRequest("logout/", {
          method: "POST",
          body: JSON.stringify({ refresh: auth.refresh }),
        });
      }
    } catch {
      // Still clear local state if the server session has already expired.
    } finally {
      clearAuth();
      navigate("/login", { replace: true });
    }
  }

  const firstName = auth?.user?.first_name || auth?.user?.username || "User";
  const displayName = [auth?.user?.first_name, auth?.user?.last_name]
    .filter(Boolean)
    .join(" ") || firstName;
  const avatar = firstName.charAt(0).toUpperCase();
  const notificationLabel = unreadCount === null
    ? "Notifications"
    : `Notifications${unreadCount ? `, ${unreadCount} unread` : ""}`;

  return (
    <header className="flex h-19 items-center justify-between gap-3 border-b border-(--border) bg-(--surface) px-4 sm:px-8">
      <div className="min-w-0">
        <h2 className="truncate text-base font-semibold">Smart Project Management</h2>
        <p className="mt-0.75 hidden text-xs text-(--text-muted) sm:block">
          Manage your projects and team efficiently
        </p>
      </div>

      <div className="flex shrink-0 items-center gap-2.5 sm:gap-4.5">
        <Link
          to="/notifications"
          aria-label={notificationLabel}
          title={unreadCount === null ? "Notification count unavailable" : `${unreadCount} unread notifications`}
          className="relative flex h-9.5 w-9.5 items-center justify-center rounded-[9px] border border-(--border) bg-(--surface) no-underline"
        >
          <span aria-hidden="true">🔔</span>
          {unreadCount > 0 && (
            <span className="absolute -right-1 -top-1 flex min-h-4 min-w-4 items-center justify-center rounded-full border border-white bg-(--danger) px-1 text-[9px] font-bold leading-none text-white">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </Link>

        <div className="relative" ref={profileMenuRef}>
          <button
            type="button"
            aria-label={`Account menu for ${displayName}`}
            aria-haspopup="menu"
            aria-expanded={profileMenuOpen}
            onClick={() => setProfileMenuOpen((open) => !open)}
            className="flex cursor-pointer items-center gap-2.25 rounded-lg border border-transparent bg-transparent p-1.5 text-left hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-(--primary)"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-(--primary) text-[13px] font-bold text-white">
              {avatar}
            </span>
            <span className="hidden min-w-0 md:block">
              <strong className="block truncate text-xs">{displayName}</strong>
              <span className="mt-0.5 block max-w-44 truncate text-[11px] text-(--text-muted)">
                {auth?.user?.email || "Student"}
              </span>
            </span>
            <span aria-hidden="true" className="hidden text-(--text-muted) md:inline">⌄</span>
          </button>

          {profileMenuOpen && (
            <div
              role="menu"
              aria-label="Account"
              className="absolute right-0 top-full z-50 mt-2 w-52 rounded-xl border border-(--border) bg-white p-1.5 shadow-xl"
            >
              <Link
                role="menuitem"
                to="/profile"
                onClick={() => setProfileMenuOpen(false)}
                className="block rounded-lg px-3 py-2.5 text-sm font-medium text-(--text-primary) no-underline hover:bg-slate-50"
              >
                Profile &amp; Skills
              </Link>
              <button
                type="button"
                role="menuitem"
                onClick={handleLogout}
                className="w-full cursor-pointer rounded-lg px-3 py-2.5 text-left text-sm font-medium text-red-600 hover:bg-red-50"
              >
                Log out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

export default Navbar;
