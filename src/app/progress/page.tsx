"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "../lib/supabase";

type Unit = {
  id: number;
  code: string | null;
  name: string | null;
  credit_hours: number | null;
};

type Assignment = {
  id: number;
  unit_id: number;
  title: string;
  max_points: number | null;
  due_date: string | null;
};

type AssignmentSubmission = {
  id: number;
  assignment_id: number;
  student_id: string;
  submission_number: number;
  status: string;
  grade: number | null;
  submitted_at: string | null;
};

type Quiz = {
  id: number;
  unit_id: number;
  title: string;
  points_possible: number | null;
};

type QuizAttempt = {
  id: number;
  quiz_id: number;
  student_id: string;
  attempt_number: number;
  status: string;
  score: number | null;
  points_earned: number | null;
  points_possible: number | null;
  submitted_at: string | null;
};

type UnitPerformance = {
  unitId: number;
  code: string;
  name: string;
  creditHours: number;
  assessments: number;
  completed: number;
  graded: number;
  pointsEarned: number;
  pointsPossible: number;
  percentage: number;
};

function getLetterGrade(percentage: number) {
  if (percentage >= 70) return "A";
  if (percentage >= 60) return "B";
  if (percentage >= 50) return "C";
  if (percentage >= 40) return "D";
  return "E";
}

function getGradePoint(percentage: number) {
  if (percentage >= 70) return 5;
  if (percentage >= 60) return 4;
  if (percentage >= 50) return 3;
  if (percentage >= 40) return 2;
  return 0;
}

function getGradeClass(percentage: number) {
  if (percentage >= 70) {
    return "text-emerald-600 bg-emerald-50";
  }

  if (percentage >= 60) {
    return "text-blue-600 bg-blue-50";
  }

  if (percentage >= 50) {
    return "text-amber-600 bg-amber-50";
  }

  return "text-red-600 bg-red-50";
}

