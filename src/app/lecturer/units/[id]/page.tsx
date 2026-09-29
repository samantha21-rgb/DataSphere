"use client";

import { FormEvent, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";

type Unit = {
  id: number;
  code: string | null;
  name: string | null;
  title: string | null;
  description: string | null;
  credit_hours: number | null;
};

type Assignment = {
  id: number;
  unit_id: number;
  title: string;
  description: string | null;
  assignment_number: number | null;
  due_date: string | null;
  available_from: string | null;
  available_until: string | null;
  max_points: number | null;
  allow_resubmission: boolean;
  max_attempts: number | null;
  allowed_file_types: string[] | null;
  submission_type: string;
  instructions: string | null;
  file_url: string | null;
  created_at: string;
};

type Quiz = {
  id: number;
  title: string;
  points_possible: number | null;
  published: boolean;
  due_date: string | null;
};

type Discussion = {
  id: number;
  title: string;
  description: string | null;
  published: boolean;
  pinned: boolean;
  locked: boolean;
  created_at: string;
};

type Note = {
  id: number;
  title: string;
  description: string | null;
  file_url: string;
  created_at: string;
};

type PastPaper = {
  id: number;
  title: string;
  description: string | null;
  file_url: string;
  exam_year: number | null;
  exam_type: string | null;
  created_at: string;
};

type FormState = {
  title: string;
  description: string;
  assignment_number: string;
  due_date: string;
  available_from: string;
  available_until: string;
  max_points: string;
  allow_resubmission: boolean;
  max_attempts: string;
  allowed_file_types: string;
  submission_type: "file" | "text" | "file_and_text";
  instructions: string;
  file_url: string;
};

const EMPTY_FORM: FormState = {
  title: "",
  description: "",
  assignment_number: "",
  due_date: "",
  available_from: "",
  available_until: "",
  max_points: "100",
  allow_resubmission: true,
  max_attempts: "",
  allowed_file_types:
    ".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.csv",
  submission_type: "file_and_text",
  instructions: "",
  file_url: "",
};

export default function LecturerUnitPage() {
  const params = useParams();
  const router = useRouter();

  const unitId = Number(params.id);

  const [unit, setUnit] = useState<Unit | null>(null);

  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [discussions, setDiscussions] = useState<Discussion[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [pastPapers, setPastPapers] = useState<PastPaper[]>([]);

  const [activeTab, setActiveTab] = useState<
    "overview" | "assignments" | "quizzes" | "discussions" | "resources"
  >("overview");

  const [showAssignmentForm, setShowAssignmentForm] =
    useState(false);

  const [editingAssignmentId, setEditingAssignmentId] =
    useState<number | null>(null);

  const [form, setForm] = useState<FormState>(EMPTY_FORM);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] =
    useState<number | null>(null);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    if (!unitId || Number.isNaN(unitId)) {
      setError("Invalid unit.");
      setLoading(false);
      return;
    }

    loadUnit();
  }, [unitId]);

  async function loadUnit() {
    try {
      setLoading(true);
      setError("");

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      /*
       * Check lecturer assignment.
       *
       * Admin is allowed here so your current admin account
       * can test the lecturer portal before a real lecturer
       * joins DataSphere.
       */
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();

      const isAdmin = profile?.role === "admin";

      const { data: lecturerAssignment, error: lecturerError } =
        await supabase
          .from("lecturer_units")
          .select("id")
          .eq("lecturer_id", user.id)
          .eq("unit_id", unitId)
          .maybeSingle();

      if (lecturerError) {
        throw lecturerError;
      }

      if (!lecturerAssignment && !isAdmin) {
        setError(
          "You are not assigned to this unit."
        );
        return;
      }

      // Load unit
      const { data: unitData, error: unitError } =
        await supabase
          .from("units")
          .select(
            "id, code, name, title, description, credit_hours"
          )
          .eq("id", unitId)
          .maybeSingle();

      if (unitError) throw unitError;

      if (!unitData) {
        setError("Unit not found.");
        return;
      }

      setUnit(unitData);

      // Load assignments
      const { data: assignmentData, error: assignmentError } =
        await supabase
          .from("assignments")
          .select("*")
          .eq("unit_id", unitId)
          .order("assignment_number", {
            ascending: true,
            nullsFirst: false,
          })
          .order("created_at", {
            ascending: true,
          });

      if (assignmentError) {
        console.error(
          "Assignments error:",
          assignmentError
        );
      }

      setAssignments(assignmentData || []);

      // Load quizzes
      const { data: quizData, error: quizError } =
        await supabase
          .from("quizzes")
          .select(
            "id, title, points_possible, published, due_date"
          )
          .eq("unit_id", unitId)
          .order("created_at", {
            ascending: false,
          });

      if (quizError) {
        console.error(
          "Quiz error:",
          quizError
        );
      }

      setQuizzes(quizData || []);

      // Load discussions
      const {
        data: discussionData,
        error: discussionError,
      } = await supabase
        .from("discussions")
        .select("*")
        .eq("unit_id", unitId)
        .order("pinned", {
          ascending: false,
        })
        .order("created_at", {
          ascending: false,
        });

      if (discussionError) {
        console.error(
          "Discussion error:",
          discussionError
        );
      }

      setDiscussions(discussionData || []);

      // Load notes
      const { data: noteData, error: noteError } =
        await supabase
          .from("notes")
          .select("*")
          .eq("unit_id", unitId)
          .order("created_at", {
            ascending: false,
          });

      if (noteError) {
        console.error(
          "Notes error:",
          noteError
        );
      }

      setNotes(noteData || []);

      // Load past papers
      const {
        data: paperData,
        error: paperError,
      } = await supabase
        .from("past_papers")
        .select("*")
        .eq("unit_id", unitId)
        .order("exam_year", {
          ascending: false,
          nullsFirst: false,
        });

      if (paperError) {
        console.error(
          "Past papers error:",
          paperError
        );
      }

      setPastPapers(paperData || []);
    } catch (err: any) {
      console.error(
        "Lecturer unit error:",
        err
      );

      setError(
        err?.message ||
          "Failed to load lecturer unit."
      );
    } finally {
      setLoading(false);
    }
  }

  function updateForm(
    field: keyof FormState,
    value: any
  ) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function openCreateAssignment() {
    setError("");
    setSuccess("");

    const nextNumber =
      assignments.length === 0
        ? 1
        : Math.max(
            ...assignments.map(
              (assignment) =>
                assignment.assignment_number || 0
            )
          ) + 1;

    setForm({
      ...EMPTY_FORM,
      assignment_number: String(nextNumber),
    });

    setEditingAssignmentId(null);
    setShowAssignmentForm(true);

    setTimeout(() => {
      document
        .getElementById("assignment-form")
        ?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
    }, 50);
  }

  function openEditAssignment(
    assignment: Assignment
  ) {
    setError("");
    setSuccess("");

    setEditingAssignmentId(assignment.id);

    setForm({
      title: assignment.title || "",
      description:
        assignment.description || "",
      assignment_number:
        assignment.assignment_number != null
          ? String(
              assignment.assignment_number
            )
          : "",
      due_date: toLocalDateTime(
        assignment.due_date
      ),
      available_from: toLocalDateTime(
        assignment.available_from
      ),
      available_until: toLocalDateTime(
        assignment.available_until
      ),
      max_points:
        assignment.max_points != null
          ? String(assignment.max_points)
          : "100",
      allow_resubmission:
        assignment.allow_resubmission ?? true,
      max_attempts:
        assignment.max_attempts != null
          ? String(assignment.max_attempts)
          : "",
      allowed_file_types:
        assignment.allowed_file_types?.join(
          ","
        ) ||
        ".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.csv",
      submission_type:
        assignment.submission_type ===
        "file"
          ? "file"
          : assignment.submission_type ===
            "text"
          ? "text"
          : "file_and_text",
      instructions:
        assignment.instructions || "",
      file_url:
        assignment.file_url || "",
    });

    setShowAssignmentForm(true);

    setTimeout(() => {
      document
        .getElementById("assignment-form")
        ?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
    }, 50);
  }

  function closeAssignmentForm() {
    setShowAssignmentForm(false);
    setEditingAssignmentId(null);
    setForm(EMPTY_FORM);
  }

  async function saveAssignment(
    event: FormEvent
  ) {
    event.preventDefault();

    setError("");
    setSuccess("");

    if (!form.title.trim()) {
      setError(
        "Assignment title is required."
      );
      return;
    }

    const maxPoints = Number(
      form.max_points
    );

    if (
      Number.isNaN(maxPoints) ||
      maxPoints < 0
    ) {
      setError(
        "Maximum points must be zero or greater."
      );
      return;
    }

    const assignmentNumber =
      form.assignment_number
        ? Number(form.assignment_number)
        : null;

    if (
      assignmentNumber !== null &&
      (!Number.isInteger(
        assignmentNumber
      ) ||
        assignmentNumber < 1)
    ) {
      setError(
        "Assignment number must be a positive whole number."
      );
      return;
    }

    const maxAttempts =
      form.max_attempts
        ? Number(form.max_attempts)
        : null;

    if (
      maxAttempts !== null &&
      (!Number.isInteger(
        maxAttempts
      ) ||
        maxAttempts < 1)
    ) {
      setError(
        "Maximum attempts must be a positive whole number."
      );
      return;
    }

    if (
      form.available_from &&
      form.available_until &&
      new Date(form.available_until) <
        new Date(form.available_from)
    ) {
      setError(
        "Available-until cannot be earlier than available-from."
      );
      return;
    }

    const allowedFileTypes =
      form.allowed_file_types
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);

    if (
      form.submission_type !==
        "text" &&
      allowedFileTypes.length === 0
    ) {
      setError(
        "Specify at least one allowed file type."
      );
      return;
    }

    try {
      setSaving(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      /*
       * Defense-in-depth access check.
       */
      const { data: profile } =
        await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .maybeSingle();

      const isAdmin =
        profile?.role === "admin";

      const { data: lecturerAssignment } =
        await supabase
          .from("lecturer_units")
          .select("id")
          .eq("lecturer_id", user.id)
          .eq("unit_id", unitId)
          .maybeSingle();

      if (
        !lecturerAssignment &&
        !isAdmin
      ) {
        setError(
          "You are not assigned to this unit."
        );
        return;
      }

      const payload = {
        unit_id: unitId,
        title: form.title.trim(),
        description:
          form.description.trim() ||
          null,
        assignment_number:
          assignmentNumber,
        due_date: form.due_date
          ? new Date(
              form.due_date
            ).toISOString()
          : null,
        available_from:
          form.available_from
            ? new Date(
                form.available_from
              ).toISOString()
            : null,
        available_until:
          form.available_until
            ? new Date(
                form.available_until
              ).toISOString()
            : null,
        max_points: maxPoints,
        allow_resubmission:
          form.allow_resubmission,
        max_attempts: maxAttempts,
        allowed_file_types:
          form.submission_type ===
          "text"
            ? null
            : allowedFileTypes,
        submission_type:
          form.submission_type,
        instructions:
          form.instructions.trim() ||
          null,
        file_url:
          form.file_url.trim() ||
          null,
        updated_at:
          new Date().toISOString(),
      };

      if (
        editingAssignmentId !== null
      ) {
        const { error: updateError } =
          await supabase
            .from("assignments")
            .update(payload)
            .eq(
              "id",
              editingAssignmentId
            )
            .eq("unit_id", unitId);

        if (updateError) {
          throw updateError;
        }

        setSuccess(
          "Assignment updated successfully."
        );
      } else {
        const { error: insertError } =
          await supabase
            .from("assignments")
            .insert({
              ...payload,
              created_by: user.id,
            });

        if (insertError) {
          throw insertError;
        }

        setSuccess(
          "Assignment created successfully."
        );
      }

      closeAssignmentForm();
      await loadUnit();
    } catch (err: any) {
      console.error(err);

      setError(
        err?.message ||
          "Failed to save assignment."
      );
    } finally {
      setSaving(false);
    }
  }

  async function deleteAssignment(
    assignment: Assignment
  ) {
    const confirmed =
      window.confirm(
        `Delete "${assignment.title}"?\n\nStudent submissions associated with this assignment may also be deleted because they reference the assignment.`
      );

    if (!confirmed) {
      return;
    }

    try {
      setDeletingId(assignment.id);
      setError("");
      setSuccess("");

      const { error: deleteError } =
        await supabase
          .from("assignments")
          .delete()
          .eq("id", assignment.id)
          .eq("unit_id", unitId);

      if (deleteError) {
        throw deleteError;
      }

      setSuccess(
        "Assignment deleted successfully."
      );

      await loadUnit();
    } catch (err: any) {
      console.error(err);

      setError(
        err?.message ||
          "Failed to delete assignment."
      );
    } finally {
      setDeletingId(null);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50 p-8">
        <div className="mx-auto max-w-7xl animate-pulse">
          <div className="h-5 w-40 rounded bg-slate-200" />

          <div className="mt-5 h-10 w-96 rounded bg-slate-200" />

          <div className="mt-3 h-5 w-64 rounded bg-slate-200" />

          <div className="mt-8 grid gap-4 md:grid-cols-4">
            {[1, 2, 3, 4].map(
              (item) => (
                <div
                  key={item}
                  className="h-28 rounded-2xl bg-slate-200"
                />
              )
            )}
          </div>

          <div className="mt-8 h-80 rounded-2xl bg-slate-200" />
        </div>
      </main>
    );
  }

  if (error && !unit) {
    return (
      <main className="min-h-screen bg-slate-50 p-8">
        <div className="mx-auto max-w-3xl">
          <button
            onClick={() =>
              router.push("/lecturer")
            }
            className="mb-6 text-sm font-medium text-slate-500 hover:text-slate-900"
          >
            ← Lecturer Portal
          </button>

          <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
            <div className="text-4xl">
              🔒
            </div>

            <h1 className="mt-4 text-2xl font-bold text-slate-900">
              Access Restricted
            </h1>

            <p className="mt-3 text-slate-600">
              {error}
            </p>
          </div>
        </div>
      </main>
    );
  }

  const unitName =
    unit?.name ||
    unit?.title ||
    "Unit";

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-7xl px-6 py-8">
        {/* Back */}
        <button
          onClick={() =>
            router.push("/lecturer")
          }
          className="mb-6 text-sm font-medium text-slate-500 hover:text-slate-900"
        >
          ← Lecturer Portal
        </button>

        {/* Unit Header */}
        <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="p-7">
            <div className="flex flex-col justify-between gap-6 md:flex-row md:items-start">
              <div>
                <span className="inline-flex rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-700">
                  {unit?.code ||
                    "UNIT"}
                </span>

                <h1 className="mt-4 text-3xl font-bold tracking-tight text-slate-900">
                  {unitName}
                </h1>

                {unit?.description && (
                  <p className="mt-3 max-w-3xl leading-7 text-slate-600">
                    {unit.description}
                  </p>
                )}

                {unit?.credit_hours !=
                  null && (
                  <p className="mt-3 text-sm text-slate-500">
                    {unit.credit_hours} credit
                    hour
                    {unit.credit_hours ===
                    1
                      ? ""
                      : "s"}
                  </p>
                )}
              </div>

              <button
                onClick={loadUnit}
                className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                ↻ Refresh
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="overflow-x-auto border-t border-slate-100">
            <div className="flex min-w-max px-4">
              <Tab
                active={
                  activeTab ===
                  "overview"
                }
                label="Overview"
                icon="🏠"
                onClick={() =>
                  setActiveTab(
                    "overview"
                  )
                }
              />

              <Tab
                active={
                  activeTab ===
                  "assignments"
                }
                label={`Assignments (${assignments.length})`}
                icon="📝"
                onClick={() =>
                  setActiveTab(
                    "assignments"
                  )
                }
              />

              <Tab
                active={
                  activeTab ===
                  "quizzes"
                }
                label={`Quizzes (${quizzes.length})`}
                icon="❓"
                onClick={() =>
                  setActiveTab(
                    "quizzes"
                  )
                }
              />

              <Tab
                active={
                  activeTab ===
                  "discussions"
                }
                label={`Discussions (${discussions.length})`}
                icon="💬"
                onClick={() =>
                  setActiveTab(
                    "discussions"
                  )
                }
              />

              <Tab
                active={
                  activeTab ===
                  "resources"
                }
                label={`Resources (${notes.length + pastPapers.length})`}
                icon="📚"
                onClick={() =>
                  setActiveTab(
                    "resources"
                  )
                }
              />
            </div>
          </div>
        </section>

        {/* Alerts */}
        {error && (
          <div className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {success && (
          <div className="mt-6 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
            {success}
          </div>
        )}

        {/* OVERVIEW */}
        {activeTab ===
          "overview" && (
          <div className="mt-8 space-y-8">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Stat
                icon="📝"
                label="Assignments"
                value={
                  assignments.length
                }
              />

              <Stat
                icon="❓"
                label="Quizzes"
                value={
                  quizzes.length
                }
              />

              <Stat
                icon="💬"
                label="Discussions"
                value={
                  discussions.length
                }
              />

              <Stat
                icon="📚"
                label="Resources"
                value={
                  notes.length +
                  pastPapers.length
                }
              />
            </div>

            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-bold text-slate-900">
                Teaching Workspace
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Manage the academic
                activity for this
                unit.
              </p>

              <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <Action
                  icon="📝"
                  title="Assignments"
                  description="Create and manage coursework."
                  onClick={() =>
                    setActiveTab(
                      "assignments"
                    )
                  }
                />

                <Action
                  icon="❓"
                  title="Quizzes"
                  description="Manage online assessments."
                  onClick={() =>
                    setActiveTab(
                      "quizzes"
                    )
                  }
                />

                <Action
                  icon="💬"
                  title="Discussions"
                  description="Manage unit discussions."
                  onClick={() =>
                    setActiveTab(
                      "discussions"
                    )
                  }
                />

                <Action
                  icon="📚"
                  title="Resources"
                  description="View learning materials."
                  onClick={() =>
                    setActiveTab(
                      "resources"
                    )
                  }
                />
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">
                    Assessment
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    Review submissions
                    and student
                    performance.
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <a
                    href={`/admin/submissions?unit=${unitId}`}
                    className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-800"
                  >
                    Submissions
                  </a>

                  <a
                    href={`/admin/gradebook?unit=${unitId}`}
                    className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    Gradebook
                  </a>
                </div>
              </div>
            </section>
          </div>
        )}

        {/* ASSIGNMENTS */}
        {activeTab ===
          "assignments" && (
          <div className="mt-8 space-y-6">
            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex flex-col justify-between gap-5 md:flex-row md:items-center">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900">
                    Assignment Manager
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    Create, edit and
                    manage coursework
                    for {unit?.code ||
                      unitName}.
                  </p>
                </div>

                <button
                  onClick={
                    openCreateAssignment
                  }
                  className="rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800"
                >
                  + Create Assignment
                </button>
              </div>
            </section>

            {/* Assignment form */}
            {showAssignmentForm && (
              <section
                id="assignment-form"
                className="rounded-2xl border border-slate-200 bg-white shadow-sm"
              >
                <div className="flex items-center justify-between border-b border-slate-100 p-6">
                  <div>
                    <h2 className="text-xl font-bold text-slate-900">
                      {editingAssignmentId
                        ? "Edit Assignment"
                        : "Create Assignment"}
                    </h2>

                    <p className="mt-1 text-sm text-slate-500">
                      Configure the
                      assignment and
                      submission rules.
                    </p>
                  </div>

                  <button
                    onClick={
                      closeAssignmentForm
                    }
                    className="rounded-lg px-3 py-2 text-sm text-slate-500 hover:bg-slate-100"
                  >
                    Close
                  </button>
                </div>

                <form
                  onSubmit={
                    saveAssignment
                  }
                  className="space-y-8 p-6"
                >
                  <div>
                    <h3 className="font-bold text-slate-900">
                      Basic Information
                    </h3>

                    <div className="mt-4 grid gap-5 md:grid-cols-2">
                      <Field
                        label="Assignment Title"
                        required
                      >
                        <input
                          value={
                            form.title
                          }
                          onChange={(e) =>
                            updateForm(
                              "title",
                              e.target
                                .value
                            )
                          }
                          placeholder="e.g. Assignment 1 — Data Analysis"
                          className={
                            inputClass
                          }
                          required
                        />
                      </Field>

                      <Field label="Assignment Number">
                        <input
                          type="number"
                          min="1"
                          value={
                            form.assignment_number
                          }
                          onChange={(e) =>
                            updateForm(
                              "assignment_number",
                              e.target
                                .value
                            )
                          }
                          placeholder="1"
                          className={
                            inputClass
                          }
                        />
                      </Field>

                      <Field
                        label="Description"
                        className="md:col-span-2"
                      >
                        <textarea
                          value={
                            form.description
                          }
                          onChange={(e) =>
                            updateForm(
                              "description",
                              e.target
                                .value
                            )
                          }
                          rows={3}
                          placeholder="Short description..."
                          className={
                            textareaClass
                          }
                        />
                      </Field>

                      <Field
                        label="Instructions"
                        className="md:col-span-2"
                      >
                        <textarea
                          value={
                            form.instructions
                          }
                          onChange={(e) =>
                            updateForm(
                              "instructions",
                              e.target
                                .value
                            )
                          }
                          rows={6}
                          placeholder="Detailed instructions students should follow..."
                          className={
                            textareaClass
                          }
                        />
                      </Field>
                    </div>
                  </div>

                  <div>
                    <h3 className="font-bold text-slate-900">
                      Availability & Deadline
                    </h3>

                    <div className="mt-4 grid gap-5 md:grid-cols-3">
                      <Field label="Available From">
                        <input
                          type="datetime-local"
                          value={
                            form.available_from
                          }
                          onChange={(e) =>
                            updateForm(
                              "available_from",
                              e.target
                                .value
                            )
                          }
                          className={
                            inputClass
                          }
                        />
                      </Field>

                      <Field label="Available Until">
                        <input
                          type="datetime-local"
                          value={
                            form.available_until
                          }
                          onChange={(e) =>
                            updateForm(
                              "available_until",
                              e.target
                                .value
                            )
                          }
                          className={
                            inputClass
                          }
                        />
                      </Field>

                      <Field label="Due Date">
                        <input
                          type="datetime-local"
                          value={
                            form.due_date
                          }
                          onChange={(e) =>
                            updateForm(
                              "due_date",
                              e.target
                                .value
                            )
                          }
                          className={
                            inputClass
                          }
                        />
                      </Field>
                    </div>
                  </div>

                  <div>
                    <h3 className="font-bold text-slate-900">
                      Grading
                    </h3>

                    <div className="mt-4 grid gap-5 md:grid-cols-3">
                      <Field
                        label="Maximum Points"
                        required
                      >
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={
                            form.max_points
                          }
                          onChange={(e) =>
                            updateForm(
                              "max_points",
                              e.target
                                .value
                            )
                          }
                          className={
                            inputClass
                          }
                          required
                        />
                      </Field>

                      <Field label="Maximum Attempts">
                        <input
                          type="number"
                          min="1"
                          value={
                            form.max_attempts
                          }
                          onChange={(e) =>
                            updateForm(
                              "max_attempts",
                              e.target
                                .value
                            )
                          }
                          placeholder="Unlimited"
                          className={
                            inputClass
                          }
                        />
                      </Field>

                      <div className="flex items-end">
                        <label className="flex min-h-12 w-full cursor-pointer items-center gap-3 rounded-xl border border-slate-200 px-4">
                          <input
                            type="checkbox"
                            checked={
                              form.allow_resubmission
                            }
                            onChange={(e) =>
                              updateForm(
                                "allow_resubmission",
                                e.target
                                  .checked
                              )
                            }
                            className="h-4 w-4"
                          />

                          <span className="text-sm font-medium text-slate-700">
                            Allow resubmission
                          </span>
                        </label>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="font-bold text-slate-900">
                      Submission
                    </h3>

                    <div className="mt-4 grid gap-5 md:grid-cols-2">
                      <Field label="Submission Type">
                        <select
                          value={
                            form.submission_type
                          }
                          onChange={(e) =>
                            updateForm(
                              "submission_type",
                              e.target
                                .value
                            )
                          }
                          className={
                            inputClass
                          }
                        >
                          <option value="file_and_text">
                            File + Text
                          </option>

                          <option value="file">
                            File Only
                          </option>

                          <option value="text">
                            Text Only
                          </option>
                        </select>
                      </Field>

                      <Field label="Allowed File Types">
                        <input
                          value={
                            form.allowed_file_types
                          }
                          onChange={(e) =>
                            updateForm(
                              "allowed_file_types",
                              e.target
                                .value
                            )
                          }
                          disabled={
                            form.submission_type ===
                            "text"
                          }
                          placeholder=".pdf,.docx,.pptx"
                          className={
                            inputClass
                          }
                        />

                        <p className="mt-2 text-xs text-slate-400">
                          Separate extensions
                          with commas.
                        </p>
                      </Field>

                      <Field
                        label="Reference File URL"
                        className="md:col-span-2"
                      >
                        <input
                          type="url"
                          value={
                            form.file_url
                          }
                          onChange={(e) =>
                            updateForm(
                              "file_url",
                              e.target
                                .value
                            )
                          }
                          placeholder="Optional resource URL"
                          className={
                            inputClass
                          }
                        />
                      </Field>
                    </div>
                  </div>

                  <div className="flex flex-col-reverse justify-end gap-3 border-t border-slate-100 pt-6 sm:flex-row">
                    <button
                      type="button"
                      onClick={
                        closeAssignmentForm
                      }
                      className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
                    >
                      Cancel
                    </button>

                    <button
                      type="submit"
                      disabled={saving}
                      className="rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
                    >
                      {saving
                        ? "Saving..."
                        : editingAssignmentId
                        ? "Save Changes"
                        : "Create Assignment"}
                    </button>
                  </div>
                </form>
              </section>
            )}

            {/* Assignment list */}
            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-100 p-6">
                <h2 className="text-xl font-bold text-slate-900">
                  Unit Assignments
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  {assignments.length} assignment
                  {assignments.length ===
                  1
                    ? ""
                    : "s"}
                </p>
              </div>

              {assignments.length ===
              0 ? (
                <div className="p-12 text-center">
                  <div className="text-5xl">
                    📝
                  </div>

                  <h3 className="mt-4 font-bold text-slate-900">
                    No assignments yet
                  </h3>

                  <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
                    Create your first
                    assignment for this
                    unit.
                  </p>

                  <button
                    onClick={
                      openCreateAssignment
                    }
                    className="mt-6 rounded-xl bg-slate-900 px-5 py-3 text-sm font-medium text-white"
                  >
                    + Create Assignment
                  </button>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {assignments.map(
                    (
                      assignment,
                      index
                    ) => (
                      <AssignmentRow
                        key={
                          assignment.id
                        }
                        assignment={
                          assignment
                        }
                        index={index}
                        onEdit={() =>
                          openEditAssignment(
                            assignment
                          )
                        }
                        onDelete={() =>
                          deleteAssignment(
                            assignment
                          )
                        }
                        deleting={
                          deletingId ===
                          assignment.id
                        }
                      />
                    )
                  )}
                </div>
              )}
            </section>
          </div>
        )}

        {/* QUIZZES */}
        {activeTab === "quizzes" && (
          <section className="mt-8 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-col justify-between gap-4 border-b border-slate-100 p-6 md:flex-row md:items-center">
              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  Quizzes
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Online assessments for
                  this unit.
                </p>
              </div>

              <a
                href={`/admin/quizzes?unit=${unitId}`}
                className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white"
              >
                Manage Quizzes
              </a>
            </div>

            {quizzes.length ===
            0 ? (
              <Empty
                icon="❓"
                title="No quizzes yet"
                description="No online quizzes have been created for this unit."
              />
            ) : (
              <div className="grid gap-4 p-6 md:grid-cols-2">
                {quizzes.map(
                  (quiz) => (
                    <div
                      key={
                        quiz.id
                      }
                      className="rounded-2xl border border-slate-200 p-5"
                    >
                      <div className="flex justify-between gap-4">
                        <div>
                          <h3 className="font-bold text-slate-900">
                            {quiz.title}
                          </h3>

                          <div className="mt-3 flex flex-wrap gap-2">
                            <Badge>
                              {quiz.points_possible ??
                                0}{" "}
                              points
                            </Badge>

                            <Badge>
                              {quiz.published
                                ? "Published"
                                : "Draft"}
                            </Badge>
                          </div>
                        </div>

                        <span className="text-2xl">
                          ❓
                        </span>
                      </div>

                      <a
                        href={`/admin/quiz-attempts?quiz=${quiz.id}`}
                        className="mt-5 inline-flex rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700"
                      >
                        View Attempts
                      </a>
                    </div>
                  )
                )}
              </div>
            )}
          </section>
        )}

        {/* DISCUSSIONS */}
        {activeTab ===
          "discussions" && (
          <section className="mt-8 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-col justify-between gap-4 border-b border-slate-100 p-6 md:flex-row md:items-center">
              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  Discussions
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Student conversations
                  for this unit.
                </p>
              </div>

              <a
                href={`/admin/discussions?unit=${unitId}`}
                className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white"
              >
                Manage Discussions
              </a>
            </div>

            {discussions.length ===
            0 ? (
              <Empty
                icon="💬"
                title="No discussions yet"
                description="No discussions have been created for this unit."
              />
            ) : (
              <div className="divide-y divide-slate-100">
                {discussions.map(
                  (discussion) => (
                    <div
                      key={
                        discussion.id
                      }
                      className="p-6"
                    >
                      <div className="flex flex-col justify-between gap-4 md:flex-row">
                        <div>
                          <div className="flex flex-wrap gap-2">
                            {discussion.pinned && (
                              <Badge>
                                📌 Pinned
                              </Badge>
                            )}

                            {discussion.locked && (
                              <Badge>
                                🔒 Locked
                              </Badge>
                            )}

                            <Badge>
                              {discussion.published
                                ? "Published"
                                : "Draft"}
                            </Badge>
                          </div>

                          <h3 className="mt-3 font-bold text-slate-900">
                            {
                              discussion.title
                            }
                          </h3>

                          {discussion.description && (
                            <p className="mt-1 text-sm text-slate-500">
                              {
                                discussion.description
                              }
                            </p>
                          )}
                        </div>

                        <a
                          href={`/discussions/${discussion.id}`}
                          className="h-fit rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700"
                        >
                          Open
                        </a>
                      </div>
                    </div>
                  )
                )}
              </div>
            )}
          </section>
        )}

        {/* RESOURCES */}
        {activeTab ===
          "resources" && (
          <div className="mt-8 space-y-6">
            <ResourceSection
              title="Lecture Notes"
              icon="📖"
              items={notes.map(
                (note) => ({
                  id: note.id,
                  title:
                    note.title,
                  description:
                    note.description,
                  url: note.file_url,
                  meta: formatDate(
                    note.created_at
                  ),
                })
              )}
            />

            <ResourceSection
              title="Past Papers"
              icon="📄"
              items={pastPapers.map(
                (paper) => ({
                  id: paper.id,
                  title:
                    paper.title,
                  description:
                    paper.description,
                  url: paper.file_url,
                  meta: [
                    paper.exam_year,
                    paper.exam_type,
                  ]
                    .filter(Boolean)
                    .join(
                      " • "
                    ),
                })
              )}
            />
          </div>
        )}
      </div>
    </main>
  );
}

