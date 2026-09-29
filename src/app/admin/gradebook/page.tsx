"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabase";

type Unit = {
  id: number;
  name: string;
  code?: string | null;
};

type GradebookGroup = {
  id: number;
  unit_id: number;
  name: string;
  weight: number;
  drop_lowest: number;
};

type Assignment = {
  id: number;
  unit_id: number;
  title: string;
  max_points: number;
  due_date: string | null;
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

type AssignmentSubmission = {
  id: number;
  assignment_id: number;
  student_id: string;
  submission_number: number;
  submitted_at: string | null;
  status: string;
  grade: number | null;
  feedback: string | null;
};

type QuizAttempt = {
  id: number;
  quiz_id: number;
  student_id: string;
  attempt_number: number;
  submitted_at: string | null;
  status: string;
  score: number | null;
  points_earned: number | null;
  points_possible: number | null;
};

type Profile = {
  id: string;
  full_name?: string | null;
  name?: string | null;
  email?: string | null;
  username?: string | null;
};

type Assessment = {
  key: string;
  id: number;
  type: "assignment" | "quiz";
  title: string;
  maxPoints: number;
  dueDate: string | null;
  groupId: number | null;
};

type StudentRow = {
  id: string;
  name: string;
  email: string;
};

type GradeCell = {
  assessmentKey: string;
  score: number | null;
  maxPoints: number;
  status: string;
  submissionId?: number;
  attemptId?: number;
};

function getProfileName(profile?: Profile) {
  if (!profile) return "Unknown Student";

  return (
    profile.full_name ||
    profile.name ||
    profile.username ||
    profile.email ||
    "Unknown Student"
  );
}

function percentage(score: number, max: number) {
  if (!max) return 0;
  return (score / max) * 100;
}

function formatDate(value: string | null) {
  if (!value) return "—";

  return new Date(value).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatNumber(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(2);
}

function gradeLetter(value: number) {
  if (value >= 80) return "A";
  if (value >= 75) return "A-";
  if (value >= 70) return "B+";
  if (value >= 65) return "B";
  if (value >= 60) return "B-";
  if (value >= 55) return "C+";
  if (value >= 50) return "C";
  if (value >= 45) return "C-";
  if (value >= 40) return "D";
  return "E";
}

export default function GradebookPage() {
  const [units, setUnits] = useState<Unit[]>([]);
  const [selectedUnitId, setSelectedUnitId] = useState<number | null>(null);

  const [groups, setGroups] = useState<GradebookGroup[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [submissions, setSubmissions] = useState<AssignmentSubmission[]>([]);
  const [attempts, setAttempts] = useState<QuizAttempt[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);

  const [loading, setLoading] = useState(false);
  const [savingGroup, setSavingGroup] = useState(false);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupWeight, setNewGroupWeight] = useState("0");

  const [showGroups, setShowGroups] = useState(false);

  /*
   * ---------------------------------------------------------
   * LOAD UNITS
   * ---------------------------------------------------------
   */

  useEffect(() => {
    loadUnits();
  }, []);

  async function loadUnits() {
    setError("");

    const { data, error } = await supabase
      .from("units")
      .select("id, name, code")
      .order("name", { ascending: true });

    if (error) {
      setError(error.message);
      return;
    }

    setUnits((data || []) as Unit[]);

    if (data && data.length > 0) {
      setSelectedUnitId(data[0].id);
    }
  }

  /*
   * ---------------------------------------------------------
   * LOAD GRADEBOOK
   * ---------------------------------------------------------
   */

  useEffect(() => {
    if (!selectedUnitId) return;

    loadGradebook(selectedUnitId);
  }, [selectedUnitId]);

  async function loadGradebook(unitId: number) {
    setLoading(true);
    setError("");
    setMessage("");

    const [
      groupsResult,
      assignmentsResult,
      quizzesResult,
    ] = await Promise.all([
      supabase
        .from("gradebook_groups")
        .select("*")
        .eq("unit_id", unitId)
        .order("id", { ascending: true }),

      supabase
        .from("assignments")
        .select(
          "id, unit_id, title, max_points, due_date, gradebook_group_id"
        )
        .eq("unit_id", unitId)
        .order("due_date", { ascending: true }),

      supabase
        .from("quizzes")
        .select(
          "id, unit_id, title, points_possible, due_date, gradebook_group_id"
        )
        .eq("unit_id", unitId)
        .order("due_date", { ascending: true }),
    ]);

    if (groupsResult.error) {
      setError(groupsResult.error.message);
      setLoading(false);
      return;
    }

    if (assignmentsResult.error) {
      setError(assignmentsResult.error.message);
      setLoading(false);
      return;
    }

    if (quizzesResult.error) {
      setError(quizzesResult.error.message);
      setLoading(false);
      return;
    }

    const loadedAssignments =
      (assignmentsResult.data || []) as Assignment[];

    const loadedQuizzes =
      (quizzesResult.data || []) as Quiz[];

    setGroups((groupsResult.data || []) as GradebookGroup[]);
    setAssignments(loadedAssignments);
    setQuizzes(loadedQuizzes);

    const assignmentIds = loadedAssignments.map((item) => item.id);
    const quizIds = loadedQuizzes.map((item) => item.id);

    let loadedSubmissions: AssignmentSubmission[] = [];
    let loadedAttempts: QuizAttempt[] = [];

    if (assignmentIds.length > 0) {
      const result = await supabase
        .from("assignment_submissions")
        .select(
          `
          id,
          assignment_id,
          student_id,
          submission_number,
          submitted_at,
          status,
          grade,
          feedback
        `
        )
        .in("assignment_id", assignmentIds)
        .order("submission_number", { ascending: false });

      if (result.error) {
        setError(result.error.message);
        setLoading(false);
        return;
      }

      loadedSubmissions =
        (result.data || []) as AssignmentSubmission[];
    }

    if (quizIds.length > 0) {
      const result = await supabase
        .from("quiz_attempts")
        .select(
          `
          id,
          quiz_id,
          student_id,
          attempt_number,
          submitted_at,
          status,
          score,
          points_earned,
          points_possible
        `
        )
        .in("quiz_id", quizIds)
        .order("attempt_number", { ascending: false });

      if (result.error) {
        setError(result.error.message);
        setLoading(false);
        return;
      }

      loadedAttempts = (result.data || []) as QuizAttempt[];
    }

    setSubmissions(loadedSubmissions);
    setAttempts(loadedAttempts);

    const studentIds = Array.from(
      new Set([
        ...loadedSubmissions.map((item) => item.student_id),
        ...loadedAttempts.map((item) => item.student_id),
      ])
    );

    if (studentIds.length > 0) {
      const profileResult = await supabase
        .from("profiles")
        .select("*")
        .in("id", studentIds);

      if (profileResult.error) {
        setError(profileResult.error.message);
        setLoading(false);
        return;
      }

      setProfiles((profileResult.data || []) as Profile[]);
    } else {
      setProfiles([]);
    }

    setLoading(false);
  }

  /*
   * ---------------------------------------------------------
   * ASSESSMENTS
   * ---------------------------------------------------------
   */

  const assessments = useMemo<Assessment[]>(() => {
    const assignmentAssessments: Assessment[] = assignments.map(
      (assignment) => ({
        key: `assignment-${assignment.id}`,
        id: assignment.id,
        type: "assignment",
        title: assignment.title,
        maxPoints: Number(assignment.max_points || 0),
        dueDate: assignment.due_date,
        groupId: assignment.gradebook_group_id,
      })
    );

    const quizAssessments: Assessment[] = quizzes.map((quiz) => ({
      key: `quiz-${quiz.id}`,
      id: quiz.id,
      type: "quiz",
      title: quiz.title,
      maxPoints: Number(quiz.points_possible || 0),
      dueDate: quiz.due_date,
      groupId: quiz.gradebook_group_id,
    }));

    return [...assignmentAssessments, ...quizAssessments];
  }, [assignments, quizzes]);

  /*
   * ---------------------------------------------------------
   * LATEST SUBMISSION / ATTEMPT
   * ---------------------------------------------------------
   */

  function getLatestSubmission(
    studentId: string,
    assignmentId: number
  ) {
    return (
      submissions.find(
        (item) =>
          item.student_id === studentId &&
          item.assignment_id === assignmentId
      ) || null
    );
  }

  function getLatestAttempt(studentId: string, quizId: number) {
    return (
      attempts.find(
        (item) =>
          item.student_id === studentId &&
          item.quiz_id === quizId
      ) || null
    );
  }

  /*
   * ---------------------------------------------------------
   * STUDENTS
   * ---------------------------------------------------------
   */

  const students = useMemo<StudentRow[]>(() => {
    const ids = Array.from(
      new Set([
        ...submissions.map((item) => item.student_id),
        ...attempts.map((item) => item.student_id),
      ])
    );

    return ids
      .map((id) => {
        const profile = profiles.find((item) => item.id === id);

        return {
          id,
          name: getProfileName(profile),
          email: profile?.email || "",
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [submissions, attempts, profiles]);

  /*
   * ---------------------------------------------------------
   * STUDENT CALCULATIONS
   * ---------------------------------------------------------
   */

  function getCell(
    studentId: string,
    assessment: Assessment
  ): GradeCell {
    if (assessment.type === "assignment") {
      const submission = getLatestSubmission(
        studentId,
        assessment.id
      );

      if (!submission) {
        return {
          assessmentKey: assessment.key,
          score: null,
          maxPoints: assessment.maxPoints,
          status: "missing",
          submissionId: undefined,
        };
      }

      return {
        assessmentKey: assessment.key,
        score:
          submission.grade === null
            ? null
            : Number(submission.grade),
        maxPoints: assessment.maxPoints,
        status: submission.status || "submitted",
        submissionId: submission.id,
      };
    }

    const attempt = getLatestAttempt(
      studentId,
      assessment.id
    );

    if (!attempt) {
      return {
        assessmentKey: assessment.key,
        score: null,
        maxPoints: assessment.maxPoints,
        status: "missing",
      };
    }

    return {
      assessmentKey: assessment.key,
      score:
        attempt.points_earned === null
          ? null
          : Number(attempt.points_earned),
      maxPoints:
        Number(attempt.points_possible || assessment.maxPoints),
      status: attempt.status || "submitted",
      attemptId: attempt.id,
    };
  }

  function getGroupResult(
    studentId: string,
    group: GradebookGroup
  ) {
    const groupAssessments = assessments.filter(
      (assessment) => assessment.groupId === group.id
    );

    if (groupAssessments.length === 0) {
      return {
        percentage: null,
        graded: 0,
        possible: 0,
      };
    }

    const cells = groupAssessments.map((assessment) =>
      getCell(studentId, assessment)
    );

    const gradedCells = cells.filter(
      (cell) => cell.score !== null
    );

    const earned = gradedCells.reduce(
      (sum, cell) => sum + Number(cell.score || 0),
      0
    );

    const possible = gradedCells.reduce(
      (sum, cell) => sum + Number(cell.maxPoints || 0),
      0
    );

    if (possible === 0) {
      return {
        percentage: null,
        graded: 0,
        possible: 0,
      };
    }

    return {
      percentage: percentage(earned, possible),
      graded: gradedCells.length,
      possible,
    };
  }

  function getOverallResult(studentId: string) {
    let weightedTotal = 0;
    let usedWeight = 0;

    for (const group of groups) {
      const result = getGroupResult(studentId, group);

      if (result.percentage === null) continue;

      weightedTotal +=
        result.percentage * (Number(group.weight) / 100);

      usedWeight += Number(group.weight);
    }

    if (usedWeight === 0) {
      return {
        percentage: null,
        letter: "—",
        usedWeight: 0,
      };
    }

    const normalized =
      usedWeight < 100
        ? weightedTotal / (usedWeight / 100)
        : weightedTotal;

    return {
      percentage: normalized,
      letter: gradeLetter(normalized),
      usedWeight,
    };
  }

  /*
   * ---------------------------------------------------------
   * FILTER STUDENTS
   * ---------------------------------------------------------
   */

  const filteredStudents = useMemo(() => {
    return students.filter((student) => {
      const matchesSearch =
        !search ||
        student.name
          .toLowerCase()
          .includes(search.toLowerCase()) ||
        student.email
          .toLowerCase()
          .includes(search.toLowerCase());

      if (!matchesSearch) return false;

      if (statusFilter === "all") return true;

      const overall = getOverallResult(student.id);

      if (statusFilter === "graded") {
        return overall.percentage !== null;
      }

      if (statusFilter === "ungraded") {
        return overall.percentage === null;
      }

      if (statusFilter === "missing") {
        return assessments.some(
          (assessment) =>
            getCell(student.id, assessment).status === "missing"
        );
      }

      return true;
    });
  }, [
    students,
    search,
    statusFilter,
    assessments,
    groups,
    submissions,
    attempts,
  ]);

  /*
   * ---------------------------------------------------------
   * CREATE GROUP
   * ---------------------------------------------------------
   */

  async function createGroup() {
    if (!selectedUnitId) return;

    const name = newGroupName.trim();
    const weight = Number(newGroupWeight);

    if (!name) {
      setError("Enter a group name.");
      return;
    }

    if (weight < 0 || weight > 100) {
      setError("Weight must be between 0 and 100.");
      return;
    }

    setSavingGroup(true);
    setError("");
    setMessage("");

    const { error } = await supabase
      .from("gradebook_groups")
      .insert({
        unit_id: selectedUnitId,
        name,
        weight,
      });

    if (error) {
      setError(error.message);
    } else {
      setNewGroupName("");
      setNewGroupWeight("0");
      setMessage("Gradebook group created.");
      await loadGradebook(selectedUnitId);
    }

    setSavingGroup(false);
  }

  /*
   * ---------------------------------------------------------
   * UPDATE GROUP
   * ---------------------------------------------------------
   */

  async function updateGroup(
    groupId: number,
    field: "name" | "weight" | "drop_lowest",
    value: string
  ) {
    if (!selectedUnitId) return;

    let updateValue: string | number = value;

    if (field !== "name") {
      updateValue = Number(value);

      if (Number.isNaN(updateValue)) {
        setError("Enter a valid number.");
        return;
      }
    }

    const { error } = await supabase
      .from("gradebook_groups")
      .update({
        [field]: updateValue,
        updated_at: new Date().toISOString(),
      })
      .eq("id", groupId);

    if (error) {
      setError(error.message);
      return;
    }

    await loadGradebook(selectedUnitId);
  }

  /*
   * ---------------------------------------------------------
   * DELETE GROUP
   * ---------------------------------------------------------
   */

  async function deleteGroup(groupId: number) {
    if (!selectedUnitId) return;

    const group = groups.find((item) => item.id === groupId);

    if (!group) return;

    const confirmed = window.confirm(
      `Delete "${group.name}"? Assessments will become ungrouped.`
    );

    if (!confirmed) return;

    const { error } = await supabase
      .from("gradebook_groups")
      .delete()
      .eq("id", groupId);

    if (error) {
      setError(error.message);
      return;
    }

    await loadGradebook(selectedUnitId);
  }

  /*
   * ---------------------------------------------------------
   * ASSIGN ASSESSMENT TO GROUP
   * ---------------------------------------------------------
   */

  async function assignAssessmentToGroup(
    assessment: Assessment,
    groupId: number | null
  ) {
    if (!selectedUnitId) return;

    const table =
      assessment.type === "assignment"
        ? "assignments"
        : "quizzes";

    const { error } = await supabase
      .from(table)
      .update({
        gradebook_group_id: groupId,
      })
      .eq("id", assessment.id);

    if (error) {
      setError(error.message);
      return;
    }

    await loadGradebook(selectedUnitId);
  }

  /*
   * ---------------------------------------------------------
   * EXPORT CSV
   * ---------------------------------------------------------
   */

  function exportCsv() {
    if (!filteredStudents.length) return;

    const headers = [
      "Student",
      "Email",
      ...assessments.map((assessment) => assessment.title),
      "Overall %",
      "Letter",
    ];

    const rows = filteredStudents.map((student) => {
      const cells = assessments.map((assessment) => {
        const cell = getCell(student.id, assessment);

        if (cell.score === null) {
          return "";
        }

        return `${cell.score}/${cell.maxPoints}`;
      });

      const overall = getOverallResult(student.id);

      return [
        student.name,
        student.email,
        ...cells,
        overall.percentage === null
          ? ""
          : overall.percentage.toFixed(2),
        overall.letter,
      ];
    });

    const csv = [
      headers,
      ...rows,
    ]
      .map((row) =>
        row
          .map((value) => {
            const stringValue = String(value ?? "");
            return `"${stringValue.replaceAll('"', '""')}"`;
          })
          .join(",")
      )
      .join("\n");

    const blob = new Blob([csv], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "datasphere-gradebook.csv";
    link.click();

    URL.revokeObjectURL(url);
  }

  /*
   * ---------------------------------------------------------
   * GROUP WEIGHT TOTAL
   * ---------------------------------------------------------
   */

  const totalWeight = groups.reduce(
    (sum, group) => sum + Number(group.weight || 0),
    0
  );

  const selectedUnit = units.find(
    (unit) => unit.id === selectedUnitId
  );

  /*
   * ---------------------------------------------------------
   * UI
   * ---------------------------------------------------------
   */

  return (
    <main className="min-h-screen bg-slate-50 p-6 text-slate-900">
      <div className="mx-auto max-w-[1800px]">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">
            Unified Gradebook
          </h1>

          <p className="mt-1 text-sm text-slate-600">
            Assignments and quizzes are combined into one
            assessment gradebook.
          </p>
        </div>

        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {message && (
          <div className="mb-4 rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-700">
            {message}
          </div>
        )}

        {/* UNIT SELECTOR */}

        <section className="mb-6 rounded-xl border bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div className="flex-1">
              <label className="mb-2 block text-sm font-semibold">
                Unit
              </label>

              <select
                value={selectedUnitId ?? ""}
                onChange={(event) =>
                  setSelectedUnitId(
                    event.target.value
                      ? Number(event.target.value)
                      : null
                  )
                }
                className="w-full rounded-lg border px-3 py-2"
              >
                <option value="">Select unit</option>

                {units.map((unit) => (
                  <option key={unit.id} value={unit.id}>
                    {unit.code
                      ? `${unit.code} — ${unit.name}`
                      : unit.name}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={exportCsv}
              disabled={!filteredStudents.length}
              className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Export CSV
            </button>

            <button
              onClick={() => setShowGroups((value) => !value)}
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
            >
              {showGroups
                ? "Hide Grade Settings"
                : "Grade Settings"}
            </button>
          </div>

          {selectedUnit && (
            <div className="mt-4 rounded-lg bg-slate-50 p-3 text-sm">
              <span className="font-semibold">
                {selectedUnit.code || ""}
              </span>{" "}
              {selectedUnit.name}
            </div>
          )}
        </section>

        {/* GRADEBOOK SETTINGS */}

        {showGroups && (
          <section className="mb-6 rounded-xl border bg-white p-5 shadow-sm">
            <div className="mb-4">
              <h2 className="text-lg font-bold">
                Assessment Groups
              </h2>

              <p className="text-sm text-slate-600">
                Configure how assignments and quizzes contribute
                to the final unit grade.
              </p>
            </div>

            <div className="mb-5 grid gap-3 md:grid-cols-[1fr_150px_auto]">
              <input
                value={newGroupName}
                onChange={(event) =>
                  setNewGroupName(event.target.value)
                }
                placeholder="Group name e.g. CATs"
                className="rounded-lg border px-3 py-2"
              />

              <input
                type="number"
                min="0"
                max="100"
                value={newGroupWeight}
                onChange={(event) =>
                  setNewGroupWeight(event.target.value)
                }
                placeholder="Weight %"
                className="rounded-lg border px-3 py-2"
              />

              <button
                onClick={createGroup}
                disabled={savingGroup}
                className="rounded-lg bg-slate-900 px-4 py-2 font-medium text-white disabled:opacity-50"
              >
                {savingGroup ? "Adding..." : "Add Group"}
              </button>
            </div>

            <div className="mb-5 overflow-x-auto">
              <table className="w-full min-w-[700px] text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="p-3">Group</th>
                    <th className="p-3">Weight</th>
                    <th className="p-3">Drop Lowest</th>
                    <th className="p-3">Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {groups.map((group) => (
                    <tr
                      key={group.id}
                      className="border-b"
                    >
                      <td className="p-3">
                        <input
                          defaultValue={group.name}
                          onBlur={(event) =>
                            updateGroup(
                              group.id,
                              "name",
                              event.target.value
                            )
                          }
                          className="rounded border px-2 py-1"
                        />
                      </td>

                      <td className="p-3">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          defaultValue={group.weight}
                          onBlur={(event) =>
                            updateGroup(
                              group.id,
                              "weight",
                              event.target.value
                            )
                          }
                          className="w-24 rounded border px-2 py-1"
                        />
                        %
                      </td>

                      <td className="p-3">
                        <input
                          type="number"
                          min="0"
                          defaultValue={group.drop_lowest}
                          onBlur={(event) =>
                            updateGroup(
                              group.id,
                              "drop_lowest",
                              event.target.value
                            )
                          }
                          className="w-24 rounded border px-2 py-1"
                        />
                      </td>

                      <td className="p-3">
                        <button
                          onClick={() =>
                            deleteGroup(group.id)
                          }
                          className="text-sm font-medium text-red-600 hover:underline"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div
              className={`rounded-lg p-3 text-sm ${
                totalWeight === 100
                  ? "bg-green-50 text-green-700"
                  : "bg-amber-50 text-amber-700"
              }`}
            >
              Total group weight:{" "}
              <strong>{totalWeight}%</strong>

              {totalWeight !== 100 && (
                <span className="ml-2">
                  Recommended total: 100%.
                </span>
              )}
            </div>

            {/* ASSESSMENT GROUP ASSIGNMENT */}

            <div className="mt-6">
              <h3 className="mb-3 font-semibold">
                Assessment Group Assignment
              </h3>

              <div className="space-y-2">
                {assessments.map((assessment) => (
                  <div
                    key={assessment.key}
                    className="flex flex-col gap-3 rounded-lg border p-3 md:flex-row md:items-center md:justify-between"
                  >
                    <div>
                      <div className="font-medium">
                        {assessment.title}
                      </div>

                      <div className="text-xs text-slate-500">
                        {assessment.type === "assignment"
                          ? "Assignment"
                          : "Quiz"}{" "}
                        · {assessment.maxPoints} points
                      </div>
                    </div>

                    <select
                      value={assessment.groupId ?? ""}
                      onChange={(event) =>
                        assignAssessmentToGroup(
                          assessment,
                          event.target.value
                            ? Number(event.target.value)
                            : null
                        )
                      }
                      className="rounded-lg border px-3 py-2 text-sm md:w-64"
                    >
                      <option value="">
                        No group
                      </option>

                      {groups.map((group) => (
                        <option
                          key={group.id}
                          value={group.id}
                        >
                          {group.name} ({group.weight}%)
                        </option>
                      ))}
                    </select>
                  </div>
                ))}

                {assessments.length === 0 && (
                  <div className="rounded-lg bg-slate-50 p-4 text-sm text-slate-500">
                    No assignments or quizzes exist for this
                    unit yet.
                  </div>
                )}
              </div>
            </div>
          </section>
        )}

        {/* FILTERS */}

        <section className="mb-6 rounded-xl border bg-white p-5 shadow-sm">
          <div className="grid gap-3 md:grid-cols-[1fr_200px]">
            <input
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
              placeholder="Search student..."
              className="rounded-lg border px-3 py-2"
            />

            <select
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(event.target.value)
              }
              className="rounded-lg border px-3 py-2"
            >
              <option value="all">All Students</option>
              <option value="graded">
                Has Graded Work
              </option>
              <option value="ungraded">
                No Graded Work
              </option>
              <option value="missing">
                Has Missing Work
              </option>
            </select>
          </div>
        </section>

        {/* SUMMARY */}

        <section className="mb-6 grid gap-4 md:grid-cols-4">
          <div className="rounded-xl border bg-white p-5 shadow-sm">
            <div className="text-sm text-slate-500">
              Students
            </div>
            <div className="mt-1 text-2xl font-bold">
              {students.length}
            </div>
          </div>

          <div className="rounded-xl border bg-white p-5 shadow-sm">
            <div className="text-sm text-slate-500">
              Assignments
            </div>
            <div className="mt-1 text-2xl font-bold">
              {assignments.length}
            </div>
          </div>

          <div className="rounded-xl border bg-white p-5 shadow-sm">
            <div className="text-sm text-slate-500">
              Quizzes
            </div>
            <div className="mt-1 text-2xl font-bold">
              {quizzes.length}
            </div>
          </div>

          <div className="rounded-xl border bg-white p-5 shadow-sm">
            <div className="text-sm text-slate-500">
              Assessments
            </div>
            <div className="mt-1 text-2xl font-bold">
              {assessments.length}
            </div>
          </div>
        </section>

        {/* MAIN GRADEBOOK */}

        <section className="overflow-hidden rounded-xl border bg-white shadow-sm">
          <div className="border-b p-5">
            <h2 className="text-lg font-bold">
              Assessment Gradebook
            </h2>

            <p className="text-sm text-slate-500">
              {filteredStudents.length} student
              {filteredStudents.length === 1 ? "" : "s"}
              {" · "}
              {assessments.length} assessment
              {assessments.length === 1 ? "" : "s"}
            </p>
          </div>

          {loading ? (
            <div className="p-10 text-center text-slate-500">
              Loading gradebook...
            </div>
          ) : assessments.length === 0 ? (
            <div className="p-10 text-center text-slate-500">
              No assessments have been created for this unit.
            </div>
          ) : filteredStudents.length === 0 ? (
            <div className="p-10 text-center text-slate-500">
              No students are represented by assessment
              submissions or quiz attempts yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-[1400px] w-full text-sm">
                <thead>
                  <tr className="border-b bg-slate-50 text-left">
                    <th className="sticky left-0 z-20 min-w-[220px] bg-slate-50 p-3">
                      Student
                    </th>

                    {assessments.map((assessment) => (
                      <th
                        key={assessment.key}
                        className="min-w-[150px] p-3"
                      >
                        <div className="font-semibold">
                          {assessment.title}
                        </div>

                        <div className="mt-1 text-xs font-normal text-slate-500">
                          {assessment.type === "assignment"
                            ? "Assignment"
                            : "Quiz"}
                        </div>

                        <div className="text-xs font-normal text-slate-500">
                          / {assessment.maxPoints}
                        </div>
                      </th>
                    ))}

                    <th className="min-w-[130px] bg-slate-100 p-3">
                      Overall
                    </th>

                    <th className="min-w-[100px] bg-slate-100 p-3">
                      Grade
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {filteredStudents.map((student) => {
                    const overall = getOverallResult(
                      student.id
                    );

                    return (
                      <tr
                        key={student.id}
                        className="border-b hover:bg-slate-50"
                      >
                        <td className="sticky left-0 z-10 bg-white p-3">
                          <div className="font-semibold">
                            {student.name}
                          </div>

                          {student.email && (
                            <div className="text-xs text-slate-500">
                              {student.email}
                            </div>
                          )}
                        </td>

                        {assessments.map((assessment) => {
                          const cell = getCell(
                            student.id,
                            assessment
                          );

                          const scorePercentage =
                            cell.score !== null
                              ? percentage(
                                  cell.score,
                                  cell.maxPoints
                                )
                              : null;

                          const isMissing =
                            cell.status === "missing";

                          return (
                            <td
                              key={assessment.key}
                              className="p-3"
                            >
                              <div
                                className={`rounded-lg border p-2 ${
                                  isMissing
                                    ? "border-red-200 bg-red-50"
                                    : cell.score === null
                                      ? "border-amber-200 bg-amber-50"
                                      : "border-slate-200"
                                }`}
                              >
                                {isMissing ? (
                                  <div className="font-semibold text-red-600">
                                    Missing
                                  </div>
                                ) : cell.score === null ? (
                                  <div className="font-semibold text-amber-700">
                                    Pending
                                  </div>
                                ) : (
                                  <>
                                    <div className="font-semibold">
                                      {formatNumber(
                                        cell.score
                                      )}{" "}
                                      /{" "}
                                      {formatNumber(
                                        cell.maxPoints
                                      )}
                                    </div>

                                    <div className="text-xs text-slate-500">
                                      {scorePercentage?.toFixed(
                                        1
                                      )}
                                      %
                                    </div>
                                  </>
                                )}

                                {cell.submissionId && (
                                  <a
                                    href={`/admin/submissions?submission=${cell.submissionId}`}
                                    className="mt-1 inline-block text-xs font-medium text-blue-600 hover:underline"
                                  >
                                    View submission
                                  </a>
                                )}

                                {cell.attemptId && (
                                  <a
                                    href={`/admin/quiz-attempts?attempt=${cell.attemptId}`}
                                    className="mt-1 inline-block text-xs font-medium text-blue-600 hover:underline"
                                  >
                                    View attempt
                                  </a>
                                )}
                              </div>
                            </td>
                          );
                        })}

                        <td className="bg-slate-50 p-3">
                          {overall.percentage === null ? (
                            <span className="text-slate-400">
                              —
                            </span>
                          ) : (
                            <div>
                              <div className="text-lg font-bold">
                                {overall.percentage.toFixed(
                                  2
                                )}
                                %
                              </div>

                              {overall.usedWeight < 100 && (
                                <div className="text-xs text-amber-600">
                                  {overall.usedWeight}% graded
                                </div>
                              )}
                            </div>
                          )}
                        </td>

                        <td className="bg-slate-50 p-3">
                          <span className="text-lg font-bold">
                            {overall.letter}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* GROUP BREAKDOWN */}

        {!loading && filteredStudents.length > 0 && (
          <section className="mt-6 rounded-xl border bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-lg font-bold">
              Group Breakdown
            </h2>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {groups.map((group) => {
                const groupAssessments =
                  assessments.filter(
                    (assessment) =>
                      assessment.groupId === group.id
                  );

                return (
                  <div
                    key={group.id}
                    className="rounded-xl border p-4"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-semibold">
                          {group.name}
                        </div>

                        <div className="text-xs text-slate-500">
                          {groupAssessments.length} assessment
                          {groupAssessments.length === 1
                            ? ""
                            : "s"}
                        </div>
                      </div>

                      <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold">
                        {group.weight}%
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}