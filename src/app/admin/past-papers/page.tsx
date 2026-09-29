"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "../../lib/supabase";


type Unit = {
  id: number;
  name: string;
  code: string;
};

type PastPaper = {
  id: number;
  unit_id: number;
  title: string;
  description: string | null;
  file_url: string;
  exam_year: number | null;
  exam_type: string | null;
  created_at: string;
};

export default function AdminPastPapersPage() {
  const [units, setUnits] = useState<Unit[]>([]);
  const [papers, setPapers] = useState<PastPaper[]>([]);

  const [unitId, setUnitId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [examYear, setExamYear] = useState("");
  const [examType, setExamType] = useState("End Semester");
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
      loadPapers(),
    ]);

    setLoading(false);
  }

  async function loadUnits() {
    const { data, error } = await supabase
      .from("units")
      .select("id, name, code")
      .order("code");

    if (error) {
      setError(error.message);
      return;
    }

    setUnits(data ?? []);
  }

  async function loadPapers() {
    const { data, error } = await supabase
      .from("past_papers")
      .select(`
        id,
        unit_id,
        title,
        description,
        file_url,
        exam_year,
        exam_type,
        created_at
      `)
      .order("exam_year", {
        ascending: false,
      });

    if (error) {
      setError(error.message);
      return;
    }

    setPapers(data ?? []);
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
      setError("Please enter a title.");
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
          "You do not have permission to upload past papers."
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
          .from("past_papers")
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
          .from("past_papers")
          .getPublicUrl(filePath);

      const fileUrl =
        publicUrlData.publicUrl;

      const { error: insertError } =
        await supabase
          .from("past_papers")
          .insert({
            unit_id: Number(unitId),
            title: title.trim(),
            description:
              description.trim() || null,
            file_url: fileUrl,
            exam_year: examYear
              ? Number(examYear)
              : null,
            exam_type:
              examType.trim() || null,
          });

      if (insertError) {
        await supabase.storage
          .from("past_papers")
          .remove([filePath]);

        throw new Error(insertError.message);
      }

      setMessage(
        "Past paper uploaded successfully."
      );

      setUnitId("");
      setTitle("");
      setDescription("");
      setExamYear("");
      setExamType("End Semester");
      setFile(null);

      const input =
        document.getElementById(
          "past-paper-file"
        ) as HTMLInputElement | null;

      if (input) {
        input.value = "";
      }

      await loadPapers();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to upload past paper."
      );
    } finally {
      setUploading(false);
    }
  }

  async function deletePaper(
    paper: PastPaper
  ) {
    const confirmed = window.confirm(
      `Delete "${paper.title}"?`
    );

    if (!confirmed) return;

    setError("");
    setMessage("");

    try {
      const marker =
        "/storage/v1/object/public/past_papers/";

      let filePath = "";

      if (paper.file_url.includes(marker)) {
        filePath =
          paper.file_url.split(marker)[1];
      }

      const { error: deleteError } =
        await supabase
          .from("past_papers")
          .delete()
          .eq("id", paper.id);

      if (deleteError) {
        throw new Error(deleteError.message);
      }

      if (filePath) {
        await supabase.storage
          .from("past_papers")
          .remove([filePath]);
      }

      setMessage(
        "Past paper deleted successfully."
      );

      await loadPapers();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to delete past paper."
      );
    }
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
        <p className="text-gray-400">
          Loading past papers...
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
          Manage Past Papers
        </h1>

        <p className="mt-2 text-gray-400">
          Upload and manage previous examination papers.
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

        <section className="mt-8 rounded-2xl border border-slate-800 bg-slate-900 p-6">

          <h2 className="mb-6 text-xl font-semibold">
            Upload Past Paper
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
                Exam Year
              </label>

              <input
                type="number"
                value={examYear}
                onChange={(e) =>
                  setExamYear(e.target.value)
                }
                placeholder="e.g. 2025"
                className="w-full rounded-lg border border-slate-700 bg-slate-800 p-3 text-white"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm text-gray-300">
                Exam Type
              </label>

              <select
                value={examType}
                onChange={(e) =>
                  setExamType(e.target.value)
                }
                className="w-full rounded-lg border border-slate-700 bg-slate-800 p-3 text-white"
              >
                <option>
                  End Semester
                </option>
                <option>
                  Main Examination
                </option>
                <option>
                  Supplementary
                </option>
                <option>
                  Special Examination
                </option>
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm text-gray-300">
                Title
              </label>

              <input
                type="text"
                value={title}
                onChange={(e) =>
                  setTitle(e.target.value)
                }
                placeholder="e.g. Computer Programming End Semester Exam"
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
                placeholder="Optional description"
                className="w-full rounded-lg border border-slate-700 bg-slate-800 p-3 text-white"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm text-gray-300">
                PDF File
              </label>

              <input
                id="past-paper-file"
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
                : "Upload Past Paper"}
            </button>

          </form>
        </section>

        <section className="mt-10">

          <h2 className="text-xl font-semibold">
            Uploaded Past Papers
          </h2>

          <p className="mt-1 text-sm text-gray-500">
            {papers.length}{" "}
            {papers.length === 1
              ? "past paper"
              : "past papers"}
          </p>

          {papers.length === 0 ? (

            <div className="mt-5 rounded-2xl border border-dashed border-slate-700 bg-slate-900 p-10 text-center text-gray-500">
              No past papers uploaded yet.
            </div>

          ) : (

            <div className="mt-5 space-y-4">

              {papers.map((paper) => {

                const unit =
                  units.find(
                    (item) =>
                      item.id === paper.unit_id
                  );

                return (
                  <div
                    key={paper.id}
                    className="flex flex-col gap-4 rounded-xl border border-slate-800 bg-slate-900 p-5 md:flex-row md:items-center md:justify-between"
                  >

                    <div>

                      <p className="text-xs font-semibold text-cyan-400">
                        {unit?.code ??
                          "Unknown Unit"}
                      </p>

                      <h3 className="text-lg font-semibold">
                        {paper.title}
                      </h3>

                      <p className="mt-1 text-sm text-gray-400">
                        {paper.exam_year ??
                          "Year not specified"}
                        {" • "}
                        {paper.exam_type ??
                          "Examination"}
                      </p>

                    </div>

                    <div className="flex gap-3">

                      <a
                        href={paper.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-semibold hover:bg-slate-700"
                      >
                        View PDF
                      </a>

                      <button
                        type="button"
                        onClick={() =>
                          deletePaper(paper)
                        }
                        className="rounded-lg bg-red-500/10 px-4 py-2 text-sm font-semibold text-red-400 hover:bg-red-500/20"
                      >
                        Delete
                      </button>

                    </div>

                  </div>
                );
              })}

            </div>
          )}

        </section>

      </div>
    </main>
  );
}