"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabase";

type Quiz = {
  id: number;
  title: string;
  unit_id: number;
};

type Attempt = {
  id: number;
  quiz_id: number;
  student_id: string;
  attempt_number: number;
  started_at: string;
  submitted_at: string | null;
  status: string;
  score: number | null;
  points_earned: number;
  points_possible: number;
};

type StudentProfile = {
  id: string;
  full_name: string | null;
  email: string | null;
};

type QuizQuestion = {
  id: number;
  quiz_id: number;
  question_bank_question_id: number;
  position: number;
  points: number;
};

type Question = {
  id: number;
  question_type: string;
  question_text: string;
  explanation: string | null;
  points: number;
};

type Answer = {
  id: number;
  attempt_id: number;
  quiz_question_id: number;
  answer: unknown;
  is_correct: boolean | null;
  points_earned: number;
  feedback: string | null;
};

export default function QuizAttemptsPage() {
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [profiles, setProfiles] = useState<
    StudentProfile[]
  >([]);

  const [selectedQuizId, setSelectedQuizId] =
    useState<number | null>(null);

  const [selectedAttempt, setSelectedAttempt] =
    useState<Attempt | null>(null);

  const [questions, setQuestions] = useState<
    QuizQuestion[]
  >([]);

  const [questionDetails, setQuestionDetails] =
    useState<Question[]>([]);

  const [answers, setAnswers] = useState<Answer[]>([]);

  const [essayGrades, setEssayGrades] =
    useState<Record<number, string>>({});

  const [essayFeedback, setEssayFeedback] =
    useState<Record<number, string>>({});

  const [loading, setLoading] = useState(true);
  const [loadingAttempt, setLoadingAttempt] =
    useState(false);
  const [saving, setSaving] = useState(false);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] =
    useState("all");

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    loadQuizzes();
  }, []);

  async function loadQuizzes() {
    setLoading(true);
    setError("");

    const { data, error } = await supabase
      .from("quizzes")
      .select("id, title, unit_id")
      .order("created_at", {
        ascending: false,
      });

    if (error) {
      setError(error.message);
    }

    setQuizzes((data || []) as Quiz[]);
    setLoading(false);
  }

  async function loadAttempts(
    quizId: number
  ) {
    setSelectedQuizId(quizId);
    setSelectedAttempt(null);
    setQuestions([]);
    setQuestionDetails([]);
    setAnswers([]);

    setError("");

    const { data, error } = await supabase
      .from("quiz_attempts")
      .select("*")
      .eq("quiz_id", quizId)
      .order("started_at", {
        ascending: false,
      });

    if (error) {
      setError(error.message);
      return;
    }

    const attemptRows =
      (data || []) as Attempt[];

    setAttempts(attemptRows);

    const studentIds = [
      ...new Set(
        attemptRows.map(
          (attempt) => attempt.student_id
        )
      ),
    ];

    if (!studentIds.length) {
      setProfiles([]);
      return;
    }

    const { data: profileData } =
      await supabase
        .from("profiles")
        .select("id, full_name, email")
        .in("id", studentIds);

    setProfiles(
      (profileData || []) as StudentProfile[]
    );
  }

  async function openAttempt(
    attempt: Attempt
  ) {
    setSelectedAttempt(attempt);
    setLoadingAttempt(true);
    setError("");
    setMessage("");

    const { data: questionRows, error: questionError } =
      await supabase
        .from("quiz_questions")
        .select("*")
        .eq("quiz_id", attempt.quiz_id)
        .order("position", {
          ascending: true,
        });

    if (questionError) {
      setError(questionError.message);
      setLoadingAttempt(false);
      return;
    }

    const quizQuestions =
      (questionRows || []) as QuizQuestion[];

    setQuestions(quizQuestions);

    const questionIds =
      quizQuestions.map(
        (question) =>
          question.question_bank_question_id
      );

    if (questionIds.length) {
      const {
        data: questionData,
        error: questionDataError,
      } = await supabase
        .from("question_bank_questions")
        .select(
          "id, question_type, question_text, explanation, points"
        )
        .in("id", questionIds);

      if (questionDataError) {
        setError(
          questionDataError.message
        );
        setLoadingAttempt(false);
        return;
      }

      setQuestionDetails(
        (questionData || []) as Question[]
      );
    }

    const {
      data: answerData,
      error: answerError,
    } = await supabase
      .from("quiz_attempt_answers")
      .select("*")
      .eq("attempt_id", attempt.id);

    if (answerError) {
      setError(answerError.message);
      setLoadingAttempt(false);
      return;
    }

    const answerRows =
      (answerData || []) as Answer[];

    setAnswers(answerRows);

    const grades: Record<
      number,
      string
    > = {};

    const feedback: Record<
      number,
      string
    > = {};

    for (const answer of answerRows) {
      const question = quizQuestions.find(
        (item) =>
          item.id ===
          answer.quiz_question_id
      );

      const details =
        question &&
        questionDetails.find(
          (item: Question) =>
            item.id ===
            question.question_bank_question_id
        );

      if (
        details?.question_type ===
        "essay"
      ) {
        grades[answer.id] =
          answer.points_earned?.toString() ||
          "";

        feedback[answer.id] =
          answer.feedback || "";
      }
    }

    setEssayGrades(grades);
    setEssayFeedback(feedback);

    setLoadingAttempt(false);
  }

  function getStudent(
    studentId: string
  ) {
    return profiles.find(
      (profile) =>
        profile.id === studentId
    );
  }

  function getQuestion(
    quizQuestionId: number
  ) {
    const quizQuestion =
      questions.find(
        (question) =>
          question.id === quizQuestionId
      );

    if (!quizQuestion) {
      return undefined;
    }

    return questionDetails.find(
      (question) =>
        question.id ===
        quizQuestion.question_bank_question_id
    );
  }

  function getAnswer(
    quizQuestionId: number
  ) {
    return answers.find(
      (answer) =>
        answer.quiz_question_id ===
        quizQuestionId
    );
  }

  function formatAnswer(
    answer: unknown
  ) {
    if (
      answer === null ||
      answer === undefined
    ) {
      return "No answer";
    }

    if (typeof answer === "boolean") {
      return answer ? "True" : "False";
    }

    if (
      typeof answer === "object"
    ) {
      try {
        return JSON.stringify(
          answer
        );
      } catch {
        return String(answer);
      }
    }

    return String(answer);
  }

  async function saveManualGrades() {
    if (!selectedAttempt) {
      return;
    }

    setSaving(true);
    setError("");
    setMessage("");

    let manualPoints = 0;

    for (const question of questions) {
      const details =
        questionDetails.find(
          (item) =>
            item.id ===
            question.question_bank_question_id
        );

      if (
        details?.question_type !==
        "essay"
      ) {
        continue;
      }

      const answer =
        getAnswer(question.id);

      if (!answer) {
        continue;
      }

      const grade =
        Number(
          essayGrades[answer.id]
        );

      if (
        Number.isNaN(grade) ||
        grade < 0 ||
        grade > Number(question.points)
      ) {
        setError(
          `Invalid grade for question ${question.position}. Grade must be between 0 and ${question.points}.`
        );

        setSaving(false);
        return;
      }

      manualPoints += grade;

      const { error } =
        await supabase
          .from("quiz_attempt_answers")
          .update({
            points_earned: grade,
            feedback:
              essayFeedback[
                answer.id
              ] || null,
            is_correct:
              grade >=
              Number(question.points),
            updated_at:
              new Date().toISOString(),
          })
          .eq("id", answer.id);

      if (error) {
        setError(error.message);
        setSaving(false);
        return;
      }
    }

    /*
      Recalculate the entire attempt after
      manual grading.
    */

    const { data: updatedAnswers } =
      await supabase
        .from("quiz_attempt_answers")
        .select("points_earned")
        .eq(
          "attempt_id",
          selectedAttempt.id
        );

    const totalEarned = (
      updatedAnswers || []
    ).reduce(
      (sum, answer) =>
        sum +
        Number(
          answer.points_earned || 0
        ),
      0
    );

    const pointsPossible =
      Number(
        selectedAttempt.points_possible
      );

    const score =
      pointsPossible > 0
        ? Number(
            (
              (totalEarned /
                pointsPossible) *
              100
            ).toFixed(2)
          )
        : 0;

    const { error: attemptError } =
      await supabase
        .from("quiz_attempts")
        .update({
          points_earned:
            totalEarned,
          score,
          status: "graded",
          updated_at:
            new Date().toISOString(),
        })
        .eq(
          "id",
          selectedAttempt.id
        );

    if (attemptError) {
      setError(
        attemptError.message
      );
      setSaving(false);
      return;
    }

    setSelectedAttempt({
      ...selectedAttempt,
      points_earned:
        totalEarned,
      score,
      status: "graded",
    });

    setAttempts((current) =>
      current.map((attempt) =>
        attempt.id ===
        selectedAttempt.id
          ? {
              ...attempt,
              points_earned:
                totalEarned,
              score,
              status: "graded",
            }
          : attempt
      )
    );

    await openAttempt({
      ...selectedAttempt,
      points_earned:
        totalEarned,
      score,
      status: "graded",
    });

    setMessage(
      "Manual grading saved and final score updated."
    );

    setSaving(false);
  }

  const filteredAttempts = useMemo(() => {
    return attempts.filter(
      (attempt) => {
        const student =
          getStudent(
            attempt.student_id
          );

        const searchText =
          search
            .toLowerCase()
            .trim();

        const matchesSearch =
          !searchText ||
          student?.full_name
            ?.toLowerCase()
            .includes(searchText) ||
          student?.email
            ?.toLowerCase()
            .includes(searchText) ||
          attempt.student_id
            .toLowerCase()
            .includes(searchText);

        const matchesStatus =
          statusFilter === "all" ||
          attempt.status ===
            statusFilter;

        return (
          matchesSearch &&
          matchesStatus
        );
      }
    );
  }, [
    attempts,
    profiles,
    search,
    statusFilter,
  ]);

  const selectedQuiz =
    quizzes.find(
      (quiz) =>
        quiz.id ===
        selectedQuizId
    );

  const statistics = useMemo(() => {
    const graded =
      attempts.filter(
        (attempt) =>
          attempt.status ===
          "graded"
      );

    const submitted =
      attempts.filter(
        (attempt) =>
          attempt.status ===
            "submitted" ||
          attempt.status ===
            "graded"
      );

    const average =
      graded.length
        ? graded.reduce(
            (sum, attempt) =>
              sum +
              Number(
                attempt.score || 0
              ),
            0
          ) / graded.length
        : 0;

    return {
      total: attempts.length,
      graded: graded.length,
      submitted: submitted.length,
      average: average.toFixed(1),
    };
  }, [attempts]);

  if (loading) {
    return (
      <main className="min-h-screen bg-white p-8 text-black">
        Loading quiz attempts...
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-white p-6 text-black">
      <div className="mx-auto max-w-7xl space-y-6">

        <section>
          <h1 className="text-3xl font-bold">
            Quiz Attempts
          </h1>

          <p className="mt-1 text-gray-600">
            Review submissions and manually grade
            essay questions.
          </p>
        </section>

        {message && (
          <div className="rounded-lg border border-green-300 bg-green-50 p-4 text-green-800">
            {message}
          </div>
        )}

        {error && (
          <div className="rounded-lg border border-red-300 bg-red-50 p-4 text-red-800">
            {error}
          </div>
        )}

        {/* QUIZ SELECTOR */}
        <section className="rounded-xl border bg-gray-50 p-5">
          <label className="mb-2 block text-sm font-semibold">
            Select quiz
          </label>

          <select
            value={
              selectedQuizId ?? ""
            }
            onChange={(event) => {
              const id = event.target
                .value
                ? Number(
                    event.target.value
                  )
                : null;

              if (id) {
                loadAttempts(id);
              }
            }}
            className="w-full rounded-lg border bg-white px-4 py-3"
          >
            <option value="">
              Select a quiz
            </option>

            {quizzes.map((quiz) => (
              <option
                key={quiz.id}
                value={quiz.id}
              >
                {quiz.title}
              </option>
            ))}
          </select>
        </section>

        {selectedQuizId && (
          <>
            {/* STATISTICS */}
            <section className="grid gap-4 md:grid-cols-4">

              <StatCard
                label="Attempts"
                value={statistics.total.toString()}
              />

              <StatCard
                label="Submitted"
                value={statistics.submitted.toString()}
              />

              <StatCard
                label="Graded"
                value={statistics.graded.toString()}
              />

              <StatCard
                label="Average"
                value={`${statistics.average}%`}
              />

            </section>

            {/* ATTEMPT LIST */}
            <section className="rounded-xl border p-6">

              <div className="flex flex-col gap-3 md:flex-row">
                <input
                  value={search}
                  onChange={(e) =>
                    setSearch(
                      e.target.value
                    )
                  }
                  placeholder="Search student..."
                  className="flex-1 rounded-lg border px-4 py-3"
                />

                <select
                  value={
                    statusFilter
                  }
                  onChange={(e) =>
                    setStatusFilter(
                      e.target.value
                    )
                  }
                  className="rounded-lg border px-4 py-3"
                >
                  <option value="all">
                    All statuses
                  </option>

                  <option value="in_progress">
                    In progress
                  </option>

                  <option value="submitted">
                    Needs grading
                  </option>

                  <option value="graded">
                    Graded
                  </option>

                  <option value="expired">
                    Expired
                  </option>
                </select>
              </div>

              <div className="mt-5 overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="px-3 py-3">
                        Student
                      </th>

                      <th className="px-3 py-3">
                        Attempt
                      </th>

                      <th className="px-3 py-3">
                        Submitted
                      </th>

                      <th className="px-3 py-3">
                        Score
                      </th>

                      <th className="px-3 py-3">
                        Status
                      </th>

                      <th className="px-3 py-3">
                        Action
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {filteredAttempts.map(
                      (attempt) => {
                        const student =
                          getStudent(
                            attempt.student_id
                          );

                        return (
                          <tr
                            key={attempt.id}
                            className="border-b last:border-0"
                          >
                            <td className="px-3 py-4">
                              <div className="font-semibold">
                                {student?.full_name ||
                                  "Unknown student"}
                              </div>

                              <div className="text-xs text-gray-500">
                                {student?.email ||
                                  attempt.student_id}
                              </div>
                            </td>

                            <td className="px-3 py-4">
                              #
                              {
                                attempt.attempt_number
                              }
                            </td>

                            <td className="px-3 py-4">
                              {attempt.submitted_at
                                ? new Date(
                                    attempt.submitted_at
                                  ).toLocaleString()
                                : "—"}
                            </td>

                            <td className="px-3 py-4 font-semibold">
                              {attempt.score !==
                              null
                                ? `${attempt.score}%`
                                : "—"}
                            </td>

                            <td className="px-3 py-4">
                              <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold capitalize">
                                {attempt.status.replace(
                                  "_",
                                  " "
                                )}
                              </span>
                            </td>

                            <td className="px-3 py-4">
                              <button
                                onClick={() =>
                                  openAttempt(
                                    attempt
                                  )
                                }
                                className="rounded-lg bg-black px-4 py-2 font-semibold text-white"
                              >
                                Review
                              </button>
                            </td>
                          </tr>
                        );
                      }
                    )}
                  </tbody>
                </table>
              </div>

              {filteredAttempts.length ===
                0 && (
                <div className="py-10 text-center text-gray-500">
                  No attempts match the current
                  filters.
                </div>
              )}
            </section>
          </>
        )}

        {/* REVIEW PANEL */}
        {selectedAttempt && (
          <section className="rounded-xl border p-6">

            <div className="flex flex-col gap-4 border-b pb-5 md:flex-row md:items-start md:justify-between">

              <div>
                <div className="text-sm text-gray-500">
                  Reviewing
                </div>

                <h2 className="text-2xl font-bold">
                  {getStudent(
                    selectedAttempt.student_id
                  )?.full_name ||
                    "Student"}
                </h2>

                <p className="mt-1 text-sm text-gray-500">
                  {selectedQuiz?.title}
                  {" • "}
                  Attempt #
                  {
                    selectedAttempt.attempt_number
                  }
                </p>
              </div>

              <div className="rounded-xl bg-gray-100 p-4 text-center">
                <div className="text-xs text-gray-500">
                  Current score
                </div>

                <div className="text-2xl font-bold">
                  {selectedAttempt.score ??
                    0}
                  %
                </div>
              </div>
            </div>

            {loadingAttempt ? (
              <div className="py-10 text-center text-gray-500">
                Loading attempt...
              </div>
            ) : (
              <div className="mt-6 space-y-5">

                {questions.map(
                  (question, index) => {
                    const details =
                      questionDetails.find(
                        (item) =>
                          item.id ===
                          question.question_bank_question_id
                      );

                    const answer =
                      getAnswer(
                        question.id
                      );

                    if (!details) {
                      return null;
                    }

                    const isEssay =
                      details.question_type ===
                      "essay";

                    return (
                      <div
                        key={question.id}
                        className="rounded-xl border p-5"
                      >

                        <div className="flex items-start justify-between gap-4">

                          <div className="flex gap-3">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-black text-sm font-bold text-white">
                              {index + 1}
                            </div>

                            <div>
                              <div className="mb-1 text-xs font-semibold uppercase text-gray-500">
                                {details.question_type.replace(
                                  "_",
                                  " "
                                )}
                              </div>

                              <div className="font-semibold">
                                {
                                  details.question_text
                                }
                              </div>
                            </div>
                          </div>

                          <div className="shrink-0 text-sm font-semibold">
                            {question.points} pts
                          </div>

                        </div>

                        <div className="mt-5 rounded-lg bg-gray-50 p-4">

                          <div className="mb-1 text-xs font-semibold uppercase text-gray-500">
                            Student answer
                          </div>

                          <div className="whitespace-pre-wrap">
                            {answer
                              ? formatAnswer(
                                  answer.answer
                                )
                              : "No answer"}
                          </div>

                        </div>

                        {!isEssay && (
                          <div className="mt-4 flex items-center gap-3 text-sm">

                            <span
                              className={`rounded-full px-3 py-1 font-semibold ${
                                answer?.is_correct
                                  ? "bg-green-100 text-green-800"
                                  : "bg-red-100 text-red-800"
                              }`}
                            >
                              {answer?.is_correct
                                ? "Correct"
                                : "Incorrect"}
                            </span>

                            <span className="text-gray-500">
                              {answer?.points_earned ??
                                0}{" "}
                              /{" "}
                              {question.points}{" "}
                              points
                            </span>

                          </div>
                        )}

                        {isEssay && answer && (
                          <div className="mt-5 rounded-xl border border-yellow-200 bg-yellow-50 p-4">

                            <h3 className="font-semibold">
                              Manual grading
                            </h3>

                            <div className="mt-4 grid gap-4 md:grid-cols-3">

                              <div>
                                <label className="mb-1 block text-sm font-medium">
                                  Points awarded
                                </label>

                                <input
                                  type="number"
                                  min="0"
                                  max={question.points}
                                  step="0.01"
                                  value={
                                    essayGrades[
                                      answer.id
                                    ] ??
                                    ""
                                  }
                                  onChange={(e) =>
                                    setEssayGrades(
                                      (
                                        current
                                      ) => ({
                                        ...current,
                                        [answer.id]:
                                          e.target
                                            .value,
                                      })
                                    )
                                  }
                                  className="w-full rounded-lg border bg-white px-4 py-3"
                                />
                              </div>

                              <div className="md:col-span-2">
                                <label className="mb-1 block text-sm font-medium">
                                  Feedback
                                </label>

                                <textarea
                                  value={
                                    essayFeedback[
                                      answer.id
                                    ] ??
                                    ""
                                  }
                                  onChange={(e) =>
                                    setEssayFeedback(
                                      (
                                        current
                                      ) => ({
                                        ...current,
                                        [answer.id]:
                                          e.target
                                            .value,
                                      })
                                    )
                                  }
                                  rows={3}
                                  placeholder="Give feedback to the student..."
                                  className="w-full rounded-lg border bg-white px-4 py-3"
                                />
                              </div>

                            </div>

                          </div>
                        )}

                      </div>
                    );
                  }
                )}

              </div>
            )}

            {!loadingAttempt && (
              <div className="mt-8 flex flex-wrap justify-end gap-3 border-t pt-5">

                <button
                  onClick={() =>
                    setSelectedAttempt(
                      null
                    )
                  }
                  className="rounded-lg border px-5 py-3 font-semibold"
                >
                  Close
                </button>

                <button
                  onClick={
                    saveManualGrades
                  }
                  disabled={saving}
                  className="rounded-lg bg-black px-6 py-3 font-semibold text-white disabled:opacity-50"
                >
                  {saving
                    ? "Saving..."
                    : "Save Grades"}
                </button>

              </div>
            )}

          </section>
        )}

      </div>
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
    <div className="rounded-xl border bg-gray-50 p-5">
      <div className="text-sm text-gray-500">
        {label}
      </div>

      <div className="mt-1 text-2xl font-bold">
        {value}
      </div>
    </div>
  );
}