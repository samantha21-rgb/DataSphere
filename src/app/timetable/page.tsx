"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "../lib/supabase";

type AcademicYear = {
  id: number;
  year_number: number;
  programme_id: number;
};

type Semester = {
  id: number;
  academic_year_id: number;
  semester_number: number;
};

type Unit = {
  id: number;
  semester_id: number;
  name: string;
};

type SemesterWithUnits = Semester & {
  academicYear: AcademicYear;
  units: Unit[];
};

export default function TimetablePage() {
  const [semesters, setSemesters] = useState<SemesterWithUnits[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadTimetable();
  }, []);

  async function loadTimetable() {
    try {
      setLoading(true);
      setError("");

      // Get the Data Science programme's academic years.
      const { data: academicYears, error: academicYearsError } =
        await supabase
          .from("academic_years")
          .select("id, year_number, programme_id")
          .eq("programme_id", 7)
          .order("year_number", { ascending: true });

      if (academicYearsError) {
        throw academicYearsError;
      }

      if (!academicYears || academicYears.length === 0) {
        setSemesters([]);
        return;
      }

      const academicYearIds = academicYears.map((year) => year.id);

      // Get every semester belonging to those academic years.
      // This is important because Year 3 Sem 1 and Year 4 Sem 1
      // are currently empty but must still be displayed.
      const { data: semesterData, error: semestersError } =
        await supabase
          .from("semesters")
          .select("id, academic_year_id, semester_number")
          .in("academic_year_id", academicYearIds)
          .order("academic_year_id", { ascending: true })
          .order("semester_number", { ascending: true });

      if (semestersError) {
        throw semestersError;
      }

      if (!semesterData || semesterData.length === 0) {
        setSemesters([]);
        return;
      }

      const semesterIds = semesterData.map((semester) => semester.id);

      // Get all units belonging to these semesters.
      const { data: unitData, error: unitsError } = await supabase
        .from("units")
        .select("id, semester_id, name")
        .in("semester_id", semesterIds)
        .order("id", { ascending: true });

      if (unitsError) {
        throw unitsError;
      }

      const combined: SemesterWithUnits[] = semesterData.map((semester) => {
        const academicYear = academicYears.find(
          (year) => year.id === semester.academic_year_id
        );

        return {
          ...semester,
          academicYear: academicYear as AcademicYear,
          units:
            unitData?.filter(
              (unit) => unit.semester_id === semester.id
            ) || [],
        };
      });

      setSemesters(combined);
    } catch (err) {
      console.error("Error loading timetable:", err);
      
      setError("Unable to load the timetable. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 md:px-8">
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/dashboard"
            className="mb-4 inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-800"
          >
            ← Back to Dashboard
          </Link>

          <div className="rounded-2xl bg-gradient-to-r from-slate-900 to-slate-800 p-6 text-white shadow-lg">
            <p className="mb-2 text-sm font-medium uppercase tracking-wider text-blue-300">
              Academic Timetable
            </p>

            <h1 className="text-2xl font-bold md:text-3xl">
              BSc Data Science and Analytics
            </h1>

            <p className="mt-2 text-sm text-slate-300">
              JKUAT • Karen Campus
            </p>
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <div className="rounded-2xl bg-white p-10 text-center shadow-sm">
            <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600" />
            <p className="text-slate-600">Loading timetable...</p>
          </div>
        )}

        {/* Error */}
        {!loading && error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center">
            <p className="font-medium text-red-700">{error}</p>

            <button
              onClick={loadTimetable}
              className="mt-4 rounded-lg bg-red-600 px-5 py-2 text-sm font-medium text-white hover:bg-red-700"
            >
              Try Again
            </button>
          </div>
        )}

        {/* Timetable */}
        {!loading && !error && semesters.length > 0 && (
          <div className="space-y-8">
            {Array.from({ length: 4 }, (_, index) => index + 1).map(
              (yearNumber) => {
                const yearSemesters = semesters.filter(
                  (semester) =>
                    semester.academicYear.year_number === yearNumber
                );

                return (
                  <section key={yearNumber}>
                    {/* Year heading */}
                    <div className="mb-4 flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 font-bold text-white">
                        {yearNumber}
                      </div>

                      <div>
                        <h2 className="text-xl font-bold text-slate-900">
                          Year {yearNumber}
                        </h2>

                        <p className="text-sm text-slate-500">
                          BSc Data Science and Analytics
                        </p>
                      </div>
                    </div>

                    {/* Semesters */}
                    <div className="grid gap-5 md:grid-cols-2">
                      {[1, 2].map((semesterNumber) => {
                        const semester = yearSemesters.find(
                          (item) =>
                            item.semester_number === semesterNumber
                        );

                        return (
                          <div
                            key={`${yearNumber}-${semesterNumber}`}
                            className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
                          >
                            {/* Semester header */}
                            <div className="flex items-center justify-between border-b border-slate-200 bg-slate-100 px-5 py-4">
                              <div>
                                <h3 className="font-bold text-slate-900">
                                  Semester {semesterNumber}
                                </h3>

                                <p className="text-xs text-slate-500">
                                  {semester
                                    ? `${semester.units.length} unit${
                                        semester.units.length === 1
                                          ? ""
                                          : "s"
                                      }`
                                    : "Not available"}
                                </p>
                              </div>

                              {semester && semester.units.length > 0 ? (
                                <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
                                  Available
                                </span>
                              ) : (
                                <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">
                                  Empty
                                </span>
                              )}
                            </div>

                            {/* Units */}
                            <div className="p-5">
                              {!semester ? (
                                <div className="py-6 text-center">
                                  <p className="text-sm text-slate-500">
                                    Semester record not found.
                                  </p>
                                </div>
                              ) : semester.units.length === 0 ? (
                                <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-5 py-8 text-center">
                                  <div className="mb-2 text-2xl">📚</div>

                                  <p className="font-medium text-slate-700">
                                    No units added yet
                                  </p>

                                  <p className="mt-1 text-xs text-slate-500">
                                    This semester will be populated after the
                                    current timetable data is confirmed.
                                  </p>
                                </div>
                              ) : (
                                <div className="space-y-3">
                                  {semester.units.map((unit, unitIndex) => (
                                    <div
                                      key={unit.id}
                                      className="flex items-start gap-3 rounded-xl border border-slate-200 p-4 transition hover:border-blue-300 hover:bg-blue-50/40"
                                    >
                                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-xs font-bold text-blue-700">
                                        {unitIndex + 1}
                                      </div>

                                      <div className="min-w-0">
                                        <p className="font-medium text-slate-900">
                                          {unit.name}
                                        </p>

                                        <p className="mt-1 text-xs text-slate-500">
                                          Unit ID: {unit.id}
                                        </p>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </section>
                );
              }
            )}
          </div>
        )}

        {/* No data */}
        {!loading && !error && semesters.length === 0 && (
          <div className="rounded-2xl bg-white p-10 text-center shadow-sm">
            <div className="mb-3 text-4xl">📅</div>

            <h2 className="text-lg font-bold text-slate-900">
              No timetable data found
            </h2>

            <p className="mt-2 text-sm text-slate-500">
              No academic semesters are currently available for this
              programme.
            </p>
          </div>
        )}

        {/* Footer note */}
        {!loading && !error && semesters.length > 0 && (
          <div className="mt-8 rounded-xl border border-blue-100 bg-blue-50 p-4">
            <p className="text-sm text-blue-800">
              <strong>Note:</strong> Year 3 Semester 1 and Year 4 Semester 1
              have intentionally been left empty. Their units will be added
              only after the existing timetable data has been confirmed.
            </p>
          </div>
        )}
      </div>
    </main>
  );
}