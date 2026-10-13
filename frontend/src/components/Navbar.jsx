import { useNavigate } from "react-router-dom";

import { apiRequest, clearAuth, getStoredAuth } from "../lib/auth";

function Navbar() {
  const navigate = useNavigate();
  const auth = getStoredAuth();

  async function handleLogout() {
      try {
        if (auth?.refresh) {
          await apiRequest("logout/", {
            method: "POST",
            body: JSON.stringify({ refresh: auth.refresh }),
          });
        }
      } catch {
        // Ignore logout API failure and still clear local state.
      } finally {
        clearAuth();
        navigate("/login", { replace: true });
      }
    }

  const displayName = auth?.user?.first_name || auth?.user?.username || "User";
  const avatar = displayName.charAt(0).toUpperCase();

  return (
    <header className="flex h-19 items-center justify-between border-b border-(--border) bg-(--surface) px-8">
      <div>
        <h2 className="text-base font-semibold">Smart Project Management</h2>
        <p className="mt-0.75 text-xs text-(--text-muted)">
          Manage your projects and team efficiently
        </p>
      </div>

      <div className="flex items-center gap-4.5">
        <button
          type="button"
          aria-label="Notifications"
          className="relative h-9.5 w-9.5 cursor-pointer rounded-[9px] border border-(--border) bg-(--surface)"
        >
          🔔
          <span className="absolute right-1.75 top-1.75 h-1.75 w-1.75 rounded-full border border-white bg-(--danger)" />
        </button>

        <div className="flex items-center gap-2.25">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-(--primary) text-[13px] font-bold text-white">
            {avatar}
          </div>

          <div>
            <strong className="block text-xs">{displayName}</strong>
            <span className="mt-0.5 block text-[10px] text-(--text-muted)">
              {auth?.user?.email || "Student"}
            </span>
          </div>

          <span className="text-(--text-muted)">⌄</span>
        </div>

        <button
          type="button"
          onClick={handleLogout}
          className="cursor-pointer rounded-lg border border-(--border) bg-(--surface) px-3.5 py-2 text-[13px] font-medium hover:bg-slate-50"
        >
          Logout
        </button>
      </div>
    </header>
  );
}

export default Navbar;