/* -------------------------------------------------------------------------- */
/* COMPONENTS                                                                 */
/* -------------------------------------------------------------------------- */

function Tab({
  active,
  label,
  icon,
  onClick,
}: {
  active: boolean;
  label: string;
  icon: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`border-b-2 px-4 py-4 text-sm font-medium ${
        active
          ? "border-slate-900 text-slate-900"
          : "border-transparent text-slate-500 hover:text-slate-900"
      }`}
    >
      <span className="mr-2">
        {icon}
      </span>
      {label}
    </button>
  );
}

function Stat({
  icon,
  label,
  value,
}: {
  icon: string;
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <span className="text-2xl">
          {icon}
        </span>

        <span className="text-2xl font-bold text-slate-900">
          {value}
        </span>
      </div>

      <p className="mt-4 text-sm font-medium text-slate-500">
        {label}
      </p>
    </div>
  );
}

function Action({
  icon,
  title,
  description,
  onClick,
}: {
  icon: string;
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="rounded-2xl border border-slate-200 p-5 text-left transition hover:bg-slate-50"
    >
      <div className="text-2xl">
        {icon}
      </div>

      <h3 className="mt-4 font-bold text-slate-900">
        {title}
      </h3>

      <p className="mt-1 text-sm text-slate-500">
        {description}
      </p>
    </button>
  );
}

