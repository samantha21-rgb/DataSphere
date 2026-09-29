"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "../../lib/supabase";

type Unit = {
  id: number;
  name: string;
};

type Student = {
  id: string;
  email?: string | null;
  full_name?: string | null;
  name?: string | null;
};

type Assessment = {
  id: number;
  unit_id: number;
  title: string;
  assessment_type: string;
  max_score: number;
  weight: number;
  assessment_date: string | null;
};

type StudentResult = {
  id: number;
  student_id: string;
  assessment_id: number;
  score: number;
  grade: string | null;
  grade_points: number | null;
  remarks: string | null;
};

const assessmentTypes = [
  "CAT",
  "Assignment",
  "Mid-Semester",
  "Final Exam",
  "Project",
  "Practical",
  "Other",
];

function calculateGrade(score: number, maxScore: number) {
  const percentage = (score / maxScore) * 100;

  if (percentage >= 70) return { grade: "A", points: 5 };
  if (percentage >= 60) return { grade: "B+", points: 4 };
  if (percentage >= 50) return { grade: "B", points: 3 };
  if (percentage >= 45) return { grade: "C+", points: 2 };
  if (percentage >= 40) return { grade: "C", points: 1 };
  if (percentage >= 30) return { grade: "D", points: 0 };
  if (percentage >= 20) return { grade: "E", points: 0 };

  return { grade: "F", points: 0 };
}

function getStudentName(student: Student) {
  return (
    student.full_name ||
    student.name ||
    student.email ||
    "Unnamed student"
  );
}

