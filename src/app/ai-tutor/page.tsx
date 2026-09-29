"use client";

import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { supabase } from "../lib/supabase";

type Message = {
  id?: number;
  role: "user" | "assistant";
  content: string;
};

type Conversation = {
  id: number;
  title: string;
  unit_id: number | null;
  created_at: string;
  updated_at: string;
};

type Unit = {
  id: number;
  name: string;
};

type AIFile = {
  id: number;
  file_name: string;
  mime_type: string | null;
  file_size: number | null;
  gemini_file_uri: string | null;
};

const STUDY_MODES = [
  {
    value: "tutor",
    label: "Tutor",
    description: "Learn interactively",
  },
  {
    value: "explain",
    label: "Explain",
    description: "Get a clear explanation",
  },
  {
    value: "solve",
    label: "Solve",
    description: "Solve problems step by step",
  },
  {
    value: "socratic",
    label: "Socratic",
    description: "Learn through guided questions",
  },
  {
    value: "quiz",
    label: "Quiz",
    description: "Test your knowledge",
  },
  {
    value: "revision",
    label: "Revision",
    description: "Create revision material",
  },
  {
    value: "exam",
    label: "Exam Prep",
    description: "Prepare for exams",
  },
  {
    value: "study-plan",
    label: "Study Plan",
    description: "Build a study plan",
  },
  {
    value: "flashcards",
    label: "Flashcards",
    description: "Create flashcards",
  },
  {
    value: "code",
    label: "Code Help",
    description: "Understand and debug code",
  },
  {
    value: "summarize",
    label: "Summarize",
    description: "Summarize learning material",
  },
];

