
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

// Create a supabase client here to avoid import path issues from other modules.
const supabase: SupabaseClient = createClient(
  // These env vars should be defined in your Next.js environment.
  // NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
);

type Unit = {
  id: number;
  name: string;
  code: string;
};

type Cat = {
  id: number;
  unit_id: number;
  title: string;
  description: string | null;
  file_url: string | null;
  created_at: string;
};

export default function AdminCatsPage() {
  const [units, setUnits] = useState<Unit[]>([]);
  const [cats, setCats] = useState<Cat[]>([]);

  const [unitId, setUnitId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);

  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    initialisePage();
  }, []);

  async function initialisePage() {
    setLoading(true);

    await Promise.all([
      loadUnits(),
      loadCats(),
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

  async function loadCats() {
    const { data, error } = await supabase
      .from("cats")
      .select(
        `
        id,
        unit_id,
        title,
        description,
        file_url,
        created_at
        `
      )
      .order("created_at", {
        ascending: false,
      });

    if (error) {
      console.error("CATs:", error);
      setError(error.message);
      return;
    }

    setCats(data ?? []);
  }

  async function handleUpload(
    e: React.FormEvent<HTMLFormElement>
  ) {
    e.preventDefault();

    setMessage("");
    setError("");

    if (!unitId) {
      setError("Please select a unit.");
      return;
    }

    if (!title.trim()) {
      setError("Please enter a CAT title.");
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

    const maxSize = 20 * 1024 * 1024;

    if (file.size > maxSize) {
      setError("PDF must be smaller than 20 MB.");
      return;
    }

    setUploading(true);

    try {
      // ---------------------------------------------
      // CHECK LOGIN
      // ---------------------------------------------

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        throw new Error("You must be logged in.");
      }

      // ---------------------------------------------
      // CHECK ADMIN
      // ---------------------------------------------

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
          "You do not have permission to upload CATs."
        );
      }

      // ---------------------------------------------
      // CREATE FILE PATH
      // ---------------------------------------------

      const safeName = file.name
        .replace(/[^a-zA-Z0-9._-]/g, "_")
        .replace(/\.pdf$/i, "");

      const uniqueName =
        `${Date.now()}-${crypto.randomUUID()}`;

      const filePath =
        `${unitId}/${uniqueName}-${safeName}.pdf`;

      // ---------------------------------------------
      // UPLOAD PDF
      // ---------------------------------------------

      const { error: uploadError } =
        await supabase.storage
          .from("cats")
          .upload(filePath, file, {
            cacheControl: "3600",
            upsert: false,
            contentType: "application/pdf",
          });

      if (uploadError) {
        console.error(
          "Storage upload:",
          uploadError
        );

        throw new Error(uploadError.message);
      }

      // ---------------------------------------------
      // GET PUBLIC URL
      // ---------------------------------------------

      const { data: publicUrlData } =
        supabase.storage
          .from("cats")
          .getPublicUrl(filePath);

      const fileUrl =
        publicUrlData.publicUrl;

      // ---------------------------------------------
      // INSERT DATABASE RECORD
      // ---------------------------------------------

      const { error: insertError } =
        await supabase
          .from("cats")
          .insert({
            unit_id: Number(unitId),
            title: title.trim(),
            description:
              description.trim() || null,
            file_url: fileUrl,
          });

      // ---------------------------------------------
      // CLEAN STORAGE IF INSERT FAILS
      // ---------------------------------------------

      if (insertError) {
        console.error(
          "Database insert:",
          insertError
        );

        await supabase.storage
          .from("cats")
          .remove([filePath]);

        throw new Error(
          insertError.message
        );
      }

      // ---------------------------------------------
      // SUCCESS
      // ---------------------------------------------

      setMessage(
        "CAT uploaded successfully."
      );

      setUnitId("");
      setTitle("");
      setDescription("");
      setFile(null);

      const fileInput =
        document.getElementById(
          "cat-file"
        ) as HTMLInputElement | null;

      if (fileInput) {
        fileInput.value = "";
      }

      await loadCats();
    } catch (err) {
      console.error(
        "CAT upload error:",
        err
      );

      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError(
          "Something went wrong while uploading."
        );
      }
    } finally {
      setUploading(false);
    }
  }

  async function deleteCat(cat: Cat) {
    const confirmed = window.confirm(
      `Delete "${cat.title}"?`
    );

    if (!confirmed) return;

    setError("");
    setMessage("");

    try {
      const marker =
        "/storage/v1/object/public/cats/";

      let filePath = "";

      if (cat.file_url?.includes(marker)) {
        filePath =
          cat.file_url.split(marker)[1];
      }

      const { error: deleteError } =
        await supabase
          .from("cats")
          .delete()
          .eq("id", cat.id);

      if (deleteError) {
        throw new Error(
          deleteError.message
        );
      }

      if (filePath) {
        const { error: storageError } =
          await supabase.storage
            .from("cats")
            .remove([filePath]);

        if (storageError) {
          console.error(
            "Storage delete:",
            storageError
          );
        }
      }

      setMessage(
        "CAT deleted successfully."
      );

      await loadCats();
    } catch (err) {
      console.error(
        "Delete error:",
        err
      );

      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Failed to delete CAT.");
      }
    }
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
        <p className="text-gray-400">
          Loading CATs...
        </p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 p-6 text-white">
      <div className="mx-auto max-w-6xl">

        {/* HEADER */}

        <div className="mb-8">
          <Link
            href="/dashboard"
            className="text-sm text-gray-400 hover:text-cyan-400"
          >
            ← Back to Dashboard
          </Link>

          <h1 className="mt-5 text-3xl font-bold text-cyan-400">
            Manage CATs
          </h1>

          <p className="mt-2 text-gray-400">
            Upload and manage Continuous Assessment Tests.
          </p>
        </div>

        {/* SUCCESS */}

        {message && (
          <div className="mb-6 rounded-lg border border-green-500/20 bg-green-500/10 p-4 text-green-400">
            {message}
          </div>
        )}

        {/* ERROR */}

        {error && (
          <div className="mb-6 rounded-lg border border-red-500/20 bg-red-500/10 p-4 text-red-400">
            {error}
          </div>
        )}

        {/* UPLOAD */}

        <section className="mb-10 rounded-2xl border border-slate-800 bg-slate-900 p-6">

          <h2 className="mb-6 text-xl font-semibold">
            Upload New CAT
          </h2>

          <form
            onSubmit={handleUpload}
            className="space-y-5"
          >

            {/* UNIT */}

            <div>
              <label
                htmlFor="unit"
                className="mb-2 block text-sm text-gray-300"
              >
                Unit
              </label>

              <select
                id="unit"
                value={unitId}
                onChange={(e) =>
                  setUnitId(e.target.value)
                }
                className="w-full rounded-lg border border-slate-700 bg-slate-800 p-3 text-white outline-none focus:border-cyan-500"
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

            {/* TITLE */}

            <div>
              <label
                htmlFor="title"
                className="mb-2 block text-sm text-gray-300"
              >
                CAT Title
              </label>

              <input
                id="title"
                type="text"
                value={title}
                onChange={(e) =>
                  setTitle(e.target.value)
                }
                placeholder="e.g. CAT 1 — Introduction"
                className="w-full rounded-lg border border-slate-700 bg-slate-800 p-3 text-white outline-none placeholder:text-gray-600 focus:border-cyan-500"
              />
            </div>

            {/* DESCRIPTION */}

            <div>
              <label
                htmlFor="description"
                className="mb-2 block text-sm text-gray-300"
              >
                Description
              </label>

              <textarea
                id="description"
                value={description}
                onChange={(e) =>
                  setDescription(e.target.value)
                }
                placeholder="Optional description"
                rows={4}
                className="w-full rounded-lg border border-slate-700 bg-slate-800 p-3 text-white outline-none placeholder:text-gray-600 focus:border-cyan-500"
              />
            </div>

            {/* FILE */}

            <div>
              <label
                htmlFor="cat-file"
                className="mb-2 block text-sm text-gray-300"
              >
                CAT PDF
              </label>

              <input
                id="cat-file"
                type="file"
                accept="application/pdf,.pdf"
                onChange={(e) =>
                  setFile(
                    e.target.files?.[0] ?? null
                  )
                }
                className="block w-full cursor-pointer rounded-lg border border-slate-700 bg-slate-800 p-3 text-sm text-gray-300 file:mr-4 file:rounded file:border-0 file:bg-cyan-500 file:px-4 file:py-2 file:font-semibold file:text-white hover:file:bg-cyan-600"
              />

              <p className="mt-2 text-xs text-gray-500">
                PDF only. Maximum size: 20 MB.
              </p>
            </div>

            {/* BUTTON */}

            <button
              type="submit"
              disabled={uploading}
              className="w-full rounded-lg bg-cyan-500 p-3 font-semibold text-white transition hover:bg-cyan-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {uploading
                ? "Uploading..."
                : "Upload CAT"}
            </button>

          </form>
        </section>

        {/* EXISTING CATS */}

        <section>

          <div className="mb-5">
            <h2 className="text-xl font-semibold">
              Uploaded CATs
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              {cats.length}{" "}
              {cats.length === 1
                ? "CAT"
                : "CATs"}
            </p>
          </div>

          {cats.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-900 p-10 text-center text-gray-500">
              No CATs uploaded yet.
            </div>
          ) : (
            <div className="space-y-4">

              {cats.map((cat) => {

                const unit =
                  units.find(
                    (item) =>
                      item.id ===
                      cat.unit_id
                  );

                return (
                  <div
                    key={cat.id}
                    className="flex flex-col gap-4 rounded-xl border border-slate-800 bg-slate-900 p-5 md:flex-row md:items-center md:justify-between"
                  >

                    <div>
                      <div className="mb-1 text-xs font-semibold text-cyan-400">
                        {unit?.code ??
                          "Unknown Unit"}
                      </div>

                      <h3 className="text-lg font-semibold">
                        {cat.title}
                      </h3>

                      {cat.description && (
                        <p className="mt-1 text-sm text-gray-400">
                          {cat.description}
                        </p>
                      )}

                      <p className="mt-2 text-xs text-gray-600">
                        {new Date(
                          cat.created_at
                        ).toLocaleDateString()}
                      </p>
                    </div>

                    <div className="flex gap-3">

                      {cat.file_url && (
                        <a
                          href={cat.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-semibold hover:bg-slate-700"
                        >
                          View CAT
                        </a>
                      )}

                      <button
                        type="button"
                        onClick={() =>
                          deleteCat(cat)
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