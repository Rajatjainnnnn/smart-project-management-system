import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { apiRequest } from "../lib/auth";

const card = "rounded-(--radius) border border-(--border) bg-(--surface)";
const primaryButton =
  "cursor-pointer rounded-lg border-none bg-(--primary) px-[17px] py-[11px] text-[13px] font-semibold text-white transition duration-200 ease-in-out hover:bg-(--primary-hover)";
const secondaryButton =
  "cursor-pointer rounded-lg border border-(--border) bg-white px-3 py-2 text-xs font-semibold text-(--text-secondary) hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60";

// The API has used both `is_read` and `read`, and a notification may or may
// not have a `title`, so this accepts either shape.
function normalizeNotification(item) {
  return {
    id: item.id,
    title: item.title || "",
    message: item.message || "",
    link: item.link || "",
    isRead: Boolean(item.is_read ?? item.read),
    createdAt: item.created_at || "",
  };
}

function formatDate(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

function SkeletonRows() {
  return (
    <div role="status" aria-live="polite" aria-label="Loading notifications" className="flex flex-col gap-3">
      {[0, 1, 2].map((item) => (
        <div key={item} className="h-20 animate-pulse rounded-(--radius) bg-slate-200" />
      ))}
      <span className="sr-only">Loading notifications...</span>
    </div>
  );
}

function MessageCard({ title, message, actionLabel, onAction }) {
  return (
    <div className={`${card} px-6 py-12 text-center`}>
      <h3 className="text-base font-semibold">{title}</h3>
      <p className="mx-auto mt-2 max-w-md text-[13px] text-(--text-secondary)">{message}</p>
      {actionLabel && (
        <button type="button" className={`${primaryButton} mt-5`} onClick={onAction}>
          {actionLabel}
        </button>
      )}
    </div>
  );
}

function Notifications() {
  const [reloadKey, setReloadKey] = useState(0);
  const [state, setState] = useState({ status: "loading", items: [] });
  const [filter, setFilter] = useState("all");
  const [busyId, setBusyId] = useState(null);
  const [actionError, setActionError] = useState("");

  useEffect(() => {
    let active = true;

    apiRequest("/api/notifications/")
      .then((data) => {
        if (!active) return;
        const list = Array.isArray(data) ? data : (data?.results ?? []);
        setState({ status: "ready", items: list.map(normalizeNotification) });
      })
      .catch(() => {
        if (!active) return;
        setState({ status: "error", items: [] });
      });

    return () => {
      active = false;
    };
  }, [reloadKey]);

  function retry() {
    setState({ status: "loading", items: [] });
    setActionError("");
    setReloadKey((key) => key + 1);
  }

  async function markRead(id) {
    setBusyId(id);
    setActionError("");
    try {
      await apiRequest(`/api/notifications/${id}/read/`, { method: "PATCH" });
      setState((current) => ({
        ...current,
        items: current.items.map((item) => (item.id === id ? { ...item, isRead: true } : item)),
      }));
      window.dispatchEvent(new Event("spms-notifications-updated"));
    } catch {
      setActionError("Could not mark that notification as read. Please try again.");
    } finally {
      setBusyId(null);
    }
  }

  const unreadCount = state.items.filter((item) => !item.isRead).length;
  const visibleItems = filter === "unread" ? state.items.filter((item) => !item.isRead) : state.items;

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-1.5 text-[11px] font-bold tracking-[0.08em] text-(--primary)">
            SYSTEM
          </div>
          <h1 className="text-2xl font-bold leading-[1.1] sm:text-[27px]">Notifications</h1>
          <p className="mt-1.75 text-[13px] text-(--text-secondary)">
            {state.status === "ready"
              ? `${unreadCount} unread of ${state.items.length}`
              : "Assignments, deadlines and project updates."}
          </p>
        </div>

        <div className="flex gap-2" role="group" aria-label="Filter notifications">
          {["all", "unread"].map((value) => (
            <button
              key={value}
              type="button"
              aria-pressed={filter === value}
              onClick={() => setFilter(value)}
              className={`cursor-pointer rounded-lg border px-3.5 py-2 text-xs font-semibold capitalize ${
                filter === value
                  ? "border-(--primary) bg-(--primary) text-white"
                  : "border-(--border) bg-white text-(--text-secondary) hover:bg-slate-50"
              }`}
            >
              {value}
            </button>
          ))}
        </div>
      </div>

      {actionError && (
        <p role="alert" className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          {actionError}
        </p>
      )}

      {state.status === "loading" && <SkeletonRows />}

      {state.status === "error" && (
        <MessageCard
          title="Could not load notifications"
          message="Something went wrong while loading your notifications. Check that the backend is running, then try again."
          actionLabel="Try again"
          onAction={retry}
        />
      )}

      {state.status === "ready" && visibleItems.length === 0 && (
        <MessageCard
          title={filter === "unread" ? "You're all caught up" : "No notifications yet"}
          message={
            filter === "unread"
              ? "You have no unread notifications."
              : "When you are assigned work or a deadline is near, it will show up here."
          }
        />
      )}

      {state.status === "ready" && visibleItems.length > 0 && (
        <ul className="flex flex-col gap-3">
          {visibleItems.map((item) => (
            <li
              key={item.id}
              className={`${card} flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between ${
                item.isRead ? "" : "border-l-4 border-l-(--primary)"
              }`}
            >
              <div className="min-w-0">
                {item.title && <strong className="block text-[13px]">{item.title}</strong>}
                <p className={`text-[13px] ${item.title ? "mt-0.5 text-(--text-secondary)" : "font-semibold"}`}>
                  {item.message}
                </p>
                {item.createdAt && (
                  <span className="mt-1 block text-[11px] text-(--text-muted)">
                    {formatDate(item.createdAt)}
                  </span>
                )}
              </div>

              <div className="flex shrink-0 items-center gap-2">
                {item.link.startsWith("/") && !item.link.startsWith("//") && (
                  <Link to={item.link} className={`${secondaryButton} no-underline`}>
                    Open
                  </Link>
                )}
                {item.isRead ? (
                  <span className="text-[11px] font-semibold text-(--text-muted)">Read</span>
                ) : (
                  <button
                    type="button"
                    className={secondaryButton}
                    disabled={busyId === item.id}
                    onClick={() => markRead(item.id)}
                  >
                    Mark as read
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default Notifications;