export default function AITutorPage() {
  const [user, setUser] = useState<any>(null);

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] =
    useState<Conversation | null>(null);

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");

  const [units, setUnits] = useState<Unit[]>([]);
  const [selectedUnit, setSelectedUnit] = useState<number | null>(null);

  const [mode, setMode] = useState("tutor");
  const [modeOpen, setModeOpen] = useState(false);

  const [files, setFiles] = useState<AIFile[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<AIFile[]>([]);

  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [error, setError] = useState("");

  const [sidebarOpen, setSidebarOpen] = useState(true);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  /*
   * ---------------------------------------------------------
   * INITIALIZATION
   * ---------------------------------------------------------
   */

  useEffect(() => {
    initialize();
  }, []);

  async function initialize() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setError("You are not logged in. Please log in again.");
      return;
    }

    setUser(user);

    await Promise.all([
      loadConversations(user.id),
      loadUnits(),
    ]);
  }

  /*
   * ---------------------------------------------------------
   * LOAD DATA
   * ---------------------------------------------------------
   */

  async function loadConversations(userId: string) {
    const { data, error } = await supabase
      .from("ai_conversations")
      .select("*")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false });

    if (error) {
      console.error("Conversation loading error:", error);
      return;
    }

    setConversations(data || []);
  }

  async function loadUnits() {
    const { data, error } = await supabase
      .from("units")
      .select("id, name")
      .order("name", { ascending: true });

    if (error) {
      console.error("Unit loading error:", error);
      setError("Unable to load your units.");
      return;
    }

    setUnits(data || []);
  }

  async function loadConversationData(conversationId: number) {
    const [messagesResult, filesResult] = await Promise.all([
      supabase
        .from("ai_messages")
        .select("id, role, content")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true }),

      supabase
        .from("ai_files")
        .select(
          "id, file_name, mime_type, file_size, gemini_file_uri"
        )
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true }),
    ]);

    if (messagesResult.error) {
      console.error(
        "Message loading error:",
        messagesResult.error
      );
    }

    if (filesResult.error) {
      console.error(
        "File loading error:",
        filesResult.error
      );
    }

    setMessages(messagesResult.data || []);
    setFiles(filesResult.data || []);
    setSelectedFiles(filesResult.data || []);
  }

  /*
   * ---------------------------------------------------------
   * CONVERSATIONS
   * ---------------------------------------------------------
   */

  async function createConversation(
    unitId: number | null = selectedUnit
  ): Promise<Conversation | null> {
    if (!user) {
      setError("Your session is not ready. Please refresh the page.");
      return null;
    }

    const { data, error } = await supabase
      .from("ai_conversations")
      .insert({
        user_id: user.id,
        title: "New Conversation",
        unit_id: unitId,
      })
      .select("*")
      .single();

    if (error) {
      console.error("Create conversation error:", error);
      setError(error.message);
      return null;
    }

    setConversations((previous) => [data, ...previous]);
    setSelectedConversation(data);

    return data;
  }

  async function openConversation(
    conversation: Conversation
  ) {
    if (loading) return;

    setError("");
    setSelectedConversation(conversation);
    setSelectedUnit(conversation.unit_id);
    setMode("tutor");

    await loadConversationData(conversation.id);
  }

  function newConversation() {
    if (loading) return;

    setSelectedConversation(null);
    setMessages([]);
    setFiles([]);
    setSelectedFiles([]);
    setSelectedUnit(null);
    setInput("");
    setError("");
    setMode("tutor");

    setTimeout(() => {
      textareaRef.current?.focus();
    }, 100);
  }

  async function deleteConversation(id: number) {
    if (loading) return;

    const confirmed = window.confirm(
      "Delete this conversation permanently?"
    );

    if (!confirmed) return;

    const { error } = await supabase
      .from("ai_conversations")
      .delete()
      .eq("id", id);

    if (error) {
      setError(error.message);
      return;
    }

    setConversations((previous) =>
      previous.filter((item) => item.id !== id)
    );

    if (selectedConversation?.id === id) {
      newConversation();
    }
  }

  async function renameConversation(
    conversation: Conversation
  ) {
    const title = window.prompt(
      "Enter a new title:",
      conversation.title
    );

    if (!title?.trim()) return;

    const cleanTitle = title.trim();

    const { error } = await supabase
      .from("ai_conversations")
      .update({
        title: cleanTitle,
        updated_at: new Date().toISOString(),
      })
      .eq("id", conversation.id);

    if (error) {
      setError(error.message);
      return;
    }

    const updated = {
      ...conversation,
      title: cleanTitle,
      updated_at: new Date().toISOString(),
    };

    setConversations((previous) =>
      previous.map((item) =>
        item.id === conversation.id ? updated : item
      )
    );

    if (selectedConversation?.id === conversation.id) {
      setSelectedConversation(updated);
    }
  }

  async function changeUnit(unitId: number | null) {
    setSelectedUnit(unitId);

    if (!selectedConversation) {
      return;
    }

    const { error } = await supabase
      .from("ai_conversations")
      .update({
        unit_id: unitId,
        updated_at: new Date().toISOString(),
      })
      .eq("id", selectedConversation.id);

    if (error) {
      setError(error.message);
      return;
    }

    const updated = {
      ...selectedConversation,
      unit_id: unitId,
    };

    setSelectedConversation(updated);

    setConversations((previous) =>
      previous.map((item) =>
        item.id === updated.id ? updated : item
      )
    );
  }

  /*
   * ---------------------------------------------------------
   * SEND MESSAGE
   * ---------------------------------------------------------
   */

  async function sendMessage() {
    const cleanMessage = input.trim();

    if (!cleanMessage) {
      return;
    }

    if (loading) {
      return;
    }

    setError("");

    /*
     * Make sure the user exists.
     */
    let currentUser = user;

    if (!currentUser) {
      const {
        data: { user: authenticatedUser },
      } = await supabase.auth.getUser();

      if (!authenticatedUser) {
        setError("You are not logged in. Please log in again.");
        return;
      }

      currentUser = authenticatedUser;
      setUser(authenticatedUser);
    }

    /*
     * Create conversation automatically if needed.
     */
    let conversation = selectedConversation;

    if (!conversation) {
      conversation = await createConversation(selectedUnit);

      if (!conversation) {
        return;
      }
    }

    /*
     * Save the current message locally immediately.
     */
    const userMessage: Message = {
      role: "user",
      content: cleanMessage,
    };

    setMessages((previous) => [
      ...previous,
      userMessage,
    ]);

    setInput("");
    setLoading(true);

    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }

    /*
     * Prepare history BEFORE starting the request.
     */
    const history = [
      ...messages,
      userMessage,
    ]
      .slice(-20)
      .map((message) => ({
        role: message.role,
        content: message.content,
      }));

    /*
     * Get selected unit name.
     */
    const unitName =
      units.find((unit) => unit.id === selectedUnit)?.name ||
      undefined;

    /*
     * Prepare files.
     */
    const attachedFiles = selectedFiles
      .filter(
        (file) => Boolean(file.gemini_file_uri)
      )
      .map((file) => ({
        geminiFileUri: file.gemini_file_uri,
        mimeType: file.mime_type,
        fileName: file.file_name,
      }));

    /*
     * Create abort controller.
     */
    const controller = new AbortController();

    abortControllerRef.current = controller;

    /*
     * Add empty assistant message.
     */
    setMessages((previous) => [
      ...previous,
      {
        role: "assistant",
        content: "",
      },
    ]);

    try {
      console.log("Sending message to DataSphere AI...");

      const response = await fetch(
        "/api/ai-tutor",
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
          },

          signal: controller.signal,

          body: JSON.stringify({
            message: cleanMessage,
            mode,
            unitName,
            history,
            files: attachedFiles,
          }),
        }
      );

      console.log(
        "AI response status:",
        response.status
      );

      /*
       * Handle API errors.
       */
      if (!response.ok) {
        let errorMessage =
          "DataSphere AI could not generate a response.";

        try {
          const data = await response.json();

          if (data?.error) {
            errorMessage = data.error;
          }
        } catch {
          // Response was not JSON.
        }

        throw new Error(errorMessage);
      }

      /*
       * Make sure streaming exists.
       */
      if (!response.body) {
        throw new Error(
          "The AI server returned no response stream."
        );
      }

      const reader =
        response.body.getReader();

      const decoder =
        new TextDecoder();

      let assistantText = "";

      /*
       * Read the AI response stream.
       */
      while (true) {
        const { value, done } =
          await reader.read();

        if (done) {
          break;
        }

        const chunk = decoder.decode(
          value,
          { stream: true }
        );

        assistantText += chunk;

        /*
         * Update assistant message live.
         */
        setMessages((previous) => {
          const updated = [...previous];

          const lastIndex =
            updated.length - 1;

          if (
            lastIndex >= 0 &&
            updated[lastIndex].role ===
              "assistant"
          ) {
            updated[lastIndex] = {
              ...updated[lastIndex],
              content: assistantText,
            };
          }

          return updated;
        });
      }

      /*
       * Flush decoder.
       */
      assistantText += decoder.decode();

      /*
       * Make sure final assistant text appears.
       */
      if (assistantText) {
        setMessages((previous) => {
          const updated = [...previous];

          const lastIndex =
            updated.length - 1;

          if (
            lastIndex >= 0 &&
            updated[lastIndex].role ===
              "assistant"
          ) {
            updated[lastIndex] = {
              ...updated[lastIndex],
              content: assistantText,
            };
          }

          return updated;
        });
      }

      /*
       * Save user + assistant messages.
       */
      const { error: saveError } =
        await supabase
          .from("ai_messages")
          .insert([
            {
              conversation_id:
                conversation.id,
              user_id: currentUser.id,
              role: "user",
              content: cleanMessage,
            },
            {
              conversation_id:
                conversation.id,
              user_id: currentUser.id,
              role: "assistant",
              content: assistantText,
            },
          ]);

      if (saveError) {
        console.error(
          "Message save error:",
          saveError
        );
      }

      /*
       * Automatically title a new conversation.
       */
      let newTitle = conversation.title;

      if (
        conversation.title ===
        "New Conversation"
      ) {
        newTitle =
          cleanMessage.length > 50
            ? cleanMessage.slice(0, 50) + "..."
            : cleanMessage;
      }

      const now =
        new Date().toISOString();

      await supabase
        .from("ai_conversations")
        .update({
          title: newTitle,
          updated_at: now,
        })
        .eq("id", conversation.id);

      /*
       * Update conversation list.
       */
      setConversations((previous) =>
        previous
          .map((item) =>
            item.id === conversation!.id
              ? {
                  ...item,
                  title: newTitle,
                  updated_at: now,
                }
              : item
          )
          .sort(
            (a, b) =>
              new Date(
                b.updated_at
              ).getTime() -
              new Date(
                a.updated_at
              ).getTime()
          )
      );

      setSelectedConversation((previous) =>
        previous
          ? {
              ...previous,
              title: newTitle,
              updated_at: now,
            }
          : previous
      );
    } catch (err: any) {
      console.error(
        "AI Tutor send error:",
        err
      );

      if (
        err?.name === "AbortError"
      ) {
        return;
      }

      setError(
        err?.message ||
          "Something went wrong while contacting DataSphere AI."
      );

      /*
       * Remove empty assistant message
       * if request failed.
       */
      setMessages((previous) => {
        const updated = [...previous];

        if (
          updated.length > 0 &&
          updated[updated.length - 1]
            .role === "assistant" &&
          !updated[updated.length - 1]
            .content
        ) {
          updated.pop();
        }

        return updated;
      });
    } finally {
      setLoading(false);
      abortControllerRef.current = null;
    }
  }

  /*
   * ---------------------------------------------------------
   * STOP GENERATION
   * ---------------------------------------------------------
   */

  function stopGeneration() {
    abortControllerRef.current?.abort();

    abortControllerRef.current = null;

    setLoading(false);
  }

  /*
   * ---------------------------------------------------------
   * TEXTAREA
   * ---------------------------------------------------------
   */

  function handleInputChange(
    event: React.ChangeEvent<HTMLTextAreaElement>
  ) {
    setInput(event.target.value);

    event.target.style.height = "auto";

    event.target.style.height =
      `${Math.min(
        event.target.scrollHeight,
        180
      )}px`;
  }

  function handleKeyDown(
    event: React.KeyboardEvent<HTMLTextAreaElement>
  ) {
    if (
      event.key === "Enter" &&
      !event.shiftKey
    ) {
      event.preventDefault();

      if (!loading) {
        sendMessage();
      }
    }
  }

  /*
   * ---------------------------------------------------------
   * FILE UPLOAD
   * ---------------------------------------------------------
   */

  async function uploadFile(file: File) {
    setError("");

    if (!user) {
      setError(
        "Please wait for your account to load."
      );
      return;
    }

    setUploading(true);

    try {
      /*
       * Create conversation if this is a new chat.
       */
      let conversation =
        selectedConversation;

      if (!conversation) {
        conversation =
          await createConversation(
            selectedUnit
          );
      }

      if (!conversation) {
        throw new Error(
          "Unable to create conversation."
        );
      }

      /*
       * Get authentication token.
       */
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        throw new Error(
          "Your session has expired. Please log in again."
        );
      }

      /*
       * Build upload request.
       */
      const formData = new FormData();

      formData.append(
        "file",
        file
      );

      formData.append(
        "conversationId",
        String(conversation.id)
      );

      if (selectedUnit) {
        formData.append(
          "unitId",
          String(selectedUnit)
        );
      }

      const response = await fetch(
        "/api/ai-tutor/upload",
        {
          method: "POST",

          headers: {
            Authorization:
              `Bearer ${session.access_token}`,
          },

          body: formData,
        }
      );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error ||
            "File upload failed."
        );
      }

      /*
       * Add uploaded file.
       */
      setFiles((previous) => [
        ...previous,
        data.file,
      ]);

      setSelectedFiles(
        (previous) => [
          ...previous,
          data.file,
        ]
      );
    } catch (err: any) {
      console.error(
        "File upload error:",
        err
      );

      setError(
        err?.message ||
          "Unable to upload file."
      );
    } finally {
      setUploading(false);

      if (fileInputRef.current) {
        fileInputRef.current.value =
          "";
      }
    }
  }

  /*
   * ---------------------------------------------------------
   * COPY
   * ---------------------------------------------------------
   */

  async function copyMessage(
    content: string
  ) {
    try {
      await navigator.clipboard.writeText(
        content
      );
    } catch {
      setError(
        "Unable to copy the message."
      );
    }
  }

  /*
   * ---------------------------------------------------------
   * SUGGESTIONS
   * ---------------------------------------------------------
   */

  function useSuggestion(
    suggestion: string
  ) {
    setInput(suggestion);

    setTimeout(() => {
      textareaRef.current?.focus();
    }, 50);
  }

  const currentMode =
    STUDY_MODES.find(
      (item) => item.value === mode
    ) || STUDY_MODES[0];

  /*
   * ---------------------------------------------------------
   * UI
   * ---------------------------------------------------------
   */

  return (
    <div className="flex h-[calc(100vh-120px)] min-h-[650px] overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">

      {/* =====================================================
          SIDEBAR
      ===================================================== */}

      <aside
        className={`flex-shrink-0 overflow-hidden border-r border-gray-200 bg-gray-50 transition-all duration-200 ${
          sidebarOpen
            ? "w-[280px]"
            : "w-0"
        }`}
      >
        <div className="flex h-full w-[280px] flex-col">

          {/* Sidebar header */}
          <div className="flex items-center justify-between border-b border-gray-200 p-4">
            <div>
              <h2 className="font-semibold text-black">
                AI Tutor
              </h2>

              <p className="text-xs text-gray-500">
                Your conversations
              </p>
            </div>

            <button
              type="button"
              onClick={newConversation}
              className="rounded-lg bg-black px-3 py-2 text-sm font-medium text-white hover:bg-gray-800"
            >
              + New
            </button>
          </div>

          {/* Conversations */}
          <div className="flex-1 overflow-y-auto p-3">

            {conversations.length === 0 ? (
              <div className="px-3 py-10 text-center text-sm text-gray-500">
                No conversations yet.
                <br />
                Start a new conversation.
              </div>
            ) : (
              <div className="space-y-1">

                {conversations.map(
                  (conversation) => (
                    <div
                      key={conversation.id}
                      className={`group flex items-center rounded-xl ${
                        selectedConversation?.id ===
                        conversation.id
                          ? "bg-gray-200"
                          : "hover:bg-gray-100"
                      }`}
                    >

                      <button
                        type="button"
                        onClick={() =>
                          openConversation(
                            conversation
                          )
                        }
                        className="min-w-0 flex-1 px-3 py-3 text-left"
                      >
                        <div className="truncate text-sm font-medium text-black">
                          {conversation.title}
                        </div>

                        <div className="mt-1 text-xs text-gray-500">
                          {new Date(
                            conversation.updated_at
                          ).toLocaleDateString()}
                        </div>
                      </button>

                      <div className="mr-1 hidden items-center gap-1 group-hover:flex">

                        <button
                          type="button"
                          onClick={() =>
                            renameConversation(
                              conversation
                            )
                          }
                          className="rounded-md px-2 py-1 text-sm text-gray-600 hover:bg-white hover:text-black"
                          title="Rename"
                        >
                          ✎
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            deleteConversation(
                              conversation.id
                            )
                          }
                          className="rounded-md px-2 py-1 text-sm text-gray-600 hover:bg-white hover:text-red-600"
                          title="Delete"
                        >
                          ×
                        </button>

                      </div>
                    </div>
                  )
                )}

              </div>
            )}

          </div>
        </div>
      </aside>

      {/* =====================================================
          MAIN CHAT
      ===================================================== */}

      <main className="flex min-w-0 flex-1 flex-col">

        {/* Header */}
        <header className="flex items-center justify-between border-b border-gray-200 px-5 py-4">

          <div className="flex min-w-0 items-center gap-3">

            <button
              type="button"
              onClick={() =>
                setSidebarOpen(
                  (value) => !value
                )
              }
              className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-black hover:bg-gray-50"
            >
              ☰
            </button>

            <div className="min-w-0">
              <h1 className="truncate text-lg font-semibold text-black">
                DataSphere AI Tutor
              </h1>

              <p className="truncate text-xs text-gray-500">
                Ask questions, study and solve problems.
              </p>
            </div>

          </div>

          {/* Mode selector */}
          <div className="relative">

            <button
              type="button"
              onClick={() =>
                setModeOpen(
                  (value) => !value
                )
              }
              className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-black shadow-sm hover:bg-gray-50"
            >
              <span>
                {currentMode.label}
              </span>

              <span className="text-gray-500">
                ⌄
              </span>
            </button>

            {modeOpen && (
              <div className="absolute right-0 top-full z-50 mt-2 w-[270px] overflow-hidden rounded-xl border border-gray-200 bg-white p-1 shadow-xl">

                {STUDY_MODES.map(
                  (studyMode) => (
                    <button
                      key={
                        studyMode.value
                      }
                      type="button"
                      onClick={() => {
                        setMode(
                          studyMode.value
                        );
                        setModeOpen(false);
                      }}
                      className={`w-full rounded-lg px-3 py-2.5 text-left hover:bg-gray-50 ${
                        mode ===
                        studyMode.value
                          ? "bg-gray-100"
                          : ""
                      }`}
                    >
                      <div className="flex items-center justify-between">

                        <span className="text-sm font-medium text-black">
                          {
                            studyMode.label
                          }
                        </span>

                        {mode ===
                          studyMode.value && (
                          <span>
                            ✓
                          </span>
                        )}

                      </div>

                      <div className="mt-1 text-xs text-gray-500">
                        {
                          studyMode.description
                        }
                      </div>
                    </button>
                  )
                )}

              </div>
            )}

          </div>

        </header>

        {/* =====================================================
            UNIT CONTEXT
        ===================================================== */}

        <div className="border-b border-gray-100 px-5 py-3">

          <div className="flex items-center gap-3">

            <label className="text-xs font-medium text-black">
              Unit
            </label>

            <select
              value={selectedUnit ?? ""}
              onChange={(event) =>
                changeUnit(
                  event.target.value
                    ? Number(
                        event.target.value
                      )
                    : null
                )
              }
              className="max-w-[350px] rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-black outline-none focus:border-black"
            >
              <option value="">
                No unit selected
              </option>

              {units.map((unit) => (
                <option
                  key={unit.id}
                  value={unit.id}
                >
                  {unit.name}
                </option>
              ))}
            </select>

            <span className="text-xs text-gray-500">
              Optional
            </span>

          </div>

        </div>

        {/* =====================================================
            ERROR
        ===================================================== */}

        {error && (
          <div className="mx-5 mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* =====================================================
            MESSAGES
        ===================================================== */}

        <div className="flex-1 overflow-y-auto px-5 py-6">

          {messages.length === 0 ? (

            <div className="flex h-full items-center justify-center">

              <div className="max-w-2xl text-center">

                <div className="mb-5 text-5xl">
                  🎓
                </div>

                <h2 className="text-2xl font-semibold text-black">
                  What would you like to learn?
                </h2>

                <p className="mt-3 leading-7 text-gray-600">
                  Ask DataSphere AI Tutor anything.
                  You can optionally select a unit
                  or attach learning material.
                </p>

                <div className="mt-7 grid grid-cols-1 gap-3 sm:grid-cols-2">

                  {[
                    "Explain machine learning simply",
                    "Quiz me on database systems",
                    "Help me solve this problem",
                    "Create revision notes",
                  ].map(
                    (suggestion) => (
                      <button
                        key={suggestion}
                        type="button"
                        onClick={() =>
                          useSuggestion(
                            suggestion
                          )
                        }
                        className="rounded-xl border border-gray-200 bg-white p-4 text-left text-sm text-black transition hover:border-gray-400 hover:bg-gray-50"
                      >
                        {suggestion}
                      </button>
                    )
                  )}

                </div>

              </div>

            </div>

          ) : (

            <div className="mx-auto max-w-4xl space-y-6">

              {messages.map(
                (message, index) => {

                  const isUser =
                    message.role ===
                    "user";

                  const isLast =
                    index ===
                    messages.length - 1;

                  return (
                    <div
                      key={
                        message.id ??
                        `${message.role}-${index}`
                      }
                      className={`flex ${
                        isUser
                          ? "justify-end"
                          : "justify-start"
                      }`}
                    >

                      {isUser ? (

                        <div className="max-w-[85%] rounded-2xl rounded-br-md bg-black px-5 py-3 text-sm leading-7 text-white">
                          {message.content}
                        </div>

                      ) : (

                        <div className="w-full rounded-2xl border border-gray-200 bg-white px-6 py-5 shadow-sm">

                          <div className="mb-3 text-xs font-semibold text-gray-500">
                            DataSphere AI Tutor
                          </div>

                          {message.content ? (

                            <div className="prose prose-sm max-w-none text-black">

                              <ReactMarkdown
                                remarkPlugins={[
                                  remarkGfm,
                                ]}
                                components={{
                                  h1:
                                    ({
                                      children,
                                    }) => (
                                      <h1 className="mb-4 mt-2 text-2xl font-bold text-black">
                                        {
                                          children
                                        }
                                      </h1>
                                    ),

                                  h2:
                                    ({
                                      children,
                                    }) => (
                                      <h2 className="mb-3 mt-6 text-xl font-semibold text-black">
                                        {
                                          children
                                        }
                                      </h2>
                                    ),

                                  h3:
                                    ({
                                      children,
                                    }) => (
                                      <h3 className="mb-2 mt-5 text-lg font-semibold text-black">
                                        {
                                          children
                                        }
                                      </h3>
                                    ),

                                  p:
                                    ({
                                      children,
                                    }) => (
                                      <p className="mb-3 leading-7 text-black">
                                        {
                                          children
                                        }
                                      </p>
                                    ),

                                  ul:
                                    ({
                                      children,
                                    }) => (
                                      <ul className="mb-4 list-disc space-y-1 pl-6 text-black">
                                        {
                                          children
                                        }
                                      </ul>
                                    ),

                                  ol:
                                    ({
                                      children,
                                    }) => (
                                      <ol className="mb-4 list-decimal space-y-1 pl-6 text-black">
                                        {
                                          children
                                        }
                                      </ol>
                                    ),

                                  blockquote:
                                    ({
                                      children,
                                    }) => (
                                      <blockquote className="my-4 border-l-4 border-gray-300 pl-4 italic text-black">
                                        {
                                          children
                                        }
                                      </blockquote>
                                    ),

                                  code:
                                    ({
                                      inline,
                                      children,
                                    }: any) =>
                                      inline ? (
                                        <code className="rounded bg-gray-100 px-1.5 py-0.5 text-sm text-black">
                                          {
                                            children
                                          }
                                        </code>
                                      ) : (
                                        <pre className="my-4 overflow-x-auto rounded-xl bg-gray-950 p-4 text-sm text-white">
                                          <code>
                                            {
                                              children
                                            }
                                          </code>
                                        </pre>
                                      ),

                                  table:
                                    ({
                                      children,
                                    }) => (
                                      <div className="my-5 overflow-x-auto">
                                        <table className="w-full border-collapse text-sm text-black">
                                          {
                                            children
                                          }
                                        </table>
                                      </div>
                                    ),

                                  th:
                                    ({
                                      children,
                                    }) => (
                                      <th className="border border-gray-200 bg-gray-50 px-3 py-2 text-left font-semibold text-black">
                                        {
                                          children
                                        }
                                      </th>
                                    ),

                                  td:
                                    ({
                                      children,
                                    }) => (
                                      <td className="border border-gray-200 px-3 py-2 text-black">
                                        {
                                          children
                                        }
                                      </td>
                                    ),
                                }}
                              >
                                {
                                  message.content
                                }
                              </ReactMarkdown>

                            </div>

                          ) : (

                            loading &&
                            isLast && (
                              <div className="flex items-center gap-2 text-sm text-gray-600">
                                <span className="animate-pulse">
                                  DataSphere AI is thinking...
                                </span>
                              </div>
                            )

                          )}

                          {message.content && (
                            <div className="mt-4 border-t border-gray-100 pt-3">

                              <button
                                type="button"
                                onClick={() =>
                                  copyMessage(
                                    message.content
                                  )
                                }
                                className="rounded-lg px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-100 hover:text-black"
                              >
                                Copy
                              </button>

                            </div>
                          )}

                        </div>
                      )}

                    </div>
                  );
                }
              )}

            </div>

          )}

        </div>

        {/* =====================================================
            SELECTED FILES
        ===================================================== */}

        {selectedFiles.length > 0 && (
          <div className="border-t border-gray-100 px-5 py-3">

            <div className="mx-auto flex max-w-4xl flex-wrap gap-2">

              {selectedFiles.map(
                (file) => (
                  <div
                    key={file.id}
                    className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-black"
                  >
                    <span>
                      📎
                    </span>

                    <span className="max-w-[220px] truncate">
                      {file.file_name}
                    </span>

                    <button
                      type="button"
                      onClick={() =>
                        setSelectedFiles(
                          (previous) =>
                            previous.filter(
                              (item) =>
                                item.id !==
                                file.id
                            )
                        )
                      }
                      className="text-gray-500 hover:text-red-600"
                    >
                      ×
                    </button>
                  </div>
                )
              )}

            </div>

          </div>
        )}

        {/* =====================================================
            INPUT
        ===================================================== */}

        <div className="border-t border-gray-200 p-4">

          <form
            onSubmit={(event) => {
              event.preventDefault();

              if (!loading) {
                sendMessage();
              }
            }}
            className="mx-auto max-w-4xl"
          >

            <div className="rounded-2xl border border-gray-300 bg-white shadow-sm focus-within:border-black">

              <textarea
                ref={textareaRef}
                value={input}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                disabled={loading}
                rows={1}
                placeholder="Ask DataSphere AI Tutor anything..."
                className="max-h-[180px] min-h-[56px] w-full resize-none bg-transparent px-4 py-4 text-sm text-black outline-none placeholder:text-gray-500 disabled:cursor-not-allowed disabled:opacity-70"
              />

              <div className="flex items-center justify-between border-t border-gray-100 px-3 py-2">

                <div className="flex items-center gap-2">

                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    accept=".pdf,.txt,.csv,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.jpg,.jpeg,.png,.webp,.gif"
                    onChange={(event) => {
                      const file =
                        event.target.files?.[0];

                      if (file) {
                        uploadFile(file);
                      }
                    }}
                  />

                  <button
                    type="button"
                    onClick={() =>
                      fileInputRef.current?.click()
                    }
                    disabled={
                      uploading ||
                      loading
                    }
                    className="rounded-lg px-3 py-2 text-sm text-black hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {uploading
                      ? "Uploading..."
                      : "📎 Attach"}
                  </button>

                  <span className="hidden text-xs text-gray-500 md:block">
                    {currentMode.label}
                  </span>

                </div>

                <div>

                  {loading ? (

                    <button
                      type="button"
                      onClick={
                        stopGeneration
                      }
                      className="rounded-xl border border-gray-300 px-5 py-2 text-sm font-medium text-black hover:bg-gray-100"
                    >
                      Stop
                    </button>

                  ) : (

                    <button
                      type="submit"
                      disabled={
                        !input.trim()
                      }
                      className="rounded-xl bg-black px-5 py-2 text-sm font-semibold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Send
                    </button>

                  )}

                </div>

              </div>

            </div>

            <div className="mt-2 text-center text-xs text-gray-500">
              Enter to send • Shift + Enter for a new line
            </div>

          </form>

        </div>

      </main>
    </div>
  );
}