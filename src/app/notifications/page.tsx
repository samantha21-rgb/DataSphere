"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Sidebar from "../components/dashboard/Sidebar";
import Topbar from "../components/dashboard/Topbar";
import { supabase } from "../lib/supabase";

type NotificationType =
  | "general"
  | "academic"
  | "assignment"
  | "exam"
  | "cat"
  | "announcement"
  | "ai"
  | "system";

type Notification = {
  id: number;
  user_id: string;
  title: string;
  message: string;
  type: NotificationType;
  link: string | null;
  is_read: boolean;
  created_at: string;
};

type Filter = "all" | "unread" | NotificationType;

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>(
    []
  );

  const [filter, setFilter] = useState<Filter>("all");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadNotifications();
  }, []);

  async function loadNotifications() {
    setLoading(true);
    setError("");

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        throw userError;
      }

      if (!user) {
        setError("You are not logged in.");
        return;
      }

      const { data, error: notificationError } = await supabase
        .from("notifications")
        .select(
          "id, user_id, title, message, type, link, is_read, created_at"
        )
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (notificationError) {
        throw notificationError;
      }

      setNotifications(data || []);
    } catch (err) {
      console.error("Notifications error:", err);

      setError(
        err instanceof Error
          ? err.message
          : "Unable to load notifications."
      );
    } finally {
      setLoading(false);
    }
  }

  async function markAsRead(id: number) {
    const notification = notifications.find(
      (item) => item.id === id
    );

    if (!notification || notification.is_read) {
      return;
    }

    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("id", id);

    if (error) {
      console.error("Mark read error:", error);
      return;
    }

    setNotifications((previous) =>
      previous.map((item) =>
        item.id === id
          ? { ...item, is_read: true }
          : item
      )
    );
  }

  async function markAllAsRead() {
    const unreadIds = notifications
      .filter((item) => !item.is_read)
      .map((item) => item.id);

    if (unreadIds.length === 0) {
      return;
    }

    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .in("id", unreadIds);

    if (error) {
      console.error("Mark all read error:", error);
      setError("Unable to mark notifications as read.");
      return;
    }

    setNotifications((previous) =>
      previous.map((item) => ({
        ...item,
        is_read: true,
      }))
    );
  }

  const unreadCount = notifications.filter(
    (item) => !item.is_read
  ).length;

  const filteredNotifications = useMemo(() => {
    if (filter === "all") {
      return notifications;
    }

    if (filter === "unread") {
      return notifications.filter(
        (item) => !item.is_read
      );
    }

    return notifications.filter(
      (item) => item.type === filter
    );
  }, [notifications, filter]);

  function handleNotificationClick(
    notification: Notification
  ) {
    markAsRead(notification.id);
  }

  return (
    <div className="flex min-h-screen bg-slate-950">
      <Sidebar />

      <main className="min-w-0 flex-1 p-6 md:p-8">
        <Topbar />

        {/* Header */}
        <section className="mt-6 rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <div className="flex flex-col justify-between gap-5 md:flex-row md:items-center">
            <div>
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-800 text-2xl">
                  🔔
                </div>

                <div>
                  <h1 className="text-2xl font-bold text-white md:text-3xl">
                    Notifications
                  </h1>

                  <p className="mt-1 text-sm text-slate-500">
                    Stay updated with your DataSphere academic
                    activity.
                  </p>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={markAllAsRead}
              disabled={unreadCount === 0}
              className="rounded-xl border border-slate-700 px-4 py-2.5 text-sm font-semibold text-slate-200 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Mark all as read
            </button>
          </div>
        </section>

        {/* Summary */}
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <SummaryCard
            icon="🔔"
            title="Total"
            value={notifications.length}
          />

          <SummaryCard
            icon="📬"
            title="Unread"
            value={unreadCount}
          />

          <SummaryCard
            icon="✓"
            title="Read"
            value={notifications.length - unreadCount}
          />
        </div>

        {/* Error */}
        {error && (
          <div className="mt-6 rounded-xl border border-red-900 bg-red-950/40 p-4 text-sm text-red-300">
            {error}
          </div>
        )}

        {/* Filters */}
        <section className="mt-8">
          <div className="flex flex-wrap gap-2">
            <FilterButton
              active={filter === "all"}
              onClick={() => setFilter("all")}
            >
              All
            </FilterButton>

            <FilterButton
              active={filter === "unread"}
              onClick={() => setFilter("unread")}
            >
              Unread
            </FilterButton>

            <FilterButton
              active={filter === "academic"}
              onClick={() => setFilter("academic")}
            >
              Academic
            </FilterButton>

            <FilterButton
              active={filter === "assignment"}
              onClick={() => setFilter("assignment")}
            >
              Assignments
            </FilterButton>

            <FilterButton
              active={filter === "exam"}
              onClick={() => setFilter("exam")}
            >
              Exams
            </FilterButton>

            <FilterButton
              active={filter === "cat"}
              onClick={() => setFilter("cat")}
            >
              CATs
            </FilterButton>

            <FilterButton
              active={filter === "announcement"}
              onClick={() => setFilter("announcement")}
            >
              Announcements
            </FilterButton>

            <FilterButton
              active={filter === "ai"}
              onClick={() => setFilter("ai")}
            >
              AI
            </FilterButton>
          </div>
        </section>

        {/* Notifications */}
        <section className="mt-4">
          {loading ? (
            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-12 text-center">
              <div className="mx-auto h-9 w-9 animate-spin rounded-full border-4 border-slate-700 border-t-white" />

              <p className="mt-4 text-sm text-slate-500">
                Loading notifications...
              </p>
            </div>
          ) : filteredNotifications.length === 0 ? (
            <EmptyNotifications
              filter={filter}
            />
          ) : (
            <div className="space-y-3">
              {filteredNotifications.map((notification) => (
                <NotificationCard
                  key={notification.id}
                  notification={notification}
                  onClick={() =>
                    handleNotificationClick(notification)
                  }
                />
              ))}
            </div>
          )}
        </section>

        {/* Quick links */}
        <section className="mt-8 rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <h2 className="text-lg font-bold text-white">
            Quick Access
          </h2>

          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <QuickLink
              href="/exams"
              icon="🎓"
              title="Exams"
            />

            <QuickLink
              href="/ai-tutor"
              icon="🤖"
              title="AI Tutor"
            />

            <QuickLink
              href="/timetable"
              icon="🗓️"
              title="Timetable"
            />

            <QuickLink
              href="/career"
              icon="🚀"
              title="Career Hub"
            />
          </div>
        </section>
      </main>
    </div>
  );
}

