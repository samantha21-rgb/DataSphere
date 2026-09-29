"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabase";

type Assignment = {
  id: number;
  unit_id: number;
  title: string;
  assignment_number: number | null;
  max_points: number;
};

type Unit = {
  id: number;
  code: string;
  name: string;
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
  submitted_at: string;
  status: "draft" | "submitted" | "late" | "graded" | "returned";
  grade: number | null;
  feedback: string | null;
  graded_at: string | null;
  graded_by: string | null;
};

type StudentProfile = {
  id: string;
  full_name: string | null;
};

function formatDate(value: string | null) {
  if (!value) return "—";

  return new Date(value).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function formatFileSize(bytes: number | null) {
  if (!bytes) return "";

  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function statusLabel(status: Submission["status"]) {
  switch (status) {
    case "graded":
      return "Graded";
    case "late":
      return "Late";
    case "returned":
      return "Returned";
    case "draft":
      return "Draft";
    default:
      return "Submitted";
  }
}

export default function AdminSubmissionsPage() {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [profiles, setProfiles] = useState<
    Record<string, StudentProfile>
  >({});

  const [selectedAssignmentId, setSelectedAssignmentId] =
    useState<string>("");

  const [selectedSubmissionId, setSelectedSubmissionId] =
    useState<number | null>(null);

  const [statusFilter, setStatusFilter] =
    useState<string>("all");

  const [search, setSearch] = useState("");

  const [grade, setGrade] = useState("");
  const [feedback, setFeedback] = useState("");

  const [fileUrls, setFileUrls] = useState<
    Record<number, string>
  >({});

  const [loading, setLoading] = useState(true);
  const [loadingSubmissions, setLoadingSubmissions] =
    useState(false);
  const [savingGrade, setSavingGrade] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  /*
   * Load assignments and units.
   */
  async function loadAssignments() {
    setLoading(true);
    setError("");

    try {
      const [
        assignmentsResult,
        unitsResult,
      ] = await Promise.all([
        supabase
          .from("assignments")
          .select(
            `
              id,
              unit_id,
              title,
              assignment_number,
              max_points
            `
          )
          .order("created_at", {
            ascending: false,
          }),

        supabase
          .from("units")
          .select("id, code, name")
          .order("code"),
      ]);

      if (assignmentsResult.error) {
        throw assignmentsResult.error;
      }

      if (unitsResult.error) {
        throw unitsResult.error;
      }

      setAssignments(
        (assignmentsResult.data || []) as Assignment[]
      );

      setUnits(
        (unitsResult.data || []) as Unit[]
      );
    } catch (err: any) {
      console.error(err);

      setError(
        err?.message ||
          "Unable to load assignments."
      );
    } finally {
      setLoading(false);
    }
  }

  /*
   * Load submissions for the selected assignment.
   */
  async function loadSubmissions(
    assignmentId: number
  ) {
    setLoadingSubmissions(true);
    setError("");
    setSuccess("");

    try {
      const { data, error: submissionsError } =
        await supabase
          .from("assignment_submissions")
          .select(
            `
              id,
              assignment_id,
              student_id,
              submission_number,
              file_url,
              file_name,
              file_size,
              file_type,
              submission_text,
              submitted_at,
              status,
              grade,
              feedback,
              graded_at,
              graded_by
            `
          )
          .eq("assignment_id", assignmentId)
          .order("submitted_at", {
            ascending: false,
          });

      if (submissionsError) {
        throw submissionsError;
      }

      const loaded =
        (data || []) as Submission[];

      setSubmissions(loaded);

      /*
       * Load student profile names.
       */
      const studentIds = [
        ...new Set(
          loaded.map(
            (submission) =>
              submission.student_id
          )
        ),
      ];

      if (studentIds.length > 0) {
        const {
          data: profileData,
          error: profileError,
        } = await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", studentIds);

        if (!profileError) {
          const profileMap: Record<
            string,
            StudentProfile
          > = {};

          for (const profile of profileData || []) {
            profileMap[profile.id] = profile;
          }

          setProfiles(profileMap);
        }
      }

      /*
       * Create temporary signed URLs for
       * submitted files.
       */
      const urls: Record<number, string> = {};

      for (const submission of loaded) {
        if (!submission.file_url) {
          continue;
        }

        const {
          data: signedUrlData,
          error: signedUrlError,
        } = await supabase.storage
          .from("assignment_submissions")
          .createSignedUrl(
            submission.file_url,
            3600
          );

        if (
          !signedUrlError &&
          signedUrlData?.signedUrl
        ) {
          urls[submission.id] =
            signedUrlData.signedUrl;
        }
      }

      setFileUrls(urls);

      /*
       * Automatically select the first submission.
       */
      if (loaded.length > 0) {
        selectSubmission(loaded[0]);
      } else {
        setSelectedSubmissionId(null);
        setGrade("");
        setFeedback("");
      }
    } catch (err: any) {
      console.error(err);

      setError(
        err?.message ||
          "Unable to load submissions."
      );
    } finally {
      setLoadingSubmissions(false);
    }
  }

  function selectSubmission(
    submission: Submission
  ) {
    setSelectedSubmissionId(
      submission.id
    );

    setGrade(
      submission.grade !== null
        ? String(submission.grade)
        : ""
    );

    setFeedback(
      submission.feedback || ""
    );
  }

  useEffect(() => {
    loadAssignments();
  }, []);

  useEffect(() => {
    if (!selectedAssignmentId) {
      setSubmissions([]);
      setSelectedSubmissionId(null);
      return;
    }

    loadSubmissions(
      Number(selectedAssignmentId)
    );
  }, [selectedAssignmentId]);

  const selectedAssignment =
    assignments.find(
      (assignment) =>
        assignment.id ===
        Number(selectedAssignmentId)
    ) || null;

  const selectedSubmission =
    submissions.find(
      (submission) =>
        submission.id ===
        selectedSubmissionId
    ) || null;

  const unitMap = useMemo(() => {
    const map: Record<number, Unit> = {};

    for (const unit of units) {
      map[unit.id] = unit;
    }

    return map;
  }, [units]);

  const filteredSubmissions =
    useMemo(() => {
      const query =
        search.trim().toLowerCase();

      return submissions.filter(
        (submission) => {
          if (
            statusFilter !== "all" &&
            submission.status !== statusFilter
          ) {
            return false;
          }

          if (!query) {
            return true;
          }

          const profile =
            profiles[
              submission.student_id
            ];

          const studentName =
            profile?.full_name || "";

          return (
            studentName
              .toLowerCase()
              .includes(query) ||
            submission.student_id
              .toLowerCase()
              .includes(query) ||
            submission.file_name
              ?.toLowerCase()
              .includes(query)
          );
        }
      );
    }, [
      submissions,
      statusFilter,
      search,
      profiles,
    ]);

  const statistics = useMemo(() => {
    const total = submissions.length;

    const graded = submissions.filter(
      (submission) =>
        submission.status === "graded"
    ).length;

    const late = submissions.filter(
      (submission) =>
        submission.status === "late"
    ).length;

    const ungraded =
      submissions.filter(
        (submission) =>
          submission.status !== "graded" &&
          submission.status !== "returned"
      ).length;

    return {
      total,
      graded,
      late,
      ungraded,
    };
  }, [submissions]);

  async function saveGrade() {
    if (!selectedSubmission) {
      setError(
        "Select a submission first."
      );
      return;
    }

    if (!selectedAssignment) {
      setError(
        "Select an assignment first."
      );
      return;
    }

    setError("");
    setSuccess("");

    const numericGrade =
      grade.trim() === ""
        ? null
        : Number(grade);

    if (
      numericGrade !== null &&
      Number.isNaN(numericGrade)
    ) {
      setError(
        "Grade must be a valid number."
      );
      return;
    }

    if (
      numericGrade !== null &&
      numericGrade < 0
    ) {
      setError(
        "Grade cannot be negative."
      );
      return;
    }

    if (
      numericGrade !== null &&
      numericGrade >
        selectedAssignment.max_points
    ) {
      setError(
        `Grade cannot exceed ${selectedAssignment.max_points} points.`
      );
      return;
    }

    setSavingGrade(true);

    try {
      const {
        data: {
          user,
        },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error(
          "Your session has expired. Please log in again."
        );
      }

      const newStatus =
        numericGrade === null
          ? selectedSubmission.status
          : "graded";

      const { data, error: updateError } =
        await supabase
          .from("assignment_submissions")
          .update({
            grade: numericGrade,
            feedback:
              feedback.trim() || null,
            status: newStatus,
            graded_at:
              numericGrade !== null
                ? new Date().toISOString()
                : null,
            graded_by:
              numericGrade !== null
                ? user.id
                : null,
            updated_at:
              new Date().toISOString(),
          })
          .eq(
            "id",
            selectedSubmission.id
          )
          .select()
          .single();

      if (updateError) {
        throw updateError;
      }

      const updated =
        data as Submission;

      setSubmissions((previous) =>
        previous.map((submission) =>
          submission.id ===
          updated.id
            ? updated
            : submission
        )
      );

      setGrade(
        updated.grade !== null
          ? String(updated.grade)
          : ""
      );

      setFeedback(
        updated.feedback || ""
      );

      setSuccess(
        numericGrade === null
          ? "Grade cleared successfully."
          : "Grade and feedback saved successfully."
      );
    } catch (err: any) {
      console.error(err);

      setError(
        err?.message ||
          "Unable to save the grade."
      );
    } finally {
      setSavingGrade(false);
    }
  }

  async function returnSubmission() {
    if (!selectedSubmission) {
      return;
    }

    setError("");
    setSuccess("");

    try {
      const { error: updateError } =
        await supabase
          .from("assignment_submissions")
          .update({
            status: "returned",
            updated_at:
              new Date().toISOString(),
          })
          .eq(
            "id",
            selectedSubmission.id
          );

      if (updateError) {
        throw updateError;
      }

      setSubmissions((previous) =>
        previous.map((submission) =>
          submission.id ===
          selectedSubmission.id
            ? {
                ...submission,
                status: "returned",
              }
            : submission
        )
      );

      setSuccess(
        "Submission marked as returned."
      );
    } catch (err: any) {
      console.error(err);

      setError(
        err?.message ||
          "Unable to return submission."
      );
    }
  }

  function getStudentName(
    studentId: string
  ) {
    return (
      profiles[studentId]?.full_name ||
      `Student ${studentId.slice(0, 8)}`
    );
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-50 p-8">
        <div className="mx-auto max-w-7xl rounded-2xl bg-white p-8 shadow-sm">
          <p className="text-gray-600">
            Loading grading workspace...
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Header */}
        <section className="rounded-2xl bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">
                Admin / Assessment
              </p>

              <h1 className="mt-1 text-2xl font-bold text-gray-900">
                Submission Grading
              </h1>

              <p className="mt-2 text-sm text-gray-500">
                Review student submissions, assign
                grades, and provide feedback.
              </p>
            </div>

            <a
              href="/admin/assignments"
              className="rounded-xl border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-800 hover:bg-gray-50"
            >
              Manage Assignments
            </a>
          </div>
        </section>

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {success && (
          <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-700">
            {success}
          </div>
        )}

        {/* Assignment selector */}
        <section className="rounded-2xl bg-white p-6 shadow-sm">
          <label className="block text-sm font-semibold text-gray-800">
            Select assignment
          </label>

          <select
            value={selectedAssignmentId}
            onChange={(event) =>
              setSelectedAssignmentId(
                event.target.value
              )
            }
            className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm md:max-w-2xl"
          >
            <option value="">
              Select an assignment...
            </option>

            {assignments.map(
              (assignment) => {
                const unit =
                  unitMap[assignment.unit_id];

                return (
                  <option
                    key={assignment.id}
                    value={assignment.id}
                  >
                    {unit
                      ? `${unit.code} — ${unit.name} — `
                      : ""}
                    {assignment.title}
                    {assignment.assignment_number
                      ? ` (Assignment ${assignment.assignment_number})`
                      : ""}
                  </option>
                );
              }
            )}
          </select>
        </section>

        {selectedAssignment && (
          <>
            {/* Statistics */}
            <section className="grid gap-4 md:grid-cols-4">
              <div className="rounded-2xl bg-white p-5 shadow-sm">
                <p className="text-sm text-gray-500">
                  Submissions
                </p>

                <p className="mt-1 text-3xl font-bold text-gray-900">
                  {statistics.total}
                </p>
              </div>

              <div className="rounded-2xl bg-white p-5 shadow-sm">
                <p className="text-sm text-gray-500">
                  Graded
                </p>

                <p className="mt-1 text-3xl font-bold text-gray-900">
                  {statistics.graded}
                </p>
              </div>

              <div className="rounded-2xl bg-white p-5 shadow-sm">
                <p className="text-sm text-gray-500">
                  Awaiting grading
                </p>

                <p className="mt-1 text-3xl font-bold text-gray-900">
                  {statistics.ungraded}
                </p>
              </div>

              <div className="rounded-2xl bg-white p-5 shadow-sm">
                <p className="text-sm text-gray-500">
                  Late
                </p>

                <p className="mt-1 text-3xl font-bold text-gray-900">
                  {statistics.late}
                </p>
              </div>
            </section>

            {/* Main grading workspace */}
            <section className="grid gap-6 lg:grid-cols-[380px_1fr]">
              {/* Submission list */}
              <div className="rounded-2xl bg-white shadow-sm">
                <div className="border-b p-5">
                  <h2 className="font-bold text-gray-900">
                    Student submissions
                  </h2>

                  <input
                    type="search"
                    value={search}
                    onChange={(event) =>
                      setSearch(
                        event.target.value
                      )
                    }
                    placeholder="Search student..."
                    className="mt-4 w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm"
                  />

                  <select
                    value={statusFilter}
                    onChange={(event) =>
                      setStatusFilter(
                        event.target.value
                      )
                    }
                    className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm"
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
                  </select>
                </div>

                <div className="max-h-[650px] overflow-y-auto">
                  {loadingSubmissions ? (
                    <div className="p-6 text-sm text-gray-500">
                      Loading submissions...
                    </div>
                  ) : filteredSubmissions.length ===
                    0 ? (
                    <div className="p-6 text-sm text-gray-500">
                      No submissions found.
                    </div>
                  ) : (
                    filteredSubmissions.map(
                      (submission) => {
                        const selected =
                          selectedSubmissionId ===
                          submission.id;

                        return (
                          <button
                            key={submission.id}
                            type="button"
                            onClick={() =>
                              selectSubmission(
                                submission
                              )
                            }
                            className={`w-full border-b p-4 text-left transition ${
                              selected
                                ? "bg-gray-100"
                                : "hover:bg-gray-50"
                            }`}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="truncate font-semibold text-gray-900">
                                  {getStudentName(
                                    submission.student_id
                                  )}
                                </p>

                                <p className="mt-1 text-xs text-gray-500">
                                  Attempt #
                                  {
                                    submission.submission_number
                                  }
                                </p>

                                <p className="mt-1 text-xs text-gray-500">
                                  {formatDate(
                                    submission.submitted_at
                                  )}
                                </p>
                              </div>

                              <span
                                className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${
                                  submission.status ===
                                  "graded"
                                    ? "bg-green-100 text-green-700"
                                    : submission.status ===
                                      "late"
                                    ? "bg-yellow-100 text-yellow-700"
                                    : submission.status ===
                                      "returned"
                                    ? "bg-blue-100 text-blue-700"
                                    : "bg-gray-100 text-gray-700"
                                }`}
                              >
                                {statusLabel(
                                  submission.status
                                )}
                              </span>
                            </div>

                            {submission.grade !==
                              null && (
                              <p className="mt-3 text-sm font-semibold text-gray-800">
                                {submission.grade} /{" "}
                                {
                                  selectedAssignment.max_points
                                }
                              </p>
                            )}
                          </button>
                        );
                      }
                    )
                  )}
                </div>
              </div>

              {/* Submission viewer */}
              <div className="rounded-2xl bg-white shadow-sm">
                {!selectedSubmission ? (
                  <div className="flex min-h-[500px] items-center justify-center p-8 text-center text-gray-500">
                    Select a student submission
                    to begin grading.
                  </div>
                ) : (
                  <>
                    {/* Submission header */}
                    <div className="border-b p-6">
                      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                        <div>
                          <p className="text-sm text-gray-500">
                            Student
                          </p>

                          <h2 className="text-xl font-bold text-gray-900">
                            {getStudentName(
                              selectedSubmission.student_id
                            )}
                          </h2>

                          <p className="mt-1 text-sm text-gray-500">
                            Student ID:{" "}
                            {
                              selectedSubmission.student_id
                            }
                          </p>

                          <p className="mt-2 text-sm text-gray-500">
                            Attempt #
                            {
                              selectedSubmission.submission_number
                            }{" "}
                            •{" "}
                            {formatDate(
                              selectedSubmission.submitted_at
                            )}
                          </p>
                        </div>

                        <div className="rounded-xl bg-gray-50 px-5 py-4 text-center">
                          <p className="text-xs uppercase text-gray-500">
                            Maximum
                          </p>

                          <p className="text-2xl font-bold text-gray-900">
                            {
                              selectedAssignment.max_points
                            }
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* File */}
                    <div className="p-6">
                      {selectedSubmission.file_name && (
                        <div className="rounded-xl border p-4">
                          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                            <div>
                              <p className="font-semibold text-gray-900">
                                Submitted file
                              </p>

                              <p className="mt-1 text-sm text-gray-600">
                                {
                                  selectedSubmission.file_name
                                }
                              </p>

                              {selectedSubmission.file_size && (
                                <p className="mt-1 text-xs text-gray-500">
                                  {formatFileSize(
                                    selectedSubmission.file_size
                                  )}
                                </p>
                              )}
                            </div>

                            {fileUrls[
                              selectedSubmission.id
                            ] && (
                              <a
                                href={
                                  fileUrls[
                                    selectedSubmission.id
                                  ]
                                }
                                target="_blank"
                                rel="noopener noreferrer"
                                className="rounded-xl bg-black px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800"
                              >
                                Open submission
                              </a>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Text response */}
                      {selectedSubmission.submission_text && (
                        <div className="mt-5 rounded-xl border">
                          <div className="border-b px-5 py-3">
                            <h3 className="font-semibold text-gray-900">
                              Written response
                            </h3>
                          </div>

                          <div className="max-h-[400px] overflow-y-auto whitespace-pre-wrap p-5 text-sm leading-7 text-gray-700">
                            {
                              selectedSubmission.submission_text
                            }
                          </div>
                        </div>
                      )}

                      {/* Grade */}
                      <div className="mt-6 rounded-xl border bg-gray-50 p-5">
                        <h3 className="font-bold text-gray-900">
                          Grade and feedback
                        </h3>

                        <div className="mt-4 grid gap-5 md:grid-cols-[180px_1fr]">
                          <div>
                            <label className="block text-sm font-semibold text-gray-700">
                              Grade
                            </label>

                            <div className="mt-2 flex items-center gap-2">
                              <input
                                type="number"
                                min="0"
                                max={
                                  selectedAssignment.max_points
                                }
                                step="0.01"
                                value={grade}
                                onChange={(event) =>
                                  setGrade(
                                    event.target.value
                                  )
                                }
                                placeholder="0"
                                className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-lg font-semibold"
                              />

                              <span className="font-semibold text-gray-500">
                                /
                                {
                                  selectedAssignment.max_points
                                }
                              </span>
                            </div>
                          </div>

                          <div>
                            <label className="block text-sm font-semibold text-gray-700">
                              Feedback
                            </label>

                            <textarea
                              value={feedback}
                              onChange={(event) =>
                                setFeedback(
                                  event.target.value
                                )
                              }
                              rows={6}
                              placeholder="Enter feedback for the student..."
                              className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm"
                            />
                          </div>
                        </div>

                        <div className="mt-5 flex flex-wrap gap-3">
                          <button
                            type="button"
                            onClick={saveGrade}
                            disabled={savingGrade}
                            className="rounded-xl bg-black px-5 py-3 text-sm font-semibold text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {savingGrade
                              ? "Saving..."
                              : "Save Grade"}
                          </button>

                          <button
                            type="button"
                            onClick={returnSubmission}
                            className="rounded-xl border border-gray-300 bg-white px-5 py-3 text-sm font-semibold text-gray-800 hover:bg-gray-50"
                          >
                            Return to Student
                          </button>

                          {selectedSubmission.grade !==
                            null && (
                            <button
                              type="button"
                              onClick={() => {
                                setGrade("");
                                setFeedback(
                                  selectedSubmission.feedback ||
                                    ""
                                );
                              }}
                              className="rounded-xl border border-gray-300 bg-white px-5 py-3 text-sm font-semibold text-gray-800 hover:bg-gray-50"
                            >
                              Clear Grade
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Existing grading information */}
                      {selectedSubmission.graded_at && (
                        <div className="mt-5 rounded-xl bg-green-50 p-4 text-sm text-green-800">
                          <strong>
                            Graded:
                          </strong>{" "}
                          {formatDate(
                            selectedSubmission.graded_at
                          )}
                          <a
  href="/admin/submissions"
  className="..."
>
  Submissions
</a>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            </section>
          </>
        )}
      </div>
    </main>
  );
}