export default function ProgressPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [units, setUnits] = useState<Unit[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [assignmentSubmissions, setAssignmentSubmissions] = useState<
    AssignmentSubmission[]
  >([]);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [quizAttempts, setQuizAttempts] = useState<QuizAttempt[]>([]);

  const [activeTab, setActiveTab] = useState<
    "overview" | "units" | "assessments"
  >("overview");

  useEffect(() => {
    loadProgress();
  }, []);

  async function loadProgress() {
    try {
      setLoading(true);
      setError("");

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) throw userError;

      if (!user) {
        setError("You must be logged in to view your progress.");
        return;
      }

      const [
        unitsResult,
        assignmentsResult,
        submissionsResult,
        quizzesResult,
        attemptsResult,
      ] = await Promise.all([
        supabase
          .from("units")
          .select("id, code, name, credit_hours")
          .order("code", { ascending: true }),

        supabase
          .from("assignments")
          .select("id, unit_id, title, max_points, due_date")
          .order("created_at", { ascending: true }),

        supabase
          .from("assignment_submissions")
          .select(
            "id, assignment_id, student_id, submission_number, status, grade, submitted_at"
          )
          .eq("student_id", user.id)
          .order("submission_number", { ascending: false }),

        supabase
          .from("quizzes")
          .select("id, unit_id, title, points_possible")
          .eq("published", true),

        supabase
          .from("quiz_attempts")
          .select(
            "id, quiz_id, student_id, attempt_number, status, score, points_earned, points_possible, submitted_at"
          )
          .eq("student_id", user.id)
          .order("attempt_number", { ascending: false }),
      ]);

      if (unitsResult.error) throw unitsResult.error;
      if (assignmentsResult.error) throw assignmentsResult.error;
      if (submissionsResult.error) throw submissionsResult.error;
      if (quizzesResult.error) throw quizzesResult.error;
      if (attemptsResult.error) throw attemptsResult.error;

      setUnits(unitsResult.data || []);
      setAssignments(assignmentsResult.data || []);
      setAssignmentSubmissions(submissionsResult.data || []);
      setQuizzes(quizzesResult.data || []);
      setQuizAttempts(attemptsResult.data || []);
    } catch (err: any) {
      console.error(err);
      setError(err?.message || "Unable to load your academic progress.");
    } finally {
      setLoading(false);
    }
  }

  /*
   * Keep only the latest submission for each assignment.
   */
  const latestAssignmentSubmissions = useMemo(() => {
    const map = new Map<number, AssignmentSubmission>();

    for (const submission of assignmentSubmissions) {
      const existing = map.get(submission.assignment_id);

      if (
        !existing ||
        submission.submission_number > existing.submission_number
      ) {
        map.set(submission.assignment_id, submission);
      }
    }

    return Array.from(map.values());
  }, [assignmentSubmissions]);

  /*
   * Keep the highest/latest submitted quiz attempt.
   *
   * Highest score is used because a student may have multiple attempts.
   */
  const bestQuizAttempts = useMemo(() => {
    const map = new Map<number, QuizAttempt>();

    for (const attempt of quizAttempts) {
      if (attempt.status === "in_progress") continue;

      const existing = map.get(attempt.quiz_id);

      const currentScore =
        attempt.points_earned ??
        (attempt.score != null && attempt.points_possible
          ? (attempt.score / 100) * attempt.points_possible
          : null);

      const existingScore =
        existing?.points_earned ??
        (existing?.score != null && existing?.points_possible
          ? (existing.score / 100) * existing.points_possible
          : null);

      if (
        !existing ||
        (currentScore != null &&
          (existingScore == null || currentScore > existingScore))
      ) {
        map.set(attempt.quiz_id, attempt);
      }
    }

    return Array.from(map.values());
  }, [quizAttempts]);

  const performance = useMemo<UnitPerformance[]>(() => {
    return units.map((unit) => {
      const unitAssignments = assignments.filter(
        (assignment) => assignment.unit_id === unit.id
      );

      const unitQuizzes = quizzes.filter(
        (quiz) => quiz.unit_id === unit.id
      );

      const unitAssignmentIds = new Set(
        unitAssignments.map((assignment) => assignment.id)
      );

      const unitQuizIds = new Set(
        unitQuizzes.map((quiz) => quiz.id)
      );

      const unitSubmissions = latestAssignmentSubmissions.filter((submission) =>
        unitAssignmentIds.has(submission.assignment_id)
      );

      const unitQuizAttempts = bestQuizAttempts.filter((attempt) =>
        unitQuizIds.has(attempt.quiz_id)
      );

      let pointsEarned = 0;
      let pointsPossible = 0;
      let completed = 0;
      let graded = 0;

      for (const assignment of unitAssignments) {
        const submission = unitSubmissions.find(
          (item) => item.assignment_id === assignment.id
        );

        const maxPoints = Number(assignment.max_points ?? 100);

        pointsPossible += maxPoints;

        if (submission) {
          completed++;

          if (submission.grade != null) {
            graded++;
            pointsEarned += Number(submission.grade);
          }
        }
      }

      for (const quiz of unitQuizzes) {
        const attempt = unitQuizAttempts.find(
          (item) => item.quiz_id === quiz.id
        );

        const maxPoints = Number(
          quiz.points_possible ??
            attempt?.points_possible ??
            0
        );

        pointsPossible += maxPoints;

        if (attempt) {
          completed++;

          if (attempt.points_earned != null) {
            graded++;
            pointsEarned += Number(attempt.points_earned);
          } else if (
            attempt.score != null &&
            attempt.points_possible
          ) {
            graded++;
            pointsEarned +=
              (Number(attempt.score) / 100) *
              Number(attempt.points_possible);
          }
        }
      }

      const percentage =
        pointsPossible > 0
          ? (pointsEarned / pointsPossible) * 100
          : 0;

      return {
        unitId: unit.id,
        code: unit.code || "UNIT",
        name: unit.name || "Unnamed Unit",
        creditHours: Number(unit.credit_hours ?? 0),
        assessments: unitAssignments.length + unitQuizzes.length,
        completed,
        graded,
        pointsEarned,
        pointsPossible,
        percentage,
      };
    });
  }, [
    units,
    assignments,
    quizzes,
    latestAssignmentSubmissions,
    bestQuizAttempts,
  ]);

  const totalAssessments = performance.reduce(
    (sum, item) => sum + item.assessments,
    0
  );

  const totalCompleted = performance.reduce(
    (sum, item) => sum + item.completed,
    0
  );

  const totalGraded = performance.reduce(
    (sum, item) => sum + item.graded,
    0
  );

  const totalPointsEarned = performance.reduce(
    (sum, item) => sum + item.pointsEarned,
    0
  );

  const totalPointsPossible = performance.reduce(
    (sum, item) => sum + item.pointsPossible,
    0
  );

  const overallPercentage =
    totalPointsPossible > 0
      ? (totalPointsEarned / totalPointsPossible) * 100
      : 0;

  const overallGrade = getLetterGrade(overallPercentage);
  const overallGradePoint = getGradePoint(overallPercentage);

  const completionPercentage =
    totalAssessments > 0
      ? (totalCompleted / totalAssessments) * 100
      : 0;

  const gradedPercentage =
    totalAssessments > 0
      ? (totalGraded / totalAssessments) * 100
      : 0;

  const strongestUnits = [...performance]
    .filter((unit) => unit.pointsPossible > 0)
    .sort((a, b) => b.percentage - a.percentage)
    .slice(0, 3);

  const weakestUnits = [...performance]
    .filter((unit) => unit.pointsPossible > 0)
    .sort((a, b) => a.percentage - b.percentage)
    .slice(0, 3);

  const pendingAssignments = assignments.filter((assignment) => {
    return !latestAssignmentSubmissions.some(
      (submission) => submission.assignment_id === assignment.id
    );
  });

  const pendingQuizzes = quizzes.filter((quiz) => {
    return !bestQuizAttempts.some(
      (attempt) => attempt.quiz_id === quiz.id
    );
  });

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50 p-6">
        <div className="mx-auto max-w-7xl">
          <div className="animate-pulse space-y-6">
            <div className="h-10 w-64 rounded bg-slate-200" />
            <div className="grid gap-4 md:grid-cols-4">
              {[1, 2, 3, 4].map((item) => (
                <div
                  key={item}
                  className="h-32 rounded-2xl bg-slate-200"
                />
              ))}
            </div>
            <div className="h-96 rounded-2xl bg-slate-200" />
          </div>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen bg-slate-50 p-6">
        <div className="mx-auto max-w-3xl">
          <div className="rounded-2xl border border-red-200 bg-red-50 p-6">
            <h1 className="text-xl font-bold text-red-700">
              Unable to load progress
            </h1>

            <p className="mt-2 text-sm text-red-600">
              {error}
            </p>

            <button
              onClick={loadProgress}
              className="mt-5 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
            >
              Try again
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 p-4 md:p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Header */}
        <section className="rounded-3xl bg-white p-6 shadow-sm md:p-8">
          <div className="flex flex-col justify-between gap-5 md:flex-row md:items-center">
            <div>
              <p className="text-sm font-semibold text-blue-600">
                ACADEMIC PERFORMANCE
              </p>

              <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">
                My Progress
              </h1>

              <p className="mt-2 max-w-2xl text-sm text-slate-500">
                Track your academic performance, assessment completion,
                grades and unit-by-unit progress.
              </p>
            </div>

            <Link
              href="/gpa"
              className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Open GPA Calculator
            </Link>
          </div>

          {/* Tabs */}
          <div className="mt-7 flex gap-2 overflow-x-auto border-b border-slate-100">
            {[
              ["overview", "Overview"],
              ["units", "Unit Performance"],
              ["assessments", "Assessments"],
            ].map(([value, label]) => (
              <button
                key={value}
                onClick={() =>
                  setActiveTab(
                    value as "overview" | "units" | "assessments"
                  )
                }
                className={`whitespace-nowrap border-b-2 px-4 py-3 text-sm font-semibold transition ${
                  activeTab === value
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-slate-500 hover:text-slate-800"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </section>

        {activeTab === "overview" && (
          <>
            {/* Main statistics */}
            <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard
                label="Overall Performance"
                value={`${overallPercentage.toFixed(1)}%`}
                detail={`Grade ${overallGrade}`}
                icon="📊"
              />

              <StatCard
                label="Grade Point"
                value={overallGradePoint.toFixed(1)}
                detail="Current estimated point"
                icon="🎓"
              />

              <StatCard
                label="Assessment Completion"
                value={`${completionPercentage.toFixed(0)}%`}
                detail={`${totalCompleted}/${totalAssessments} completed`}
                icon="✅"
              />

              <StatCard
                label="Graded Work"
                value={`${gradedPercentage.toFixed(0)}%`}
                detail={`${totalGraded} graded assessments`}
                icon="📝"
              />
            </section>

            {/* Overall progress */}
            <section className="grid gap-6 lg:grid-cols-3">
              <div className="rounded-2xl bg-white p-6 shadow-sm lg:col-span-2">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">
                      Overall Progress
                    </h2>

                    <p className="mt-1 text-sm text-slate-500">
                      Based on available assignment and quiz results.
                    </p>
                  </div>

                  <span
                    className={`rounded-full px-3 py-1 text-sm font-bold ${getGradeClass(
                      overallPercentage
                    )}`}
                  >
                    {overallGrade}
                  </span>
                </div>

                <div className="mt-7">
                  <div className="flex items-end justify-between">
                    <span className="text-4xl font-bold text-slate-900">
                      {overallPercentage.toFixed(1)}%
                    </span>

                    <span className="text-sm text-slate-500">
                      {totalPointsEarned.toFixed(1)} /{" "}
                      {totalPointsPossible.toFixed(1)} points
                    </span>
                  </div>

                  <div className="mt-4 h-4 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-blue-600 transition-all"
                      style={{
                        width: `${Math.min(
                          Math.max(overallPercentage, 0),
                          100
                        )}%`,
                      }}
                    />
                  </div>
                </div>

                <div className="mt-8 grid gap-4 sm:grid-cols-3">
                  <MiniMetric
                    label="Units"
                    value={units.length.toString()}
                  />

                  <MiniMetric
                    label="Completed"
                    value={totalCompleted.toString()}
                  />

                  <MiniMetric
                    label="Pending"
                    value={(
                      pendingAssignments.length +
                      pendingQuizzes.length
                    ).toString()}
                  />
                </div>
              </div>

              {/* Grade interpretation */}
              <div className="rounded-2xl bg-white p-6 shadow-sm">
                <h2 className="text-lg font-bold text-slate-900">
                  Current Standing
                </h2>

                <div className="mt-6 flex flex-col items-center">
                  <div
                    className={`flex h-32 w-32 items-center justify-center rounded-full text-5xl font-black ${getGradeClass(
                      overallPercentage
                    )}`}
                  >
                    {overallGrade}
                  </div>

                  <p className="mt-5 text-center text-2xl font-bold text-slate-900">
                    {overallPercentage.toFixed(1)}%
                  </p>

                  <p className="mt-1 text-center text-sm text-slate-500">
                    Estimated current performance
                  </p>
                </div>
              </div>
            </section>

            {/* Strongest / weakest */}
            <section className="grid gap-6 lg:grid-cols-2">
              <PerformanceList
                title="Strongest Units"
                subtitle="Your highest-performing units"
                items={strongestUnits}
              />

              <PerformanceList
                title="Units Needing Attention"
                subtitle="Consider spending more study time here"
                items={weakestUnits}
              />
            </section>
          </>
        )}

        {activeTab === "units" && (
          <section className="rounded-2xl bg-white shadow-sm">
            <div className="border-b border-slate-100 p-6">
              <h2 className="text-lg font-bold text-slate-900">
                Unit Performance
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                A detailed view of your performance in each unit.
              </p>
            </div>

            {performance.length === 0 ? (
              <EmptyState message="No academic units are available yet." />
            ) : (
              <div className="divide-y divide-slate-100">
                {performance.map((unit) => (
                  <div
                    key={unit.unitId}
                    className="p-5 transition hover:bg-slate-50 md:p-6"
                  >
                    <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-bold text-slate-700">
                            {unit.code}
                          </span>

                          {unit.creditHours > 0 && (
                            <span className="text-xs text-slate-400">
                              {unit.creditHours} credit hours
                            </span>
                          )}
                        </div>

                        <h3 className="mt-2 truncate text-base font-bold text-slate-900">
                          {unit.name}
                        </h3>

                        <p className="mt-1 text-sm text-slate-500">
                          {unit.completed} of {unit.assessments} assessments
                          completed
                        </p>
                      </div>

                      <div className="w-full md:w-72">
                        <div className="flex justify-between text-sm">
                          <span className="font-semibold text-slate-600">
                            Progress
                          </span>

                          <span className="font-bold text-slate-900">
                            {unit.percentage.toFixed(1)}%
                          </span>
                        </div>

                        <div className="mt-2 h-3 overflow-hidden rounded-full bg-slate-100">
                          <div
                            className="h-full rounded-full bg-blue-600"
                            style={{
                              width: `${Math.min(
                                Math.max(unit.percentage, 0),
                                100
                              )}%`,
                            }}
                          />
                        </div>
                      </div>

                      <div
                        className={`self-start rounded-xl px-4 py-2 text-center md:self-auto ${getGradeClass(
                          unit.percentage
                        )}`}
                      >
                        <div className="text-xl font-black">
                          {getLetterGrade(unit.percentage)}
                        </div>

                        <div className="text-xs font-semibold">
                          {unit.percentage.toFixed(1)}%
                        </div>
                      </div>

                      <Link
                        href={`/units/${unit.unitId}`}
                        className="rounded-xl border border-slate-200 px-4 py-2 text-center text-sm font-semibold text-slate-700 hover:bg-slate-50"
                      >
                        Open Unit
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {activeTab === "assessments" && (
          <section className="grid gap-6 lg:grid-cols-2">
            {/* Assignments */}
            <div className="rounded-2xl bg-white shadow-sm">
              <div className="border-b border-slate-100 p-6">
                <h2 className="text-lg font-bold text-slate-900">
                  Assignments
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Your latest assignment results.
                </p>
              </div>

              <div className="divide-y divide-slate-100">
                {assignments.length === 0 ? (
                  <EmptyState message="No assignments available." />
                ) : (
                  assignments.map((assignment) => {
                    const submission =
                      latestAssignmentSubmissions.find(
                        (item) =>
                          item.assignment_id === assignment.id
                      );

                    const unit = units.find(
                      (item) => item.id === assignment.unit_id
                    );

                    const percentage =
                      submission?.grade != null &&
                      assignment.max_points
                        ? (Number(submission.grade) /
                            Number(assignment.max_points)) *
                          100
                        : null;

                    return (
                      <div
                        key={assignment.id}
                        className="p-5"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0">
                            <p className="text-xs font-bold uppercase tracking-wide text-blue-600">
                              {unit?.code || "Unit"}
                            </p>

                            <h3 className="mt-1 font-bold text-slate-900">
                              {assignment.title}
                            </h3>

                            {assignment.due_date && (
                              <p className="mt-1 text-xs text-slate-500">
                                Due{" "}
                                {new Date(
                                  assignment.due_date
                                ).toLocaleDateString()}
                              </p>
                            )}
                          </div>

                          {percentage != null ? (
                            <span
                              className={`rounded-lg px-3 py-2 text-sm font-bold ${getGradeClass(
                                percentage
                              )}`}
                            >
                              {percentage.toFixed(1)}%
                            </span>
                          ) : (
                            <span className="rounded-lg bg-slate-100 px-3 py-2 text-xs font-bold text-slate-500">
                              {submission
                                ? "Pending grade"
                                : "Not submitted"}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Quizzes */}
            <div className="rounded-2xl bg-white shadow-sm">
              <div className="border-b border-slate-100 p-6">
                <h2 className="text-lg font-bold text-slate-900">
                  Quizzes
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Your best completed quiz attempts.
                </p>
              </div>

              <div className="divide-y divide-slate-100">
                {quizzes.length === 0 ? (
                  <EmptyState message="No published quizzes available." />
                ) : (
                  quizzes.map((quiz) => {
                    const attempt = bestQuizAttempts.find(
                      (item) => item.quiz_id === quiz.id
                    );

                    const percentage =
                      attempt?.score != null
                        ? Number(attempt.score)
                        : attempt?.points_earned != null &&
                          attempt.points_possible
                        ? (Number(attempt.points_earned) /
                            Number(attempt.points_possible)) *
                          100
                        : null;

                    const unit = units.find(
                      (item) => item.id === quiz.unit_id
                    );

                    return (
                      <div
                        key={quiz.id}
                        className="p-5"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0">
                            <p className="text-xs font-bold uppercase tracking-wide text-purple-600">
                              {unit?.code || "Unit"}
                            </p>

                            <h3 className="mt-1 font-bold text-slate-900">
                              {quiz.title}
                            </h3>

                            <p className="mt-1 text-xs text-slate-500">
                              {attempt
                                ? `Attempt ${attempt.attempt_number}`
                                : "Not attempted"}
                            </p>
                          </div>

                          {percentage != null ? (
                            <span
                              className={`rounded-lg px-3 py-2 text-sm font-bold ${getGradeClass(
                                percentage
                              )}`}
                            >
                              {percentage.toFixed(1)}%
                            </span>
                          ) : (
                            <span className="rounded-lg bg-slate-100 px-3 py-2 text-xs font-bold text-slate-500">
                              Pending
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </section>
        )}

        {/* Pending work */}
        {activeTab === "overview" && (
          <section className="rounded-2xl bg-white shadow-sm">
            <div className="border-b border-slate-100 p-6">
              <h2 className="text-lg font-bold text-slate-900">
                Outstanding Work
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Assessments you have not submitted or attempted.
              </p>
            </div>

            <div className="grid gap-6 p-6 md:grid-cols-2">
              <div>
                <h3 className="font-bold text-slate-800">
                  Assignments
                </h3>

                <div className="mt-3 space-y-2">
                  {pendingAssignments.length === 0 ? (
                    <p className="rounded-xl bg-emerald-50 p-4 text-sm font-medium text-emerald-700">
                      No pending assignments.
                    </p>
                  ) : (
                    pendingAssignments.slice(0, 5).map((assignment) => (
                      <Link
                        key={assignment.id}
                        href={`/assignments/${assignment.id}`}
                        className="block rounded-xl border border-slate-100 p-4 hover:bg-slate-50"
                      >
                        <p className="font-semibold text-slate-900">
                          {assignment.title}
                        </p>

                        <p className="mt-1 text-xs text-slate-500">
                          {assignment.due_date
                            ? `Due ${new Date(
                                assignment.due_date
                              ).toLocaleDateString()}`
                            : "No due date"}
                        </p>
                      </Link>
                    ))
                  )}
                </div>
              </div>

              <div>
                <h3 className="font-bold text-slate-800">
                  Quizzes
                </h3>

                <div className="mt-3 space-y-2">
                  {pendingQuizzes.length === 0 ? (
                    <p className="rounded-xl bg-emerald-50 p-4 text-sm font-medium text-emerald-700">
                      No pending quizzes.
                    </p>
                  ) : (
                    pendingQuizzes.slice(0, 5).map((quiz) => (
                      <Link
                        key={quiz.id}
                        href={`/quizzes/${quiz.id}`}
                        className="block rounded-xl border border-slate-100 p-4 hover:bg-slate-50"
                      >
                        <p className="font-semibold text-slate-900">
                          {quiz.title}
                        </p>

                        <p className="mt-1 text-xs text-slate-500">
                          {quiz.points_possible ?? 0} points
                        </p>
                      </Link>
                    ))
                  )}
                </div>
              </div>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}

function StatCard({
  label,
  value,
  detail,
  icon,
}: {
  label: string;
  value: string;
  detail: string;
  icon: string;
}) {
  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500">
            {label}
          </p>

          <p className="mt-2 text-3xl font-black tracking-tight text-slate-900">
            {value}
          </p>

          <p className="mt-1 text-xs text-slate-500">
            {detail}
          </p>
        </div>

        <span className="text-2xl">{icon}</span>
      </div>
    </div>
  );
}

function MiniMetric({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl bg-slate-50 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
        {label}
      </p>

      <p className="mt-1 text-2xl font-black text-slate-900">
        {value}
      </p>
    </div>
  );
}

function PerformanceList({
  title,
  subtitle,
  items,
}: {
  title: string;
  subtitle: string;
  items: UnitPerformance[];
}) {
  return (
    <div className="rounded-2xl bg-white p-6 shadow-sm">
      <h2 className="text-lg font-bold text-slate-900">
        {title}
      </h2>

      <p className="mt-1 text-sm text-slate-500">
        {subtitle}
      </p>

      <div className="mt-5 space-y-4">
        {items.length === 0 ? (
          <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">
            Not enough graded data yet.
          </p>
        ) : (
          items.map((unit) => (
            <div key={unit.unitId}>
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-xs font-bold text-blue-600">
                    {unit.code}
                  </p>

                  <p className="truncate text-sm font-semibold text-slate-800">
                    {unit.name}
                  </p>
                </div>

                <span
                  className={`rounded-lg px-2.5 py-1 text-xs font-bold ${getGradeClass(
                    unit.percentage
                  )}`}
                >
                  {unit.percentage.toFixed(1)}%
                </span>
              </div>

              <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-blue-600"
                  style={{
                    width: `${Math.min(
                      Math.max(unit.percentage, 0),
                      100
                    )}%`,
                  }}
                />
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="p-8 text-center">
      <div className="text-3xl">📚</div>

      <p className="mt-3 text-sm text-slate-500">
        {message}
      </p>
    </div>
  );
}