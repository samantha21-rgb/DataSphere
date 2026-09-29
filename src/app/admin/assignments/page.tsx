"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

const supabase: SupabaseClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
);

type Unit = {
  id: number;
  name: string;
  code: string;
};

type Assignment = {
  id: number;
  unit_id: number;
  title: string;
  description: string | null;
  file_url: string;
  assignment_number: number | null;
  created_at: string;
};

export default function AdminAssignmentsPage() {
  const [units, setUnits] = useState<Unit[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);

  const [unitId, setUnitId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [assignmentNumber, setAssignmentNumber] = useState("");

  const [file, setFile] = useState<File | null>(null);

  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    initialise();
  }, []);

  async function initialise() {
    setLoading(true);

    await Promise.all([
      loadUnits(),
      loadAssignments(),
    ]);

    setLoading(false);
  }

  async function loadUnits() {
    const { data, error } = await supabase
      .from("units")
      .select("id, name, code")
      .order("code");

    if (error) {
      console.error("Units:", error);
      setError(error.message);
      return;
    }

    setUnits(data ?? []);
  }

  async function loadAssignments() {
    const { data, error } = await supabase
      .from("assignments")
      .select(
        `
          id,
          unit_id,
          title,
          description,
          file_url,
          assignment_number,
          created_at
        `
      )
      .order("created_at", {
        ascending: false,
      });

    if (error) {
      console.error("Assignments:", error);
      
      setError(error.message);
      return;
    }

    setAssignments(data ?? []);
  }

  async function handleUpload(
    e: React.FormEvent
  ) {
    e.preventDefault();

    setMessage("");
    setError("");

    if (!unitId) {
      setError("Please select a unit.");
      return;
    }

    if (!title.trim()) {
      setError("Please enter an assignment title.");
      return;
    }

    if (!file) {
      setError("Please select a PDF file.");
      return;
    }

    if (file.type !== "application/pdf") {
      setError("Only PDF files are allowed.");
      return;
    }

    if (file.size > 20 * 1024 * 1024) {
      setError("PDF must be smaller than 20 MB.");
      return;
    }

    setUploading(true);

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        throw new Error("You must be logged in.");
      }

      const { data: profile, error: profileError } =
        await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .maybeSingle();

      if (profileError) {
        throw new Error(profileError.message);
      }

      if (profile?.role !== "admin") {
        throw new Error(
          "You do not have permission to upload assignments."
        );
      }

      const safeName = file.name
        .replace(/[^a-zA-Z0-9._-]/g, "_")
        .replace(/\.pdf$/i, "");

      const uniqueName =
        `${Date.now()}-${crypto.randomUUID()}`;

      const filePath =
        `${unitId}/${uniqueName}-${safeName}.pdf`;

      const { error: uploadError } =
        await supabase.storage
          .from("assignments")
          .upload(filePath, file, {
            cacheControl: "3600",
            upsert: false,
            contentType: "application/pdf",
          });

      if (uploadError) {
        throw new Error(uploadError.message);
      }

      const { data: publicUrlData } =
        supabase.storage
          .from("assignments")
          .getPublicUrl(filePath);

      const fileUrl =
        publicUrlData.publicUrl;

      const { error: insertError } =
        await supabase
          .from("assignments")
          .insert({
            unit_id: Number(unitId),
            title: title.trim(),
            description:
              description.trim() || null,
            file_url: fileUrl,
            assignment_number:
              assignmentNumber
                ? Number(assignmentNumber)
                : null,
          });

      if (insertError) {
        await supabase.storage
          .from("assignments")
          .remove([filePath]);

        throw new Error(insertError.message);
      }

      setMessage(
        "Assignment uploaded successfully."
      );

      setUnitId("");
      setTitle("");
      setDescription("");
      setAssignmentNumber("");
      setFile(null);

      const input =
        document.getElementById(
          "assignment-file"
        ) as HTMLInputElement | null;

      if (input) {
        input.value = "";
      }

      await loadAssignments();
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "Failed to upload assignment."
      );
    } finally {
      setUploading(false);
    }
  }

  async function deleteAssignment(
    assignment: Assignment
  ) {
    const confirmed = window.confirm(
      `Delete "${assignment.title}"?`
    );

    if (!confirmed) return;

    setError("");
    setMessage("");

    try {
      const marker =
        "/storage/v1/object/public/assignments/";

      let filePath = "";

      if (assignment.file_url.includes(marker)) {
        filePath =
          assignment.file_url.split(marker)[1];
      }

      const { error: deleteError } =
        await supabase
          .from("assignments")
          .delete()
          .eq("id", assignment.id);

      if (deleteError) {
        throw new Error(deleteError.message);
      }

      if (filePath) {
        await supabase.storage
          .from("assignments")
          .remove([filePath]);
      }

      setMessage(
        "Assignment deleted successfully."
      );

      await loadAssignments();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to delete assignment."
      );
    }
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
        <p className="text-gray-400">
          Loading assignments...
        </p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 p-6 text-white">
      <div className="mx-auto max-w-6xl">

        <Link
          href="/dashboard"
          className="text-sm text-gray-400 hover:text-cyan-400"
        >
          ← Back to Dashboard
        </Link>

        <h1 className="mt-5 text-3xl font-bold text-cyan-400">
          Manage Assignments
        </h1>

        <p className="mt-2 text-gray-400">
          Upload and manage unit assignments.
        </p>

        {message && (
          <div className="mt-6 rounded-lg border border-green-500/20 bg-green-500/10 p-4 text-green-400">
            {message}
          </div>
        )}

        {error && (
          <div className="mt-6 rounded-lg border border-red-500/20 bg-red-500/10 p-4 text-red-400">
            {error}
          </div>
        )}

        {/* UPLOAD */}

        <section className="mt-8 rounded-2xl border border-slate-800 bg-slate-900 p-6">

          <h2 className="mb-6 text-xl font-semibold">
            Upload Assignment
          </h2>

          <form
            onSubmit={handleUpload}
            className="space-y-5"
          >

            <div>
              <label className="mb-2 block text-sm text-gray-300">
                Unit
              </label>

              <select
                value={unitId}
                onChange={(e) =>
                  setUnitId(e.target.value)
                }
                className="w-full rounded-lg border border-slate-700 bg-slate-800 p-3 text-white"
              >
                <option value="">
                  Select Unit
                </option>

                {units.map((unit) => (
                  <option
                    key={unit.id}
                    value={unit.id}
                  >
                    {unit.code} — {unit.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm text-gray-300">
                Assignment Number
              </label>

              <input
                type="number"
                min="1"
                value={assignmentNumber}
                onChange={(e) =>
                  setAssignmentNumber(
                    e.target.value
                  )
                }
                placeholder="e.g. 1"
                className="w-full rounded-lg border border-slate-700 bg-slate-800 p-3 text-white"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm text-gray-300">
                Assignment Title
              </label>

              <input
                type="text"
                value={title}
                onChange={(e) =>
                  setTitle(e.target.value)
                }
                placeholder="e.g. Python Programming Assignment 1"
                className="w-full rounded-lg border border-slate-700 bg-slate-800 p-3 text-white"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm text-gray-300">
                Description
              </label>

              <textarea
                rows={4}
                value={description}
                onChange={(e) =>
                  setDescription(e.target.value)
                }
                placeholder="Optional assignment description"
                className="w-full rounded-lg border border-slate-700 bg-slate-800 p-3 text-white"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm text-gray-300">
                PDF File
              </label>

              <input
                id="assignment-file"
                type="file"
                accept="application/pdf,.pdf"
                onChange={(e) =>
                  setFile(
                    e.target.files?.[0] ?? null
                  )
                }
                className="block w-full rounded-lg border border-slate-700 bg-slate-800 p-3 text-sm text-gray-300"
              />

              <p className="mt-2 text-xs text-gray-500">
                PDF only. Maximum 20 MB.
              </p>
            </div>

            <button
              type="submit"
              disabled={uploading}
              className="w-full rounded-lg bg-cyan-500 p-3 font-semibold hover:bg-cyan-600 disabled:opacity-50"
            >
              {uploading
                ? "Uploading..."
                : "Upload Assignment"}
            </button>

          </form>
        </section>

        {/* EXISTING ASSIGNMENTS */}

        <section className="mt-10">

          <h2 className="text-xl font-semibold">
            Uploaded Assignments
          </h2>

          <p className="mt-1 text-sm text-gray-500">
            {assignments.length}{" "}
            {assignments.length === 1
              ? "assignment"
              : "assignments"}
          </p>

          {assignments.length === 0 ? (
            <div className="mt-5 rounded-2xl border border-dashed border-slate-700 bg-slate-900 p-10 text-center text-gray-500">
              No assignments uploaded yet.
            </div>
          ) : (
            <div className="mt-5 space-y-4">

              {assignments.map(
                (assignment) => {

                  const unit =
                    units.find(
                      (item) =>
                        item.id ===
                        assignment.unit_id
                    );

                  return (
                    <div
                      key={assignment.id}
                      className="flex flex-col gap-4 rounded-xl border border-slate-800 bg-slate-900 p-5 md:flex-row md:items-center md:justify-between"
                    >

                      <div>

                        <p className="text-xs font-semibold text-cyan-400">
                          {unit?.code ??
                            "Unknown Unit"}
                        </p>

                        <h3 className="text-lg font-semibold">
                          {assignment.assignment_number
                            ? `Assignment ${assignment.assignment_number}: `
                            : ""}
                          {assignment.title}
                        </h3>

                        {assignment.description && (
                          <p className="mt-1 text-sm text-gray-400">
                            {assignment.description}
                          </p>
                        )}

                      </div>

                      <div className="flex gap-3">

                        <a
                          href={
                            assignment.file_url
                          }
                          target="_blank"
                          rel="noopener noreferrer"
                          className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-semibold hover:bg-slate-700"
                        >
                          View PDF
                        </a>

                        <button
                          type="button"
                          onClick={() =>
                            deleteAssignment(
                              assignment
                            )
                          }
                          className="rounded-lg bg-red-500/10 px-4 py-2 text-sm font-semibold text-red-400 hover:bg-red-500/20"
                        >
                          Delete
                        </button>

                      </div>

                    </div>
                  );
                }
              )}

            </div>
          )}

        </section>

      </div>
    </main>
  );
}