"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "../lib/supabase";

type Unit = {
  id: number;
  name: string;
  semester_id: number;
  credit_hours: number | null;
};

type UnitResult = {
  id: number;
  unit_id: number;
  total_score: number | null;
  grade: string | null;
  grade_points: number | null;
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

type SemesterOption = {
  id: number;
  label: string;
  yearNumber: number;
  semesterNumber: number;
};

type GPAUnit = {
  unit: Unit;
  result: UnitResult;
};

const gradeScale = [
  {
    grade: "A",
    points: 5,
    minimum: 70,
  },
  {
    grade: "B+",
    points: 4,
    minimum: 60,
  },
  {
    grade: "B",
    points: 3,
    minimum: 50,
  },
  {
    grade: "C+",
    points: 2,
    minimum: 45,
  },
  {
    grade: "C",
    points: 1,
    minimum: 40,
  },
  {
    grade: "D",
    points: 0,
    minimum: 30,
  },
  {
    grade: "E",
    points: 0,
    minimum: 20,
  },
  {
    grade: "F",
    points: 0,
    minimum: 0,
  },
];

function getClassification(gpa: number) {
  if (gpa >= 4.5) {
    return "First Class";
  }

  if (gpa >= 3.5) {
    return "Second Class Upper";
  }

  if (gpa >= 2.5) {
    return "Second Class Lower";
  }

  if (gpa >= 1.5) {
    return "Pass";
  }

  return "Below Pass";
}

function getGradeLabel(grade: string | null) {
  return grade || "—";
}

export default function GPAPage() {
  const [units, setUnits] = useState<Unit[]>([]);
  const [unitResults, setUnitResults] = useState<UnitResult[]>(
    []
  );
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [academicYears, setAcademicYears] = useState<
    AcademicYear[]
  >([]);

  const [selectedSemester, setSelectedSemester] =
    useState("all");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadGPAData();
  }, []);

  async function loadGPAData() {
    setLoading(true);
    setError("");

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        throw userError;
      }

      if (!user) {
        throw new Error(
          "Please log in to view your GPA."
        );
      }

      const { data: results, error: resultsError } =
        await supabase
          .from("unit_results")
          .select(
            "id, unit_id, total_score, grade, grade_points"
          )
          .eq("student_id", user.id)
          .order("unit_id");

      if (resultsError) {
        throw resultsError;
      }

      const loadedResults = results || [];

      setUnitResults(loadedResults);

      if (loadedResults.length === 0) {
        setUnits([]);
        setSemesters([]);
        setAcademicYears([]);
        return;
      }

      const unitIds = loadedResults.map(
        (result) => result.unit_id
      );

      const { data: loadedUnits, error: unitsError } =
        await supabase
          .from("units")
          .select(
            "id, name, semester_id, credit_hours"
          )
          .in("id", unitIds);

      if (unitsError) {
        throw unitsError;
      }

      const safeUnits = loadedUnits || [];

      setUnits(safeUnits);

      const semesterIds = safeUnits
        .map((unit) => unit.semester_id)
        .filter(Boolean);

      if (semesterIds.length === 0) {
        setSemesters([]);
        setAcademicYears([]);
        return;
      }

      const {
        data: loadedSemesters,
        error: semestersError,
      } = await supabase
        .from("semesters")
        .select(
          "id, semester_number, academic_year_id"
        )
        .in("id", semesterIds);

      if (semestersError) {
        throw semestersError;
      }

      const safeSemesters = loadedSemesters || [];

      setSemesters(safeSemesters);

      const academicYearIds = safeSemesters
        .map(
          (semester) =>
            semester.academic_year_id
        )
        .filter(Boolean);

      if (academicYearIds.length === 0) {
        setAcademicYears([]);
        return;
      }

      const {
        data: loadedAcademicYears,
        error: academicYearsError,
      } = await supabase
        .from("academic_years")
        .select("id, year_number")
        .in("id", academicYearIds);

      if (academicYearsError) {
        throw academicYearsError;
      }

      setAcademicYears(loadedAcademicYears || []);
    } catch (err) {
      console.error("GPA loading error:", err);

      setError(
        err instanceof Error
          ? err.message
          : "Unable to load GPA information."
      );
    } finally {
      setLoading(false);
    }
  }

  const resultMap = useMemo(() => {
    return new Map(
      unitResults.map((result) => [
        result.unit_id,
        result,
      ])
    );
  }, [unitResults]);

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
      academicYears.map((year) => [
        year.id,
        year,
      ])
    );
  }, [academicYears]);

  const semesterOptions: SemesterOption[] = useMemo(() => {
    return semesters
      .map((semester) => {
        const year = academicYearMap.get(
          semester.academic_year_id
        );

        return {
          id: semester.id,
          label: `Year ${
            year?.year_number ?? "?"
          } · Semester ${
            semester.semester_number
          }`,
          yearNumber:
            year?.year_number ?? 999,
          semesterNumber:
            semester.semester_number,
        };
      })
      .sort((a, b) => {
        if (
          a.yearNumber !==
          b.yearNumber
        ) {
          return (
            a.yearNumber -
            b.yearNumber
          );
        }

        return (
          a.semesterNumber -
          b.semesterNumber
        );
      });
  }, [semesters, academicYearMap]);

  const filteredGPAUnits: GPAUnit[] =
    useMemo(() => {
      return units
        .filter((unit) => {
          if (
            selectedSemester === "all"
          ) {
            return true;
          }

          return (
            String(unit.semester_id) ===
            selectedSemester
          );
        })
        .map((unit) => {
          const result = resultMap.get(
            unit.id
          );

          if (!result) {
            return null;
          }

          return {
            unit,
            result,
          };
        })
        .filter(
          (
            item
          ): item is GPAUnit =>
            item !== null
        );
    }, [
      units,
      resultMap,
      selectedSemester,
    ]);

  /*
   * Only units with valid credit hours can
   * participate in an official weighted GPA.
   */

  const unitsWithCredits =
    filteredGPAUnits.filter(
      ({ unit }) =>
        unit.credit_hours !== null &&
        Number(unit.credit_hours) > 0
    );

  const unitsMissingCredits =
    filteredGPAUnits.filter(
      ({ unit }) =>
        unit.credit_hours === null ||
        Number(unit.credit_hours) <= 0
    );

  const totalCredits =
    unitsWithCredits.reduce(
      (sum, { unit }) =>
        sum + Number(unit.credit_hours),
      0
    );

  const totalGradePoints =
    unitsWithCredits.reduce(
      (sum, { unit, result }) =>
        sum +
        Number(result.grade_points || 0) *
          Number(unit.credit_hours),
      0
    );

  const gpa =
    totalCredits > 0
      ? totalGradePoints / totalCredits
      : 0;

  const classification =
    totalCredits > 0
      ? getClassification(gpa)
      : "Not available";

  const averageScore =
    filteredGPAUnits.length > 0
      ? filteredGPAUnits.reduce(
          (sum, { result }) =>
            sum +
            Number(
              result.total_score || 0
            ),
          0
        ) / filteredGPAUnits.length
      : 0;

  const gradeCounts = useMemo(() => {
    const counts: Record<
      string,
      number
    > = {};

    filteredGPAUnits.forEach(
      ({ result }) => {
        const grade =
          result.grade || "Unknown";

        counts[grade] =
          (counts[grade] || 0) + 1;
      }
    );

    return counts;
  }, [filteredGPAUnits]);

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-50 p-8 text-gray-900">
        <div className="mx-auto max-w-6xl">
          <div className="rounded-2xl bg-white p-8 shadow-sm">
            Loading GPA information...
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 p-6 text-gray-900 md:p-8">
      <div className="mx-auto max-w-6xl">

        {/* HEADER */}

        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">

          <div>
            <Link
              href="/dashboard"
              className="text-sm font-medium text-gray-500 hover:text-gray-900"
            >
              ← Back to Dashboard
            </Link>

            <h1 className="mt-3 text-3xl font-bold">
              GPA & Academic Performance
            </h1>

            <p className="mt-2 text-gray-600">
              Calculate your weighted GPA from
              recorded unit results.
            </p>
          </div>

          <button
            type="button"
            onClick={loadGPAData}
            className="rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm font-semibold hover:bg-gray-100"
          >
            Refresh
          </button>

        </div>

        {/* ERROR */}

        {error && (
          <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* SEMESTER SELECTOR */}

        <section className="mt-8 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">

          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">

            <div>
              <h2 className="text-xl font-bold">
                GPA Scope
              </h2>

              <p className="mt-1 text-sm text-gray-500">
                Calculate performance for all recorded
                units or one semester.
              </p>
            </div>

            <select
              value={selectedSemester}
              onChange={(e) =>
                setSelectedSemester(
                  e.target.value
                )
              }
              className="rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm outline-none focus:border-gray-500"
            >
              <option value="all">
                All Recorded Semesters
              </option>

              {semesterOptions.map(
                (semester) => (
                  <option
                    key={semester.id}
                    value={semester.id}
                  >
                    {semester.label}
                  </option>
                )
              )}
            </select>

          </div>

        </section>

        {/* MAIN GPA */}

        <section className="mt-6 grid gap-5 lg:grid-cols-4">

          <PerformanceCard
            title="GPA"
            value={
              totalCredits > 0
                ? gpa.toFixed(2)
                : "—"
            }
            description={
              totalCredits > 0
                ? `${totalCredits.toFixed(
                    1
                  )} credit hours`
                : "Credit hours required"
            }
          />

          <PerformanceCard
            title="Average Score"
            value={
              filteredGPAUnits.length > 0
                ? `${averageScore.toFixed(
                    1
                  )}%`
                : "—"
            }
            description="Average recorded unit score"
          />

          <PerformanceCard
            title="Units"
            value={String(
              filteredGPAUnits.length
            )}
            description="Units with results"
          />

          <PerformanceCard
            title="Classification"
            value={classification}
            description="Based on current GPA"
          />

        </section>

        {/* MISSING CREDIT HOURS WARNING */}

        {unitsMissingCredits.length >
          0 && (
          <section className="mt-6 rounded-2xl border border-yellow-200 bg-yellow-50 p-6">

            <h2 className="font-bold text-yellow-900">
              Credit hours required
            </h2>

            <p className="mt-2 text-sm leading-6 text-yellow-800">
              {unitsMissingCredits.length}{" "}
              recorded unit
              {unitsMissingCredits.length ===
              1
                ? ""
                : "s"}{" "}
              do not have credit-hour information.
              Those units are excluded from the
              weighted GPA until an administrator
              configures their credit hours.
            </p>

            <div className="mt-4 space-y-2">

              {unitsMissingCredits.map(
                ({ unit }) => (
                  <div
                    key={unit.id}
                    className="rounded-lg bg-white/70 px-3 py-2 text-sm text-yellow-900"
                  >
                    {unit.name}
                  </div>
                )
              )}

            </div>

          </section>
        )}

        {/* UNIT GPA TABLE */}

        <section className="mt-6 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">

          <div className="border-b border-gray-200 p-6">

            <h2 className="text-xl font-bold">
              Unit Performance
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              Weighted GPA contribution from each
              completed unit.
            </p>

          </div>

          {filteredGPAUnits.length === 0 ? (
            <div className="p-12 text-center">

              <div className="text-4xl">
                📊
              </div>

              <h3 className="mt-4 font-bold">
                No completed unit results
              </h3>

              <p className="mt-2 text-sm text-gray-500">
                GPA information will appear after
                unit results have been recorded.
              </p>

            </div>
          ) : (
            <div className="overflow-x-auto">

              <table className="w-full min-w-[800px] text-left text-sm">

                <thead className="border-b border-gray-200 bg-gray-50">

                  <tr className="text-xs uppercase tracking-wider text-gray-500">

                    <th className="px-5 py-4">
                      Unit
                    </th>

                    <th className="px-5 py-4">
                      Credit Hours
                    </th>

                    <th className="px-5 py-4">
                      Score
                    </th>

                    <th className="px-5 py-4">
                      Grade
                    </th>

                    <th className="px-5 py-4">
                      Grade Points
                    </th>

                    <th className="px-5 py-4">
                      Quality Points
                    </th>

                  </tr>

                </thead>

                <tbody className="divide-y divide-gray-100">

                  {filteredGPAUnits.map(
                    ({ unit, result }) => {

                      const credits =
                        Number(
                          unit.credit_hours ||
                            0
                        );

                      const points =
                        Number(
                          result.grade_points ||
                            0
                        );

                      const qualityPoints =
                        credits * points;

                      return (
                        <tr key={unit.id}>

                          <td className="px-5 py-4 font-medium">
                            {unit.name}
                          </td>

                          <td className="px-5 py-4">
                            {credits > 0
                              ? credits
                              : "Not set"}
                          </td>

                          <td className="px-5 py-4">
                            {result.total_score !==
                            null
                              ? `${Number(
                                  result.total_score
                                ).toFixed(
                                  2
                                )}%`
                              : "—"}
                          </td>

                          <td className="px-5 py-4">

                            <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-bold">
                              {getGradeLabel(
                                result.grade
                              )}
                            </span>

                          </td>

                          <td className="px-5 py-4">
                            {result.grade_points ??
                              "—"}
                          </td>

                          <td className="px-5 py-4 font-semibold">
                            {credits > 0
                              ? qualityPoints.toFixed(
                                  2
                                )
                              : "—"}
                          </td>

                        </tr>
                      );
                    }
                  )}

                </tbody>

              </table>

            </div>
          )}

        </section>

        {/* GRADE DISTRIBUTION */}

        {filteredGPAUnits.length > 0 && (
          <section className="mt-6 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">

            <h2 className="text-xl font-bold">
              Grade Distribution
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              Your recorded unit grades.
            </p>

            <div className="mt-5 grid gap-3 sm:grid-cols-4 lg:grid-cols-8">

              {gradeScale.map(
                ({ grade }) => (
                  <div
                    key={grade}
                    className="rounded-xl border border-gray-200 p-4 text-center"
                  >

                    <p className="text-xl font-bold">
                      {grade}
                    </p>

                    <p className="mt-1 text-sm text-gray-500">
                      {gradeCounts[
                        grade
                      ] || 0}{" "}
                      unit
                      {(gradeCounts[
                        grade
                      ] || 0) === 1
                        ? ""
                        : "s"}
                    </p>

                  </div>
                )
              )}

            </div>

          </section>
        )}

        {/* GRADE SCALE */}

        <section className="mt-6 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">

          <h2 className="text-xl font-bold">
            Current DataSphere Grade Scale
          </h2>

          <p className="mt-1 text-sm text-gray-500">
            These are the current application defaults.
            They should be replaced with university-specific
            grading configurations when those policies are
            entered into DataSphere.
          </p>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 md:grid-cols-4">

            {gradeScale.map(
              ({
                grade,
                points,
                minimum,
              }) => (
                <div
                  key={grade}
                  className="rounded-xl border border-gray-200 p-4"
                >

                  <div className="flex items-center justify-between">

                    <span className="text-lg font-bold">
                      {grade}
                    </span>

                    <span className="text-sm font-semibold">
                      {points} pts
                    </span>

                  </div>

                  <p className="mt-1 text-xs text-gray-500">
                    {minimum}% and above
                  </p>

                </div>
              )
            )}

          </div>

        </section>

        {/* GPA FORMULA */}

        <section className="mt-6 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">

          <h2 className="text-xl font-bold">
            GPA Formula
          </h2>

          <p className="mt-3 text-sm leading-7 text-gray-600">
            DataSphere calculates weighted GPA using:
          </p>

          <div className="mt-4 rounded-xl bg-gray-50 p-5 font-mono text-sm">
            GPA = Σ (Grade Points × Credit Hours)
            ÷ Σ Credit Hours
          </div>

          <p className="mt-4 text-sm leading-6 text-gray-600">
            For example, a 3-credit unit with 4
            grade points contributes 12 quality
            points. The total quality points are
            divided by the total credit hours used
            in the calculation.
          </p>

        </section>

      </div>
    </main>
  );
}

function PerformanceCard({
  title,
  value,
  description,
}: {
  title: string;
  value: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">

      <p className="text-sm text-gray-500">
        {title}
      </p>

      <p className="mt-2 break-words text-2xl font-bold">
        {value}
      </p>

      <p className="mt-2 text-xs text-gray-500">
        {description}
      </p>

    </div>
  );
}