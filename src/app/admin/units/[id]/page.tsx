"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "../../../lib/supabase";

type Unit = {
  id: number;
  semester_id: number;
  name: string;
  code: string;
  description: string | null;
  created_at: string;
};

type Note = {
  id: number;
  unit_id: number;
  title: string;
  description: string | null;
  file_url: string;
  created_at: string;
};

type Cat = {
  id: number;
  unit_id: number;
  title: string;
  description: string | null;
  file_url: string | null;
  created_at: string;
};

export default function UnitPage() {
  const params = useParams();

  const id = params?.id;
  const unitId = Number(id);

  const [unit, setUnit] = useState<Unit | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [cats, setCats] = useState<Cat[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id || Number.isNaN(unitId)) {
      setError("Invalid unit ID.");
      setLoading(false);
      return;
    }

    loadUnit();
  }, [id]);

  async function loadUnit() {
    setLoading(true);
    setError("");

    try {
      // ==========================================
      // LOAD UNIT
      // ==========================================

      const { data: unitData, error: unitError } =
        await supabase
          .from("units")
          .select(
            `
              id,
              semester_id,
              name,
              code,
              description,
              created_at
            `
          )
          .eq("id", unitId)
          .maybeSingle();

      if (unitError) {
        console.error("Unit error:", unitError);
        throw new Error(unitError.message);
      }

      if (!unitData) {
        setError("Unit not found.");
        setUnit(null);
        setNotes([]);
        setCats([]);
        setLoading(false);
        return;
      }

      setUnit(unitData);

      // ==========================================
      // LOAD NOTES AND CATS
      // ==========================================

      const [notesResult, catsResult] =
        await Promise.all([
          supabase
            .from("notes")
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
            .eq("unit_id", unitId)
            .order("created_at", {
              ascending: false,
            }),

          supabase
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
            .eq("unit_id", unitId)
            .order("created_at", {
              ascending: false,
            }),
        ]);

      if (notesResult.error) {
        console.error(
          "Notes error:",
          notesResult.error
        );
        throw new Error(
          notesResult.error.message
        );
      }

      if (catsResult.error) {
        console.error(
          "CATs error:",
          catsResult.error
        );
        throw new Error(
          catsResult.error.message
        );
      }

      setNotes(notesResult.data ?? []);
      setCats(catsResult.data ?? []);
    } catch (err) {
      console.error(
        "Load unit error:",
        err
      );

      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Failed to load unit.");
      }
    } finally {
      setLoading(false);
    }
  }

  // ==========================================
  // LOADING
  // ==========================================

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
        <div className="text-center">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-slate-700 border-t-cyan-400" />

          <p className="text-gray-400">
            Loading unit...
          </p>
        </div>
      </main>
    );
  }

  // ==========================================
  // ERROR
  // ==========================================

  if (error || !unit) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 p-6 text-white">
        <div className="w-full max-w-lg rounded-2xl border border-red-500/20 bg-slate-900 p-8 text-center">
          <div className="mb-4 text-5xl">
            ⚠️
          </div>

          <h1 className="mb-2 text-2xl font-bold">
            Unit Not Found
          </h1>

          <p className="mb-6 text-gray-400">
            {error ||
              "We could not find this unit."}
          </p>

          <Link
            href="/profile"
            className="inline-block rounded-lg bg-cyan-500 px-5 py-3 font-semibold text-white transition hover:bg-cyan-600"
          >
            Back to Profile
          </Link>
        </div>
      </main>
    );
  }

  // ==========================================
  // MAIN PAGE
  // ==========================================

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto w-full max-w-6xl px-6 py-8">

        {/* BACK */}

        <Link
          href="/profile"
          className="mb-6 inline-flex items-center gap-2 text-sm text-gray-400 transition hover:text-cyan-400"
        >
          ← Back to Profile
        </Link>

        {/* ======================================
            UNIT HEADER
        ====================================== */}

        <section className="mb-8 rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-xl">

          <div className="mb-3 flex flex-wrap items-center gap-3">

            <span className="rounded-full bg-cyan-500/10 px-3 py-1 text-sm font-semibold text-cyan-400">
              {unit.code}
            </span>

            <span className="rounded-full bg-slate-800 px-3 py-1 text-sm text-gray-400">
              Semester {unit.semester_id}
            </span>

          </div>

          <h1 className="text-3xl font-bold text-white md:text-4xl">
            {unit.name}
          </h1>

          {unit.description && (
            <p className="mt-4 max-w-3xl leading-7 text-gray-400">
              {unit.description}
            </p>
          )}

        </section>

        {/* ======================================
            LECTURE NOTES
        ====================================== */}

        <section className="mb-10">

          <div className="mb-5 flex items-center justify-between">

            <div>
              <h2 className="text-2xl font-bold">
                📚 Lecture Notes
              </h2>

              <p className="mt-1 text-sm text-gray-500">
                {notes.length}{" "}
                {notes.length === 1
                  ? "note"
                  : "notes"}{" "}
                available
              </p>
            </div>

          </div>

          {notes.length === 0 ? (

            <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-900/60 p-8 text-center">

              <div className="mb-3 text-4xl">
                📚
              </div>

              <h3 className="font-semibold">
                No notes available
              </h3>

              <p className="mt-2 text-sm text-gray-500">
                Notes for this unit will appear
                here when they are uploaded.
              </p>

            </div>

          ) : (

            <div className="grid gap-5 md:grid-cols-2">

              {notes.map((note) => (

                <article
                  key={note.id}
                  className="group rounded-2xl border border-slate-800 bg-slate-900 p-6 transition hover:border-cyan-500/40"
                >

                  <div className="mb-5 flex items-start justify-between">

                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-500/10 text-2xl">
                      📄
                    </div>

                    <span className="rounded-full bg-slate-800 px-3 py-1 text-xs text-gray-400">
                      PDF
                    </span>

                  </div>

                  <h3 className="text-xl font-semibold transition group-hover:text-cyan-400">
                    {note.title}
                  </h3>

                  {note.description && (
                    <p className="mt-2 line-clamp-3 text-sm leading-6 text-gray-400">
                      {note.description}
                    </p>
                  )}

                  <p className="mt-4 text-xs text-gray-600">
                    Uploaded{" "}
                    {new Date(
                      note.created_at
                    ).toLocaleDateString()}
                  </p>

                  <a
                    href={note.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-cyan-500 px-4 py-3 font-semibold text-white transition hover:bg-cyan-600"
                  >
                    📖 Open PDF
                  </a>

                </article>

              ))}

            </div>
          )}

        </section>

        {/* ======================================
            CATS
        ====================================== */}

        <section className="mb-10">

          <div className="mb-5">

            <h2 className="text-2xl font-bold">
              📝 CATs
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              {cats.length}{" "}
              {cats.length === 1
                ? "CAT"
                : "CATs"}{" "}
              available
            </p>

          </div>

          {cats.length === 0 ? (

            <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-900/60 p-8 text-center">

              <div className="mb-3 text-4xl">
                📝
              </div>

              <h3 className="font-semibold">
                No CATs available
              </h3>

              <p className="mt-2 text-sm text-gray-500">
                CATs for this unit will appear
                here when they are uploaded.
              </p>

            </div>

          ) : (

            <div className="grid gap-5 md:grid-cols-2">

              {cats.map((cat) => (

                <article
                  key={cat.id}
                  className="group rounded-2xl border border-slate-800 bg-slate-900 p-6 transition hover:border-cyan-500/40"
                >

                  <div className="mb-5 flex items-start justify-between">

                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-purple-500/10 text-2xl">
                      📝
                    </div>

                    <span className="rounded-full bg-slate-800 px-3 py-1 text-xs text-gray-400">
                      CAT
                    </span>

                  </div>

                  <h3 className="text-xl font-semibold transition group-hover:text-cyan-400">
                    {cat.title}
                  </h3>

                  {cat.description && (
                    <p className="mt-2 line-clamp-3 text-sm leading-6 text-gray-400">
                      {cat.description}
                    </p>
                  )}

                  <p className="mt-4 text-xs text-gray-600">
                    Uploaded{" "}
                    {new Date(
                      cat.created_at
                    ).toLocaleDateString()}
                  </p>

                  {cat.file_url ? (
                    <a
                      href={cat.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-cyan-500 px-4 py-3 font-semibold text-white transition hover:bg-cyan-600"
                    >
                      📝 Open CAT
                    </a>
                  ) : (
                    <div className="mt-5 rounded-lg bg-slate-800 px-4 py-3 text-center text-sm text-gray-500">
                      No file attached
                    </div>
                  )}

                </article>

              ))}

            </div>
          )}

        </section>

        {/* ======================================
            COMING SOON
        ====================================== */}

        <section className="grid gap-5 md:grid-cols-2">

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">

            <div className="mb-4 text-3xl">
              📄
            </div>

            <h2 className="text-xl font-semibold">
              Assignments
            </h2>

            <p className="mt-2 text-sm text-gray-500">
              Assignments for this unit will
              appear here.
            </p>

          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">

            <div className="mb-4 text-3xl">
              📑
            </div>

            <h2 className="text-xl font-semibold">
              Past Papers
            </h2>

            <p className="mt-2 text-sm text-gray-500">
              Past papers for this unit will
              appear here.
            </p>

          </div>

        </section>

      </div>
    </main>
  );
}