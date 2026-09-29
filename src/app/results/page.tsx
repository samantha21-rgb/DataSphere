"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "../lib/supabase";

type Unit = {
  id: number;
  name: string;
  semester_id: number;
};

type UnitResult = {
  id: number;
  unit_id: number;
  total_score: number | null;
  grade: string | null;
  grade_points: number | null;
};

type Assessment = {
  id: number;
  unit_id: number;
  title: string;
  assessment_type: string;
  max_score: number;
  weight: number;
};

type StudentResult = {
  id: number;
  assessment_id: number;
  score: number;
  grade: string | null;
  grade_points: number | null;
  remarks: string | null;
};

type Semester = {
  id: number;
  semester_number: number;
  academic_year_id: number;
};

type AcademicYear = {
  id: number;
  year_number: number;
};

function getClassification(gpa: number) {
  if (gpa >= 4.5) return "First Class";
  if (gpa >= 3.5) return "Second Class Upper";
  if (gpa >= 2.5) return "Second Class Lower";
  if (gpa >= 1.5) return "Pass";
  return "Below Pass";
}

export default function ResultsPage() {
  const [units, setUnits] = useState<Unit[]>([]);
  const [unitResults, setUnitResults] = useState<UnitResult[]>([]);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [studentResults, setStudentResults] = useState<
    StudentResult[]
  >([]);

  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [academicYears, setAcademicYears] = useState<
    AcademicYear[]
  >([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [selectedSemester, setSelectedSemester] =
    useState("all");

  useEffect(() => {
    loadResults();
  }, []);

  async function loadResults() {
    setLoading(true);
    setError("");

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) throw userError;

      if (!user) {
        throw new Error("Please log in to view your results.");
      }

      /*
       * Load all student-specific result data.
       *
       * We deliberately do not trust IDs supplied by the
       * browser. Every student result query is restricted
       * using the authenticated user's ID.
       */

      const [
        unitResultsResponse,
        studentResultsResponse,
      ] = await Promise.all([
        supabase
          .from("unit_results")
          .select(
            "id, unit_id, total_score, grade, grade_points"
          )
          .eq("student_id", user.id)
          .order("unit_id"),

        supabase
          .from("student_results")
          .select(
            "id, assessment_id, score, grade, grade_points, remarks"
          )
          .eq("student_id", user.id)
          .order("created_at", {
            ascending: false,
          }),
      ]);

      if (unitResultsResponse.error) {
        throw unitResultsResponse.error;
      }

      if (studentResultsResponse.error) {
        throw studentResultsResponse.error;
      }

      setUnitResults(unitResultsResponse.data || []);
      setStudentResults(
        studentResultsResponse.data || []
      );

      /*
       * Load assessments belonging to the student's
       * recorded assessment results.
       */

      const assessmentIds = (
        studentResultsResponse.data || []
      ).map((result) => result.assessment_id);

      let loadedAssessments: Assessment[] = [];

      if (assessmentIds.length > 0) {
        const { data, error: assessmentError } =
          await supabase
            .from("assessments")
            .select(
              "id, unit_id, title, assessment_type, max_score, weight"
            )
            .in("id", assessmentIds);

        if (assessmentError) {
          throw assessmentError;
        }

        loadedAssessments = data || [];
      }

      setAssessments(loadedAssessments);

      /*
       * Load units represented in the student's unit results.
       */

      const unitIds = (
        unitResultsResponse.data || []
      ).map((result) => result.unit_id);

      let loadedUnits: Unit[] = [];

      if (unitIds.length > 0) {
        const { data, error: unitsError } =
          await supabase
            .from("units")
            .select("id, name, semester_id")
            .in("id", unitIds);

        if (unitsError) {
          throw unitsError;
        }

        loadedUnits = data || [];
      }

      setUnits(loadedUnits);

      /*
       * Load semesters connected to those units.
       */

      const semesterIds = loadedUnits
        .map((unit) => unit.semester_id)
        .filter(Boolean);

      let loadedSemesters: Semester[] = [];

      if (semesterIds.length > 0) {
        const { data, error: semestersError } =
          await supabase
            .from("semesters")
            .select(
              "id, semester_number, academic_year_id"
            )
            .in("id", semesterIds);

        if (semestersError) {
          throw semestersError;
        }

        loadedSemesters = data || [];
      }

      setSemesters(loadedSemesters);

      /*
       * Load academic years.
       */

      const academicYearIds = loadedSemesters
        .map((semester) => semester.academic_year_id)
        .filter(Boolean);

      let loadedAcademicYears: AcademicYear[] = [];

      if (academicYearIds.length > 0) {
        const { data, error: academicYearsError } =
          await supabase
            .from("academic_years")
            .select("id, year_number")
            .in("id", academicYearIds);

        if (academicYearsError) {
          throw academicYearsError;
        }

        loadedAcademicYears = data || [];
      }

      setAcademicYears(loadedAcademicYears);
    } catch (err) {
      console.error("Results error:", err);

      setError(
        err instanceof Error
          ? err.message
          : "Unable to load your results."
      );
    } finally {
      setLoading(false);
    }
  }

  const unitMap = useMemo(() => {
    return new Map(
      units.map((unit) => [unit.id, unit])
    );
  }, [units]);

  const resultMap = useMemo(() => {
    return new Map(
      unitResults.map((result) => [
        result.unit_id,
        result,
      ])
    );
  }, [unitResults]);

  const assessmentMap = useMemo(() => {
    return new Map(
      assessments.map((assessment) => [
        assessment.id,
        assessment,
      ])
    );
  }, [assessments]);

  const semesterMap = useMemo(() => {
    return new Map(
      semesters.map((semester) => [
        semester.id,
        semester,
      ])
    );
  }, [semesters]);

  const academicYearMap = useMemo(() => {
    return new Map(
      academicYears.map((year) => [year.id, year])
    );
  }, [academicYears]);

  /*
   * Determine which units belong to the selected semester.
   */

  const filteredUnits = useMemo(() => {
    if (selectedSemester === "all") {
      return units;
    }

    return units.filter(
      (unit) =>
        String(unit.semester_id) === selectedSemester
    );
  }, [units, selectedSemester]);

  /*
   * Calculate overall performance from available
   * unit grade points.
   *
   * This is a grade-point average across recorded units,
   * not an official university GPA until credit hours are
   * available.
   */

  const completedResults = filteredUnits
    .map((unit) => resultMap.get(unit.id))
    .filter(
      (result): result is UnitResult =>
        Boolean(result)
    );

  const averageScore =
    completedResults.length > 0
      ? completedResults.reduce(
          (sum, result) =>
            sum + Number(result.total_score || 0),
          0
        ) / completedResults.length
      : 0;

  const averageGradePoints =
    completedResults.length > 0
      ? completedResults.reduce(
          (sum, result) =>
            sum + Number(result.grade_points || 0),
          0
        ) / completedResults.length
      : 0;

  const classification =
    completedResults.length > 0
      ? getClassification(averageGradePoints)
      : "No classification yet";

  const recordedAssessments = studentResults.length;

  const semesterOptions = semesters
    .map((semester) => {
      const year = academicYearMap.get(
        semester.academic_year_id
      );

      return {
        id: semester.id,
        label: `Year ${year?.year_number ?? "?"} · Semester ${semester.semester_number}`,
        yearNumber: year?.year_number ?? 999,
        semesterNumber: semester.semester_number,
      };
    })
    .sort((a, b) => {
      if (a.yearNumber !== b.yearNumber) {
        return a.yearNumber - b.yearNumber;
      }

      return (
        a.semesterNumber - b.semesterNumber
      );
    });

  function getSemesterLabel(unit: Unit) {
    const semester = semesterMap.get(
      unit.semester_id
    );

    if (!semester) {
      return "Semester unavailable";
    }

    const year = academicYearMap.get(
      semester.academic_year_id
    );

    return `Year ${year?.year_number ?? "?"} · Semester ${semester.semester_number}`;
  }

  function getUnitAssessments(unitId: number) {
    return assessments.filter(
      (assessment) =>
        assessment.unit_id === unitId
    );
  }

  function getUnitStudentAssessments(unitId: number) {
    const assessmentIds = getUnitAssessments(
      unitId
    ).map((assessment) => assessment.id);

    return studentResults.filter((result) =>
      assessmentIds.includes(result.assessment_id)
    );
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-50 p-8 text-gray-900">
        <div className="mx-auto max-w-6xl">
          <div className="rounded-2xl bg-white p-8 shadow-sm">
            Loading your academic results...
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 p-6 text-gray-900 md:p-8">
      <div className="mx-auto max-w-6xl">

        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">

          <div>
            <Link
              href="/dashboard"
              className="text-sm font-medium text-gray-500 hover:text-gray-900"
            >
              ← Back to Dashboard
            </Link>

            <h1 className="mt-3 text-3xl font-bold">
              My Results
            </h1>

            <p className="mt-2 text-gray-600">
              View your assessment scores, unit results,
              grades and academic performance.
            </p>
          </div>

          <button
            type="button"
            onClick={loadResults}
            className="rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm font-semibold hover:bg-gray-100"
          >
            Refresh Results
          </button>

        </div>

        {error && (
          <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* PERFORMANCE SUMMARY */}

        <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

          <SummaryCard
            title="Units"
            value={String(completedResults.length)}
            description="Units with recorded results"
          />

          <SummaryCard
            title="Average Score"
            value={
              completedResults.length > 0
                ? `${averageScore.toFixed(1)}%`
                : "—"
            }
            description="Across recorded units"
          />

          <SummaryCard
            title="Grade Points"
            value={
              completedResults.length > 0
                ? averageGradePoints.toFixed(2)
                : "—"
            }
            description="Average unit grade points"
          />

          <SummaryCard
            title="Classification"
            value={
              completedResults.length > 0
                ? classification
                : "—"
            }
            description="Based on current recorded results"
          />

        </section>

        {/* SEMESTER FILTER */}

        <section className="mt-8 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">

          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">

            <div>
              <h2 className="text-xl font-bold">
                Academic Results
              </h2>

              <p className="mt-1 text-sm text-gray-500">
                Select a semester to view its units.
              </p>
            </div>

            <select
              value={selectedSemester}
              onChange={(e) =>
                setSelectedSemester(e.target.value)
              }
              className="rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm outline-none focus:border-gray-500"
            >
              <option value="all">
                All Semesters
              </option>

              {semesterOptions.map((semester) => (
                <option
                  key={semester.id}
                  value={semester.id}
                >
                  {semester.label}
                </option>
              ))}
            </select>

          </div>

        </section>

        {/* UNIT RESULTS */}

        <section className="mt-6">

          {filteredUnits.length === 0 ? (
            <div className="rounded-2xl border border-gray-200 bg-white p-12 text-center shadow-sm">

              <div className="text-4xl">
                📊
              </div>

              <h2 className="mt-4 text-xl font-bold">
                No results yet
              </h2>

              <p className="mx-auto mt-2 max-w-lg text-sm text-gray-500">
                Your results will appear here once
                assessments have been recorded and
                unit results have been calculated.
              </p>

            </div>
          ) : (
            <div className="space-y-5">

              {filteredUnits.map((unit) => {
                const result =
                  resultMap.get(unit.id);

                const unitAssessments =
                  getUnitAssessments(unit.id);

                const unitStudentAssessments =
                  getUnitStudentAssessments(unit.id);

                return (
                  <div
                    key={unit.id}
                    className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm"
                  >

                    {/* UNIT HEADER */}

                    <div className="border-b border-gray-200 p-6">

                      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">

                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                            {getSemesterLabel(unit)}
                          </p>

                          <h2 className="mt-1 text-xl font-bold">
                            {unit.name}
                          </h2>
                        </div>

                        <div className="flex items-center gap-3">

                          {result ? (
                            <>
                              <div className="text-right">
                                <p className="text-xs text-gray-500">
                                  Total Score
                                </p>

                                <p className="text-lg font-bold">
                                  {result.total_score !== null
                                    ? `${Number(
                                        result.total_score
                                      ).toFixed(2)}%`
                                    : "—"}
                                </p>
                              </div>

                              <div className="border-l border-gray-200 pl-4 text-right">
                                <p className="text-xs text-gray-500">
                                  Grade
                                </p>

                                <p className="text-2xl font-bold">
                                  {result.grade || "—"}
                                </p>
                              </div>

                              <div className="border-l border-gray-200 pl-4 text-right">
                                <p className="text-xs text-gray-500">
                                  Points
                                </p>

                                <p className="text-lg font-bold">
                                  {result.grade_points ??
                                    "—"}
                                </p>
                              </div>
                            </>
                          ) : (
                            <span className="rounded-full bg-gray-100 px-4 py-2 text-xs font-semibold text-gray-600">
                              Result pending
                            </span>
                          )}

                        </div>

                      </div>

                    </div>

                    {/* ASSESSMENT BREAKDOWN */}

                    <div className="p-6">

                      <div className="mb-4 flex items-center justify-between">

                        <div>
                          <h3 className="font-semibold">
                            Assessment Breakdown
                          </h3>

                          <p className="mt-1 text-xs text-gray-500">
                            {unitStudentAssessments.length}{" "}
                            of{" "}
                            {unitAssessments.length}{" "}
                            recorded
                          </p>
                        </div>

                      </div>

                      {unitAssessments.length === 0 ? (
                        <p className="text-sm text-gray-500">
                          No assessments configured for
                          this unit.
                        </p>
                      ) : (
                        <div className="overflow-x-auto">

                          <table className="w-full min-w-[650px] text-left text-sm">

                            <thead>
                              <tr className="border-b border-gray-200 text-xs uppercase tracking-wider text-gray-500">

                                <th className="px-3 py-3">
                                  Assessment
                                </th>

                                <th className="px-3 py-3">
                                  Type
                                </th>

                                <th className="px-3 py-3">
                                  Score
                                </th>

                                <th className="px-3 py-3">
                                  Weight
                                </th>

                                <th className="px-3 py-3">
                                  Grade
                                </th>

                                <th className="px-3 py-3">
                                  Remarks
                                </th>

                              </tr>
                            </thead>

                            <tbody className="divide-y divide-gray-100">

                              {unitAssessments.map(
                                (assessment) => {
                                  const studentResult =
                                    studentResults.find(
                                      (result) =>
                                        result.assessment_id ===
                                        assessment.id
                                    );

                                  return (
                                    <tr
                                      key={
                                        assessment.id
                                      }
                                    >

                                      <td className="px-3 py-4 font-medium">
                                        {assessment.title}
                                      </td>

                                      <td className="px-3 py-4 text-gray-600">
                                        {
                                          assessment.assessment_type
                                        }
                                      </td>

                                      <td className="px-3 py-4">
                                        {studentResult
                                          ? `${studentResult.score} / ${assessment.max_score}`
                                          : "Not recorded"}
                                      </td>

                                      <td className="px-3 py-4">
                                        {
                                          assessment.weight
                                        }
                                        %
                                      </td>

                                      <td className="px-3 py-4 font-semibold">
                                        {studentResult?.grade ||
                                          "—"}
                                      </td>

                                      <td className="px-3 py-4 text-gray-500">
                                        {studentResult?.remarks ||
                                          "—"}
                                      </td>

                                    </tr>
                                  );
                                }
                              )}

                            </tbody>

                          </table>

                        </div>
                      )}

                    </div>

                  </div>
                );
              })}

            </div>
          )}

        </section>

        {/* NOTE */}

        <section className="mt-8 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">

          <h2 className="font-bold">
            About your GPA
          </h2>

          <p className="mt-2 text-sm leading-6 text-gray-600">
            DataSphere currently displays your average
            grade points from recorded unit results.
            A formal university GPA will be calculated
            once credit-hour information and the
            applicable university grading configuration
            are available.
          </p>

        </section>

      </div>
    </main>
  );
}

function SummaryCard({
  title,
  value,
  description,
}: {
  title: string;
  value: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">

      <p className="text-sm text-gray-500">
        {title}
      </p>

      <p className="mt-2 text-2xl font-bold">
        {value}
      </p>

      <p className="mt-1 text-xs text-gray-500">
        {description}
      </p>

    </div>
  );
}