function NotificationCard({
  notification,
  onClick,
}: {
  notification: Notification;
  onClick: () => void;
}) {
  const content = (
    <div
      onClick={onClick}
      className={`group rounded-2xl border p-5 transition ${
        notification.is_read
          ? "border-slate-800 bg-slate-900"
          : "border-slate-600 bg-slate-900"
      } hover:border-slate-500 hover:bg-slate-800`}
    >
      <div className="flex gap-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-800 text-xl">
          {getNotificationIcon(notification.type)}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-start">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3
                  className={`font-semibold ${
                    notification.is_read
                      ? "text-slate-300"
                      : "text-white"
                  }`}
                >
                  {notification.title}
                </h3>

                {!notification.is_read && (
                  <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-950">
                    New
                  </span>
                )}
              </div>

              <p className="mt-2 text-sm leading-6 text-slate-400">
                {notification.message}
              </p>
            </div>

            <span className="shrink-0 text-xs text-slate-600">
              {formatRelativeTime(notification.created_at)}
            </span>
          </div>

          <div className="mt-4 flex items-center justify-between">
            <span className="rounded-full bg-slate-800 px-2.5 py-1 text-xs font-medium capitalize text-slate-400">
              {notification.type.replace("-", " ")}
            </span>

            {notification.link && (
              <span className="text-xs font-medium text-slate-400 group-hover:text-white">
                Open →
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  if (notification.link) {
    return (
      <Link
        href={notification.link}
        onClick={onClick}
        className="block"
      >
        {content}
      </Link>
    );
  }

  return content;
}

function SummaryCard({
  icon,
  title,
  value,
}: {
  icon: string;
  title: string;
  value: number;
}) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-800">
          {icon}
        </div>

        <div>
          <p className="text-xs font-medium text-slate-500">
            {title}
          </p>

          <p className="mt-1 text-2xl font-bold text-white">
            {value}
          </p>
        </div>
      </div>
    </div>
  );
}

function FilterButton({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-xl px-4 py-2 text-sm font-medium transition ${
        active
          ? "bg-white text-slate-950"
          : "border border-slate-800 bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-white"
      }`}
    >
      {children}
    </button>
  );
}

function EmptyNotifications({
  filter,
}: {
  filter: Filter;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-900 p-12 text-center">
      <div className="text-4xl">🔕</div>

      <h2 className="mt-4 text-lg font-semibold text-white">
        {filter === "unread"
          ? "You're all caught up"
          : "No notifications"}
      </h2>

      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
        {filter === "unread"
          ? "You don't have any unread notifications right now."
          : "When DataSphere has academic updates, announcements or assessment reminders for you, they'll appear here."}
      </p>
    </div>
  );
}

function QuickLink({
  href,
  icon,
  title,
}: {
  href: string;
  icon: string;
  title: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 rounded-xl border border-slate-800 p-4 text-sm font-medium text-slate-300 transition hover:border-slate-600 hover:bg-slate-800 hover:text-white"
    >
      <span>{icon}</span>
      <span>{title}</span>
    </Link>
  );
}

function getNotificationIcon(type: NotificationType) {
  switch (type) {
    case "academic":
      return "🎓";

    case "assignment":
      return "📋";

    case "exam":
      return "📝";

    case "cat":
      return "🧠";

    case "announcement":
      return "📢";

    case "ai":
      return "🤖";

    case "system":
      return "⚙️";

    case "general":
    default:
      return "🔔";
  }
}

function formatRelativeTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const difference =
    Date.now() - date.getTime();

  const seconds = Math.floor(difference / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) {
    return "Just now";
  }

  if (minutes < 60) {
    return `${minutes}m ago`;
  }

  if (hours < 24) {
    return `${hours}h ago`;
  }

  if (days < 7) {
    return `${days}d ago`;
  }

  return date.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}