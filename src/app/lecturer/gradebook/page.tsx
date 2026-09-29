"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { supabase } from "../../lib/supabase";

type Unit = {
  id: number;
  code: string | null;
  name: string | null;
};

type Assignment = {
  id: number;
  unit_id: number;
  title: string;
  max_points: number;
  due_date: string | null;
  assignment_number: number | null;
  gradebook_group_id: number | null;
};

type Quiz = {
  id: number;
  unit_id: number;
  title: string;
  points_possible: number;
  due_date: string | null;
  gradebook_group_id: number | null;
};

type GradebookGroup = {
  id: number;
  unit_id: number;
  name: string;
  weight: number;
  drop_lowest: number;
};

type Submission = {
  id: number;
  assignment_id: number;
  student_id: string;
  submission_number: number;
  submitted_at: string | null;
  status: string;
  grade: number | null;
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

type Profile = {
  id: string;
  full_name?: string | null;
  name?: string | null;
  email?: string | null;
};

type StudentRow = {
  student: Profile;
  assignments: Record<number, number | null>;
  quizzes: Record<number, number | null>;
  assignmentStatus: Record<number, string>;
  quizStatus: Record<number, string>;
  overall: number;
  letter: string;
};

function LecturerGradebookPage() {
  const searchParams = useSearchParams();

  const unitFromUrl = searchParams.get("unit");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [units, setUnits] = useState<Unit[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [groups, setGroups] = useState<GradebookGroup[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [quizAttempts, setQuizAttempts] = useState<QuizAttempt[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);

  const [selectedUnit, setSelectedUnit] = useState(
    unitFromUrl ? Number(unitFromUrl) : 0
  );

  const [search, setSearch] = useState("");
  const [studentFilter, setStudentFilter] = useState("all");

  const [selectedStudent, setSelectedStudent] =
    useState<StudentRow | null>(null);

  useEffect(() => {
    loadGradebook();
  }, []);

  async function loadGradebook() {
    setLoading(true);
    setError("");

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        throw new Error("You must be logged in.");
      }

      // --------------------------------------------------
      // Profile
      // --------------------------------------------------

      const { data: profile, error: profileError } =
        await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .maybeSingle();

      if (profileError) {
        throw profileError;
      }

      const isAdmin = profile?.role === "admin";

      // --------------------------------------------------
      // Lecturer units
      // --------------------------------------------------

      const { data: lecturerUnits, error: lecturerError } =
        await supabase
          .from("lecturer_units")
          .select("unit_id")
          .eq("lecturer_id", user.id);

      if (lecturerError) {
        throw lecturerError;
      }

      let allowedUnitIds = (lecturerUnits || []).map((row) =>
        Number(row.unit_id)
      );

      // Admin testing
      if (isAdmin) {
        const { data: allUnits, error: allUnitsError } =
          await supabase
            .from("units")
            .select("id");

        if (allUnitsError) {
          throw allUnitsError;
        }

        allowedUnitIds = (allUnits || []).map((row) =>
          Number(row.id)
        );
      }

      if (allowedUnitIds.length === 0) {
        setUnits([]);
        setAssignments([]);
        setQuizzes([]);
        setGroups([]);
        setSubmissions([]);
        setQuizAttempts([]);
        setProfiles([]);
        return;
      }

      // --------------------------------------------------
      // Units
      // --------------------------------------------------

      const { data: unitData, error: unitsError } =
        await supabase
          .from("units")
          .select("id, code, name")
          .in("id", allowedUnitIds)
          .order("code", { ascending: true });

      if (unitsError) {
        throw unitsError;
      }

      const loadedUnits = (unitData || []) as Unit[];

      setUnits(loadedUnits);

      // --------------------------------------------------
      // Assignments
      // --------------------------------------------------

      const { data: assignmentData, error: assignmentError } =
        await supabase
          .from("assignments")
          .select(
            `
              id,
              unit_id,
              title,
              max_points,
              due_date,
              assignment_number,
              gradebook_group_id
            `
          )
          .in("unit_id", allowedUnitIds)
          .order("assignment_number", {
            ascending: true,
          });

      if (assignmentError) {
        throw assignmentError;
      }

      setAssignments((assignmentData || []) as Assignment[]);

      // --------------------------------------------------
      // Quizzes
      // --------------------------------------------------

      const { data: quizData, error: quizError } =
        await supabase
          .from("quizzes")
          .select(
            `
              id,
              unit_id,
              title,
              points_possible,
              due_date,
              gradebook_group_id
            `
          )
          .in("unit_id", allowedUnitIds)
          .order("title", {
            ascending: true,
          });

      if (quizError) {
        throw quizError;
      }

      setQuizzes((quizData || []) as Quiz[]);

      // --------------------------------------------------
      // Gradebook groups
      // --------------------------------------------------

      const { data: groupData, error: groupError } =
        await supabase
          .from("gradebook_groups")
          .select(
            `
              id,
              unit_id,
              name,
              weight,
              drop_lowest
            `
          )
          .in("unit_id", allowedUnitIds)
          .order("name", {
            ascending: true,
          });

      if (groupError) {
        throw groupError;
      }

      setGroups((groupData || []) as GradebookGroup[]);

      // --------------------------------------------------
      // Assignment submissions
      // --------------------------------------------------

      const assignmentIds = (
        (assignmentData || []) as Assignment[]
      ).map((assignment) => Number(assignment.id));

      let loadedSubmissions: Submission[] = [];

      if (assignmentIds.length > 0) {
        const { data, error } = await supabase
          .from("assignment_submissions")
          .select(
            `
              id,
              assignment_id,
              student_id,
              submission_number,
              submitted_at,
              status,
              grade
            `
          )
          .in("assignment_id", assignmentIds);

        if (error) {
          throw error;
        }

        loadedSubmissions = (data || []) as Submission[];
      }

      setSubmissions(loadedSubmissions);

      // --------------------------------------------------
      // Quiz attempts
      // --------------------------------------------------

      const quizIds = (
        (quizData || []) as Quiz[]
      ).map((quiz) => Number(quiz.id));

      let loadedAttempts: QuizAttempt[] = [];

      if (quizIds.length > 0) {
        const { data, error } = await supabase
          .from("quiz_attempts")
          .select(
            `
              id,
              quiz_id,
              student_id,
              attempt_number,
              status,
              score,
              points_earned,
              points_possible,
              submitted_at
            `
          )
          .in("quiz_id", quizIds);

        if (error) {
          throw error;
        }

        loadedAttempts = (data || []) as QuizAttempt[];
      }

      setQuizAttempts(loadedAttempts);

      // --------------------------------------------------
      // Student profiles
      // --------------------------------------------------

      const studentIds = [
        ...new Set([
          ...loadedSubmissions.map(
            (submission) => submission.student_id
          ),
          ...loadedAttempts.map(
            (attempt) => attempt.student_id
          ),
        ]),
      ];

      let loadedProfiles: Profile[] = [];

      if (studentIds.length > 0) {
        const { data, error } = await supabase
          .from("profiles")
          .select("*")
          .in("id", studentIds);

        if (error) {
          throw error;
        }

        loadedProfiles = (data || []) as Profile[];
      }

      setProfiles(loadedProfiles);
    } catch (err: unknown) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "Failed to load lecturer gradebook."
      );
    } finally {
      setLoading(false);
    }
  }

  // --------------------------------------------------
  // Selected unit
  // --------------------------------------------------

  const currentUnit = useMemo(() => {
    return units.find(
      (unit) => Number(unit.id) === Number(selectedUnit)
    );
  }, [units, selectedUnit]);

  const currentAssignments = useMemo(() => {
    if (!selectedUnit) {
      return assignments;
    }

    return assignments.filter(
      (assignment) =>
        Number(assignment.unit_id) === Number(selectedUnit)
    );
  }, [assignments, selectedUnit]);

  const currentQuizzes = useMemo(() => {
    if (!selectedUnit) {
      return quizzes;
    }

    return quizzes.filter(
      (quiz) =>
        Number(quiz.unit_id) === Number(selectedUnit)
    );
  }, [quizzes, selectedUnit]);

  const currentGroups = useMemo(() => {
    if (!selectedUnit) {
      return groups;
    }

    return groups.filter(
      (group) =>
        Number(group.unit_id) === Number(selectedUnit)
    );
  }, [groups, selectedUnit]);

  // --------------------------------------------------
  // Latest assignment submission
  // --------------------------------------------------

  function getLatestSubmission(
    studentId: string,
    assignmentId: number
  ) {
    const records = submissions
      .filter(
        (submission) =>
          submission.student_id === studentId &&
          Number(submission.assignment_id) ===
            Number(assignmentId)
      )
      .sort(
        (a, b) =>
          Number(b.submission_number) -
          Number(a.submission_number)
      );

    return records[0] || null;
  }

  // --------------------------------------------------
  // Latest quiz attempt
  // --------------------------------------------------

  function getLatestQuizAttempt(
    studentId: string,
    quizId: number
  ) {
    const records = quizAttempts
      .filter(
        (attempt) =>
          attempt.student_id === studentId &&
          Number(attempt.quiz_id) === Number(quizId)
      )
      .sort(
        (a, b) =>
          Number(b.attempt_number) -
          Number(a.attempt_number)
      );

    return records[0] || null;
  }

  // --------------------------------------------------
  // Calculate student grade
  // --------------------------------------------------

  function calculateStudent(
    student: Profile
  ): StudentRow {
    const studentAssignments: Record<
      number,
      number | null
    > = {};

    const studentQuizzes: Record<
      number,
      number | null
    > = {};

    const assignmentStatus: Record<number, string> = {};
    const quizStatus: Record<number, string> = {};

    currentAssignments.forEach((assignment) => {
      const submission = getLatestSubmission(
        student.id,
        assignment.id
      );

      if (!submission) {
        studentAssignments[assignment.id] = null;
        assignmentStatus[assignment.id] = "missing";
        return;
      }

      studentAssignments[assignment.id] =
        submission.grade;

      assignmentStatus[assignment.id] =
        submission.status;
    });

    currentQuizzes.forEach((quiz) => {
      const attempt = getLatestQuizAttempt(
        student.id,
        quiz.id
      );

      if (!attempt) {
        studentQuizzes[quiz.id] = null;
        quizStatus[quiz.id] = "missing";
        return;
      }

      const possible =
        Number(
          attempt.points_possible ??
            quiz.points_possible ??
            0
        );

      const earned =
        attempt.points_earned !== null
          ? Number(attempt.points_earned)
          : attempt.score !== null
          ? Number(attempt.score)
          : null;

      if (
        earned === null ||
        !Number.isFinite(earned) ||
        possible <= 0
      ) {
        studentQuizzes[quiz.id] = null;
      } else {
        studentQuizzes[quiz.id] =
          (earned / possible) * 100;
      }

      quizStatus[quiz.id] = attempt.status;
    });

    // --------------------------------------------------
    // Calculate weighted groups
    // --------------------------------------------------

    let overall = 0;
    let totalAppliedWeight = 0;

    const groupsToUse =
      currentGroups.length > 0
        ? currentGroups
        : [
            {
              id: -1,
              unit_id: selectedUnit,
              name: "All Assessments",
              weight: 100,
              drop_lowest: 0,
            },
          ];

    for (const group of groupsToUse) {
      const groupAssignments =
        currentAssignments.filter(
          (assignment) =>
            Number(assignment.gradebook_group_id) ===
            Number(group.id)
        );

      const groupQuizzes =
        currentQuizzes.filter(
          (quiz) =>
            Number(quiz.gradebook_group_id) ===
            Number(group.id)
        );

      let earned = 0;
      let possible = 0;

      for (const assignment of groupAssignments) {
        const submission = getLatestSubmission(
          student.id,
          assignment.id
        );

        if (
          submission &&
          submission.grade !== null
        ) {
          earned += Number(submission.grade);
          possible += Number(
            assignment.max_points || 0
          );
        }
      }

      for (const quiz of groupQuizzes) {
        const attempt = getLatestQuizAttempt(
          student.id,
          quiz.id
        );

        if (!attempt) continue;

        const earnedPoints =
          attempt.points_earned !== null
            ? Number(attempt.points_earned)
            : null;

        const possiblePoints =
          attempt.points_possible !== null
            ? Number(attempt.points_possible)
            : Number(quiz.points_possible || 0);

        if (
          earnedPoints !== null &&
          possiblePoints > 0
        ) {
          earned += earnedPoints;
          possible += possiblePoints;
        }
      }

      if (possible > 0) {
        const groupPercentage =
          (earned / possible) * 100;

        const weight = Number(group.weight || 0);

        overall +=
          groupPercentage * (weight / 100);

        totalAppliedWeight += weight;
      }
    }

    // If groups don't cover 100%, normalize the available
    // graded work rather than incorrectly treating ungraded
    // work as zero.
    if (
      totalAppliedWeight > 0 &&
      totalAppliedWeight < 100
    ) {
      overall =
        overall * (100 / totalAppliedWeight);
    }

    overall = Math.max(
      0,
      Math.min(100, overall)
    );

    return {
      student,
      assignments: studentAssignments,
      quizzes: studentQuizzes,
      assignmentStatus,
      quizStatus,
      overall,
      letter: getLetterGrade(overall),
    };
  }

  // --------------------------------------------------
  // Student rows
  // --------------------------------------------------

  const studentRows = useMemo(() => {
    const rows = profiles.map((profile) =>
      calculateStudent(profile)
    );

    return rows.filter((row) => {
      const name =
        row.student.full_name ||
        row.student.name ||
        row.student.email ||
        "";

      const matchesSearch =
        !search ||
        name
          .toLowerCase()
          .includes(search.toLowerCase());

      if (!matchesSearch) {
        return false;
      }

      if (studentFilter === "graded") {
        return row.overall > 0;
      }

      if (studentFilter === "pending") {
        return (
          Object.values(row.assignmentStatus).some(
            (status) =>
              status === "submitted" ||
              status === "late"
          ) ||
          Object.values(row.quizStatus).some(
            (status) =>
              status === "in_progress"
          )
        );
      }

      if (studentFilter === "below_pass") {
        return row.overall < 40;
      }

      return true;
    });
  }, [
    profiles,
    assignments,
    quizzes,
    groups,
    submissions,
    quizAttempts,
    selectedUnit,
    search,
    studentFilter,
  ]);

  // --------------------------------------------------
  // Class statistics
  // --------------------------------------------------

  const statistics = useMemo(() => {
    if (studentRows.length === 0) {
      return {
        students: 0,
        average: 0,
        highest: 0,
        lowest: 0,
        passing: 0,
      };
    }

    const values = studentRows.map(
      (row) => row.overall
    );

    const average =
      values.reduce(
        (sum, value) => sum + value,
        0
      ) / values.length;

    const passing = values.filter(
      (value) => value >= 40
    ).length;

    return {
      students: values.length,
      average,
      highest: Math.max(...values),
      lowest: Math.min(...values),
      passing,
    };
  }, [studentRows]);

  function getLetterGrade(percentage: number) {
    if (percentage >= 70) return "A";
    if (percentage >= 60) return "B";
    if (percentage >= 50) return "C";
    if (percentage >= 40) return "D";
    return "E";
  }

  function studentName(profile: Profile) {
    return (
      profile.full_name ||
      profile.name ||
      profile.email ||
      "Student"
    );
  }

  function gradeClass(value: number) {
    if (value >= 70) {
      return "text-green-700";
    }

    if (value >= 60) {
      return "text-blue-700";
    }

    if (value >= 50) {
      return "text-yellow-700";
    }

    if (value >= 40) {
      return "text-orange-700";
    }

    return "text-red-700";
  }

  // --------------------------------------------------
  // Loading
  // --------------------------------------------------

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-50 p-6">
        <div className="mx-auto max-w-7xl">
          <div className="animate-pulse space-y-5">
            <div className="h-10 w-80 rounded bg-gray-200" />

            <div className="h-24 rounded-xl bg-white" />

            <div className="h-96 rounded-xl bg-white" />
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-7xl space-y-6">

        {/* Header */}
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">

          <div>
            <Link
              href="/lecturer"
              className="text-sm font-medium text-blue-600 hover:underline"
            >
              ← Lecturer Dashboard
            </Link>

            <h1 className="mt-2 text-3xl font-bold text-gray-900">
              Gradebook
            </h1>

            <p className="mt-1 text-gray-600">
              Track student performance across assignments
              and quizzes.
            </p>
          </div>

          <button
            onClick={loadGradebook}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100"
          >
            Refresh
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Unit selector */}
        <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">

          <label className="mb-2 block text-sm font-semibold text-gray-700">
            Teaching Unit
          </label>

          <select
            value={selectedUnit}
            onChange={(event) => {
              setSelectedUnit(
                Number(event.target.value)
              );
            }}
            className="w-full max-w-xl rounded-lg border border-gray-300 px-3 py-3 text-sm outline-none focus:border-blue-500"
          >
            <option value={0}>
              Select a unit
            </option>

            {units.map((unit) => (
              <option
                key={unit.id}
                value={unit.id}
              >
                {unit.code || "UNIT"} —{" "}
                {unit.name || "Unnamed Unit"}
              </option>
            ))}
          </select>

          {currentUnit && (
            <div className="mt-3 text-sm text-gray-500">
              Currently viewing{" "}
              <span className="font-semibold text-gray-900">
                {currentUnit.code}
              </span>
              {" — "}
              {currentUnit.name}
            </div>
          )}
        </section>

        {!selectedUnit ? (
          <section className="rounded-2xl border border-gray-200 bg-white px-6 py-16 text-center shadow-sm">

            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 text-3xl">
              📊
            </div>

            <h2 className="text-xl font-bold text-gray-900">
              Select a unit
            </h2>

            <p className="mx-auto mt-2 max-w-md text-sm text-gray-500">
              Choose one of your assigned units to open its
              gradebook.
            </p>

          </section>
        ) : (
          <>
            {/* Statistics */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">

              <StatCard
                label="Students"
                value={statistics.students.toString()}
              />

              <StatCard
                label="Class Average"
                value={`${statistics.average.toFixed(1)}%`}
              />

              <StatCard
                label="Highest"
                value={`${statistics.highest.toFixed(1)}%`}
              />

              <StatCard
                label="Lowest"
                value={`${statistics.lowest.toFixed(1)}%`}
              />

              <StatCard
                label="Passing"
                value={`${statistics.passing}/${statistics.students}`}
              />

            </div>

            {/* Filters */}
            <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">

              <div className="grid gap-4 md:grid-cols-2">

                <div>
                  <label className="mb-2 block text-sm font-semibold text-gray-700">
                    Search student
                  </label>

                  <input
                    value={search}
                    onChange={(event) =>
                      setSearch(event.target.value)
                    }
                    placeholder="Search by student name or email..."
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-gray-700">
                    Performance
                  </label>

                  <select
                    value={studentFilter}
                    onChange={(event) =>
                      setStudentFilter(
                        event.target.value
                      )
                    }
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500"
                  >
                    <option value="all">
                      All students
                    </option>

                    <option value="graded">
                      Students with grades
                    </option>

                    <option value="pending">
                      Pending work
                    </option>

                    <option value="below_pass">
                      Below pass
                    </option>
                  </select>
                </div>

              </div>
            </section>

            {/* Gradebook */}
            <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">

              <div className="border-b border-gray-200 px-5 py-4">

                <h2 className="font-bold text-gray-900">
                  Student Gradebook
                </h2>

                <p className="mt-1 text-sm text-gray-500">
                  {studentRows.length} student
                  {studentRows.length === 1
                    ? ""
                    : "s"}
                </p>

              </div>

              {studentRows.length === 0 ? (
                <div className="px-6 py-16 text-center">

                  <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-gray-100 text-2xl">
                    👥
                  </div>

                  <h3 className="font-semibold text-gray-900">
                    No students found
                  </h3>

                  <p className="mt-1 text-sm text-gray-500">
                    Student records will appear when
                    assessment activity is available.
                  </p>

                </div>
              ) : (
                <div className="overflow-x-auto">

                  <table className="min-w-max text-left text-sm">

                    <thead className="border-b border-gray-200 bg-gray-50">

                      <tr>

                        <th className="sticky left-0 z-10 bg-gray-50 px-5 py-3 font-semibold text-gray-600">
                          Student
                        </th>

                        {currentAssignments.map(
                          (assignment) => (
                            <th
                              key={`a-${assignment.id}`}
                              className="min-w-[130px] px-4 py-3 text-center font-semibold text-gray-600"
                            >
                              <div>
                                {assignment.title}
                              </div>

                              <div className="mt-1 text-xs font-normal text-gray-400">
                                {assignment.max_points} pts
                              </div>
                            </th>
                          )
                        )}

                        {currentQuizzes.map(
                          (quiz) => (
                            <th
                              key={`q-${quiz.id}`}
                              className="min-w-[130px] px-4 py-3 text-center font-semibold text-gray-600"
                            >
                              <div>
                                {quiz.title}
                              </div>

                              <div className="mt-1 text-xs font-normal text-gray-400">
                                Quiz ·{" "}
                                {quiz.points_possible} pts
                              </div>
                            </th>
                          )
                        )}

                        <th className="sticky right-[90px] z-10 bg-gray-50 px-5 py-3 text-center font-semibold text-gray-600">
                          Overall
                        </th>

                        <th className="sticky right-0 z-10 bg-gray-50 px-5 py-3 text-center font-semibold text-gray-600">
                          Grade
                        </th>

                      </tr>

                    </thead>

                    <tbody className="divide-y divide-gray-100">

                      {studentRows.map((row) => (
                        <tr
                          key={row.student.id}
                          className="hover:bg-gray-50"
                        >

                          <td className="sticky left-0 z-10 bg-white px-5 py-4">
                            <button
                              onClick={() =>
                                setSelectedStudent(row)
                              }
                              className="text-left"
                            >
                              <div className="font-semibold text-gray-900 hover:text-blue-600">
                                {studentName(
                                  row.student
                                )}
                              </div>

                              {row.student.email && (
                                <div className="mt-1 text-xs text-gray-500">
                                  {row.student.email}
                                </div>
                              )}
                            </button>
                          </td>

                          {currentAssignments.map(
                            (assignment) => {
                              const grade =
                                row.assignments[
                                  assignment.id
                                ];

                              const status =
                                row.assignmentStatus[
                                  assignment.id
                                ];

                              return (
                                <td
                                  key={`a-${assignment.id}`}
                                  className="px-4 py-4 text-center"
                                >
                                  {grade !== null &&
                                  grade !== undefined ? (
                                    <div>
                                      <span className="font-semibold text-gray-900">
                                        {grade}/
                                        {
                                          assignment.max_points
                                        }
                                      </span>

                                      {status ===
                                        "late" && (
                                        <div className="mt-1 text-xs font-medium text-orange-600">
                                          Late
                                        </div>
                                      )}
                                    </div>
                                  ) : (
                                    <span className="text-xs font-medium text-gray-400">
                                      {status ===
                                      "missing"
                                        ? "Missing"
                                        : "Pending"}
                                    </span>
                                  )}
                                </td>
                              );
                            }
                          )}

                          {currentQuizzes.map(
                            (quiz) => {
                              const percentage =
                                row.quizzes[
                                  quiz.id
                                ];

                              const status =
                                row.quizStatus[
                                  quiz.id
                                ];

                              return (
                                <td
                                  key={`q-${quiz.id}`}
                                  className="px-4 py-4 text-center"
                                >
                                  {percentage !== null &&
                                  percentage !==
                                    undefined ? (
                                    <div>
                                      <span className="font-semibold text-gray-900">
                                        {percentage.toFixed(
                                          1
                                        )}
                                        %
                                      </span>

                                      <div className="mt-1 text-xs text-gray-400">
                                        {status ===
                                        "graded"
                                          ? "Graded"
                                          : status}
                                      </div>
                                    </div>
                                  ) : (
                                    <span className="text-xs font-medium text-gray-400">
                                      {status ===
                                      "missing"
                                        ? "Missing"
                                        : "Pending"}
                                    </span>
                                  )}
                                </td>
                              );
                            }
                          )}

                          <td
                            className={`sticky right-[90px] z-10 bg-white px-5 py-4 text-center text-base font-bold ${gradeClass(
                              row.overall
                            )}`}
                          >
                            {row.overall.toFixed(1)}%
                          </td>

                          <td
                            className={`sticky right-0 z-10 bg-white px-5 py-4 text-center text-lg font-bold ${gradeClass(
                              row.overall
                            )}`}
                          >
                            {row.letter}
                          </td>

                        </tr>
                      ))}

                    </tbody>
                  </table>
                </div>
              )}
            </section>

            {/* Gradebook groups */}
            <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">

              <div className="flex items-center justify-between">

                <div>
                  <h2 className="font-bold text-gray-900">
                    Assessment Groups
                  </h2>

                  <p className="mt-1 text-sm text-gray-500">
                    Current weighting configured for this
                    unit.
                  </p>
                </div>

              </div>

              {currentGroups.length === 0 ? (
                <div className="mt-5 rounded-xl border border-dashed border-gray-300 p-6 text-center">

                  <p className="text-sm text-gray-500">
                    No gradebook groups are configured.
                    Assessments are currently treated as
                    one combined group.
                  </p>

                </div>
              ) : (
                <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

                  {currentGroups.map((group) => (
                    <div
                      key={group.id}
                      className="rounded-xl border border-gray-200 bg-gray-50 p-4"
                    >

                      <p className="font-semibold text-gray-900">
                        {group.name}
                      </p>

                      <p className="mt-2 text-2xl font-bold text-gray-900">
                        {group.weight}%
                      </p>

                      <p className="mt-1 text-xs text-gray-500">
                        Drop lowest:{" "}
                        {group.drop_lowest}
                      </p>

                    </div>
                  ))}

                </div>
              )}

            </section>
          </>
        )}
      </div>

      {/* ==================================================
          STUDENT DETAIL MODAL
          ================================================== */}

      {selectedStudent && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 p-4">

          <div className="mx-auto my-8 max-w-4xl rounded-2xl bg-white shadow-2xl">

            <div className="flex items-start justify-between border-b border-gray-200 p-6">

              <div>
                <p className="text-sm font-medium text-blue-600">
                  Student Performance
                </p>

                <h2 className="mt-1 text-2xl font-bold text-gray-900">
                  {studentName(
                    selectedStudent.student
                  )}
                </h2>

                {selectedStudent.student.email && (
                  <p className="mt-1 text-sm text-gray-500">
                    {selectedStudent.student.email}
                  </p>
                )}
              </div>

              <button
                onClick={() =>
                  setSelectedStudent(null)
                }
                className="rounded-lg px-3 py-2 text-xl text-gray-500 hover:bg-gray-100"
              >
                ×
              </button>

            </div>

            <div className="space-y-6 p-6">

              {/* Overall */}
              <div className="grid gap-4 sm:grid-cols-3">

                <div className="rounded-xl border border-gray-200 bg-gray-50 p-5">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Overall
                  </p>

                  <p
                    className={`mt-2 text-3xl font-bold ${gradeClass(
                      selectedStudent.overall
                    )}`}
                  >
                    {selectedStudent.overall.toFixed(
                      1
                    )}
                    %
                  </p>
                </div>

                <div className="rounded-xl border border-gray-200 bg-gray-50 p-5">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Letter Grade
                  </p>

                  <p
                    className={`mt-2 text-3xl font-bold ${gradeClass(
                      selectedStudent.overall
                    )}`}
                  >
                    {selectedStudent.letter}
                  </p>
                </div>

                <div className="rounded-xl border border-gray-200 bg-gray-50 p-5">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Unit
                  </p>

                  <p className="mt-2 text-lg font-bold text-gray-900">
                    {currentUnit?.code}
                  </p>
                </div>

              </div>

              {/* Assignment breakdown */}
              <div>

                <h3 className="mb-3 font-bold text-gray-900">
                  Assignment Performance
                </h3>

                <div className="overflow-hidden rounded-xl border border-gray-200">

                  {currentAssignments.length === 0 ? (
                    <div className="p-5 text-sm text-gray-500">
                      No assignments.
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-100">

                      {currentAssignments.map(
                        (assignment) => {
                          const grade =
                            selectedStudent
                              .assignments[
                              assignment.id
                            ];

                          const status =
                            selectedStudent
                              .assignmentStatus[
                              assignment.id
                            ];

                          return (
                            <div
                              key={assignment.id}
                              className="flex items-center justify-between gap-4 p-4"
                            >

                              <div>
                                <p className="font-medium text-gray-900">
                                  {assignment.title}
                                </p>

                                <p className="mt-1 text-xs text-gray-500">
                                  Maximum{" "}
                                  {
                                    assignment.max_points
                                  }{" "}
                                  points
                                </p>
                              </div>

                              <div className="text-right">

                                {grade !== null &&
                                grade !==
                                  undefined ? (
                                  <p className="font-bold text-gray-900">
                                    {grade}/
                                    {
                                      assignment.max_points
                                    }
                                  </p>
                                ) : (
                                  <p className="text-sm font-medium text-gray-400">
                                    {status ===
                                    "missing"
                                      ? "Missing"
                                      : "Pending"}
                                  </p>
                                )}

                                {status ===
                                  "late" && (
                                  <p className="text-xs font-medium text-orange-600">
                                    Late
                                  </p>
                                )}

                              </div>

                            </div>
                          );
                        }
                      )}

                    </div>
                  )}

                </div>
              </div>

              {/* Quiz breakdown */}
              <div>

                <h3 className="mb-3 font-bold text-gray-900">
                  Quiz Performance
                </h3>

                <div className="overflow-hidden rounded-xl border border-gray-200">

                  {currentQuizzes.length === 0 ? (
                    <div className="p-5 text-sm text-gray-500">
                      No quizzes.
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-100">

                      {currentQuizzes.map((quiz) => {
                        const percentage =
                          selectedStudent.quizzes[
                            quiz.id
                          ];

                        const status =
                          selectedStudent.quizStatus[
                            quiz.id
                          ];

                        return (
                          <div
                            key={quiz.id}
                            className="flex items-center justify-between gap-4 p-4"
                          >

                            <div>
                              <p className="font-medium text-gray-900">
                                {quiz.title}
                              </p>

                              <p className="mt-1 text-xs text-gray-500">
                                {quiz.points_possible}{" "}
                                points
                              </p>
                            </div>

                            <div className="text-right">

                              {percentage !==
                                null &&
                              percentage !==
                                undefined ? (
                                <p className="font-bold text-gray-900">
                                  {percentage.toFixed(
                                    1
                                  )}
                                  %
                                </p>
                              ) : (
                                <p className="text-sm font-medium text-gray-400">
                                  {status ===
                                  "missing"
                                    ? "Missing"
                                    : "Pending"}
                                </p>
                              )}

                            </div>

                          </div>
                        );
                      })}

                    </div>
                  )}

                </div>
              </div>

            </div>

            <div className="flex justify-end border-t border-gray-200 p-6">

              <button
                onClick={() =>
                  setSelectedStudent(null)
                }
                className="rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
              >
                Close
              </button>

            </div>

          </div>
        </div>
      )}
    </main>
  );
}

function StatCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <p className="text-sm font-medium text-gray-500">{label}</p>

      <p className="mt-2 text-2xl font-bold text-gray-900">{value}</p>
    </div>
  );
}

export default function GradebookPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-gray-50 p-6">
          <div className="mx-auto max-w-7xl">
            <div className="animate-pulse space-y-5">
              <div className="h-10 w-80 rounded bg-gray-200" />
              <div className="h-24 rounded-xl bg-white" />
              <div className="h-96 rounded-xl bg-white" />
            </div>
          </div>
        </main>
      }
    >
      <LecturerGradebookPage />
    </Suspense>
  );
}