"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

function Sidebar() {
  return (
    <aside className="ds-sidebar">
      <Link href="/" className="text-lg font800 text-[#3f6f68]">
        DataSphere
      </Link>
      <nav className="mt-8 flex flex-col gap-2 text-sm">
        <Link href="/dashboard">Dashboard</Link>
        <Link href="/my-courses">My Courses</Link>
        <Link href="/assignments">Assignments</Link>
      </nav>
    </aside>
  );
}

function Topbar() {
  return (
    <header className="flex items-center justify-between border-b border-[#ded8cc] py-4">
      <span className="text-sm font700 text-[#625d67]">DataSphere</span>
    </header>
  );
}

type Assignment = {
  id: number;
  unit_id: number;
  title: string;
  description: string | null;
  file_url: string;
  assignment_number: number | null;
  created_at: string;
};

type Unit = {
  id: number;
  name: string;
  code: string;
};

export default function AssignmentsPage() {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [search, setSearch] = useState("");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadAssignments();
  }, []);

  async function loadAssignments() {
    setLoading(true);
    setError("");

    const [assignmentsResult, unitsResult] = await Promise.all([
      supabase
        .from("assignments")
        .select(
          "id, unit_id, title, description, file_url, assignment_number, created_at"
        )
        .order("created_at", { ascending: false }),

      supabase
        .from("units")
        .select("id, name, code")
        .order("code"),
    ]);

    const firstError = assignmentsResult.error || unitsResult.error;

    if (firstError) {
      setError(firstError.message);
    }

    setAssignments(assignmentsResult.data ?? []);
    setUnits(unitsResult.data ?? []);

    setLoading(false);
  }

  const filteredAssignments = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return assignments;
    }

    return assignments.filter((assignment) => {
      const unit = units.find(
        (currentUnit) => currentUnit.id === assignment.unit_id
      );

      const searchableText = [
        assignment.title,
        assignment.description ?? "",
        unit?.name ?? "",
        unit?.code ?? "",
      ]
        .join(" ")
        .toLowerCase();

      return searchableText.includes(query);
    });
  }, [assignments, units, search]);

  return (
    <div className="ds-shell flex">
      <Sidebar />

      <main className="ds-main">
        <div className="ds-content">
          <Topbar />

          <section className="py-7">
            <p className="ds-kicker">Assessment</p>

            <h1 className="ds-title">Assignments</h1>

            <p className="ds-subtitle">
              Coursework uploaded for the units available in DataSphere.
            </p>
          </section>

          {error && (
            <div className="mb-5 border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="mb-6 flex items-center gap-3">
            <input
              className="ds-input max-w-md"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search assignments or units..."
            />

            <button
              type="button"
              className="ds-btn ds-btn-secondary"
              onClick={loadAssignments}
            >
              Refresh
            </button>
          </div>

          {loading ? (
            <div className="ds-empty">Loading assignments...</div>
          ) : filteredAssignments.length === 0 ? (
            <div className="ds-empty">
              No assignments are available yet.
            </div>
          ) : (
            <div className="ds-list">
              {filteredAssignments.map((assignment) => {
                const unit = units.find(
                  (currentUnit) => currentUnit.id === assignment.unit_id
                );

                return (
                  <div
                    key={assignment.id}
                    className="ds-row group"
                  >
                    <div className="grid h-9 w-9 shrink-0 place-items-center rounded bg-[#f3e6cf] text-xs font800 text-[#7d551e]">
                      {assignment.assignment_number ?? "A"}
                    </div>

                    <div className="min-w-0 flex-1">
                      <h2 className="text-sm font750">
                        {assignment.title}
                      </h2>

                      <p className="mt-1 text-xs font700 text-[#3f6f68]">
                        {unit?.code ?? "Unit"}

                        {unit?.name
                          ? ` · ${unit.name}`
                          : ""}
                      </p>

                      {assignment.description && (
                        <p className="mt-2 text-sm leading-6 text-[#625d67]">
                          {assignment.description}
                        </p>
                      )}
                    </div>

                    <a
                      href={assignment.file_url}
                      target="_blank"
                      rel="noreferrer"
                      className="ds-btn ds-btn-secondary shrink-0"
                    >
                      Open PDF ↗
                    </a>
                  </div>
                );
              })}
            </div>
          )}

          <div className="mt-8 border-t border-[#ded8cc] pt-4 text-sm text-[#89828d]">
            Need coursework for a specific unit? Open it from{" "}
            <Link
              href="/my-courses"
              className="font700 text-[#3f6f68]"
            >
              My Courses
            </Link>
            .
          </div>
        </div>
      </main>
    </div>
  );
}