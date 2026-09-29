"use client";

import { FormEvent, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "../../../../lib/supabase";

type Unit = {
  id: number;
  code: string | null;
  name: string | null;
  title: string | null;
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
  updated_at: string | null;
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

export default function LecturerAssignmentsPage() {
  const params = useParams();
  const router = useRouter();

  const unitId = Number(params.id);

  const [unit, setUnit] = useState<Unit | null>(null);
  const [assignments, setAssignments] = useState<Assignment[]>([]);

  const [form, setForm] = useState<FormState>(EMPTY_FORM);

  const [editingId, setEditingId] = useState<number | null>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    if (!unitId || Number.isNaN(unitId)) {
      setError("Invalid unit.");
      setLoading(false);
      return;
    }

    loadPage();
  }, [unitId]);

  async function loadPage() {
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
       * SECURITY:
       * Confirm that this lecturer is assigned to this unit.
       *
       * Admins are also allowed through so you can test the lecturer
       * workspace before a real lecturer joins.
       */
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();

      const isAdmin = profile?.role === "admin";

      const { data: lecturerUnit, error: lecturerUnitError } =
        await supabase
          .from("lecturer_units")
          .select("id")
          .eq("lecturer_id", user.id)
          .eq("unit_id", unitId)
          .maybeSingle();

      if (lecturerUnitError) {
        throw lecturerUnitError;
      }

      if (!lecturerUnit && !isAdmin) {
        setError(
          "You are not assigned to this unit and cannot manage its assignments."
        );
        return;
      }

      // Unit
      const { data: unitData, error: unitError } = await supabase
        .from("units")
        .select("id, code, name, title")
        .eq("id", unitId)
        .maybeSingle();

      if (unitError) throw unitError;

      if (!unitData) {
        setError("Unit not found.");
        return;
      }

      setUnit(unitData);

      // Assignments
      const { data: assignmentData, error: assignmentsError } =
        await supabase
          .from("assignments")
          .select("*")
          .eq("unit_id", unitId)
          .order("assignment_number", {
            ascending: true,
            nullsFirst: false,
          })
          .order("created_at", { ascending: true });

      if (assignmentsError) {
        throw assignmentsError;
      }

      setAssignments(assignmentData || []);
    } catch (err: any) {
      console.error(err);
      setError(err?.message || "Failed to load assignments.");
    } finally {
      setLoading(false);
    }
  }

  function updateForm<K extends keyof FormState>(
    field: K,
    value: FormState[K]
  ) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function resetForm() {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setShowForm(false);
  }

  function startCreate() {
    setSuccess("");
    setError("");

    setForm({
      ...EMPTY_FORM,
      assignment_number:
        assignments.length > 0
          ? String(
              Math.max(
                ...assignments.map(
                  (assignment) =>
                    assignment.assignment_number || 0
                )
              ) + 1
            )
          : "1",
    });

    setEditingId(null);
    setShowForm(true);
  }

  function startEdit(assignment: Assignment) {
    setSuccess("");
    setError("");

    setEditingId(assignment.id);

    setForm({
      title: assignment.title || "",
      description: assignment.description || "",
      assignment_number:
        assignment.assignment_number != null
          ? String(assignment.assignment_number)
          : "",
      due_date: toDateTimeLocal(assignment.due_date),
      available_from: toDateTimeLocal(
        assignment.available_from
      ),
      available_until: toDateTimeLocal(
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
        assignment.allowed_file_types?.join(",") ||
        ".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.csv",
      submission_type:
        assignment.submission_type === "file"
          ? "file"
          : assignment.submission_type === "text"
          ? "text"
          : "file_and_text",
      instructions: assignment.instructions || "",
      file_url: assignment.file_url || "",
    });

    setShowForm(true);
  }

  async function saveAssignment(event: FormEvent) {
    event.preventDefault();

    if (!form.title.trim()) {
      setError("Assignment title is required.");
      return;
    }

    const maxPoints = Number(form.max_points);

    if (
      Number.isNaN(maxPoints) ||
      maxPoints < 0
    ) {
      setError("Maximum points must be zero or greater.");
      return;
    }

    const assignmentNumber = form.assignment_number
      ? Number(form.assignment_number)
      : null;

    if (
      assignmentNumber !== null &&
      (!Number.isInteger(assignmentNumber) ||
        assignmentNumber < 1)
    ) {
      setError(
        "Assignment number must be a positive whole number."
      );
      return;
    }

    const maxAttempts = form.max_attempts
      ? Number(form.max_attempts)
      : null;

    if (
      maxAttempts !== null &&
      (!Number.isInteger(maxAttempts) ||
        maxAttempts < 1)
    ) {
      setError(
        "Maximum attempts must be a positive whole number."
      );
      return;
    }

    const allowedFileTypes =
      form.allowed_file_types
        .split(",")
        .map((type) => type.trim())
        .filter(Boolean);

    if (
      form.submission_type !== "text" &&
      allowedFileTypes.length === 0
    ) {
      setError(
        "Specify at least one allowed file type."
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

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      /*
       * We check assignment access again immediately before writing.
       * This is defense in depth; database RLS is still the real
       * security boundary.
       */
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();

      const isAdmin = profile?.role === "admin";

      const { data: lecturerUnit } = await supabase
        .from("lecturer_units")
        .select("id")
        .eq("lecturer_id", user.id)
        .eq("unit_id", unitId)
        .maybeSingle();

      if (!lecturerUnit && !isAdmin) {
        setError(
          "You are no longer assigned to this unit."
        );
        return;
      }

      const payload = {
        unit_id: unitId,
        title: form.title.trim(),
        description:
          form.description.trim() || null,
        assignment_number: assignmentNumber,
        due_date: form.due_date
          ? new Date(form.due_date).toISOString()
          : null,
        available_from: form.available_from
          ? new Date(
              form.available_from
            ).toISOString()
          : null,
        available_until: form.available_until
          ? new Date(
              form.available_until
            ).toISOString()
          : null,
        max_points: maxPoints,
        allow_resubmission:
          form.allow_resubmission,
        max_attempts: maxAttempts,
        allowed_file_types:
          form.submission_type === "text"
            ? null
            : allowedFileTypes,
        submission_type:
          form.submission_type,
        instructions:
          form.instructions.trim() || null,
        file_url:
          form.file_url.trim() || null,
        updated_at: new Date().toISOString(),
      };

      if (editingId !== null) {
        const { error: updateError } =
          await supabase
            .from("assignments")
            .update(payload)
            .eq("id", editingId)
            .eq("unit_id", unitId);

        if (updateError) {
          throw updateError;
        }

        setSuccess("Assignment updated successfully.");
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

        setSuccess("Assignment created successfully.");
      }

      resetForm();
      await loadPage();
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

  async function deleteAssignment(id: number) {
    const assignment = assignments.find(
      (item) => item.id === id
    );

    if (!assignment) return;

    const confirmed = window.confirm(
      `Delete "${assignment.title}"?\n\nThis may also remove associated student submissions because submissions reference the assignment.`
    );

    if (!confirmed) return;

    try {
      setDeletingId(id);
      setError("");
      setSuccess("");

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      const { error: deleteError } =
        await supabase
          .from("assignments")
          .delete()
          .eq("id", id)
          .eq("unit_id", unitId);

      if (deleteError) {
        throw deleteError;
      }

      setSuccess("Assignment deleted.");
      await loadPage();
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
          <div className="mt-4 h-9 w-80 rounded bg-slate-200" />

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            <div className="h-28 rounded-2xl bg-slate-200" />
            <div className="h-28 rounded-2xl bg-slate-200" />
            <div className="h-28 rounded-2xl bg-slate-200" />
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
              router.push(
                `/lecturer/units/${unitId}`
              )
            }
            className="mb-6 text-sm font-medium text-slate-600 hover:text-slate-900"
          >
            ← Back to Unit
          </button>

          <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
            <div className="text-4xl">🔒</div>

            <h1 className="mt-4 text-2xl font-bold text-slate-900">
              Assignment Manager
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

  const publishedLikeCount = assignments.filter(
    (assignment) =>
      assignment.available_from
        ? new Date(assignment.available_from) <=
          new Date()
        : true
  ).length;

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-7xl px-6 py-8">
        {/* Breadcrumb */}
        <button
          onClick={() =>
            router.push(
              `/lecturer/units/${unitId}`
            )
          }
          className="mb-6 text-sm font-medium text-slate-500 hover:text-slate-900"
        >
          ← Back to {unit?.code || unitName}
        </button>

        {/* Header */}
        <section className="rounded-3xl border border-slate-200 bg-white p-7 shadow-sm">
          <div className="flex flex-col justify-between gap-6 md:flex-row md:items-start">
            <div>
              <span className="inline-flex rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-700">
                {unit?.code || "UNIT"}
              </span>

              <h1 className="mt-4 text-3xl font-bold tracking-tight text-slate-900">
                Assignment Manager
              </h1>

              <p className="mt-2 text-slate-600">
                {unitName}
              </p>

              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500">
                Create and manage coursework for this
                assigned unit. Changes are restricted by
                lecturer-unit access and database RLS.
              </p>
            </div>

            <button
              onClick={startCreate}
              className="rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800"
            >
              + Create Assignment
            </button>
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

        {/* Stats */}
        <section className="mt-8 grid gap-4 sm:grid-cols-3">
          <StatCard
            icon="📝"
            label="Total Assignments"
            value={assignments.length}
          />

          <StatCard
            icon="📅"
            label="Currently Available"
            value={publishedLikeCount}
          />

          <StatCard
            icon="📊"
            label="Average Points"
            value={
              assignments.length
                ? Math.round(
                    assignments.reduce(
                      (sum, assignment) =>
                        sum +
                        Number(
                          assignment.max_points || 0
                        ),
                      0
                    ) / assignments.length
                  )
                : 0
            }
            suffix="pts"
          />
        </section>

        {/* Form */}
        {showForm && (
          <section className="mt-8 rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 p-6">
              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  {editingId !== null
                    ? "Edit Assignment"
                    : "Create Assignment"}
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Configure the complete assignment
                  submission rules.
                </p>
              </div>

              <button
                type="button"
                onClick={resetForm}
                className="rounded-lg px-3 py-2 text-sm text-slate-500 hover:bg-slate-100 hover:text-slate-900"
              >
                Close
              </button>
            </div>

            <form
              onSubmit={saveAssignment}
              className="space-y-8 p-6"
            >
              {/* Basic information */}
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
                      value={form.title}
                      onChange={(event) =>
                        updateForm(
                          "title",
                          event.target.value
                        )
                      }
                      placeholder="e.g. Assignment 1 — Data Analysis"
                      className={inputClass}
                      required
                    />
                  </Field>

                  <Field label="Assignment Number">
                    <input
                      type="number"
                      min="1"
                      value={form.assignment_number}
                      onChange={(event) =>
                        updateForm(
                          "assignment_number",
                          event.target.value
                        )
                      }
                      placeholder="1"
                      className={inputClass}
                    />
                  </Field>

                  <Field
                    label="Description"
                    className="md:col-span-2"
                  >
                    <textarea
                      value={form.description}
                      onChange={(event) =>
                        updateForm(
                          "description",
                          event.target.value
                        )
                      }
                      placeholder="Short description of the assignment..."
                      rows={3}
                      className={textareaClass}
                    />
                  </Field>

                  <Field
                    label="Instructions"
                    className="md:col-span-2"
                  >
                    <textarea
                      value={form.instructions}
                      onChange={(event) =>
                        updateForm(
                          "instructions",
                          event.target.value
                        )
                      }
                      placeholder="Detailed instructions for students..."
                      rows={6}
                      className={textareaClass}
                    />
                  </Field>
                </div>
              </div>

              {/* Dates */}
              <div>
                <h3 className="font-bold text-slate-900">
                  Availability & Deadlines
                </h3>

                <div className="mt-4 grid gap-5 md:grid-cols-3">
                  <Field label="Available From">
                    <input
                      type="datetime-local"
                      value={form.available_from}
                      onChange={(event) =>
                        updateForm(
                          "available_from",
                          event.target.value
                        )
                      }
                      className={inputClass}
                    />
                  </Field>

                  <Field label="Available Until">
                    <input
                      type="datetime-local"
                      value={form.available_until}
                      onChange={(event) =>
                        updateForm(
                          "available_until",
                          event.target.value
                        )
                      }
                      className={inputClass}
                    />
                  </Field>

                  <Field label="Due Date">
                    <input
                      type="datetime-local"
                      value={form.due_date}
                      onChange={(event) =>
                        updateForm(
                          "due_date",
                          event.target.value
                        )
                      }
                      className={inputClass}
                    />
                  </Field>
                </div>
              </div>

              {/* Grading */}
              <div>
                <h3 className="font-bold text-slate-900">
                  Grading & Attempts
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
                      value={form.max_points}
                      onChange={(event) =>
                        updateForm(
                          "max_points",
                          event.target.value
                        )
                      }
                      className={inputClass}
                      required
                    />
                  </Field>

                  <Field label="Maximum Attempts">
                    <input
                      type="number"
                      min="1"
                      step="1"
                      value={form.max_attempts}
                      onChange={(event) =>
                        updateForm(
                          "max_attempts",
                          event.target.value
                        )
                      }
                      placeholder="Unlimited"
                      className={inputClass}
                    />
                  </Field>

                  <div className="flex items-end">
                    <label className="flex min-h-12 w-full cursor-pointer items-center gap-3 rounded-xl border border-slate-200 px-4">
                      <input
                        type="checkbox"
                        checked={
                          form.allow_resubmission
                        }
                        onChange={(event) =>
                          updateForm(
                            "allow_resubmission",
                            event.target.checked
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

              {/* Submission */}
              <div>
                <h3 className="font-bold text-slate-900">
                  Submission Settings
                </h3>

                <div className="mt-4 grid gap-5 md:grid-cols-2">
                  <Field label="Submission Type">
                    <select
                      value={form.submission_type}
                      onChange={(event) =>
                        updateForm(
                          "submission_type",
                          event.target
                            .value as FormState["submission_type"]
                        )
                      }
                      className={inputClass}
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
                      value={form.allowed_file_types}
                      onChange={(event) =>
                        updateForm(
                          "allowed_file_types",
                          event.target.value
                        )
                      }
                      disabled={
                        form.submission_type ===
                        "text"
                      }
                      placeholder=".pdf,.docx,.pptx"
                      className={inputClass}
                    />

                    <p className="mt-2 text-xs text-slate-400">
                      Separate extensions with commas.
                    </p>
                  </Field>

                  <Field
                    label="Resource / Reference File URL"
                    className="md:col-span-2"
                  >
                    <input
                      type="url"
                      value={form.file_url}
                      onChange={(event) =>
                        updateForm(
                          "file_url",
                          event.target.value
                        )
                      }
                      placeholder="Optional existing resource URL"
                      className={inputClass}
                    />
                  </Field>
                </div>
              </div>

              {/* Submit */}
              <div className="flex flex-col-reverse justify-end gap-3 border-t border-slate-100 pt-6 sm:flex-row">
                <button
                  type="button"
                  onClick={resetForm}
                  className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving
                    ? "Saving..."
                    : editingId !== null
                    ? "Save Changes"
                    : "Create Assignment"}
                </button>
              </div>
            </form>
          </section>
        )}

        {/* Assignment list */}
        <section className="mt-8 rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 p-6">
            <h2 className="text-xl font-bold text-slate-900">
              Assignments
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              {assignments.length} assignment
              {assignments.length === 1 ? "" : "s"} in this
              unit.
            </p>
          </div>

          {assignments.length === 0 ? (
            <div className="p-12 text-center">
              <div className="text-5xl">📝</div>

              <h3 className="mt-4 font-bold text-slate-900">
                No assignments yet
              </h3>

              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
                Create the first assignment for this unit
                using the button above.
              </p>

              <button
                onClick={startCreate}
                className="mt-6 rounded-xl bg-slate-900 px-5 py-3 text-sm font-medium text-white hover:bg-slate-800"
              >
                + Create Assignment
              </button>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {assignments.map(
                (assignment, index) => (
                  <AssignmentRow
                    key={assignment.id}
                    assignment={assignment}
                    index={index}
                    onEdit={() =>
                      startEdit(assignment)
                    }
                    onDelete={() =>
                      deleteAssignment(
                        assignment.id
                      )
                    }
                    deleting={
                      deletingId === assignment.id
                    }
                  />
                )
              )}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

/* -------------------------------------------------------------------------- */
/* ASSIGNMENT ROW                                                             */
/* -------------------------------------------------------------------------- */

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

  const available =
    !assignment.available_from ||
    new Date(assignment.available_from) <= now;

  const closed =
    !!assignment.available_until &&
    new Date(assignment.available_until) < now;

  let status = "Available";

  if (!available) {
    status = "Scheduled";
  } else if (closed) {
    status = "Closed";
  }

  return (
    <div className="p-6 transition hover:bg-slate-50">
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

              <span
                className={`rounded-lg px-2.5 py-1 text-xs font-semibold ${
                  status === "Available"
                    ? "bg-green-50 text-green-700"
                    : status === "Scheduled"
                    ? "bg-blue-50 text-blue-700"
                    : "bg-slate-100 text-slate-600"
                }`}
              >
                {status}
              </span>
            </div>

            {assignment.description && (
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
                {assignment.description}
              </p>
            )}

            <div className="mt-3 flex flex-wrap gap-2">
              {assignment.max_points != null && (
                <MetaBadge>
                  {assignment.max_points} points
                </MetaBadge>
              )}

              {assignment.due_date && (
                <MetaBadge>
                  Due {formatDateTime(
                    assignment.due_date
                  )}
                </MetaBadge>
              )}

              <MetaBadge>
                {assignment.submission_type ===
                "file_and_text"
                  ? "File + Text"
                  : assignment.submission_type ===
                    "file"
                  ? "File"
                  : "Text"}
              </MetaBadge>

              {assignment.allow_resubmission && (
                <MetaBadge>
                  Resubmission allowed
                </MetaBadge>
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

          <a
            href={`/admin/gradebook?assignment=${assignment.id}`}
            className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-white"
          >
            Gradebook
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
            {deleting ? "Deleting..." : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* UI HELPERS                                                                 */
/* -------------------------------------------------------------------------- */

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

function StatCard({
  icon,
  label,
  value,
  suffix,
}: {
  icon: string;
  label: string;
  value: number;
  suffix?: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <span className="text-2xl">{icon}</span>

        <span className="text-2xl font-bold text-slate-900">
          {value}
          {suffix && (
            <span className="ml-1 text-sm font-medium text-slate-400">
              {suffix}
            </span>
          )}
        </span>
      </div>

      <p className="mt-4 text-sm font-medium text-slate-500">
        {label}
      </p>
    </div>
  );
}

function MetaBadge({
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

const inputClass =
  "w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-100";

const textareaClass =
  "w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm leading-6 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-100";

/* -------------------------------------------------------------------------- */
/* DATE HELPERS                                                               */
/* -------------------------------------------------------------------------- */

function toDateTimeLocal(
  value: string | null
) {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const year = date.getFullYear();
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

function formatDateTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}