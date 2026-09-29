"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "../lib/supabase";

type AnnouncementType =
  | "general"
  | "academic"
  | "registration"
  | "exam"
  | "assignment"
  | "cat"
  | "event"
  | "career"
  | "system"
  | "urgent";

type Announcement = {
  id: number;
  title: string;
  body: string;
  announcement_type: AnnouncementType;
  is_published: boolean;
  published_at: string | null;
  created_at: string;
};

const FILTERS: {
  value: "all" | AnnouncementType;
  label: string;
}[] = [
  { value: "all", label: "All" },
  { value: "academic", label: "Academic" },
  { value: "registration", label: "Registration" },
  { value: "exam", label: "Exams" },
  { value: "assignment", label: "Assignments" },
  { value: "cat", label: "CATs" },
  { value: "event", label: "Events" },
  { value: "career", label: "Career" },
  { value: "urgent", label: "Urgent" },
  { value: "general", label: "General" },
];

function typeLabel(type: AnnouncementType) {
  const item = FILTERS.find((filter) => filter.value === type);

  return item?.label || type;
}

function formatDate(value: string | null) {
  if (!value) return "";

  return new Date(value).toLocaleString("en-KE", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function getTypeClass(type: AnnouncementType) {
  switch (type) {
    case "urgent":
      return "bg-red-100 text-red-700";

    case "exam":
      return "bg-orange-100 text-orange-700";

    case "assignment":
      return "bg-blue-100 text-blue-700";

    case "cat":
      return "bg-purple-100 text-purple-700";

    case "career":
      return "bg-green-100 text-green-700";

    case "registration":
      return "bg-yellow-100 text-yellow-700";

    case "event":
      return "bg-pink-100 text-pink-700";

    default:
      return "bg-gray-100 text-gray-700";
  }
}

export default function AnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<
    Announcement[]
  >([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [filter, setFilter] = useState<
    "all" | AnnouncementType
  >("all");

  const [search, setSearch] = useState("");

  useEffect(() => {
    loadAnnouncements();
  }, []);

  async function loadAnnouncements() {
    setLoading(true);
    setError("");

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setError("Please log in to view announcements.");
      setLoading(false);
      return;
    }

    const { data, error: queryError } = await supabase
      .from("announcements")
      .select(
        "id, title, body, announcement_type, is_published, published_at, created_at"
      )
      .eq("is_published", true)
      .order("published_at", {
        ascending: false,
        nullsFirst: false,
      });

    if (queryError) {
      console.error(queryError);
      setError(queryError.message);
      setLoading(false);
      return;
    }

    setAnnouncements((data || []) as Announcement[]);
    setLoading(false);
  }

  const filteredAnnouncements = useMemo(() => {
    const term = search.trim().toLowerCase();

    return announcements.filter((announcement) => {
      const matchesFilter =
        filter === "all" ||
        announcement.announcement_type === filter;

      const matchesSearch =
        !term ||
        announcement.title.toLowerCase().includes(term) ||
        announcement.body.toLowerCase().includes(term);

      return matchesFilter && matchesSearch;
    });
  }, [announcements, filter, search]);

  const urgentAnnouncements = announcements.filter(
    (item) => item.announcement_type === "urgent"
  );

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-50 p-6">
        <div className="mx-auto max-w-5xl">
          <div className="rounded-2xl border border-gray-200 bg-white p-10 text-center shadow-sm">
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-gray-900" />
            <p className="mt-4 text-sm text-gray-500">
              Loading announcements...
            </p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gray-900 text-xl text-white">
                  📢
                </div>

                <div>
                  <h1 className="text-2xl font-bold text-gray-900 md:text-3xl">
                    Announcements
                  </h1>

                  <p className="mt-1 text-sm text-gray-500">
                    Stay updated with important DataSphere
                    information.
                  </p>
                </div>
              </div>
            </div>

            <Link
              href="/notifications"
              className="rounded-xl border border-gray-300 bg-white px-4 py-3 text-center text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              View Notifications
            </Link>
          </div>
        </div>

        {error && (
          <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {urgentAnnouncements.length > 0 && (
          <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-5">
            <div className="flex items-start gap-3">
              <div className="text-xl">⚠️</div>

              <div>
                <h2 className="font-bold text-red-900">
                  Urgent Announcement
                </h2>

                <p className="mt-1 text-sm text-red-700">
                  There is important information requiring your
                  attention.
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="mb-5 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-4">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search announcements..."
              className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm text-gray-900 outline-none focus:border-gray-900 focus:ring-2 focus:ring-gray-200"
            />

            <div className="flex gap-2 overflow-x-auto pb-1">
              {FILTERS.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => setFilter(item.value)}
                  className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition ${
                    filter === item.value
                      ? "bg-gray-900 text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="mb-4 flex items-center justify-between">
          <p className="text-sm text-gray-500">
            {filteredAnnouncements.length} announcement
            {filteredAnnouncements.length === 1 ? "" : "s"}
          </p>
        </div>

        <div className="space-y-4">
          {filteredAnnouncements.length === 0 ? (
            <div className="rounded-2xl border border-gray-200 bg-white p-10 text-center shadow-sm">
              <div className="text-4xl">📭</div>

              <h2 className="mt-3 text-lg font-bold text-gray-900">
                No announcements
              </h2>

              <p className="mt-1 text-sm text-gray-500">
                There are no announcements matching your search
                or filter.
              </p>
            </div>
          ) : (
            filteredAnnouncements.map((announcement) => (
              <article
                key={announcement.id}
                className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition hover:shadow-md"
              >
                <div className="flex items-start gap-4">
                  <div className="hidden h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gray-100 text-lg sm:flex">
                    📢
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${getTypeClass(
                          announcement.announcement_type
                        )}`}
                      >
                        {typeLabel(
                          announcement.announcement_type
                        )}
                      </span>

                      {announcement.announcement_type ===
                        "urgent" && (
                        <span className="rounded-full bg-red-600 px-3 py-1 text-xs font-semibold text-white">
                          Important
                        </span>
                      )}
                    </div>

                    <h2 className="text-lg font-bold text-gray-900">
                      {announcement.title}
                    </h2>

                    <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-gray-600">
                      {announcement.body}
                    </p>

                    <div className="mt-4 text-xs text-gray-400">
                      {formatDate(
                        announcement.published_at ||
                          announcement.created_at
                      )}
                    </div>
                  </div>
                </div>
              </article>
            ))
          )}
        </div>
      </div>
    </main>
  );
}