function AssignmentRow({
  assignment,
  index,
  onEdit,
  onDelete,
  deleting,
}: {
  assignment: Assignment;
  index: number;
  onEdit: () => void;
  onDelete: () => void;
  deleting: boolean;
}) {
  const now = new Date();

  const scheduled =
    assignment.available_from &&
    new Date(
      assignment.available_from
    ) > now;

  const closed =
    assignment.available_until &&
    new Date(
      assignment.available_until
    ) < now;

  let status = "Available";

  if (scheduled) {
    status = "Scheduled";
  } else if (closed) {
    status = "Closed";
  }

  return (
    <div className="p-6 hover:bg-slate-50">
      <div className="flex flex-col justify-between gap-5 xl:flex-row xl:items-center">
        <div className="flex gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-sm font-bold text-slate-700">
            {assignment.assignment_number ||
              index + 1}
          </div>

          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-bold text-slate-900">
                {assignment.title}
              </h3>

              <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                {status}
              </span>
            </div>

            {assignment.description && (
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
                {
                  assignment.description
                }
              </p>
            )}

            <div className="mt-3 flex flex-wrap gap-2">
              {assignment.max_points !=
                null && (
                <Badge>
                  {
                    assignment.max_points
                  }{" "}
                  points
                </Badge>
              )}

              {assignment.due_date && (
                <Badge>
                  Due{" "}
                  {formatDate(
                    assignment.due_date
                  )}
                </Badge>
              )}

              <Badge>
                {assignment.submission_type ===
                "file_and_text"
                  ? "File + Text"
                  : assignment.submission_type ===
                    "file"
                  ? "File"
                  : "Text"}
              </Badge>

              {assignment.max_attempts && (
                <Badge>
                  {
                    assignment.max_attempts
                  }{" "}
                  attempts
                </Badge>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <a
            href={`/admin/submissions?assignment=${assignment.id}`}
            className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-white"
          >
            Submissions
          </a>

          <button
            onClick={onEdit}
            className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-white"
          >
            Edit
          </button>

          <button
            onClick={onDelete}
            disabled={deleting}
            className="rounded-xl border border-red-200 px-4 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
          >
            {deleting
              ? "Deleting..."
              : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  required,
  children,
  className = "",
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <label className="mb-2 block text-sm font-semibold text-slate-700">
        {label}
        {required && (
          <span className="ml-1 text-red-500">
            *
          </span>
        )}
      </label>

      {children}
    </div>
  );
}

function Badge({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
      {children}
    </span>
  );
}

function Empty({
  icon,
  title,
  description,
}: {
  icon: string;
  title: string;
  description: string;
}) {
  return (
    <div className="p-12 text-center">
      <div className="text-5xl">
        {icon}
      </div>

      <h3 className="mt-4 font-bold text-slate-900">
        {title}
      </h3>

      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
        {description}
      </p>
    </div>
  );
}

function ResourceSection({
  title,
  icon,
  items,
}: {
  title: string;
  icon: string;
  items: {
    id: number;
    title: string;
    description: string | null;
    url: string;
    meta: string;
  }[];
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 p-6">
        <h2 className="text-xl font-bold text-slate-900">
          {icon} {title}
        </h2>
      </div>

      {items.length ===
      0 ? (
        <Empty
          icon={icon}
          title={`No ${title.toLowerCase()}`}
          description={`No ${title.toLowerCase()} are available for this unit.`}
        />
      ) : (
        <div className="divide-y divide-slate-100">
          {items.map(
            (item) => (
              <div
                key={item.id}
                className="flex flex-col justify-between gap-4 p-5 hover:bg-slate-50 md:flex-row md:items-center"
              >
                <div>
                  <h3 className="font-semibold text-slate-900">
                    {item.title}
                  </h3>

                  {item.description && (
                    <p className="mt-1 text-sm text-slate-500">
                      {
                        item.description
                      }
                    </p>
                  )}

                  {item.meta && (
                    <p className="mt-2 text-xs text-slate-400">
                      {item.meta}
                    </p>
                  )}
                </div>

                <a
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="h-fit rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700"
                >
                  Open
                </a>
              </div>
            )
          )}
        </div>
      )}
    </section>
  );
}

const inputClass =
  "w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-100";

const textareaClass =
  "w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm leading-6 text-slate-900 outline-none placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-100";

function toLocalDateTime(
  value: string | null
) {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const year =
    date.getFullYear();

  const month = String(
    date.getMonth() + 1
  ).padStart(2, "0");

  const day = String(
    date.getDate()
  ).padStart(2, "0");

  const hours = String(
    date.getHours()
  ).padStart(2, "0");

  const minutes = String(
    date.getMinutes()
  ).padStart(2, "0");

  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function formatDate(
  value: string
) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString(
    undefined,
    {
      dateStyle: "medium",
      timeStyle: "short",
    }
  );
}