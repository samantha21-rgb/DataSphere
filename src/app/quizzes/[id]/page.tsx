"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

type Quiz = {
  id: number;
  unit_id: number;
  title: string;
  description: string | null;
  instructions: string | null;
  time_limit_minutes: number | null;
  max_attempts: number | null;
  available_from: string | null;
  available_until: string | null;
  due_date: string | null;
  points_possible: number;
  shuffle_questions: boolean;
  shuffle_answers: boolean;
  show_results: boolean;
  published: boolean;
};

type QuizQuestion = {
  id: number;
  quiz_id: number;
  question_bank_question_id: number;
  position: number;
  points: number;
  required: boolean;
};

type Question = {
  id: number;
  question_type:
    | "multiple_choice"
    | "true_false"
    | "short_answer"
    | "essay"
    | "numerical";
  question_text: string;
  explanation: string | null;
  points: number;
  options: {
    id: string;
    text: string;
  }[];
};

type DisplayQuestion = QuizQuestion & {
  question: Question;
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

type Result = {
  attempt_id: number;
  status: string;
  points_earned: number;
  points_possible: number;
  score: number;
};

type AnswerValue = string | boolean | number | null;

type SavedAnswers = Record<number, AnswerValue>;

export default function QuizPage() {
  const params = useParams();
  const router = useRouter();

  const quizId = Number(params.id);

  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [questions, setQuestions] = useState<DisplayQuestion[]>([]);
  const [attempt, setAttempt] = useState<Attempt | null>(null);

  const [answers, setAnswers] =
    useState<SavedAnswers>({});

  const [currentIndex, setCurrentIndex] = useState(0);

  const [secondsRemaining, setSecondsRemaining] =
    useState<number | null>(null);

  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [started, setStarted] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const [result, setResult] =
    useState<Result | null>(null);

  const [error, setError] = useState("");

  const [showSubmitConfirm, setShowSubmitConfirm] =
    useState(false);

  const [warning, setWarning] = useState("");

  const currentQuestion =
    questions[currentIndex] || null;

  /*
    -------------------------------------------------------
    INITIAL LOAD
    -------------------------------------------------------
  */

  useEffect(() => {
    if (!quizId || Number.isNaN(quizId)) {
      return;
    }

    loadQuiz();
  }, [quizId]);

  async function loadQuiz() {
    setLoading(true);
    setError("");

    const { data: quizData, error: quizError } =
      await supabase
        .from("quizzes")
        .select("*")
        .eq("id", quizId)
        .eq("published", true)
        .single();

    if (quizError || !quizData) {
      setError(
        quizError?.message ||
          "This quiz could not be found."
      );

      setLoading(false);
      return;
    }

    setQuiz(quizData as Quiz);

    const { data: quizQuestionRows, error: questionError } =
      await supabase
        .from("quiz_questions")
        .select("*")
        .eq("quiz_id", quizId)
        .order("position", {
          ascending: true,
        });

    if (questionError) {
      setError(questionError.message);
      setLoading(false);
      return;
    }

    if (!quizQuestionRows?.length) {
      setQuestions([]);
      setLoading(false);
      return;
    }

    const questionIds =
      quizQuestionRows.map(
        (row) =>
          row.question_bank_question_id
      );

    const { data: questionRows, error: questionsError } =
      await supabase
        .from("question_bank_questions")
        .select("*")
        .in("id", questionIds);

    if (questionsError) {
      setError(questionsError.message);
      setLoading(false);
      return;
    }

    const questionMap = new Map(
      (questionRows || []).map(
        (question) => [question.id, question]
      )
    );

    let displayQuestions: DisplayQuestion[] =
      quizQuestionRows
        .map((quizQuestion) => {
          const question = questionMap.get(
            quizQuestion.question_bank_question_id
          );

          if (!question) {
            return null;
          }

          return {
            ...quizQuestion,
            question,
          };
        })
        .filter(Boolean) as DisplayQuestion[];

    if (quizData.shuffle_questions) {
      displayQuestions =
        shuffleArray(displayQuestions);
    }

    if (quizData.shuffle_answers) {
      displayQuestions =
        displayQuestions.map((item) => ({
          ...item,
          question: {
            ...item.question,
            options:
              item.question.options
                ? shuffleArray(
                    item.question.options
                  )
                : [],
          },
        }));
    }

    setQuestions(displayQuestions);

    /*
      Look for an unfinished attempt first.
      This allows the student to leave and return.
    */

    const {
      data: existingAttempts,
      error: attemptError,
    } = await supabase
      .from("quiz_attempts")
      .select("*")
      .eq("quiz_id", quizId)
      .eq("status", "in_progress")
      .order("started_at", {
        ascending: false,
      })
      .limit(1);

    if (attemptError) {
      setError(attemptError.message);
      setLoading(false);
      return;
    }

    if (existingAttempts?.length) {
      const existing =
        existingAttempts[0] as Attempt;

      setAttempt(existing);
      setStarted(true);

      restoreAnswers(quizId, existing.id);

      calculateRemainingTime(
        quizData as Quiz,
        existing
      );
    }

    setLoading(false);
  }

  /*
    -------------------------------------------------------
    LOCAL ANSWER STORAGE
    -------------------------------------------------------
  */

  function storageKey(
    quizIdValue: number,
    attemptId: number
  ) {
    return `datasphere-quiz-${quizIdValue}-attempt-${attemptId}`;
  }

  function restoreAnswers(
    quizIdValue: number,
    attemptId: number
  ) {
    try {
      const raw = localStorage.getItem(
        storageKey(
          quizIdValue,
          attemptId
        )
      );

      if (!raw) {
        return;
      }

      const parsed = JSON.parse(raw);

      if (parsed && typeof parsed === "object") {
        setAnswers(parsed);
      }
    } catch {
      // Ignore malformed local data.
    }
  }

  function saveAnswers(
    nextAnswers: SavedAnswers
  ) {
    if (!quizId || !attempt) {
      return;
    }

    try {
      localStorage.setItem(
        storageKey(
          quizId,
          attempt.id
        ),
        JSON.stringify(nextAnswers)
      );
    } catch {
      // Local storage may be unavailable.
    }
  }

  /*
    -------------------------------------------------------
    TIMER
    -------------------------------------------------------
  */

  function calculateRemainingTime(
    quizData: Quiz,
    attemptData: Attempt
  ) {
    const startedAt =
      new Date(
        attemptData.started_at
      ).getTime();

    const possibleDeadlines: number[] = [];

    if (quizData.time_limit_minutes) {
      possibleDeadlines.push(
        startedAt +
          quizData.time_limit_minutes *
            60 *
            1000
      );
    }

    if (quizData.available_until) {
      possibleDeadlines.push(
        new Date(
          quizData.available_until
        ).getTime()
      );
    }

    if (!possibleDeadlines.length) {
      setSecondsRemaining(null);
      return;
    }

    const deadline = Math.min(
      ...possibleDeadlines
    );

    const remaining = Math.max(
      0,
      Math.floor(
        (deadline - Date.now()) /
          1000
      )
    );

    setSecondsRemaining(remaining);
  }

  useEffect(() => {
    if (!started || submitted) {
      return;
    }

    if (secondsRemaining === null) {
      return;
    }

    if (secondsRemaining <= 0) {
      submitQuiz(true);
      return;
    }

    const timer = window.setInterval(() => {
      setSecondsRemaining(
        (current) => {
          if (
            current === null ||
            current <= 1
          ) {
            return 0;
          }

          return current - 1;
        }
      );
    }, 1000);

    return () => {
      window.clearInterval(timer);
    };
  }, [
    started,
    submitted,
    secondsRemaining,
  ]);

  useEffect(() => {
    if (
      secondsRemaining !== null &&
      secondsRemaining === 60
    ) {
      setWarning(
        "One minute remaining."
      );
    }

    if (
      secondsRemaining !== null &&
      secondsRemaining === 300
    ) {
      setWarning(
        "Five minutes remaining."
      );
    }
  }, [secondsRemaining]);

  /*
    -------------------------------------------------------
    START QUIZ
    -------------------------------------------------------
  */

  async function startQuiz() {
    if (!quiz) {
      return;
    }

    setStarting(true);
    setError("");

    const { data, error } =
      await supabase.rpc(
        "start_quiz_attempt",
        {
          p_quiz_id: quiz.id,
        }
      );

    if (error) {
      setError(error.message);
      setStarting(false);
      return;
    }

    const attemptId =
      data?.attempt_id;

    if (!attemptId) {
      setError(
        "The quiz attempt could not be created."
      );

      setStarting(false);
      return;
    }

    const {
      data: attemptData,
      error: attemptLoadError,
    } = await supabase
      .from("quiz_attempts")
      .select("*")
      .eq("id", attemptId)
      .single();

    if (attemptLoadError) {
      setError(
        attemptLoadError.message
      );
      setStarting(false);
      return;
    }

    setAttempt(
      attemptData as Attempt
    );

    setStarted(true);

    calculateRemainingTime(
      quiz,
      attemptData as Attempt
    );

    setStarting(false);
  }

  /*
    -------------------------------------------------------
    ANSWERS
    -------------------------------------------------------
  */

  function setAnswer(
    questionId: number,
    value: AnswerValue
  ) {
    setAnswers((current) => {
      const next = {
        ...current,
        [questionId]: value,
      };

      saveAnswers(next);

      return next;
    });
  }

  function answerForQuestion(
    questionId: number
  ) {
    return answers[questionId];
  }

  /*
    -------------------------------------------------------
    SUBMISSION
    -------------------------------------------------------
  */

  const submitQuiz = useCallback(
    async (automatic = false) => {
      if (!attempt || submitting || submitted) {
        return;
      }

      setSubmitting(true);
      setError("");
      setWarning("");

      const answerPayload =
        questions.map((item) => ({
          quiz_question_id: item.id,
          answer:
            answers[item.id] ??
            null,
        }));

      const { data, error } =
        await supabase.rpc(
          "submit_quiz_attempt",
          {
            p_attempt_id: attempt.id,
            p_answers:
              answerPayload,
          }
        );

      if (error) {
        setError(error.message);
        setSubmitting(false);
        return;
      }

      const submissionResult =
        data as Result;

      setResult(
        submissionResult
      );

      setSubmitted(true);
      setStarted(false);

      try {
        localStorage.removeItem(
          storageKey(
            quizId,
            attempt.id
          )
        );
      } catch {}

      if (automatic) {
        setWarning(
          "The time limit was reached. Your quiz was submitted automatically."
        );
      }

      setSubmitting(false);
    },
    [
      attempt,
      submitting,
      submitted,
      questions,
      answers,
      quizId,
    ]
  );

  /*
    -------------------------------------------------------
    KEYBOARD / BROWSER LEAVE WARNING
    -------------------------------------------------------
  */

  useEffect(() => {
    if (!started || submitted) {
      return;
    }

    const handler = (
      event: BeforeUnloadEvent
    ) => {
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener(
      "beforeunload",
      handler
    );

    return () => {
      window.removeEventListener(
        "beforeunload",
        handler
      );
    };
  }, [started, submitted]);

  /*
    -------------------------------------------------------
    NAVIGATION
    -------------------------------------------------------
  */

  function nextQuestion() {
    if (
      currentIndex <
      questions.length - 1
    ) {
      setCurrentIndex(
        (current) => current + 1
      );
    }
  }

  function previousQuestion() {
    if (currentIndex > 0) {
      setCurrentIndex(
        (current) => current - 1
      );
    }
  }

  /*
    -------------------------------------------------------
    FORMATTERS
    -------------------------------------------------------
  */

  function formatTime(
    totalSeconds: number | null
  ) {
    if (totalSeconds === null) {
      return "No time limit";
    }

    const hours = Math.floor(
      totalSeconds / 3600
    );

    const minutes = Math.floor(
      (totalSeconds % 3600) / 60
    );

    const seconds =
      totalSeconds % 60;

    if (hours > 0) {
      return `${String(hours).padStart(
        2,
        "0"
      )}:${String(minutes).padStart(
        2,
        "0"
      )}:${String(seconds).padStart(
        2,
        "0"
      )}`;
    }

    return `${String(minutes).padStart(
      2,
      "0"
    )}:${String(seconds).padStart(
      2,
      "0"
    )}`;
  }

  function shuffleArray<T>(
    items: T[]
  ): T[] {
    const array = [...items];

    for (
      let i = array.length - 1;
      i > 0;
      i--
    ) {
      const j = Math.floor(
        Math.random() * (i + 1)
      );

      [array[i], array[j]] = [
        array[j],
        array[i],
      ];
    }

    return array;
  }

  function answeredCount() {
    return questions.filter(
      (question) =>
        answers[question.id] !==
          undefined &&
        answers[question.id] !== null &&
        answers[question.id] !== ""
    ).length;
  }

  /*
    -------------------------------------------------------
    LOADING
    -------------------------------------------------------
  */

  if (loading) {
    return (
      <main className="min-h-screen bg-white p-8 text-black">
        Loading quiz...
      </main>
    );
  }

  /*
    -------------------------------------------------------
    ERROR
    -------------------------------------------------------
  */

  if (!quiz) {
    return (
      <main className="min-h-screen bg-white p-8 text-black">
        <div className="mx-auto max-w-2xl">
          <div className="rounded-xl border border-red-200 bg-red-50 p-6">
            <h1 className="text-xl font-bold">
              Quiz unavailable
            </h1>

            <p className="mt-2 text-red-700">
              {error ||
                "This quiz could not be loaded."}
            </p>

            <button
              onClick={() =>
                router.back()
              }
              className="mt-5 rounded-lg bg-black px-5 py-3 text-white"
            >
              Go Back
            </button>
          </div>
        </div>
      </main>
    );
  }

  /*
    -------------------------------------------------------
    RESULT SCREEN
    -------------------------------------------------------
  */

  if (submitted && result) {
    const percentage =
      result.score ?? 0;

    return (
      <main className="min-h-screen bg-gray-50 p-6 text-black">
        <div className="mx-auto max-w-3xl">

          <div className="rounded-2xl border bg-white p-8 text-center">

            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-black text-2xl font-bold text-white">
              ✓
            </div>

            <h1 className="mt-5 text-3xl font-bold">
              Quiz Submitted
            </h1>

            <p className="mt-2 text-gray-600">
              {quiz.title}
            </p>

            <div className="mt-8 grid gap-4 md:grid-cols-3">

              <div className="rounded-xl bg-gray-50 p-5">
                <div className="text-sm text-gray-500">
                  Score
                </div>

                <div className="mt-1 text-3xl font-bold">
                  {percentage}%
                </div>
              </div>

              <div className="rounded-xl bg-gray-50 p-5">
                <div className="text-sm text-gray-500">
                  Points
                </div>

                <div className="mt-1 text-3xl font-bold">
                  {result.points_earned}
                  {" / "}
                  {result.points_possible}
                </div>
              </div>

              <div className="rounded-xl bg-gray-50 p-5">
                <div className="text-sm text-gray-500">
                  Status
                </div>

                <div className="mt-2 font-bold capitalize">
                  {result.status.replace(
                    "_",
                    " "
                  )}
                </div>
              </div>
            </div>

            {result.status ===
              "submitted" && (
              <div className="mt-6 rounded-lg border border-yellow-300 bg-yellow-50 p-4 text-left text-yellow-900">
                This quiz contains questions that
                require manual grading. Your final
                result may change after grading.
              </div>
            )}

            {warning && (
              <div className="mt-6 rounded-lg border border-blue-200 bg-blue-50 p-4 text-left text-blue-800">
                {warning}
              </div>
            )}

            {quiz.show_results && (
              <div className="mt-6 text-left">
                <h2 className="font-semibold">
                  Submission summary
                </h2>

                <p className="mt-2 text-sm text-gray-600">
                  You answered{" "}
                  {answeredCount()} of{" "}
                  {questions.length} questions.
                </p>
              </div>
            )}

            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <button
                onClick={() =>
                  router.push("/dashboard")
                }
                className="rounded-lg bg-black px-6 py-3 font-semibold text-white"
              >
                Back to Dashboard
              </button>

              <button
                onClick={() =>
                  router.push(
                    `/units/${quiz.unit_id}`
                  )
                }
                className="rounded-lg border px-6 py-3 font-semibold"
              >
                Back to Unit
              </button>
            </div>
          </div>
        </div>
      </main>
    );
  }

  /*
    -------------------------------------------------------
    START / INSTRUCTIONS SCREEN
    -------------------------------------------------------
  */

  if (!started || !attempt) {
    return (
      <main className="min-h-screen bg-gray-50 p-6 text-black">
        <div className="mx-auto max-w-3xl">

          <button
            onClick={() =>
              router.back()
            }
            className="mb-5 text-sm font-medium text-gray-600"
          >
            ← Back
          </button>

          <div className="rounded-2xl border bg-white p-8">

            <div className="flex flex-wrap items-start justify-between gap-5">
              <div>
                <div className="text-sm font-semibold uppercase text-gray-500">
                  Online Quiz
                </div>

                <h1 className="mt-1 text-3xl font-bold">
                  {quiz.title}
                </h1>
              </div>

              <div className="rounded-xl bg-gray-100 px-5 py-3 text-center">
                <div className="text-xs text-gray-500">
                  Points
                </div>

                <div className="font-bold">
                  {quiz.points_possible}
                </div>
              </div>
            </div>

            {quiz.description && (
              <div className="mt-6">
                <h2 className="font-semibold">
                  Description
                </h2>

                <p className="mt-2 whitespace-pre-wrap text-gray-600">
                  {quiz.description}
                </p>
              </div>
            )}

            {quiz.instructions && (
              <div className="mt-6 rounded-xl bg-gray-50 p-5">
                <h2 className="font-semibold">
                  Instructions
                </h2>

                <p className="mt-2 whitespace-pre-wrap text-gray-700">
                  {quiz.instructions}
                </p>
              </div>
            )}

            <div className="mt-6 grid gap-3 md:grid-cols-4">

              <InfoBox
                label="Questions"
                value={questions.length.toString()}
              />

              <InfoBox
                label="Time limit"
                value={
                  quiz.time_limit_minutes
                    ? `${quiz.time_limit_minutes} min`
                    : "None"
                }
              />

              <InfoBox
                label="Attempts"
                value={
                  quiz.max_attempts
                    ? quiz.max_attempts.toString()
                    : "Unlimited"
                }
              />

              <InfoBox
                label="Points"
                value={quiz.points_possible.toString()}
              />
            </div>

            {quiz.available_from &&
              new Date(
                quiz.available_from
              ) > new Date() && (
                <div className="mt-6 rounded-lg border border-yellow-300 bg-yellow-50 p-4 text-yellow-900">
                  This quiz is not available yet.
                  <div className="mt-1 text-sm">
                    Opens{" "}
                    {new Date(
                      quiz.available_from
                    ).toLocaleString()}
                  </div>
                </div>
              )}

            {quiz.available_until &&
              new Date(
                quiz.available_until
              ) < new Date() && (
                <div className="mt-6 rounded-lg border border-red-300 bg-red-50 p-4 text-red-800">
                  This quiz is no longer available.
                </div>
              )}

            {error && (
              <div className="mt-6 rounded-lg border border-red-300 bg-red-50 p-4 text-red-800">
                {error}
              </div>
            )}

            <div className="mt-8 rounded-xl border border-yellow-200 bg-yellow-50 p-5">
              <h3 className="font-semibold">
                Before you start
              </h3>

              <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-yellow-900">
                <li>
                  Make sure you have enough time to
                  complete the quiz.
                </li>

                {quiz.time_limit_minutes && (
                  <li>
                    You have{" "}
                    <strong>
                      {quiz.time_limit_minutes}
                      minutes
                    </strong>{" "}
                    once you begin.
                  </li>
                )}

                <li>
                  The timer continues while you are
                  navigating between questions.
                </li>

                <li>
                  The quiz will be submitted
                  automatically when the time expires.
                </li>

                <li>
                  Do not close the browser unless you
                  intend to leave the attempt.
                </li>
              </ul>
            </div>

            <button
              onClick={startQuiz}
              disabled={
                starting ||
                (quiz.available_from
                  ? new Date(
                      quiz.available_from
                    ) > new Date()
                  : false) ||
                (quiz.available_until
                  ? new Date(
                      quiz.available_until
                    ) < new Date()
                  : false)
              }
              className="mt-8 w-full rounded-xl bg-black px-6 py-4 text-lg font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              {starting
                ? "Starting..."
                : "Start Quiz"}
            </button>
          </div>
        </div>
      </main>
    );
  }

  /*
    -------------------------------------------------------
    ACTIVE QUIZ
    -------------------------------------------------------
  */

  if (!currentQuestion) {
    return (
      <main className="min-h-screen bg-white p-8 text-black">
        No questions are available in this quiz.
      </main>
    );
  }

  const currentAnswer =
    answerForQuestion(
      currentQuestion.id
    );

  return (
    <main className="min-h-screen bg-gray-50 text-black">

      {/* TOP BAR */}
      <header className="sticky top-0 z-20 border-b bg-white shadow-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-4">

          <div className="min-w-0">
            <div className="text-xs font-semibold uppercase text-gray-500">
              Quiz
            </div>

            <h1 className="truncate font-bold">
              {quiz.title}
            </h1>
          </div>

          <div
            className={`shrink-0 rounded-xl px-5 py-3 text-center font-mono font-bold ${
              secondsRemaining !== null &&
              secondsRemaining <= 60
                ? "bg-red-100 text-red-700"
                : secondsRemaining !== null &&
                  secondsRemaining <= 300
                ? "bg-yellow-100 text-yellow-800"
                : "bg-gray-100"
            }`}
          >
            <div className="text-xs font-sans font-normal">
              Time remaining
            </div>

            {formatTime(
              secondsRemaining
            )}
          </div>
        </div>
      </header>

      {warning && (
        <div className="mx-auto max-w-7xl px-5 pt-4">
          <div className="rounded-lg border border-yellow-300 bg-yellow-50 p-3 text-sm text-yellow-900">
            {warning}
          </div>
        </div>
      )}

      <div className="mx-auto grid max-w-7xl gap-6 p-5 lg:grid-cols-[1fr_280px]">

        {/* QUESTION */}
        <section className="rounded-2xl border bg-white p-6">

          <div className="flex items-center justify-between">
            <div className="text-sm font-semibold text-gray-500">
              Question {currentIndex + 1} of{" "}
              {questions.length}
            </div>

            <div className="text-sm text-gray-500">
              {currentQuestion.points} point
              {currentQuestion.points === 1
                ? ""
                : "s"}
            </div>
          </div>

          <div className="mt-7">
            <h2 className="text-xl font-semibold leading-relaxed">
              {currentQuestion.question.question_text}
            </h2>
          </div>

          {/* MULTIPLE CHOICE */}
          {currentQuestion.question.question_type ===
            "multiple_choice" && (
            <div className="mt-7 space-y-3">
              {currentQuestion.question.options.map(
                (option) => (
                  <label
                    key={option.id}
                    className={`flex cursor-pointer items-start gap-4 rounded-xl border p-4 transition ${
                      currentAnswer === option.id
                        ? "border-black bg-gray-50"
                        : "hover:bg-gray-50"
                    }`}
                  >
                    <input
                      type="radio"
                      name={`question-${currentQuestion.id}`}
                      checked={
                        currentAnswer ===
                        option.id
                      }
                      onChange={() =>
                        setAnswer(
                          currentQuestion.id,
                          option.id
                        )
                      }
                      className="mt-1"
                    />

                    <div>
                      <div className="font-semibold">
                        {option.id.toUpperCase()}.
                      </div>

                      <div className="mt-1 text-gray-700">
                        {option.text}
                      </div>
                    </div>
                  </label>
                )
              )}
            </div>
          )}

          {/* TRUE FALSE */}
          {currentQuestion.question.question_type ===
            "true_false" && (
            <div className="mt-7 grid gap-3 md:grid-cols-2">
              {[
                {
                  value: true,
                  label: "True",
                },
                {
                  value: false,
                  label: "False",
                },
              ].map((option) => (
                <label
                  key={option.label}
                  className={`flex cursor-pointer items-center gap-3 rounded-xl border p-5 ${
                    currentAnswer ===
                    option.value
                      ? "border-black bg-gray-50"
                      : ""
                  }`}
                >
                  <input
                    type="radio"
                    name={`question-${currentQuestion.id}`}
                    checked={
                      currentAnswer ===
                      option.value
                    }
                    onChange={() =>
                      setAnswer(
                        currentQuestion.id,
                        option.value
                      )
                    }
                  />

                  <span className="font-semibold">
                    {option.label}
                  </span>
                </label>
              ))}
            </div>
          )}

          {/* SHORT ANSWER */}
          {currentQuestion.question.question_type ===
            "short_answer" && (
            <div className="mt-7">
              <input
                type="text"
                value={
                  typeof currentAnswer ===
                  "string"
                    ? currentAnswer
                    : ""
                }
                onChange={(e) =>
                  setAnswer(
                    currentQuestion.id,
                    e.target.value
                  )
                }
                placeholder="Type your answer..."
                className="w-full rounded-xl border px-4 py-4 text-lg outline-none focus:border-black"
              />
            </div>
          )}

          {/* NUMERICAL */}
          {currentQuestion.question.question_type ===
            "numerical" && (
            <div className="mt-7">
              <input
                type="number"
                step="any"
                value={
                  currentAnswer !==
                    undefined &&
                  currentAnswer !== null
                    ? String(
                        currentAnswer
                      )
                    : ""
                }
                onChange={(e) =>
                  setAnswer(
                    currentQuestion.id,
                    e.target.value === ""
                      ? null
                      : Number(
                          e.target.value
                        )
                  )
                }
                placeholder="Enter your numerical answer..."
                className="w-full rounded-xl border px-4 py-4 text-lg outline-none focus:border-black"
              />
            </div>
          )}

          {/* ESSAY */}
          {currentQuestion.question.question_type ===
            "essay" && (
            <div className="mt-7">
              <textarea
                value={
                  typeof currentAnswer ===
                  "string"
                    ? currentAnswer
                    : ""
                }
                onChange={(e) =>
                  setAnswer(
                    currentQuestion.id,
                    e.target.value
                  )
                }
                rows={10}
                placeholder="Write your answer..."
                className="w-full rounded-xl border px-4 py-4 leading-relaxed outline-none focus:border-black"
              />

              <p className="mt-2 text-xs text-gray-500">
                This question will require manual
                grading.
              </p>
            </div>
          )}

          {/* NAVIGATION */}
          <div className="mt-8 flex flex-wrap justify-between gap-3 border-t pt-5">

            <button
              onClick={previousQuestion}
              disabled={currentIndex === 0}
              className="rounded-lg border px-5 py-3 font-semibold disabled:opacity-30"
            >
              ← Previous
            </button>

            {currentIndex <
            questions.length - 1 ? (
              <button
                onClick={nextQuestion}
                className="rounded-lg bg-black px-6 py-3 font-semibold text-white"
              >
                Next →
              </button>
            ) : (
              <button
                onClick={() =>
                  setShowSubmitConfirm(true)
                }
                className="rounded-lg bg-black px-6 py-3 font-semibold text-white"
              >
                Submit Quiz
              </button>
            )}
          </div>
        </section>

        {/* QUESTION NAVIGATOR */}
        <aside className="h-fit rounded-2xl border bg-white p-5 lg:sticky lg:top-24">

          <div className="flex items-center justify-between">
            <h2 className="font-bold">
              Questions
            </h2>

            <span className="text-sm text-gray-500">
              {answeredCount()}/
              {questions.length}
            </span>
          </div>

          <div className="mt-4 grid grid-cols-5 gap-2">
            {questions.map(
              (question, index) => {
                const answered =
                  answers[
                    question.id
                  ] !== undefined &&
                  answers[
                    question.id
                  ] !== null &&
                  answers[
                    question.id
                  ] !== "";

                return (
                  <button
                    key={question.id}
                    onClick={() =>
                      setCurrentIndex(
                        index
                      )
                    }
                    className={`flex h-10 items-center justify-center rounded-lg border text-sm font-semibold ${
                      currentIndex ===
                      index
                        ? "border-black bg-black text-white"
                        : answered
                        ? "border-black bg-gray-100"
                        : "bg-white"
                    }`}
                  >
                    {index + 1}
                  </button>
                );
              }
            )}
          </div>

          <div className="mt-5 space-y-2 border-t pt-4 text-xs text-gray-500">
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded border bg-black" />
              Current
            </div>

            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded border bg-gray-100" />
              Answered
            </div>

            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded border bg-white" />
              Not answered
            </div>
          </div>

          <button
            onClick={() =>
              setShowSubmitConfirm(true)
            }
            className="mt-5 w-full rounded-lg border border-red-300 px-4 py-3 font-semibold text-red-700"
          >
            Submit Quiz
          </button>
        </aside>
      </div>

      {/* SUBMIT CONFIRMATION */}
      {showSubmitConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-5">
          <div className="w-full max-w-md rounded-2xl bg-white p-6">

            <h2 className="text-xl font-bold">
              Submit quiz?
            </h2>

            <p className="mt-3 text-gray-600">
              You have answered{" "}
              <strong>
                {answeredCount()}
              </strong>{" "}
              of{" "}
              <strong>
                {questions.length}
              </strong>{" "}
              questions.
            </p>

            {answeredCount() <
              questions.length && (
              <div className="mt-4 rounded-lg border border-yellow-300 bg-yellow-50 p-3 text-sm text-yellow-900">
                Some questions are unanswered.
                Unanswered questions will receive
                zero points.
              </div>
            )}

            <div className="mt-6 flex gap-3">
              <button
                onClick={() =>
                  setShowSubmitConfirm(false)
                }
                className="flex-1 rounded-lg border px-4 py-3 font-semibold"
              >
                Continue Quiz
              </button>

              <button
                onClick={() => {
                  setShowSubmitConfirm(
                    false
                  );

                  submitQuiz(false);
                }}
                disabled={submitting}
                className="flex-1 rounded-lg bg-black px-4 py-3 font-semibold text-white disabled:opacity-50"
              >
                {submitting
                  ? "Submitting..."
                  : "Submit"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
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
    <div className="rounded-xl border bg-gray-50 p-4">
      <div className="text-xs text-gray-500">
        {label}
      </div>

      <div className="mt-1 font-bold">
        {value}
      </div>
    </div>
  );
}