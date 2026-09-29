"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { supabase } from "../../lib/supabase";

type Message = {
  id: number;
  sender_id: string;
  recipient_id: string;
  subject: string;
  content: string;
  is_read: boolean;
  is_archived_by_sender: boolean;
  is_archived_by_recipient: boolean;
  attachment_url: string | null;
  attachment_name: string | null;
  attachment_type: string | null;
  attachment_size: number | null;
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
  attachmentSignedUrl?: string | null;
};

const MAX_FILE_SIZE = 25 * 1024 * 1024;

const ALLOWED_FILE_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/plain",
  "text/csv",
  "image/png",
  "image/jpeg",
  "image/webp",
];

export default function MessageConversationPage() {
  const params = useParams();
  const messageId = Number(params.id);

  const [userId, setUserId] = useState<string | null>(null);
  const [message, setMessage] =
    useState<MessageWithProfile | null>(null);

  const [conversation, setConversation] = useState<
    MessageWithProfile[]
  >([]);

  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [reply, setReply] = useState("");
  const [selectedFile, setSelectedFile] =
    useState<File | null>(null);

  const [error, setError] = useState("");

  const fileInputRef = useRef<HTMLInputElement | null>(
    null
  );

  const conversationBottomRef =
    useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!messageId || Number.isNaN(messageId)) {
      setError("Invalid message.");
      setLoading(false);
      return;
    }

    loadConversation();
  }, [messageId]);

  useEffect(() => {
    if (!userId || !message) return;

    const otherUserId =
      message.sender_id === userId
        ? message.recipient_id
        : message.sender_id;

    const channel = supabase
      .channel(`message-conversation-${messageId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
        },
        async (payload) => {
          const incoming = payload.new as Message;

          const belongsToConversation =
            (incoming.sender_id === userId &&
              incoming.recipient_id === otherUserId) ||
            (incoming.sender_id === otherUserId &&
              incoming.recipient_id === userId);

          if (!belongsToConversation) return;

          const decorated =
            await decorateMessages([incoming]);

          if (decorated.length === 0) return;

          setConversation((current) => {
            if (
              current.some(
                (item) => item.id === incoming.id
              )
            ) {
              return current;
            }

            return [...current, decorated[0]];
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, message?.id, message?.sender_id, message?.recipient_id]);

  useEffect(() => {
    conversationBottomRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [conversation.length]);

  async function decorateMessages(
    messages: Message[]
  ): Promise<MessageWithProfile[]> {
    if (messages.length === 0) return [];

    const profileIds = Array.from(
      new Set([
        ...messages.map((item) => item.sender_id),
        ...messages.map((item) => item.recipient_id),
      ])
    );

    const profilesResult = await supabase
      .from("profiles")
      .select("*")
      .in("id", profileIds);

    const profileMap: Record<string, Profile> = {};

    if (!profilesResult.error) {
      for (const profile of profilesResult.data || []) {
        profileMap[profile.id] = profile as Profile;
      }
    }

    return messages.map((item) => ({
      ...item,
      sender: profileMap[item.sender_id] || null,
      recipient: profileMap[item.recipient_id] || null,
    }));
  }

  async function loadConversation() {
    setLoading(true);
    setError("");

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setError("You must be logged in.");
      setLoading(false);
      return;
    }

    setUserId(user.id);

    const messageResult = await supabase
      .from("messages")
      .select("*")
      .eq("id", messageId)
      .single();

    if (messageResult.error || !messageResult.data) {
      setError(
        messageResult.error?.message ||
          "Message could not be found."
      );
      setLoading(false);
      return;
    }

    const selectedMessage =
      messageResult.data as Message;

    if (
      selectedMessage.sender_id !== user.id &&
      selectedMessage.recipient_id !== user.id
    ) {
      setError("You do not have access to this message.");
      setLoading(false);
      return;
    }

    const otherUserId =
      selectedMessage.sender_id === user.id
        ? selectedMessage.recipient_id
        : selectedMessage.sender_id;

    const conversationResult = await supabase
      .from("messages")
      .select("*")
      .or(
        `and(sender_id.eq.${user.id},recipient_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},recipient_id.eq.${user.id})`
      )
      .order("created_at", { ascending: true });

    if (conversationResult.error) {
      setError(conversationResult.error.message);
      setLoading(false);
      return;
    }

    const loadedMessages =
      (conversationResult.data || []) as Message[];

    const decorated =
      await decorateMessages(loadedMessages);

    setConversation(decorated);

    const selectedDecorated =
      decorated.find(
        (item) => item.id === selectedMessage.id
      ) || null;

    setMessage(selectedDecorated);

    const unreadIds = loadedMessages
      .filter(
        (item) =>
          item.recipient_id === user.id &&
          !item.is_read
      )
      .map((item) => item.id);

    if (unreadIds.length > 0) {
      await supabase
        .from("messages")
        .update({
          is_read: true,
          updated_at: new Date().toISOString(),
        })
        .in("id", unreadIds)
        .eq("recipient_id", user.id);

      setConversation((current) =>
        current.map((item) =>
          unreadIds.includes(item.id)
            ? { ...item, is_read: true }
            : item
        )
      );
    }

    setLoading(false);
  }

  function profileName(profile?: Profile | null) {
    if (!profile) return "User";

    return (
      profile.full_name ||
      profile.name ||
      profile.email ||
      "User"
    );
  }

  function initials(profile?: Profile | null) {
    const name = profileName(profile).trim();

    if (!name) return "U";

    const parts = name.split(/\s+/);

    if (parts.length === 1) {
      return parts[0].charAt(0).toUpperCase();
    }

    return (
      parts[0].charAt(0) +
      parts[parts.length - 1].charAt(0)
    ).toUpperCase();
  }

  function formatDate(date: string) {
    return new Date(date).toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  }

  function formatFileSize(bytes: number | null) {
    if (!bytes) return "";

    if (bytes < 1024) {
      return `${bytes} B`;
    }

    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    }

    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  const otherPerson = useMemo(() => {
    if (!message || !userId) return null;

    return message.sender_id === userId
      ? message.recipient
      : message.sender;
  }, [message, userId]);

  const conversationSubject = useMemo(() => {
    const firstWithSubject = conversation.find(
      (item) => item.subject.trim().length > 0
    );

    return (
      firstWithSubject?.subject ||
      message?.subject ||
      "(No subject)"
    );
  }, [conversation, message]);

  function validateFile(file: File) {
    if (file.size > MAX_FILE_SIZE) {
      setError(
        "Attachment is too large. Maximum size is 25 MB."
      );
      return false;
    }

    if (
      file.type &&
      !ALLOWED_FILE_TYPES.includes(file.type)
    ) {
      setError(
        "This file type is not supported. Use PDF, Word, PowerPoint, Excel, TXT, CSV, PNG, JPG, JPEG, or WEBP."
      );
      return false;
    }

    return true;
  }

  function selectFile(file: File | null) {
    setError("");

    if (!file) {
      setSelectedFile(null);
      return;
    }

    if (!validateFile(file)) {
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      setSelectedFile(null);
      return;
    }

    setSelectedFile(file);
  }

  async function uploadAttachment(
    file: File,
    recipientUserId: string
  ) {
    if (!userId) {
      throw new Error("You must be logged in.");
    }

    setUploading(true);

    const safeFileName = file.name
      .replace(/[^a-zA-Z0-9._-]/g, "_")
      .replace(/_+/g, "_");

    const path = `${userId}/${recipientUserId}/${Date.now()}-${safeFileName}`;

    const uploadResult = await supabase.storage
      .from("message_attachments")
      .upload(path, file, {
        cacheControl: "3600",
        upsert: false,
      });

    setUploading(false);

    if (uploadResult.error) {
      throw new Error(uploadResult.error.message);
    }

    return path;
  }

  async function getSignedAttachmentUrl(
    path: string
  ) {
    const result = await supabase.storage
      .from("message_attachments")
      .createSignedUrl(path, 60 * 60);

    if (result.error) {
      return null;
    }

    return result.data.signedUrl;
  }

  async function sendReply() {
    if (!userId || !message || !otherPerson) {
      return;
    }

    const cleanedReply = reply.trim();

    if (!cleanedReply && !selectedFile) {
      setError("Write a reply or attach a file.");
      return;
    }

    setSending(true);
    setError("");

    try {
      let attachmentPath: string | null = null;

      if (selectedFile) {
        attachmentPath = await uploadAttachment(
          selectedFile,
          otherPerson.id
        );
      }

      const result = await supabase
        .from("messages")
        .insert({
          sender_id: userId,
          recipient_id: otherPerson.id,
          subject: conversationSubject,
          content: cleanedReply,
          attachment_url: attachmentPath,
          attachment_name: selectedFile?.name || null,
          attachment_type: selectedFile?.type || null,
          attachment_size: selectedFile?.size || null,
        })
        .select("*")
        .single();

      if (result.error) {
        setError(result.error.message);
        setSending(false);
        return;
      }

      const newMessage =
        await decorateMessages([
          result.data as Message,
        ]);

      if (newMessage.length > 0) {
        setConversation((current) => [
          ...current,
          newMessage[0],
        ]);
      }

      setReply("");
      setSelectedFile(null);

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to send message."
      );
    } finally {
      setSending(false);
      setUploading(false);
    }
  }

  async function openAttachment(
    messageItem: MessageWithProfile
  ) {
    if (!messageItem.attachment_url) return;

    const signedUrl =
      await getSignedAttachmentUrl(
        messageItem.attachment_url
      );

    if (!signedUrl) {
      setError("Unable to open this attachment.");
      return;
    }

    window.open(
      signedUrl,
      "_blank",
      "noopener,noreferrer"
    );
  }

  async function archiveConversation() {
    if (!userId || !conversation.length) return;

    setError("");

    for (const item of conversation) {
      const isSender = item.sender_id === userId;
      const isRecipient =
        item.recipient_id === userId;

      const updateData = isSender
        ? { is_archived_by_sender: true }
        : isRecipient
          ? { is_archived_by_recipient: true }
          : null;

      if (!updateData) continue;

      const result = await supabase
        .from("messages")
        .update(updateData)
        .eq("id", item.id);

      if (result.error) {
        setError(result.error.message);
        return;
      }
    }

    window.location.href = "/messaging";
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50 p-4 text-slate-900 md:p-6">
        <div className="mx-auto max-w-4xl">
          <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center text-sm text-slate-500 shadow-sm">
            Loading conversation...
          </div>
        </div>
      </main>
    );
  }

  if (!message) {
    return (
      <main className="min-h-screen bg-slate-50 p-4 text-slate-900 md:p-6">
        <div className="mx-auto max-w-4xl">
          <Link
            href="/messaging"
            className="mb-5 inline-flex text-sm font-semibold text-slate-700 hover:text-slate-950"
          >
            ← Back to Messages
          </Link>

          <div className="rounded-2xl border border-red-200 bg-red-50 p-8 text-sm text-red-700">
            {error || "Conversation not found."}
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 p-4 text-slate-900 md:p-6">
      <div className="mx-auto flex max-w-4xl flex-col">
        <div className="mb-5 flex items-center justify-between gap-4">
          <Link
            href="/messaging"
            className="inline-flex items-center text-sm font-semibold text-slate-700 hover:text-slate-950"
          >
            ← Back to Messages
          </Link>

          <button
            type="button"
            onClick={archiveConversation}
            className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Archive
          </button>
        </div>

        {error && (
          <div className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <header className="border-b border-slate-200 p-5">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-slate-900 text-sm font-bold text-white">
                {initials(otherPerson)}
              </div>

              <div className="min-w-0">
                <h1 className="truncate text-xl font-bold">
                  {profileName(otherPerson)}
                </h1>

                <p className="mt-0.5 text-xs text-slate-500">
                  {otherPerson?.role ||
                    otherPerson?.email ||
                    "DataSphere user"}
                </p>
              </div>
            </div>

            <div className="mt-5 rounded-xl bg-slate-50 p-4">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Subject
              </div>

              <div className="mt-1 text-sm font-bold text-slate-900">
                {conversationSubject}
              </div>
            </div>

            <div className="mt-3 flex items-center gap-2 text-xs text-green-600">
              <span className="h-2 w-2 rounded-full bg-green-500" />
              Live conversation
            </div>
          </header>

          <div className="max-h-[60vh] space-y-5 overflow-y-auto p-4 md:p-6">
            {conversation.map((item) => {
              const isMine =
                item.sender_id === userId;

              return (
                <div
                  key={item.id}
                  className={`flex ${
                    isMine
                      ? "justify-end"
                      : "justify-start"
                  }`}
                >
                  <div className="max-w-[88%] md:max-w-[75%]">
                    <div
                      className={`mb-1 flex items-center gap-2 text-xs text-slate-400 ${
                        isMine
                          ? "justify-end"
                          : "justify-start"
                      }`}
                    >
                      <span>
                        {isMine
                          ? "You"
                          : profileName(item.sender)}
                      </span>

                      <span>•</span>

                      <span>
                        {formatDate(item.created_at)}
                      </span>
                    </div>

                    <div
                      className={`rounded-2xl px-4 py-3 ${
                        isMine
                          ? "rounded-br-md bg-slate-900 text-white"
                          : "rounded-bl-md bg-slate-100 text-slate-800"
                      }`}
                    >
                      {item.content && (
                        <p className="whitespace-pre-wrap text-sm leading-7">
                          {item.content}
                        </p>
                      )}

                      {item.attachment_url && (
                        <button
                          type="button"
                          onClick={() =>
                            openAttachment(item)
                          }
                          className={`mt-3 flex w-full items-center gap-3 rounded-xl border p-3 text-left transition ${
                            isMine
                              ? "border-slate-700 bg-slate-800 hover:bg-slate-700"
                              : "border-slate-200 bg-white hover:bg-slate-50"
                          }`}
                        >
                          <div
                            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
                              isMine
                                ? "bg-slate-700"
                                : "bg-slate-100"
                            }`}
                          >
                            📎
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="truncate text-sm font-semibold">
                              {item.attachment_name ||
                                "Attachment"}
                            </div>

                            <div
                              className={`text-xs ${
                                isMine
                                  ? "text-slate-400"
                                  : "text-slate-500"
                              }`}
                            >
                              {formatFileSize(
                                item.attachment_size
                              )}
                              {" · "}
                              Open attachment
                            </div>
                          </div>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            <div ref={conversationBottomRef} />
          </div>

          <div className="border-t border-slate-200 bg-slate-50 p-4 md:p-5">
            {selectedFile && (
              <div className="mb-3 flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100">
                  📎
                </div>

                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold">
                    {selectedFile.name}
                  </div>

                  <div className="text-xs text-slate-500">
                    {formatFileSize(selectedFile.size)}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setSelectedFile(null);

                    if (fileInputRef.current) {
                      fileInputRef.current.value = "";
                    }
                  }}
                  className="rounded-lg px-2 py-1 text-sm text-slate-500 hover:bg-slate-100"
                >
                  ×
                </button>
              </div>
            )}

            <div className="rounded-2xl border border-slate-300 bg-white p-3">
              <textarea
                value={reply}
                onChange={(event) =>
                  setReply(event.target.value)
                }
                onKeyDown={(event) => {
                  if (
                    event.key === "Enter" &&
                    !event.shiftKey
                  ) {
                    event.preventDefault();

                    if (
                      !sending &&
                      (reply.trim() || selectedFile)
                    ) {
                      sendReply();
                    }
                  }
                }}
                placeholder="Write a reply..."
                rows={4}
                className="w-full resize-none border-0 bg-transparent p-1 text-sm outline-none placeholder:text-slate-400"
              />

              <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.csv,.png,.jpg,.jpeg,.webp"
                    onChange={(event) =>
                      selectFile(
                        event.target.files?.[0] || null
                      )
                    }
                  />

                  <button
                    type="button"
                    disabled={sending}
                    onClick={() =>
                      fileInputRef.current?.click()
                    }
                    className="rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                  >
                    📎 Attach
                  </button>

                  <span className="hidden text-xs text-slate-400 md:inline">
                    Max 25 MB
                  </span>
                </div>

                <div className="flex items-center justify-between gap-3">
                  <span className="hidden text-xs text-slate-400 md:inline">
                    Enter to send · Shift + Enter for new line
                  </span>

                  <button
                    type="button"
                    disabled={
                      sending ||
                      uploading ||
                      (!reply.trim() && !selectedFile)
                    }
                    onClick={sendReply}
                    className="rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {uploading
                      ? "Uploading..."
                      : sending
                        ? "Sending..."
                        : "Send"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}