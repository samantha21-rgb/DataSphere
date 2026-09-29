"use client";

import { useEffect, useMemo, useState } from "react";
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
};

type Submission = {
  id: number;
  assignment_id: number;
  student_id: string;
  submission_number: number;
  file_url: string | null;
  file_name: string | null;
  file_size: number | null;
  file_type: string | null;
  submission_text: string | null;
  submitted_at: string | null;
  status: string;
  grade: number | null;
  feedback: string | null;
  graded_at: string | null;
};

type Profile = {
  id: string;
  full_name?: string | null;
  name?: string | null;
  email?: string | null;
};

type SubmissionRow = Submission & {
  assignment: Assignment;
  unit: Unit;
  student: Profile | null;
};

export default function LecturerSubmissionsPage() {
  const searchParams = useSearchParams();

  const assignmentFilter = searchParams.get("assignment");
  const unitFilter = searchParams.get("unit");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [userId, setUserId] = useState<string | null>(null);

  const [units, setUnits] = useState<Unit[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [submissions, setSubmissions] = useState<SubmissionRow[]>([]);

  const [selectedUnit, setSelectedUnit] = useState(
    unitFilter ? Number(unitFilter) : 0
  );

  const [selectedAssignment, setSelectedAssignment] = useState(
    assignmentFilter ? Number(assignmentFilter) : 0
  );

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const [selectedSubmission, setSelectedSubmission] =
    useState<SubmissionRow | null>(null);

  const [gradeInput, setGradeInput] = useState("");
  const [feedbackInput, setFeedbackInput] = useState("");

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
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

      setUserId(user.id);

      // --------------------------------------------------
      // Current user's profile
      // --------------------------------------------------

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();

      if (profileError) {
        throw profileError;
      }

      const isAdmin = profile?.role === "admin";

      // --------------------------------------------------
      // Lecturer's assigned units
      // --------------------------------------------------

      const { data: lecturerUnits, error: lecturerUnitsError } =
        await supabase
          .from("lecturer_units")
          .select("unit_id")
          .eq("lecturer_id", user.id);

      if (lecturerUnitsError) {
        throw lecturerUnitsError;
      }

      const lecturerUnitIds = (lecturerUnits || []).map((row) =>
        Number(row.unit_id)
      );

      let allowedUnitIds = lecturerUnitIds;

      // Admin can test the lecturer portal.
      if (isAdmin) {
        const { data: allUnits, error: allUnitsError } = await supabase
          .from("units")
          .select("id");

        if (allUnitsError) {
          throw allUnitsError;
        }

        allowedUnitIds = (allUnits || []).map((row) => Number(row.id));
      }

      if (allowedUnitIds.length === 0) {
        setUnits([]);
        setAssignments([]);
        setSubmissions([]);
        return;
      }

      // --------------------------------------------------
      // Units
      // IMPORTANT: only existing units columns are used
      // --------------------------------------------------

      const { data: unitData, error: unitsError } = await supabase
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

      const { data: assignmentData, error: assignmentsError } =
        await supabase
          .from("assignments")
          .select(
            `
              id,
              unit_id,
              title,
              max_points,
              due_date,
              assignment_number
            `
          )
          .in("unit_id", allowedUnitIds)
          .order("assignment_number", { ascending: true });

      if (assignmentsError) {
        throw assignmentsError;
      }

      const loadedAssignments = (assignmentData || []) as Assignment[];

      setAssignments(loadedAssignments);

      // --------------------------------------------------
      // Submissions
      // --------------------------------------------------

      const assignmentIds = loadedAssignments.map((assignment) =>
        Number(assignment.id)
      );

      if (assignmentIds.length === 0) {
        setSubmissions([]);
        return;
      }

      const { data: submissionData, error: submissionsError } =
        await supabase
          .from("assignment_submissions")
          .select("*")
          .in("assignment_id", assignmentIds)
          .order("submitted_at", { ascending: false });

      if (submissionsError) {
        throw submissionsError;
      }

      const loadedSubmissions = (submissionData || []) as Submission[];

      // --------------------------------------------------
      // Student profiles
      // --------------------------------------------------

      const studentIds = [
        ...new Set(
          loadedSubmissions.map((submission) => submission.student_id)
        ),
      ];

      let profileMap = new Map<string, Profile>();

      if (studentIds.length > 0) {
        const { data: studentProfiles, error: studentProfilesError } =
          await supabase
            .from("profiles")
            .select("*")
            .in("id", studentIds);

        if (studentProfilesError) {
          throw studentProfilesError;
        }

        profileMap = new Map(
          ((studentProfiles || []) as Profile[]).map((studentProfile) => [
            studentProfile.id,
            studentProfile,
          ])
        );
      }

      // --------------------------------------------------
      // Maps
      // --------------------------------------------------

      const assignmentMap = new Map(
        loadedAssignments.map((assignment) => [
          Number(assignment.id),
          assignment,
        ])
      );

      const unitMap = new Map(
        loadedUnits.map((unit) => [Number(unit.id), unit])
      );

      // --------------------------------------------------
      // Build submission rows
      // --------------------------------------------------

      const rows: SubmissionRow[] = [];

      for (const submission of loadedSubmissions) {
        const assignment = assignmentMap.get(
          Number(submission.assignment_id)
        );

        if (!assignment) continue;

        const unit = unitMap.get(Number(assignment.unit_id));

        if (!unit) continue;

        rows.push({
          ...submission,
          assignment,
          unit,
          student: profileMap.get(submission.student_id) || null,
        });
      }

      setSubmissions(rows);

      // --------------------------------------------------
      // URL filters
      // --------------------------------------------------

      if (assignmentFilter) {
        const parsedAssignment = Number(assignmentFilter);

        const matchingAssignment = loadedAssignments.find(
          (assignment) => Number(assignment.id) === parsedAssignment
        );

        if (matchingAssignment) {
          setSelectedAssignment(parsedAssignment);
          setSelectedUnit(Number(matchingAssignment.unit_id));
        }
      } else if (unitFilter) {
        const parsedUnit = Number(unitFilter);

        const matchingUnit = loadedUnits.some(
          (unit) => Number(unit.id) === parsedUnit
        );

        if (matchingUnit) {
          setSelectedUnit(parsedUnit);
        }
      }
    } catch (err: any) {
      console.error(err);
      setError(err?.message || "Failed to load submissions.");
    } finally {
      setLoading(false);
    }
  }

  // --------------------------------------------------
  // Filter assignments by selected unit
  // --------------------------------------------------

  const filteredAssignments = useMemo(() => {
    if (!selectedUnit) {
      return assignments;
    }

    return assignments.filter(
      (assignment) => Number(assignment.unit_id) === Number(selectedUnit)
    );
  }, [assignments, selectedUnit]);

  // --------------------------------------------------
  // Filter submissions
  // --------------------------------------------------

  const filteredSubmissions = useMemo(() => {
    return submissions.filter((submission) => {
      const matchesUnit =
        !selectedUnit ||
        Number(submission.assignment.unit_id) === Number(selectedUnit);

      const matchesAssignment =
        !selectedAssignment ||
        Number(submission.assignment_id) === Number(selectedAssignment);

      const matchesStatus =
        statusFilter === "all" ||
        submission.status === statusFilter;

      const studentName =
        submission.student?.full_name ||
        submission.student?.name ||
        submission.student?.email ||
        submission.student_id;

      const searchText = `
        ${studentName}
        ${submission.assignment.title}
        ${submission.unit.code || ""}
        ${submission.unit.name || ""}
        ${submission.file_name || ""}
      `.toLowerCase();

      const matchesSearch =
        !search ||
        searchText.includes(search.toLowerCase());

      return (
        matchesUnit &&
        matchesAssignment &&
        matchesStatus &&
        matchesSearch
      );
    });
  }, [
    submissions,
    selectedUnit,
    selectedAssignment,
    statusFilter,
    search,
  ]);

  // --------------------------------------------------
  // Statistics
  // --------------------------------------------------

  const statistics = useMemo(() => {
    const total = filteredSubmissions.length;

    const graded = filteredSubmissions.filter(
      (submission) =>
        submission.status === "graded" ||
        submission.status === "returned" ||
        submission.grade !== null
    ).length;

    const pending = total - graded;

    const late = filteredSubmissions.filter(
      (submission) => submission.status === "late"
    ).length;

    const returned = filteredSubmissions.filter(
      (submission) => submission.status === "returned"
    ).length;

    return {
      total,
      graded,
      pending,
      late,
      returned,
    };
  }, [filteredSubmissions]);

  // --------------------------------------------------
  // Open submission
  // --------------------------------------------------

  function openSubmission(submission: SubmissionRow) {
    setSelectedSubmission(submission);

    setGradeInput(
      submission.grade !== null ? String(submission.grade) : ""
    );

    setFeedbackInput(submission.feedback || "");

    setError("");
    setSuccess("");
  }

  function closeSubmission() {
    if (saving) return;

    setSelectedSubmission(null);
    setGradeInput("");
    setFeedbackInput("");
    setError("");
    setSuccess("");
  }

  // --------------------------------------------------
  // Storage path helper
  // --------------------------------------------------

  function extractStoragePath(value: string) {
    if (!value) return "";

    if (!value.startsWith("http")) {
      return value;
    }

    try {
      const url = new URL(value);

      const marker = "/assignment_submissions/";

      const index = url.pathname.indexOf(marker);

      if (index === -1) {
        return "";
      }

      return decodeURIComponent(
        url.pathname.substring(index + marker.length)
      );
    } catch {
      return "";
    }
  }

  // --------------------------------------------------
  // Open student's uploaded file
  // --------------------------------------------------

  async function openSubmissionFile() {
    if (!selectedSubmission?.file_url) return;

    try {
      const path = extractStoragePath(
        selectedSubmission.file_url
      );

      if (!path) {
        window.open(
          selectedSubmission.file_url,
          "_blank",
          "noopener,noreferrer"
        );

        return;
      }

      const { data, error: signedUrlError } =
        await supabase.storage
          .from("assignment_submissions")
          .createSignedUrl(path, 60 * 30);

      if (signedUrlError || !data?.signedUrl) {
        throw signedUrlError || new Error("Could not open file.");
      }

      window.open(
        data.signedUrl,
        "_blank",
        "noopener,noreferrer"
      );
    } catch (err: any) {
      setError(
        err?.message || "Unable to open the submission file."
      );
    }
  }

  // --------------------------------------------------
  // Save grade
  // --------------------------------------------------

  async function saveGrade(returnSubmission = false) {
    if (!selectedSubmission || !userId) {
      return;
    }

    setError("");
    setSuccess("");

    const maxPoints = Number(
      selectedSubmission.assignment.max_points || 100
    );

    if (!gradeInput.trim()) {
      setError("Enter a grade before saving.");
      return;
    }

    const grade = Number(gradeInput);

    if (!Number.isFinite(grade)) {
      setError("Grade must be a valid number.");
      return;
    }

    if (grade < 0) {
      setError("Grade cannot be below 0.");
      return;
    }

    if (grade > maxPoints) {
      setError(`Grade cannot exceed ${maxPoints} points.`);
      return;
    }

    setSaving(true);

    try {
      const newStatus = returnSubmission
        ? "returned"
        : "graded";

      const { data, error: updateError } = await supabase
        .from("assignment_submissions")
        .update({
          grade,
          feedback: feedbackInput.trim() || null,
          status: newStatus,
          graded_at: new Date().toISOString(),
          graded_by: userId,
          updated_at: new Date().toISOString(),
        })
        .eq("id", selectedSubmission.id)
        .select("*")
        .single();

      if (updateError) {
        throw updateError;
      }

      const updatedSubmission = data as Submission;

      const updatedRow: SubmissionRow = {
        ...selectedSubmission,
        ...updatedSubmission,
      };

      setSubmissions((current) =>
        current.map((item) =>
          item.id === updatedSubmission.id
            ? updatedRow
            : item
        )
      );

      setSelectedSubmission(updatedRow);

      setSuccess(
        returnSubmission
          ? "Grade saved and submission returned to the student."
          : "Grade saved successfully."
      );
    } catch (err: any) {
      console.error(err);

      setError(
        err?.message || "Failed to save grade."
      );
    } finally {
      setSaving(false);
    }
  }

  // --------------------------------------------------
  // Return existing grade
  // --------------------------------------------------

  async function markReturnedWithoutChangingGrade() {
    if (!selectedSubmission || !userId) {
      return;
    }

    if (selectedSubmission.grade === null) {
      setError("Grade the submission before returning it.");
      return;
    }

    setError("");
    setSuccess("");
    setSaving(true);

    try {
      const { data, error: updateError } = await supabase
        .from("assignment_submissions")
        .update({
          status: "returned",
          updated_at: new Date().toISOString(),
        })
        .eq("id", selectedSubmission.id)
        .select("*")
        .single();

      if (updateError) {
        throw updateError;
      }

      const updatedSubmission = data as Submission;

      const updatedRow: SubmissionRow = {
        ...selectedSubmission,
        ...updatedSubmission,
      };

      setSubmissions((current) =>
        current.map((item) =>
          item.id === updatedSubmission.id
            ? updatedRow
            : item
        )
      );

      setSelectedSubmission(updatedRow);

      setSuccess(
        "Submission returned to the student."
      );
    } catch (err: any) {
      console.error(err);

      setError(
        err?.message || "Failed to return submission."
      );
    } finally {
      setSaving(false);
    }
  }

  // --------------------------------------------------
  // Helpers
  // --------------------------------------------------

  function studentName(submission: SubmissionRow) {
    return (
      submission.student?.full_name ||
      submission.student?.name ||
      submission.student?.email ||
      "Student"
    );
  }

  function formatDate(value: string | null) {
    if (!value) {
      return "—";
    }

    return new Date(value).toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  }

  function formatFileSize(bytes: number | null) {
    if (!bytes) {
      return "";
    }

    if (bytes < 1024) {
      return `${bytes} B`;
    }

    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    }

    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  function statusLabel(status: string) {
    switch (status) {
      case "graded":
        return "Graded";

      case "returned":
        return "Returned";

      case "late":
        return "Late";

      case "draft":
        return "Draft";

      case "submitted":
        return "Submitted";

      default:
        return status;
    }
  }

  function statusClass(status: string) {
    switch (status) {
      case "graded":
        return "bg-green-100 text-green-700";

      case "returned":
        return "bg-blue-100 text-blue-700";

      case "late":
        return "bg-orange-100 text-orange-700";

      case "draft":
        return "bg-gray-100 text-gray-700";

      default:
        return "bg-yellow-100 text-yellow-700";
    }
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

  // --------------------------------------------------
  // Page
  // --------------------------------------------------

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
              Submissions & Grading
            </h1>

            <p className="mt-1 text-gray-600">
              Review student submissions, grade work, and provide
              feedback.
            </p>
          </div>

          <button
            onClick={loadData}
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

        {/* Success */}
        {success && (
          <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-700">
            {success}
          </div>
        )}

        {/* Statistics */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <StatCard
            label="Submissions"
            value={statistics.total}
          />

          <StatCard
            label="Pending"
            value={statistics.pending}
          />

          <StatCard
            label="Graded"
            value={statistics.graded}
          />

          <StatCard
            label="Late"
            value={statistics.late}
          />

          <StatCard
            label="Returned"
            value={statistics.returned}
          />
        </div>

        {/* Filters */}
        <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="grid gap-4 md:grid-cols-4">

            {/* Unit */}
            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-700">
                Unit
              </label>

              <select
                value={selectedUnit}
                onChange={(event) => {
                  const value = Number(event.target.value);

                  setSelectedUnit(value);
                  setSelectedAssignment(0);
                }}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
              >
                <option value={0}>
                  All units
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
            </div>

            {/* Assignment */}
            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-700">
                Assignment
              </label>

              <select
                value={selectedAssignment}
                onChange={(event) =>
                  setSelectedAssignment(
                    Number(event.target.value)
                  )
                }
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
              >
                <option value={0}>
                  All assignments
                </option>

                {filteredAssignments.map((assignment) => (
                  <option
                    key={assignment.id}
                    value={assignment.id}
                  >
                    {assignment.assignment_number
                      ? `Assignment ${assignment.assignment_number}: `
                      : ""}
                    {assignment.title}
                  </option>
                ))}
              </select>
            </div>

            {/* Status */}
            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-700">
                Status
              </label>

              <select
                value={statusFilter}
                onChange={(event) =>
                  setStatusFilter(event.target.value)
                }
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
              >
                <option value="all">
                  All statuses
                </option>

                <option value="submitted">
                  Submitted
                </option>

                <option value="late">
                  Late
                </option>

                <option value="graded">
                  Graded
                </option>

                <option value="returned">
                  Returned
                </option>

                <option value="draft">
                  Draft
                </option>
              </select>
            </div>

            {/* Search */}
            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-700">
                Search
              </label>

              <input
                value={search}
                onChange={(event) =>
                  setSearch(event.target.value)
                }
                placeholder="Student, unit, assignment..."
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
              />
            </div>
          </div>
        </section>

        {/* Submission table */}
        <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">

          <div className="border-b border-gray-200 px-5 py-4">
            <h2 className="font-bold text-gray-900">
              Student Submissions
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              {filteredSubmissions.length} submission
              {filteredSubmissions.length === 1
                ? ""
                : "s"}{" "}
              found
            </p>
          </div>

          {filteredSubmissions.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-gray-100 text-2xl">
                📄
              </div>

              <h3 className="font-semibold text-gray-900">
                No submissions found
              </h3>

              <p className="mt-1 text-sm text-gray-500">
                Try changing your filters or wait for students
                to submit their work.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">

                <thead className="border-b border-gray-200 bg-gray-50">
                  <tr>
                    <th className="px-5 py-3 font-semibold text-gray-600">
                      Student
                    </th>

                    <th className="px-5 py-3 font-semibold text-gray-600">
                      Unit
                    </th>

                    <th className="px-5 py-3 font-semibold text-gray-600">
                      Assignment
                    </th>

                    <th className="px-5 py-3 font-semibold text-gray-600">
                      Submitted
                    </th>

                    <th className="px-5 py-3 font-semibold text-gray-600">
                      Status
                    </th>

                    <th className="px-5 py-3 font-semibold text-gray-600">
                      Grade
                    </th>

                    <th className="px-5 py-3 text-right font-semibold text-gray-600">
                      Action
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-100">

                  {filteredSubmissions.map((submission) => (
                    <tr
                      key={submission.id}
                      className="hover:bg-gray-50"
                    >

                      {/* Student */}
                      <td className="px-5 py-4">
                        <div className="font-semibold text-gray-900">
                          {studentName(submission)}
                        </div>

                        {submission.student?.email && (
                          <div className="mt-1 text-xs text-gray-500">
                            {submission.student.email}
                          </div>
                        )}
                      </td>

                      {/* Unit */}
                      <td className="px-5 py-4">
                        <div className="font-medium text-gray-900">
                          {submission.unit.code || "—"}
                        </div>

                        <div className="text-xs text-gray-500">
                          {submission.unit.name || ""}
                        </div>
                      </td>

                      {/* Assignment */}
                      <td className="px-5 py-4">
                        <div className="font-medium text-gray-900">
                          {submission.assignment.title}
                        </div>

                        <div className="text-xs text-gray-500">
                          Max{" "}
                          {submission.assignment.max_points ||
                            100}{" "}
                          points
                        </div>
                      </td>

                      {/* Submitted */}
                      <td className="whitespace-nowrap px-5 py-4 text-gray-600">
                        {formatDate(
                          submission.submitted_at
                        )}
                      </td>

                      {/* Status */}
                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${statusClass(
                            submission.status
                          )}`}
                        >
                          {statusLabel(
                            submission.status
                          )}
                        </span>
                      </td>

                      {/* Grade */}
                      <td className="px-5 py-4">
                        {submission.grade !== null ? (
                          <span className="font-bold text-gray-900">
                            {submission.grade}/
                            {submission.assignment
                              .max_points || 100}
                          </span>
                        ) : (
                          <span className="text-gray-400">
                            Pending
                          </span>
                        )}
                      </td>

                      {/* Action */}
                      <td className="px-5 py-4 text-right">
                        <button
                          onClick={() =>
                            openSubmission(
                              submission
                            )
                          }
                          className="rounded-lg bg-gray-900 px-3 py-2 text-xs font-semibold text-white hover:bg-gray-700"
                        >
                          Review
                        </button>
                      </td>

                    </tr>
                  ))}

                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      {/* ==================================================
          REVIEW MODAL
          ================================================== */}

      {selectedSubmission && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 p-4">

          <div className="mx-auto my-8 max-w-4xl rounded-2xl bg-white shadow-2xl">

            {/* Modal header */}
            <div className="flex items-start justify-between gap-4 border-b border-gray-200 p-6">

              <div>
                <p className="text-sm font-medium text-blue-600">
                  {selectedSubmission.unit.code}
                </p>

                <h2 className="mt-1 text-2xl font-bold text-gray-900">
                  {selectedSubmission.assignment.title}
                </h2>

                <p className="mt-1 text-sm text-gray-500">
                  {studentName(selectedSubmission)}
                </p>
              </div>

              <button
                onClick={closeSubmission}
                className="rounded-lg px-3 py-2 text-xl text-gray-500 hover:bg-gray-100"
              >
                ×
              </button>
            </div>

            {/* Modal body */}
            <div className="space-y-6 p-6">

              {/* Information */}
              <div className="grid gap-4 md:grid-cols-3">

                <InfoBox
                  label="Submitted"
                  value={formatDate(
                    selectedSubmission.submitted_at
                  )}
                />

                <InfoBox
                  label="Attempt"
                  value={`#${selectedSubmission.submission_number}`}
                />

                <InfoBox
                  label="Maximum"
                  value={`${selectedSubmission.assignment.max_points || 100} points`}
                />

              </div>

              {/* Uploaded file */}
              {selectedSubmission.file_url && (
                <div className="rounded-xl border border-gray-200 bg-gray-50 p-5">

                  <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">

                    <div>
                      <p className="text-sm font-semibold text-gray-900">
                        Attached file
                      </p>

                      <p className="mt-1 text-sm text-gray-600">
                        {selectedSubmission.file_name ||
                          "Submission file"}
                      </p>

                      {selectedSubmission.file_size && (
                        <p className="mt-1 text-xs text-gray-500">
                          {formatFileSize(
                            selectedSubmission.file_size
                          )}
                        </p>
                      )}
                    </div>

                    <button
                      onClick={openSubmissionFile}
                      className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                    >
                      Open File
                    </button>

                  </div>
                </div>
              )}

              {/* Text submission */}
              {selectedSubmission.submission_text && (
                <div>

                  <h3 className="mb-2 text-sm font-bold text-gray-900">
                    Student Response
                  </h3>

                  <div className="whitespace-pre-wrap rounded-xl border border-gray-200 bg-gray-50 p-5 text-sm leading-6 text-gray-700">
                    {selectedSubmission.submission_text}
                  </div>

                </div>
              )}

              {/* Existing feedback */}
              {selectedSubmission.feedback && (
                <div className="rounded-xl border border-blue-200 bg-blue-50 p-5">

                  <h3 className="text-sm font-bold text-blue-900">
                    Previous Feedback
                  </h3>

                  <p className="mt-2 whitespace-pre-wrap text-sm text-blue-800">
                    {selectedSubmission.feedback}
                  </p>

                </div>
              )}

              {/* Grading */}
              <div className="rounded-2xl border border-gray-200 p-5">

                <h3 className="font-bold text-gray-900">
                  Grade Submission
                </h3>

                <p className="mt-1 text-sm text-gray-500">
                  Enter the student's score and feedback.
                </p>

                <div className="mt-5 grid gap-5 md:grid-cols-[180px_1fr]">

                  {/* Grade */}
                  <div>

                    <label className="mb-2 block text-sm font-semibold text-gray-700">
                      Grade
                    </label>

                    <div className="relative">

                      <input
                        type="number"
                        min={0}
                        max={
                          selectedSubmission.assignment
                            .max_points || 100
                        }
                        step="0.01"
                        value={gradeInput}
                        onChange={(event) =>
                          setGradeInput(
                            event.target.value
                          )
                        }
                        className="w-full rounded-lg border border-gray-300 px-3 py-3 pr-16 text-lg font-bold outline-none focus:border-blue-500"
                        placeholder="0"
                      />

                      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">
                        /
                        {selectedSubmission.assignment
                          .max_points || 100}
                      </span>

                    </div>
                  </div>

                  {/* Feedback */}
                  <div>

                    <label className="mb-2 block text-sm font-semibold text-gray-700">
                      Feedback
                    </label>

                    <textarea
                      rows={5}
                      value={feedbackInput}
                      onChange={(event) =>
                        setFeedbackInput(
                          event.target.value
                        )
                      }
                      placeholder="Write constructive feedback for the student..."
                      className="w-full resize-y rounded-lg border border-gray-300 px-3 py-3 text-sm outline-none focus:border-blue-500"
                    />

                  </div>

                </div>
              </div>

              {/* Modal error */}
              {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                  {error}
                </div>
              )}

              {/* Modal success */}
              {success && (
                <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-700">
                  {success}
                </div>
              )}

            </div>

            {/* Footer */}
            <div className="flex flex-col-reverse gap-3 border-t border-gray-200 p-6 sm:flex-row sm:justify-end">

              <button
                onClick={closeSubmission}
                disabled={saving}
                className="rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Close
              </button>

              {selectedSubmission.grade !== null &&
                selectedSubmission.status !== "returned" && (
                  <button
                    onClick={
                      markReturnedWithoutChangingGrade
                    }
                    disabled={saving}
                    className="rounded-lg border border-blue-300 bg-blue-50 px-5 py-2.5 text-sm font-semibold text-blue-700 hover:bg-blue-100 disabled:opacity-50"
                  >
                    {saving
                      ? "Saving..."
                      : "Return Existing Grade"}
                  </button>
                )}

              <button
                onClick={() => saveGrade(false)}
                disabled={saving}
                className="rounded-lg bg-gray-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-gray-800 disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save Grade"}
              </button>

              <button
                onClick={() => saveGrade(true)}
                disabled={saving}
                className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {saving
                  ? "Saving..."
                  : "Save & Return to Student"}
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
  value: number;
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <p className="text-sm font-medium text-gray-500">
        {label}
      </p>

      <p className="mt-2 text-3xl font-bold text-gray-900">
        {value}
      </p>
    </div>
  );
}

function InfoBox({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
        {label}
      </p>

      <p className="mt-1 text-sm font-semibold text-gray-900">
        {value}
      </p>
    </div>
  );
}