export default function AdminResultsPage() {
  const [units, setUnits] = useState<Unit[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [results, setResults] = useState<StudentResult[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Assessment form
  const [selectedUnit, setSelectedUnit] = useState("");
  const [title, setTitle] = useState("");
  const [assessmentType, setAssessmentType] = useState("CAT");
  const [maxScore, setMaxScore] = useState("100");
  const [weight, setWeight] = useState("0");
  const [assessmentDate, setAssessmentDate] = useState("");
  const [editingAssessmentId, setEditingAssessmentId] =
    useState<number | null>(null);

  // Result form
  const [selectedStudent, setSelectedStudent] = useState("");
  const [selectedAssessment, setSelectedAssessment] = useState("");
  const [score, setScore] = useState("");
  const [remarks, setRemarks] = useState("");
  const [editingResultId, setEditingResultId] =
    useState<number | null>(null);

  // Filters
  const [assessmentFilter, setAssessmentFilter] = useState("");
  const [studentFilter, setStudentFilter] = useState("");

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

      if (userError) throw userError;

      if (!user) {
        throw new Error("You must be logged in.");
      }

      const { data: profile, error: profileError } =
        await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .maybeSingle();

      if (profileError) throw profileError;

      if (profile?.role !== "admin") {
        throw new Error(
          "You do not have permission to access this page."
        );
      }

      const [
        unitsResult,
        studentsResult,
        assessmentsResult,
        resultsResult,
      ] = await Promise.all([
        supabase
          .from("units")
          .select("id, name")
          .order("name", { ascending: true }),

        supabase
          .from("profiles")
          .select("*")
          .eq("role", "student"),

        supabase
          .from("assessments")
          .select(
            "id, unit_id, title, assessment_type, max_score, weight, assessment_date"
          )
          .order("created_at", { ascending: false }),

        supabase
          .from("student_results")
          .select(
            "id, student_id, assessment_id, score, grade, grade_points, remarks"
          )
          .order("created_at", { ascending: false }),
      ]);

      if (unitsResult.error) throw unitsResult.error;
      if (studentsResult.error) throw studentsResult.error;
      if (assessmentsResult.error) throw assessmentsResult.error;
      if (resultsResult.error) throw resultsResult.error;

      setUnits(unitsResult.data || []);
      setStudents(studentsResult.data || []);
      setAssessments(assessmentsResult.data || []);
      setResults(resultsResult.data || []);
    } catch (err) {
      console.error("Results page error:", err);

      setError(
        err instanceof Error
          ? err.message
          : "Unable to load results data."
      );
    } finally {
      setLoading(false);
    }
  }

  function resetAssessmentForm() {
    setSelectedUnit("");
    setTitle("");
    setAssessmentType("CAT");
    setMaxScore("100");
    setWeight("0");
    setAssessmentDate("");
    setEditingAssessmentId(null);
  }

  function resetResultForm() {
    setSelectedStudent("");
    setSelectedAssessment("");
    setScore("");
    setRemarks("");
    setEditingResultId(null);
  }

  async function handleAssessmentSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError("");
    setSuccess("");

    if (!selectedUnit) {
      setError("Please select a unit.");
      return;
    }

    if (!title.trim()) {
      setError("Please enter an assessment title.");
      return;
    }

    const max = Number(maxScore);
    const assessmentWeight = Number(weight);

    if (!Number.isFinite(max) || max <= 0) {
      setError("Maximum score must be greater than zero.");
      return;
    }

    if (
      !Number.isFinite(assessmentWeight) ||
      assessmentWeight < 0 ||
      assessmentWeight > 100
    ) {
      setError("Weight must be between 0 and 100.");
      return;
    }

    setSaving(true);

    try {
      const data = {
        unit_id: Number(selectedUnit),
        title: title.trim(),
        assessment_type: assessmentType,
        max_score: max,
        weight: assessmentWeight,
        assessment_date: assessmentDate || null,
      };

      if (editingAssessmentId !== null) {
        const { error: updateError } = await supabase
          .from("assessments")
          .update(data)
          .eq("id", editingAssessmentId);

        if (updateError) throw updateError;

        setSuccess("Assessment updated successfully.");
      } else {
        const { error: insertError } = await supabase
          .from("assessments")
          .insert(data);

        if (insertError) throw insertError;

        setSuccess("Assessment created successfully.");
      }

      resetAssessmentForm();
      await loadData();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to save assessment."
      );
    } finally {
      setSaving(false);
    }
  }

  function editAssessment(assessment: Assessment) {
    setEditingAssessmentId(assessment.id);
    setSelectedUnit(String(assessment.unit_id));
    setTitle(assessment.title);
    setAssessmentType(assessment.assessment_type);
    setMaxScore(String(assessment.max_score));
    setWeight(String(assessment.weight));
    setAssessmentDate(assessment.assessment_date || "");

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function deleteAssessment(id: number) {
    if (
      !window.confirm(
        "Delete this assessment? Student results attached to it will also be deleted."
      )
    ) {
      return;
    }

    setError("");
    setSuccess("");

    try {
      const { error: deleteError } = await supabase
        .from("assessments")
        .delete()
        .eq("id", id);

      if (deleteError) throw deleteError;

      setSuccess("Assessment deleted.");
      await loadData();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to delete assessment."
      );
    }
  }

  async function handleResultSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError("");
    setSuccess("");

    if (!selectedStudent) {
      setError("Please select a student.");
      return;
    }

    if (!selectedAssessment) {
      setError("Please select an assessment.");
      return;
    }

    const assessment = assessments.find(
      (item) => item.id === Number(selectedAssessment)
    );

    if (!assessment) {
      setError("Selected assessment was not found.");
      return;
    }

    const numericScore = Number(score);

    if (!Number.isFinite(numericScore) || numericScore < 0) {
      setError("Please enter a valid score.");
      return;
    }

    if (numericScore > Number(assessment.max_score)) {
      setError(
        `Score cannot exceed ${assessment.max_score}.`
      );
      return;
    }

    const calculated = calculateGrade(
      numericScore,
      Number(assessment.max_score)
    );

    setSaving(true);

    try {
      const data = {
        student_id: selectedStudent,
        assessment_id: assessment.id,
        score: numericScore,
        grade: calculated.grade,
        grade_points: calculated.points,
        remarks: remarks.trim() || null,
      };

      if (editingResultId !== null) {
        const { error: updateError } = await supabase
          .from("student_results")
          .update(data)
          .eq("id", editingResultId);

        if (updateError) throw updateError;

        setSuccess("Student result updated successfully.");
      } else {
        const { error: insertError } = await supabase
          .from("student_results")
          .upsert(data, {
            onConflict: "student_id,assessment_id",
          });

        if (insertError) throw insertError;

        setSuccess("Student result saved successfully.");
      }

      resetResultForm();
      await loadData();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to save student result."
      );
    } finally {
      setSaving(false);
    }
  }

  function editResult(result: StudentResult) {
    setEditingResultId(result.id);
    setSelectedStudent(result.student_id);
    setSelectedAssessment(String(result.assessment_id));
    setScore(String(result.score));
    setRemarks(result.remarks || "");

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function deleteResult(id: number) {
    if (!window.confirm("Delete this student result?")) {
      return;
    }

    setError("");
    setSuccess("");

    try {
      const { error: deleteError } = await supabase
        .from("student_results")
        .delete()
        .eq("id", id);

      if (deleteError) throw deleteError;

      setSuccess("Student result deleted.");
      await loadData();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to delete result."
      );
    }
  }

  const unitMap = useMemo(
    () =>
      new Map(
        units.map((unit) => [unit.id, unit.name])
      ),
    [units]
  );

  const studentMap = useMemo(
    () =>
      new Map(
        students.map((student) => [
          student.id,
          getStudentName(student),
        ])
      ),
    [students]
  );

  const assessmentMap = useMemo(
    () =>
      new Map(
        assessments.map((assessment) => [
          assessment.id,
          assessment,
        ])
      ),
    [assessments]
  );

  const filteredAssessments = assessmentFilter
    ? assessments.filter(
        (assessment) =>
          assessment.unit_id === Number(assessmentFilter)
      )
    : assessments;

  const filteredResults = results.filter((result) => {
    if (
      studentFilter &&
      result.student_id !== studentFilter
    ) {
      return false;
    }

    if (
      assessmentFilter &&
      assessmentMap.get(result.assessment_id)?.unit_id !==
        Number(assessmentFilter)
    ) {
      return false;
    }

    return true;
  });

  const selectedAssessmentData = assessments.find(
    (assessment) =>
      assessment.id === Number(selectedAssessment)
  );

  const preview =
    selectedAssessmentData && score !== ""
      ? calculateGrade(
          Number(score),
          Number(selectedAssessmentData.max_score)
        )
      : null;

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-50 p-8 text-gray-900">
        <div className="mx-auto max-w-7xl">
          <div className="rounded-2xl bg-white p-8 shadow-sm">
            Loading assessment and results management...
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 p-6 text-gray-900 md:p-8">
      <div className="mx-auto max-w-7xl">

        <Link
          href="/admin"
          className="text-sm font-medium text-gray-500 hover:text-gray-900"
        >
          ← Back to Admin Dashboard
        </Link>

        <div className="mt-4">
          <h1 className="text-3xl font-bold">
            Assessment & Results
          </h1>

          <p className="mt-2 text-gray-600">
            Manage assessments and student academic results.
          </p>
        </div>

        {error && (
          <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {success && (
          <div className="mt-6 rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-700">
            {success}
          </div>
        )}

        {/* STATS */}

        <div className="mt-8 grid gap-4 sm:grid-cols-4">
          <StatCard
            label="Units"
            value={units.length}
          />

          <StatCard
            label="Students"
            value={students.length}
          />

          <StatCard
            label="Assessments"
            value={assessments.length}
          />

          <StatCard
            label="Student Results"
            value={results.length}
          />
        </div>

        {/* ASSESSMENT MANAGEMENT */}

        <section className="mt-8 grid gap-8 lg:grid-cols-[380px_1fr]">

          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">

            <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
              {editingAssessmentId
                ? "Edit Assessment"
                : "New Assessment"}
            </p>

            <h2 className="mt-1 text-xl font-bold">
              Assessment Details
            </h2>

            <form
              onSubmit={handleAssessmentSubmit}
              className="mt-6 space-y-5"
            >

              <Field label="Unit">
                <select
                  value={selectedUnit}
                  onChange={(e) =>
                    setSelectedUnit(e.target.value)
                  }
                  className="input"
                  required
                >
                  <option value="">
                    Select unit
                  </option>

                  {units.map((unit) => (
                    <option
                      key={unit.id}
                      value={unit.id}
                    >
                      {unit.name}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Assessment Title">
                <input
                  value={title}
                  onChange={(e) =>
                    setTitle(e.target.value)
                  }
                  className="input"
                  placeholder="e.g. CAT 1"
                  required
                />
              </Field>

              <Field label="Assessment Type">
                <select
                  value={assessmentType}
                  onChange={(e) =>
                    setAssessmentType(e.target.value)
                  }
                  className="input"
                >
                  {assessmentTypes.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </Field>

              <div className="grid grid-cols-2 gap-3">

                <Field label="Maximum Score">
                  <input
                    type="number"
                    min="1"
                    step="0.01"
                    value={maxScore}
                    onChange={(e) =>
                      setMaxScore(e.target.value)
                    }
                    className="input"
                    required
                  />
                </Field>

                <Field label="Weight %">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    value={weight}
                    onChange={(e) =>
                      setWeight(e.target.value)
                    }
                    className="input"
                  />
                </Field>

              </div>

              <Field label="Assessment Date">
                <input
                  type="date"
                  value={assessmentDate}
                  onChange={(e) =>
                    setAssessmentDate(e.target.value)
                  }
                  className="input"
                />
              </Field>

              <div className="flex gap-3">

                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 rounded-xl bg-gray-900 px-4 py-3 text-sm font-semibold text-white hover:bg-gray-800 disabled:opacity-50"
                >
                  {saving
                    ? "Saving..."
                    : editingAssessmentId
                      ? "Update Assessment"
                      : "Create Assessment"}
                </button>

                {editingAssessmentId !== null && (
                  <button
                    type="button"
                    onClick={resetAssessmentForm}
                    className="rounded-xl border border-gray-300 px-4 py-3 text-sm font-semibold hover:bg-gray-100"
                  >
                    Cancel
                  </button>
                )}

              </div>

            </form>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">

            <div className="flex flex-col gap-4 border-b border-gray-200 p-6 md:flex-row md:items-center md:justify-between">

              <div>
                <h2 className="text-xl font-bold">
                  Assessments
                </h2>

                <p className="mt-1 text-sm text-gray-500">
                  Configure CATs, assignments, exams and other assessments.
                </p>
              </div>

              <select
                value={assessmentFilter}
                onChange={(e) =>
                  setAssessmentFilter(e.target.value)
                }
                className="input md:max-w-xs"
              >
                <option value="">
                  All units
                </option>

                {units.map((unit) => (
                  <option
                    key={unit.id}
                    value={unit.id}
                  >
                    {unit.name}
                  </option>
                ))}
              </select>

            </div>

            {filteredAssessments.length === 0 ? (
              <Empty text="No assessments found." />
            ) : (
              <div className="divide-y divide-gray-100">

                {filteredAssessments.map((assessment) => (
                  <div
                    key={assessment.id}
                    className="p-6"
                  >

                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">

                      <div>
                        <div className="flex flex-wrap items-center gap-2">

                          <h3 className="font-semibold">
                            {assessment.title}
                          </h3>

                          <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold">
                            {assessment.assessment_type}
                          </span>

                        </div>

                        <p className="mt-1 text-sm text-gray-500">
                          {unitMap.get(assessment.unit_id) ||
                            "Unknown unit"}
                        </p>

                        <p className="mt-2 text-xs text-gray-500">
                          Max: {assessment.max_score}
                          {" · "}
                          Weight: {assessment.weight}%
                          {" · "}
                          {assessment.assessment_date ||
                            "No date"}
                        </p>
                      </div>

                      <div className="flex gap-2">

                        <button
                          type="button"
                          onClick={() =>
                            editAssessment(assessment)
                          }
                          className="rounded-lg border border-gray-300 px-3 py-2 text-sm hover:bg-gray-100"
                        >
                          Edit
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            deleteAssessment(assessment.id)
                          }
                          className="rounded-lg border border-red-200 px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                        >
                          Delete
                        </button>

                      </div>

                    </div>

                  </div>
                ))}

              </div>
            )}

          </div>

        </section>

        {/* STUDENT RESULTS */}

        <section className="mt-8 grid gap-8 lg:grid-cols-[380px_1fr]">

          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">

            <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
              {editingResultId
                ? "Edit Student Result"
                : "Enter Student Result"}
            </p>

            <h2 className="mt-1 text-xl font-bold">
              Student Score
            </h2>

            <form
              onSubmit={handleResultSubmit}
              className="mt-6 space-y-5"
            >

              <Field label="Student">
                <select
                  value={selectedStudent}
                  onChange={(e) =>
                    setSelectedStudent(e.target.value)
                  }
                  className="input"
                  required
                >
                  <option value="">
                    Select student
                  </option>

                  {students.map((student) => (
                    <option
                      key={student.id}
                      value={student.id}
                    >
                      {getStudentName(student)}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Assessment">
                <select
                  value={selectedAssessment}
                  onChange={(e) =>
                    setSelectedAssessment(e.target.value)
                  }
                  className="input"
                  required
                >
                  <option value="">
                    Select assessment
                  </option>

                  {assessments.map((assessment) => (
                    <option
                      key={assessment.id}
                      value={assessment.id}
                    >
                      {assessment.title}
                      {" — "}
                      {unitMap.get(assessment.unit_id) ||
                        "Unknown unit"}
                    </option>
                  ))}
                </select>
              </Field>

              {selectedAssessmentData && (
                <div className="rounded-xl bg-gray-50 p-4 text-sm">

                  <div className="flex justify-between">
                    <span className="text-gray-500">
                      Maximum
                    </span>

                    <strong>
                      {selectedAssessmentData.max_score}
                    </strong>
                  </div>

                  <div className="mt-1 flex justify-between">
                    <span className="text-gray-500">
                      Weight
                    </span>

                    <strong>
                      {selectedAssessmentData.weight}%
                    </strong>
                  </div>

                </div>
              )}

              <Field label="Score">
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  max={
                    selectedAssessmentData?.max_score
                  }
                  value={score}
                  onChange={(e) =>
                    setScore(e.target.value)
                  }
                  className="input"
                  placeholder="Enter score"
                  required
                />
              </Field>

              {preview && (
                <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">

                  <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Calculated Grade
                  </p>

                  <div className="mt-2 flex items-center justify-between">

                    <span className="text-3xl font-bold">
                      {preview.grade}
                    </span>

                    <span className="text-sm font-semibold text-gray-600">
                      {preview.points} grade points
                    </span>

                  </div>

                </div>
              )}

              <Field label="Remarks">
                <textarea
                  value={remarks}
                  onChange={(e) =>
                    setRemarks(e.target.value)
                  }
                  className="input min-h-24 resize-y"
                  placeholder="Optional remarks"
                />
              </Field>

              <div className="flex gap-3">

                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 rounded-xl bg-gray-900 px-4 py-3 text-sm font-semibold text-white hover:bg-gray-800 disabled:opacity-50"
                >
                  {saving
                    ? "Saving..."
                    : editingResultId
                      ? "Update Result"
                      : "Save Result"}
                </button>

                {editingResultId !== null && (
                  <button
                    type="button"
                    onClick={resetResultForm}
                    className="rounded-xl border border-gray-300 px-4 py-3 text-sm font-semibold hover:bg-gray-100"
                  >
                    Cancel
                  </button>
                )}

              </div>

            </form>

          </div>

          {/* RESULTS TABLE */}

          <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">

            <div className="flex flex-col gap-4 border-b border-gray-200 p-6 md:flex-row md:items-center md:justify-between">

              <div>
                <h2 className="text-xl font-bold">
                  Student Results
                </h2>

                <p className="mt-1 text-sm text-gray-500">
                  Assessment scores recorded for students.
                </p>
              </div>

              <select
                value={studentFilter}
                onChange={(e) =>
                  setStudentFilter(e.target.value)
                }
                className="input md:max-w-xs"
              >
                <option value="">
                  All students
                </option>

                {students.map((student) => (
                  <option
                    key={student.id}
                    value={student.id}
                  >
                    {getStudentName(student)}
                  </option>
                ))}
              </select>

            </div>

            {filteredResults.length === 0 ? (
              <Empty text="No student results have been entered yet." />
            ) : (
              <div className="overflow-x-auto">

                <table className="w-full min-w-[800px] text-left text-sm">

                  <thead className="border-b border-gray-200 bg-gray-50">
                    <tr>
                      <th className="px-5 py-4">
                        Student
                      </th>

                      <th className="px-5 py-4">
                        Assessment
                      </th>

                      <th className="px-5 py-4">
                        Unit
                      </th>

                      <th className="px-5 py-4">
                        Score
                      </th>

                      <th className="px-5 py-4">
                        Grade
                      </th>

                      <th className="px-5 py-4">
                        Points
                      </th>

                      <th className="px-5 py-4">
                        Actions
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-gray-100">

                    {filteredResults.map((result) => {
                      const assessment =
                        assessmentMap.get(
                          result.assessment_id
                        );

                      return (
                        <tr key={result.id}>

                          <td className="px-5 py-4 font-medium">
                            {studentMap.get(
                              result.student_id
                            ) || "Unknown student"}
                          </td>

                          <td className="px-5 py-4">
                            {assessment?.title ||
                              "Unknown assessment"}
                          </td>

                          <td className="px-5 py-4 text-gray-600">
                            {assessment
                              ? unitMap.get(
                                  assessment.unit_id
                                ) || "Unknown unit"
                              : "Unknown unit"}
                          </td>

                          <td className="px-5 py-4">
                            {result.score}
                            {assessment
                              ? ` / ${assessment.max_score}`
                              : ""}
                          </td>

                          <td className="px-5 py-4">
                            <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-bold">
                              {result.grade || "—"}
                            </span>
                          </td>

                          <td className="px-5 py-4">
                            {result.grade_points ?? "—"}
                          </td>

                          <td className="px-5 py-4">

                            <div className="flex gap-2">

                              <button
                                type="button"
                                onClick={() =>
                                  editResult(result)
                                }
                                className="rounded-lg border border-gray-300 px-2.5 py-1.5 text-xs font-medium hover:bg-gray-100"
                              >
                                Edit
                              </button>

                              <button
                                type="button"
                                onClick={() =>
                                  deleteResult(result.id)
                                }
                                className="rounded-lg border border-red-200 px-2.5 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50"
                              >
                                Delete
                              </button>

                            </div>

                          </td>

                        </tr>
                      );
                    })}

                  </tbody>

                </table>

              </div>
            )}

          </div>

        </section>

      </div>
    </main>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-gray-700">
        {label}
      </span>

      {children}
    </label>
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
      <p className="text-sm text-gray-500">
        {label}
      </p>

      <p className="mt-2 text-3xl font-bold">
        {value}
      </p>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <div className="p-10 text-center">
      <div className="text-3xl">📭</div>

      <p className="mt-3 text-sm text-gray-500">
        {text}
      </p>
    </div>
  );
}