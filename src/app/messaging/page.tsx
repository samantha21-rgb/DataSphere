"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "../lib/supabase";

type Message = {
  id: number;
  sender_id: string;
  recipient_id: string;
  subject: string;
  content: string;
  is_read: boolean;
  is_archived_by_sender: boolean;
  is_archived_by_recipient: boolean;
  created_at: string;
  updated_at: string;
};

type Profile = {
  id: string;
  full_name?: string | null;
  name?: string | null;
  email?: string | null;
  role?: string | null;
};

type MessageWithProfile = Message & {
  sender?: Profile | null;
  recipient?: Profile | null;
};

type Folder = "inbox" | "sent" | "archived";

export default function MessagingPage() {
  const [userId, setUserId] = useState<string | null>(null);

  const [messages, setMessages] = useState<MessageWithProfile[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);

  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [folder, setFolder] = useState<Folder>("inbox");
  const [search, setSearch] = useState("");

  const [showCompose, setShowCompose] = useState(false);

  const [recipientId, setRecipientId] = useState("");
  const [subject, setSubject] = useState("");
  const [content, setContent] = useState("");

  useEffect(() => {
    initialize();
  }, []);

  async function initialize() {
    setLoading(true);
    setError("");

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setError("You must be logged in to use messaging.");
      setLoading(false);
      return;
    }

    setUserId(user.id);

    await Promise.all([
      loadMessages(user.id),
      loadProfiles(user.id),
    ]);

    setLoading(false);
  }

  async function loadMessages(currentUserId: string) {
    const result = await supabase
      .from("messages")
      .select("*")
      .or(
        `sender_id.eq.${currentUserId},recipient_id.eq.${currentUserId}`
      )
      .order("created_at", { ascending: false });

    if (result.error) {
      setError(result.error.message);
      return;
    }

    const loaded = (result.data || []) as Message[];

    const userIds = Array.from(
      new Set([
        ...loaded.map((message) => message.sender_id),
        ...loaded.map((message) => message.recipient_id),
      ])
    );

    let profileMap: Record<string, Profile> = {};

    if (userIds.length > 0) {
      const profileResult = await supabase
        .from("profiles")
        .select("*")
        .in("id", userIds);

      if (!profileResult.error) {
        for (const profile of profileResult.data || []) {
          profileMap[profile.id] = profile as Profile;
        }
      }
    }

    setMessages(
      loaded.map((message) => ({
        ...message,
        sender: profileMap[message.sender_id] || null,
        recipient: profileMap[message.recipient_id] || null,
      }))
    );
  }

  async function loadProfiles(currentUserId: string) {
    const result = await supabase
      .from("profiles")
      .select("*")
      .neq("id", currentUserId)
      .order("full_name", { ascending: true });

    if (result.error) {
      return;
    }

    setProfiles((result.data || []) as Profile[]);
  }

  function getProfileName(profile?: Profile | null) {
    if (!profile) return "Unknown user";

    return (
      profile.full_name ||
      profile.name ||
      profile.email ||
      "User"
    );
  }

  function formatDate(date: string) {
    const value = new Date(date);
    const now = new Date();

    const sameDay =
      value.getFullYear() === now.getFullYear() &&
      value.getMonth() === now.getMonth() &&
      value.getDate() === now.getDate();

    if (sameDay) {
      return value.toLocaleTimeString(undefined, {
        hour: "numeric",
        minute: "2-digit",
      });
    }

    return value.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year:
        value.getFullYear() === now.getFullYear()
          ? undefined
          : "numeric",
    });
  }

  const unreadCount = useMemo(() => {
    if (!userId) return 0;

    return messages.filter(
      (message) =>
        message.recipient_id === userId &&
        !message.is_read &&
        !message.is_archived_by_recipient
    ).length;
  }, [messages, userId]);

  const sentCount = useMemo(() => {
    if (!userId) return 0;

    return messages.filter(
      (message) =>
        message.sender_id === userId &&
        !message.is_archived_by_sender
    ).length;
  }, [messages, userId]);

  const archivedCount = useMemo(() => {
    if (!userId) return 0;

    return messages.filter((message) => {
      if (message.sender_id === userId) {
        return message.is_archived_by_sender;
      }

      if (message.recipient_id === userId) {
        return message.is_archived_by_recipient;
      }

      return false;
    }).length;
  }, [messages, userId]);

  const visibleMessages = useMemo(() => {
    if (!userId) return [];

    const normalizedSearch = search.trim().toLowerCase();

    return messages.filter((message) => {
      let belongsToFolder = false;

      if (folder === "inbox") {
        belongsToFolder =
          message.recipient_id === userId &&
          !message.is_archived_by_recipient;
      }

      if (folder === "sent") {
        belongsToFolder =
          message.sender_id === userId &&
          !message.is_archived_by_sender;
      }

      if (folder === "archived") {
        belongsToFolder =
          (message.sender_id === userId &&
            message.is_archived_by_sender) ||
          (message.recipient_id === userId &&
            message.is_archived_by_recipient);
      }

      if (!belongsToFolder) return false;

      if (!normalizedSearch) return true;

      const otherPerson =
        message.sender_id === userId
          ? message.recipient
          : message.sender;

      const searchableText = [
        message.subject,
        message.content,
        getProfileName(otherPerson),
        otherPerson?.email || "",
      ]
        .join(" ")
        .toLowerCase();

      return searchableText.includes(normalizedSearch);
    });
  }, [messages, userId, folder, search]);

  async function sendMessage() {
    if (!userId) return;

    setError("");
    setSuccess("");

    if (!recipientId) {
      setError("Select a recipient.");
      return;
    }

    if (recipientId === userId) {
      setError("You cannot send a message to yourself.");
      return;
    }

    if (!content.trim()) {
      setError("Write a message before sending.");
      return;
    }

    setSending(true);

    const result = await supabase
      .from("messages")
      .insert({
        sender_id: userId,
        recipient_id: recipientId,
        subject: subject.trim(),
        content: content.trim(),
      })
      .select("*")
      .single();

    if (result.error) {
      setError(result.error.message);
      setSending(false);
      return;
    }

    const selectedRecipient =
      profiles.find((profile) => profile.id === recipientId) ||
      null;

    const newMessage: MessageWithProfile = {
      ...(result.data as Message),
      sender: {
        id: userId,
        full_name: "You",
      },
      recipient: selectedRecipient,
    };

    setMessages((current) => [newMessage, ...current]);

    setRecipientId("");
    setSubject("");
    setContent("");
    setShowCompose(false);
    setFolder("sent");

    setSuccess("Message sent successfully.");
    setSending(false);
  }

  async function markAsRead(message: MessageWithProfile) {
    if (!userId) return;

    if (
      message.recipient_id !== userId ||
      message.is_read
    ) {
      return;
    }

    const result = await supabase
      .from("messages")
      .update({
        is_read: true,
        updated_at: new Date().toISOString(),
      })
      .eq("id", message.id)
      .eq("recipient_id", userId);

    if (result.error) {
      setError(result.error.message);
      return;
    }

    setMessages((current) =>
      current.map((item) =>
        item.id === message.id
          ? { ...item, is_read: true }
          : item
      )
    );
  }

  async function archiveMessage(message: MessageWithProfile) {
    if (!userId) return;

    const isSender = message.sender_id === userId;
    const isRecipient = message.recipient_id === userId;

    const updateData = isSender
      ? { is_archived_by_sender: true }
      : isRecipient
        ? { is_archived_by_recipient: true }
        : null;

    if (!updateData) return;

    const result = await supabase
      .from("messages")
      .update(updateData)
      .eq("id", message.id);

    if (result.error) {
      setError(result.error.message);
      return;
    }

    setMessages((current) =>
      current.map((item) =>
        item.id === message.id
          ? {
              ...item,
              ...updateData,
            }
          : item
      )
    );
  }

  function clearAlerts() {
    setError("");
    setSuccess("");
  }

  return (
    <main className="min-h-screen bg-slate-50 p-4 text-slate-900 md:p-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6">
          <h1 className="text-3xl font-bold tracking-tight">
            Messages
          </h1>

          <p className="mt-1 text-sm text-slate-600">
            Communicate with students, lecturers, and administrators.
          </p>
        </div>

        {error && (
          <div className="mb-5 flex items-start justify-between gap-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <span>{error}</span>

            <button
              type="button"
              onClick={clearAlerts}
              className="font-bold"
            >
              ×
            </button>
          </div>
        )}

        {success && (
          <div className="mb-5 flex items-start justify-between gap-4 rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-700">
            <span>{success}</span>

            <button
              type="button"
              onClick={clearAlerts}
              className="font-bold"
            >
              ×
            </button>
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
          <aside className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <button
              type="button"
              onClick={() => {
                setShowCompose(true);
                clearAlerts();
              }}
              className="mb-5 w-full rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              + Compose Message
            </button>

            <nav className="space-y-1">
              <button
                type="button"
                onClick={() => setFolder("inbox")}
                className={`flex w-full items-center justify-between rounded-xl px-4 py-3 text-left text-sm font-semibold ${
                  folder === "inbox"
                    ? "bg-slate-100 text-slate-950"
                    : "text-slate-600 hover:bg-slate-50"
                }`}
              >
                <span>Inbox</span>

                {unreadCount > 0 && (
                  <span className="rounded-full bg-slate-900 px-2 py-0.5 text-xs text-white">
                    {unreadCount}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setFolder("sent")}
                className={`flex w-full items-center justify-between rounded-xl px-4 py-3 text-left text-sm font-semibold ${
                  folder === "sent"
                    ? "bg-slate-100 text-slate-950"
                    : "text-slate-600 hover:bg-slate-50"
                }`}
              >
                <span>Sent</span>

                <span className="text-xs text-slate-400">
                  {sentCount}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setFolder("archived")}
                className={`flex w-full items-center justify-between rounded-xl px-4 py-3 text-left text-sm font-semibold ${
                  folder === "archived"
                    ? "bg-slate-100 text-slate-950"
                    : "text-slate-600 hover:bg-slate-50"
                }`}
              >
                <span>Archived</span>

                <span className="text-xs text-slate-400">
                  {archivedCount}
                </span>
              </button>
            </nav>
          </aside>

          <section className="min-w-0 rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 p-4 md:p-5">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <h2 className="text-xl font-bold">
                    {folder === "inbox"
                      ? "Inbox"
                      : folder === "sent"
                        ? "Sent Messages"
                        : "Archived Messages"}
                  </h2>

                  <p className="mt-1 text-xs text-slate-500">
                    {visibleMessages.length}{" "}
                    {visibleMessages.length === 1
                      ? "message"
                      : "messages"}
                  </p>
                </div>

                <div className="w-full md:max-w-sm">
                  <input
                    value={search}
                    onChange={(event) =>
                      setSearch(event.target.value)
                    }
                    placeholder="Search messages..."
                    className="w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-2.5 text-sm outline-none focus:border-slate-500 focus:bg-white focus:ring-2 focus:ring-slate-200"
                  />
                </div>
              </div>
            </div>

            {loading ? (
              <div className="p-12 text-center text-sm text-slate-500">
                Loading messages...
              </div>
            ) : visibleMessages.length === 0 ? (
              <div className="p-12 text-center">
                <div className="text-4xl">✉</div>

                <h3 className="mt-4 text-lg font-bold">
                  No messages
                </h3>

                <p className="mt-1 text-sm text-slate-500">
                  {search
                    ? "No messages match your search."
                    : folder === "inbox"
                      ? "Your inbox is empty."
                      : folder === "sent"
                        ? "You haven't sent any messages yet."
                        : "You don't have any archived messages."}
                </p>

                {folder !== "archived" && !search && (
                  <button
                    type="button"
                    onClick={() => setShowCompose(true)}
                    className="mt-5 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white"
                  >
                    Compose a Message
                  </button>
                )}
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {visibleMessages.map((message) => {
                  const isIncoming =
                    message.recipient_id === userId;

                  const otherPerson = isIncoming
                    ? message.sender
                    : message.recipient;

                  const unread =
                    isIncoming && !message.is_read;

                  return (
                    <div
                      key={message.id}
                      className={`p-4 transition hover:bg-slate-50 md:p-5 ${
                        unread ? "bg-slate-50" : "bg-white"
                      }`}
                    >
                      <div className="flex items-start gap-4">
                        <div
                          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                            unread
                              ? "bg-slate-900 text-white"
                              : "bg-slate-200 text-slate-700"
                          }`}
                        >
                          {getProfileName(otherPerson)
                            .charAt(0)
                            .toUpperCase()}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                            <div className="flex min-w-0 items-center gap-2">
                              <span
                                className={`truncate text-sm ${
                                  unread
                                    ? "font-bold text-slate-950"
                                    : "font-semibold text-slate-800"
                                }`}
                              >
                                {getProfileName(otherPerson)}
                              </span>

                              {!isIncoming && (
                                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-slate-500">
                                  Sent
                                </span>
                              )}

                              {unread && (
                                <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold uppercase text-blue-700">
                                  Unread
                                </span>
                              )}
                            </div>

                            <span className="shrink-0 text-xs text-slate-400">
                              {formatDate(message.created_at)}
                            </span>
                          </div>

                          <Link
                            href={`/messaging/${message.id}`}
                            onClick={() => markAsRead(message)}
                            className="mt-1 block"
                          >
                            <h3
                              className={`truncate text-sm ${
                                unread
                                  ? "font-bold text-slate-950"
                                  : "font-semibold text-slate-700"
                              }`}
                            >
                              {message.subject ||
                                "(No subject)"}
                            </h3>

                            <p className="mt-1 line-clamp-2 text-sm text-slate-500">
                              {message.content}
                            </p>
                          </Link>

                          <div className="mt-3 flex flex-wrap gap-2">
                            {isIncoming && !message.is_read && (
                              <button
                                type="button"
                                onClick={() =>
                                  markAsRead(message)
                                }
                                className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100"
                              >
                                Mark as read
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() =>
                                archiveMessage(message)
                              }
                              className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100"
                            >
                              Archive
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>

        {showCompose && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-200 p-5">
                <div>
                  <h2 className="text-xl font-bold">
                    Compose Message
                  </h2>

                  <p className="mt-1 text-xs text-slate-500">
                    Send a private message to another DataSphere user.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setShowCompose(false)}
                  className="rounded-lg px-3 py-2 text-xl text-slate-500 hover:bg-slate-100"
                >
                  ×
                </button>
              </div>

              <div className="space-y-4 p-5">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Recipient
                  </label>

                  <select
                    value={recipientId}
                    onChange={(event) =>
                      setRecipientId(event.target.value)
                    }
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
                  >
                    <option value="">
                      Select recipient
                    </option>

                    {profiles.map((profile) => (
                      <option
                        key={profile.id}
                        value={profile.id}
                      >
                        {getProfileName(profile)}
                        {profile.role
                          ? ` — ${profile.role}`
                          : ""}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Subject
                  </label>

                  <input
                    value={subject}
                    onChange={(event) =>
                      setSubject(event.target.value)
                    }
                    placeholder="Message subject"
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Message
                  </label>

                  <textarea
                    value={content}
                    onChange={(event) =>
                      setContent(event.target.value)
                    }
                    placeholder="Write your message..."
                    rows={7}
                    className="w-full resize-y rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 border-t border-slate-200 p-5">
                <button
                  type="button"
                  onClick={() => setShowCompose(false)}
                  className="rounded-xl border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  disabled={
                    sending ||
                    !recipientId ||
                    !content.trim()
                  }
                  onClick={sendMessage}
                  className="rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {sending ? "Sending..." : "Send Message"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}