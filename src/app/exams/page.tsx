"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "../lib/supabase";

type Exam = {
  id: number;
  unit_id: number;
  title: string;
  exam_type: string;
  exam_date: string | null;
  start_time: string | null;
  end_time: string | null;
  venue: string | null;
  instructions: string | null;
};

type Unit = {
  id: number;
  name: string;
};

type ExamWithUnit = Exam & {
  unit: Unit | null;
};

export default function ExamsPage() {
  const [exams, setExams] = useState<ExamWithUnit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("All");

  useEffect(() => {
    loadExams();
  }, []);

  async function loadExams() {
    try {
      setLoading(true);
      setError("");

      const { data: examData, error: examError } = await supabase
        .from("exams")
        .select("*")
        .order("exam_date", { ascending: true })
        .order("start_time", { ascending: true });

      if (examError) throw examError;

      if (!examData || examData.length === 0) {
        setExams([]);
        return;
      }

      const unitIds = [
        ...new Set(examData.map((exam) => exam.unit_id)),
      ];

      const { data: unitData, error: unitError } = await supabase
        .from("units")
        .select("id, name")
        .in("id", unitIds);

      if (unitError) throw unitError;

      const combined: ExamWithUnit[] = examData.map((exam) => ({
        ...exam,
        unit:
          unitData?.find((unit) => unit.id === exam.unit_id) || null,
      }));

      setExams(combined);
    } catch (err) {
      console.error("Error loading exams:", err);
      setError("Unable to load exams. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const examTypes = useMemo(() => {
    return [
      "All",
      ...Array.from(
        new Set(exams.map((exam) => exam.exam_type))
      ),
    ];
  }, [exams]);

  const filteredExams = useMemo(() => {
    if (filter === "All") return exams;

    return exams.filter((exam) => exam.exam_type === filter);
  }, [exams, filter]);

  function formatDate(date: string | null) {
    if (!date) return "Date not set";

    return new Date(`${date}T00:00:00`).toLocaleDateString(
      "en-KE",
      {
        weekday: "short",
        day: "numeric",
        month: "short",
        year: "numeric",
      }
    );
  }

  function formatTime(time: string | null) {
    if (!time) return "Time not set";

    const [hours, minutes] = time.split(":");
    const date = new Date();

    date.setHours(Number(hours), Number(minutes), 0);

    return date.toLocaleTimeString("en-KE", {
      hour: "numeric",
      minute: "2-digit",
    });
  }

  function isUpcoming(date: string | null) {
    if (!date) return false;

    const today = new Date();
    const examDate = new Date(`${date}T23:59:59`);

    return examDate >= today;
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 md:px-8 md:py-8">
      <div className="mx-auto max-w-6xl">
        <Link
          href="/dashboard"
          className="mb-6 inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-800"
        >
          ← Back to Dashboard
        </Link>

        {/* Header */}
        <section className="mb-6 rounded-2xl bg-gradient-to-r from-slate-950 to-slate-800 p-6 text-white shadow-lg md:p-8">
          <p className="text-sm font-semibold uppercase tracking-wider text-blue-300">
            Academic Schedule
          </p>

          <h1 className="mt-2 text-3xl font-bold">
            Exams
          </h1>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">
            View your upcoming examinations, venues, times and
            instructions.
          </p>
        </section>

        {/* Filters */}
        {!loading && exams.length > 0 && (
          <div className="mb-6 overflow-x-auto">
            <div className="flex min-w-max gap-2">
              {examTypes.map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setFilter(type)}
                  className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                    filter === type
                      ? "bg-blue-600 text-white"
                      : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="rounded-2xl bg-white p-10 text-center shadow-sm">
            <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600" />

            <p className="text-sm text-slate-500">
              Loading exams...
            </p>
          </div>
        )}

        {/* Error */}
        {!loading && error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center">
            <p className="font-medium text-red-700">
              {error}
            </p>

            <button
              onClick={loadExams}
              className="mt-4 rounded-lg bg-red-600 px-5 py-2 text-sm font-semibold text-white hover:bg-red-700"
            >
              Try Again
            </button>
          </div>
        )}

        {/* Empty */}
        {!loading && !error && filteredExams.length === 0 && (
          <div className="rounded-2xl bg-white p-10 text-center shadow-sm">
            <div className="mb-4 text-4xl">📝</div>

            <h2 className="font-bold text-slate-900">
              No exams available
            </h2>

            <p className="mt-2 text-sm text-slate-500">
              {exams.length === 0
                ? "Your examination schedule has not been published yet."
                : "There are no exams matching this filter."}
            </p>
          </div>
        )}

        {/* Exams */}
        {!loading && !error && filteredExams.length > 0 && (
          <div className="space-y-4">
            {filteredExams.map((exam) => {
              const upcoming = isUpcoming(exam.exam_date);

              return (
                <article
                  key={exam.id}
                  className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
                >
                  <div className="p-5 md:p-6">
                    <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
                      {/* Main */}
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-semibold ${
                              upcoming
                                ? "bg-green-100 text-green-700"
                                : "bg-slate-100 text-slate-600"
                            }`}
                          >
                            {upcoming ? "Upcoming" : "Past"}
                          </span>

                          <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                            {exam.exam_type}
                          </span>
                        </div>

                        <h2 className="mt-3 text-xl font-bold text-slate-900">
                          {exam.title}
                        </h2>

                        <p className="mt-1 text-sm font-medium text-slate-500">
                          {exam.unit?.name ||
                            `Unit ID: ${exam.unit_id}`}
                        </p>
                      </div>

                      {/* Date */}
                      <div className="shrink-0 rounded-xl bg-slate-50 p-4 md:min-w-[180px]">
                        <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                          Exam Date
                        </p>

                        <p className="mt-1 font-bold text-slate-900">
                          {formatDate(exam.exam_date)}
                        </p>
                      </div>
                    </div>

                    {/* Details */}
                    <div className="mt-5 grid gap-3 border-t border-slate-100 pt-5 sm:grid-cols-2 lg:grid-cols-3">
                      <div className="rounded-xl bg-slate-50 p-4">
                        <p className="text-xs text-slate-400">
                          Time
                        </p>

                        <p className="mt-1 text-sm font-semibold text-slate-800">
                          {formatTime(exam.start_time)}
                          {exam.end_time && (
                            <>
                              {" "}
                              – {formatTime(exam.end_time)}
                            </>
                          )}
                        </p>
                      </div>

                      <div className="rounded-xl bg-slate-50 p-4">
                        <p className="text-xs text-slate-400">
                          Venue
                        </p>

                        <p className="mt-1 text-sm font-semibold text-slate-800">
                          {exam.venue || "Venue not set"}
                        </p>
                      </div>

                      <div className="rounded-xl bg-slate-50 p-4 sm:col-span-2 lg:col-span-1">
                        <p className="text-xs text-slate-400">
                          Exam Type
                        </p>

                        <p className="mt-1 text-sm font-semibold text-slate-800">
                          {exam.exam_type}
                        </p>
                      </div>
                    </div>

                    {/* Instructions */}
                    {exam.instructions && (
                      <div className="mt-4 rounded-xl border border-amber-100 bg-amber-50 p-4">
                        <p className="text-xs font-bold uppercase tracking-wide text-amber-700">
                          Instructions
                        </p>

                        <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-amber-900">
                          {exam.instructions}
                        </p>
                      </div>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}