"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabase";

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
  created_by: string | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
};

const TYPE_OPTIONS: {
  value: AnnouncementType;
  label: string;
}[] = [
  { value: "general", label: "General" },
  { value: "academic", label: "Academic" },
  { value: "registration", label: "Registration" },
  { value: "exam", label: "Exam" },
  { value: "assignment", label: "Assignment" },
  { value: "cat", label: "CAT" },
  { value: "event", label: "Event" },
  { value: "career", label: "Career" },
  { value: "system", label: "System" },
  { value: "urgent", label: "Urgent" },
];

const inputClass =
  "w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-gray-900 focus:ring-2 focus:ring-gray-200";

function typeLabel(type: AnnouncementType) {
  return (
    TYPE_OPTIONS.find((item) => item.value === type)?.label || type
  );
}

function formatDate(value: string | null) {
  if (!value) return "Not published";

  return new Date(value).toLocaleString("en-KE", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export default function AdminAnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);

  const [loading, setLoading] = useState(true);
  const [checkingAdmin, setCheckingAdmin] = useState(true);
  const [saving, setSaving] = useState(false);

  const [isAdmin, setIsAdmin] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | AnnouncementType>("all");

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [announcementType, setAnnouncementType] =
    useState<AnnouncementType>("general");
  const [isPublished, setIsPublished] = useState(false);

  useEffect(() => {
    initialise();
  }, []);

  async function initialise() {
    setCheckingAdmin(true);
    setError("");

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) throw userError;

      if (!user) {
        setIsAdmin(false);
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      if (profileError) throw profileError;

      if (profile?.role !== "admin") {
        setIsAdmin(false);
        return;
      }

      setIsAdmin(true);
      await loadAnnouncements();
    } catch (err) {
      console.error(err);

      setIsAdmin(false);

      setError(
        err instanceof Error
          ? err.message
          : "Unable to verify administrator access."
      );
    } finally {
      setCheckingAdmin(false);
      setLoading(false);
    }
  }

  async function loadAnnouncements() {
    setLoading(true);
    setError("");

    const { data, error: queryError } = await supabase
      .from("announcements")
      .select("*")
      .order("created_at", { ascending: false });

    if (queryError) {
      console.error(queryError);
      setError(queryError.message);
      setLoading(false);
      return;
    }

    setAnnouncements((data || []) as Announcement[]);
    setLoading(false);
  }

  function resetForm() {
    setTitle("");
    setBody("");
    setAnnouncementType("general");
    setIsPublished(false);
    setEditingId(null);
  }

  function openCreate() {
    setError("");
    setSuccess("");
    resetForm();
    setModalOpen(true);
  }

  function openEdit(item: Announcement) {
    setError("");
    setSuccess("");

    setEditingId(item.id);
    setTitle(item.title);
    setBody(item.body);
    setAnnouncementType(item.announcement_type);
    setIsPublished(item.is_published);

    setModalOpen(true);
  }

  function closeModal() {
    if (saving) return;

    setModalOpen(false);
    resetForm();
  }

  async function saveAnnouncement(event: FormEvent) {
    event.preventDefault();

    setError("");
    setSuccess("");

    if (!title.trim()) {
      setError("Please enter an announcement title.");
      return;
    }

    if (!body.trim()) {
      setError("Please enter the announcement message.");
      return;
    }

    setSaving(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error("Your session has expired. Please log in again.");
      }

      const payload = {
        title: title.trim(),
        body: body.trim(),
        announcement_type: announcementType,
        is_published: isPublished,
        created_by: user.id,
        published_at: isPublished
          ? new Date().toISOString()
          : (null as unknown as string),
      };

      if (editingId) {
        const { error: updateError } = await supabase
          .from("announcements")
          .update(payload)
          .eq("id", editingId);

        if (updateError) throw updateError;

        setSuccess(
          isPublished
            ? "Announcement updated and published."
            : "Announcement updated as a draft."
        );
      } else {
        const { error: insertError } = await supabase
          .from("announcements")
          .insert(payload);

        if (insertError) throw insertError;

        setSuccess(
          isPublished
            ? "Announcement published successfully."
            : "Announcement saved as a draft."
        );
      }

      setModalOpen(false);
      resetForm();

      await loadAnnouncements();
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "Unable to save announcement."
      );
    } finally {
      setSaving(false);
    }
  }

  async function togglePublish(item: Announcement) {
    setError("");
    setSuccess("");

    const nextPublished = !item.is_published;

    const { error: updateError } = await supabase
      .from("announcements")
      .update({
        is_published: nextPublished,
        published_at: nextPublished
          ? new Date().toISOString()
          : null,
      })
      .eq("id", item.id);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setSuccess(
      nextPublished
        ? "Announcement published."
        : "Announcement moved back to draft."
    );

    await loadAnnouncements();
  }

  async function deleteAnnouncement(item: Announcement) {
    const confirmed = window.confirm(
      `Delete "${item.title}"?\n\nThis cannot be undone.`
    );

    if (!confirmed) return;

    setError("");
    setSuccess("");

    const { error: deleteError } = await supabase
      .from("announcements")
      .delete()
      .eq("id", item.id);

    if (deleteError) {
      setError(deleteError.message);
      return;
    }

    setSuccess("Announcement deleted.");
    await loadAnnouncements();
  }

  const filteredAnnouncements = useMemo(() => {
    const term = search.trim().toLowerCase();

    return announcements.filter((item) => {
      const matchesType =
        filter === "all" || item.announcement_type === filter;

      const matchesSearch =
        !term ||
        item.title.toLowerCase().includes(term) ||
        item.body.toLowerCase().includes(term);

      return matchesType && matchesSearch;
    });
  }, [announcements, search, filter]);

  const publishedCount = announcements.filter(
    (item) => item.is_published
  ).length;

  const draftCount = announcements.filter(
    (item) => !item.is_published
  ).length;

  const urgentCount = announcements.filter(
    (item) => item.announcement_type === "urgent"
  ).length;

  if (checkingAdmin || loading) {
    return (
      <main className="min-h-screen bg-gray-50 p-6">
        <div className="mx-auto max-w-7xl">
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

  if (!isAdmin) {
    return (
      <main className="min-h-screen bg-gray-50 p-6">
        <div className="mx-auto max-w-2xl">
          <div className="rounded-2xl border border-red-200 bg-white p-8 text-center shadow-sm">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-50 text-2xl">
              🔒
            </div>

            <h1 className="mt-4 text-2xl font-bold text-gray-900">
              Access Denied
            </h1>

            <p className="mt-2 text-sm text-gray-500">
              You must have administrator privileges to manage
              announcements.
            </p>

            {error && (
              <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">
                {error}
              </p>
            )}
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
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
                  Publish important information to DataSphere students.
                </p>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={openCreate}
            className="rounded-xl bg-gray-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-gray-800"
          >
            + New Announcement
          </button>
        </div>

        {error && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
            {success}
          </div>
        )}

        <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
          <StatCard
            label="Total"
            value={announcements.length}
            icon="📢"
          />

          <StatCard
            label="Published"
            value={publishedCount}
            icon="✓"
          />

          <StatCard
            label="Drafts"
            value={draftCount}
            icon="📝"
          />

          <StatCard
            label="Urgent"
            value={urgentCount}
            icon="⚠️"
          />
        </div>

        <div className="mb-6 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-3 md:flex-row">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search announcements..."
              className={inputClass}
            />

            <select
              value={filter}
              onChange={(e) =>
                setFilter(
                  e.target.value as "all" | AnnouncementType
                )
              }
              className={`${inputClass} md:max-w-xs`}
            >
              <option value="all">All types</option>

              {TYPE_OPTIONS.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="space-y-4">
          {filteredAnnouncements.length === 0 ? (
            <div className="rounded-2xl border border-gray-200 bg-white p-10 text-center shadow-sm">
              <div className="text-4xl">📭</div>

              <h2 className="mt-3 text-lg font-semibold text-gray-900">
                No announcements found
              </h2>

              <p className="mt-1 text-sm text-gray-500">
                Create an announcement or change your filters.
              </p>
            </div>
          ) : (
            filteredAnnouncements.map((item) => (
              <article
                key={item.id}
                className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"
              >
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700">
                        {typeLabel(item.announcement_type)}
                      </span>

                      {item.is_published ? (
                        <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
                          Published
                        </span>
                      ) : (
                        <span className="rounded-full bg-yellow-100 px-3 py-1 text-xs font-semibold text-yellow-700">
                          Draft
                        </span>
                      )}
                    </div>

                    <h2 className="text-lg font-bold text-gray-900">
                      {item.title}
                    </h2>

                    <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-gray-600">
                      {item.body}
                    </p>

                    <div className="mt-4 text-xs text-gray-400">
                      {item.is_published
                        ? `Published ${formatDate(item.published_at)}`
                        : `Created ${formatDate(item.created_at)}`}
                    </div>
                  </div>

                  <div className="flex shrink-0 flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => openEdit(item)}
                      className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                    >
                      Edit
                    </button>

                    <button
                      type="button"
                      onClick={() => togglePublish(item)}
                      className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                    >
                      {item.is_published ? "Unpublish" : "Publish"}
                    </button>

                    <button
                      type="button"
                      onClick={() => deleteAnnouncement(item)}
                      className="rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </article>
            ))
          )}
        </div>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
            <form onSubmit={saveAnnouncement}>
              <div className="border-b border-gray-200 px-6 py-5">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">
                      {editingId
                        ? "Edit Announcement"
                        : "New Announcement"}
                    </h2>

                    <p className="mt-1 text-sm text-gray-500">
                      Announcements are currently delivered
                      institution-wide.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={closeModal}
                    disabled={saving}
                    className="rounded-lg px-3 py-2 text-gray-500 hover:bg-gray-100"
                  >
                    ✕
                  </button>
                </div>
              </div>

              <div className="space-y-5 p-6">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-gray-700">
                    Title
                  </label>

                  <input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Semester Registration Deadline"
                    className={inputClass}
                    autoFocus
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-gray-700">
                    Announcement Type
                  </label>

                  <select
                    value={announcementType}
                    onChange={(e) =>
                      setAnnouncementType(
                        e.target.value as AnnouncementType
                      )
                    }
                    className={inputClass}
                  >
                    {TYPE_OPTIONS.map((type) => (
                      <option
                        key={type.value}
                        value={type.value}
                      >
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-gray-700">
                    Message
                  </label>

                  <textarea
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    placeholder="Write the announcement..."
                    rows={8}
                    className={`${inputClass} resize-y`}
                  />
                </div>

                <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-gray-200 bg-gray-50 p-4">
                  <input
                    type="checkbox"
                    checked={isPublished}
                    onChange={(e) =>
                      setIsPublished(e.target.checked)
                    }
                    className="mt-1 h-4 w-4"
                  />

                  <span>
                    <span className="block text-sm font-semibold text-gray-900">
                      Publish immediately
                    </span>

                    <span className="mt-1 block text-xs text-gray-500">
                      Students will see the announcement and
                      receive a notification.
                    </span>
                  </span>
                </label>
              </div>

              <div className="flex justify-end gap-3 border-t border-gray-200 px-6 py-4">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={saving}
                  className="rounded-xl border border-gray-300 px-5 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-xl bg-gray-900 px-5 py-3 text-sm font-semibold text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saving
                    ? "Saving..."
                    : isPublished
                      ? "Publish Announcement"
                      : "Save Draft"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}

function StatCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: number;
  icon: string;
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-gray-500">
          {label}
        </span>

        <span className="text-lg">{icon}</span>
      </div>

      <p className="mt-2 text-2xl font-bold text-gray-900">
        {value}
      </p>
    </div>
  );
}