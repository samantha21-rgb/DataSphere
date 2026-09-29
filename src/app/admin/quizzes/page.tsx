"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabase";

type Unit = {
  id: number;
  code: string | null;
  name: string;
};

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

type QuestionBank = {
  id: number;
  unit_id: number | null;
  title: string;
  description: string | null;
};

type Question = {
  id: number;
  question_bank_id: number;
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

type QuestionKey = {
  question_id: number;
  correct_answer: unknown;
  tolerance: number | null;
};

const QUESTION_TYPES = [
  {
    value: "multiple_choice",
    label: "Multiple Choice",
  },
  {
    value: "true_false",
    label: "True / False",
  },
  {
    value: "short_answer",
    label: "Short Answer",
  },
  {
    value: "numerical",
    label: "Numerical",
  },
  {
    value: "essay",
    label: "Essay",
  },
] as const;

export default function AdminQuizzesPage() {
  const [units, setUnits] = useState<Unit[]>([]);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [banks, setBanks] = useState<QuestionBank[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [attachedQuestionIds, setAttachedQuestionIds] = useState<number[]>([]);

  const [selectedUnitId, setSelectedUnitId] = useState<number | null>(null);
  const [selectedQuizId, setSelectedQuizId] = useState<number | null>(null);
  const [selectedBankId, setSelectedBankId] = useState<number | null>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [quizForm, setQuizForm] = useState({
    title: "",
    description: "",
    instructions: "",
    time_limit_minutes: "",
    max_attempts: "",
    available_from: "",
    available_until: "",
    due_date: "",
    points_possible: "100",
    shuffle_questions: false,
    shuffle_answers: false,
    show_results: true,
    published: false,
  });

  const [bankForm, setBankForm] = useState({
    title: "",
    description: "",
  });

  const [questionForm, setQuestionForm] = useState({
    question_type:
      "multiple_choice" as Question["question_type"],
    question_text: "",
    explanation: "",
    points: "1",
    option_a: "",
    option_b: "",
    option_c: "",
    option_d: "",
    correct_option: "a",
    true_false_answer: "true",
    short_answer: "",
    numerical_answer: "",
    numerical_tolerance: "0",
    essay_answer: "",
  });

  const [editingQuizId, setEditingQuizId] = useState<number | null>(null);

  useEffect(() => {
    loadInitialData();
  }, []);

  async function loadInitialData() {
    setLoading(true);
    setError("");

    const [unitsResult, quizzesResult, banksResult] = await Promise.all([
      supabase
        .from("units")
        .select("id, code, name")
        .order("name", { ascending: true }),

      supabase
        .from("quizzes")
        .select("*")
        .order("created_at", { ascending: false }),

      supabase
        .from("question_banks")
        .select("*")
        .order("created_at", { ascending: false }),
    ]);

    if (unitsResult.error) {
      setError(unitsResult.error.message);
    }

    if (quizzesResult.error) {
      setError(quizzesResult.error.message);
    }

    if (banksResult.error) {
      setError(banksResult.error.message);
    }

    setUnits((unitsResult.data || []) as Unit[]);
    setQuizzes((quizzesResult.data || []) as Quiz[]);
    setBanks((banksResult.data || []) as QuestionBank[]);

    setLoading(false);
  }

  async function loadBanksForUnit(unitId: number | null) {
    if (!unitId) {
      setBanks([]);
      return;
    }

    const { data, error } = await supabase
      .from("question_banks")
      .select("*")
      .eq("unit_id", unitId)
      .order("created_at", { ascending: false });

    if (error) {
      setError(error.message);
      return;
    }

    setBanks((data || []) as QuestionBank[]);
  }

  async function loadQuestionsForBank(bankId: number | null) {
    if (!bankId) {
      setQuestions([]);
      return;
    }

    const { data, error } = await supabase
      .from("question_bank_questions")
      .select("*")
      .eq("question_bank_id", bankId)
      .order("created_at", { ascending: true });

    if (error) {
      setError(error.message);
      return;
    }

    setQuestions((data || []) as Question[]);
  }

  async function loadAttachedQuestions(quizId: number | null) {
    if (!quizId) {
      setAttachedQuestionIds([]);
      return;
    }

    const { data, error } = await supabase
      .from("quiz_questions")
      .select("question_bank_question_id")
      .eq("quiz_id", quizId)
      .order("position", { ascending: true });

    if (error) {
      setError(error.message);
      return;
    }

    setAttachedQuestionIds(
      (data || []).map(
        (item) => item.question_bank_question_id
      )
    );
  }

  function resetMessages() {
    setMessage("");
    setError("");
  }

  function resetQuizForm() {
    setQuizForm({
      title: "",
      description: "",
      instructions: "",
      time_limit_minutes: "",
      max_attempts: "",
      available_from: "",
      available_until: "",
      due_date: "",
      points_possible: "100",
      shuffle_questions: false,
      shuffle_answers: false,
      show_results: true,
      published: false,
    });

    setEditingQuizId(null);
  }

  async function createOrUpdateQuiz() {
    resetMessages();

    if (!selectedUnitId) {
      setError("Select a unit first.");
      return;
    }

    if (!quizForm.title.trim()) {
      setError("Quiz title is required.");
      return;
    }

    setSaving(true);

    const payload = {
      unit_id: selectedUnitId,
      title: quizForm.title.trim(),
      description: quizForm.description.trim() || null,
      instructions: quizForm.instructions.trim() || null,
      time_limit_minutes:
        quizForm.time_limit_minutes.trim() === ""
          ? null
          : Number(quizForm.time_limit_minutes),
      max_attempts:
        quizForm.max_attempts.trim() === ""
          ? null
          : Number(quizForm.max_attempts),
      available_from:
        quizForm.available_from || null,
      available_until:
        quizForm.available_until || null,
      due_date: quizForm.due_date || null,
      points_possible:
        Number(quizForm.points_possible) || 100,
      shuffle_questions: quizForm.shuffle_questions,
      shuffle_answers: quizForm.shuffle_answers,
      show_results: quizForm.show_results,
      published: quizForm.published,
      updated_at: new Date().toISOString(),
    };

    if (editingQuizId) {
      const { error } = await supabase
        .from("quizzes")
        .update(payload)
        .eq("id", editingQuizId);

      if (error) {
        setError(error.message);
      } else {
        setMessage("Quiz updated successfully.");
        await loadInitialData();
      }
    } else {
      const { data, error } = await supabase
        .from("quizzes")
        .insert(payload)
        .select()
        .single();

      if (error) {
        setError(error.message);
      } else {
        setMessage("Quiz created successfully.");

        await loadInitialData();

        if (data) {
          setSelectedQuizId(data.id);
        }

        resetQuizForm();
      }
    }

    setSaving(false);
  }

  function editQuiz(quiz: Quiz) {
    setSelectedUnitId(quiz.unit_id);
    setSelectedQuizId(quiz.id);

    setQuizForm({
      title: quiz.title,
      description: quiz.description || "",
      instructions: quiz.instructions || "",
      time_limit_minutes:
        quiz.time_limit_minutes?.toString() || "",
      max_attempts: quiz.max_attempts?.toString() || "",
      available_from: toDateTimeLocal(
        quiz.available_from
      ),
      available_until: toDateTimeLocal(
        quiz.available_until
      ),
      due_date: toDateTimeLocal(quiz.due_date),
      points_possible:
        quiz.points_possible?.toString() || "100",
      shuffle_questions: quiz.shuffle_questions,
      shuffle_answers: quiz.shuffle_answers,
      show_results: quiz.show_results,
      published: quiz.published,
    });

    setEditingQuizId(quiz.id);

    loadBanksForUnit(quiz.unit_id);
    loadAttachedQuestions(quiz.id);
  }

  async function deleteQuiz(id: number) {
    if (
      !confirm(
        "Delete this quiz? Its questions and attempts will also be removed."
      )
    ) {
      return;
    }

    resetMessages();

    const { error } = await supabase
      .from("quizzes")
      .delete()
      .eq("id", id);

    if (error) {
      setError(error.message);
      return;
    }

    if (selectedQuizId === id) {
      setSelectedQuizId(null);
      setAttachedQuestionIds([]);
      resetQuizForm();
    }

    await loadInitialData();

    setMessage("Quiz deleted.");
  }

  async function createQuestionBank() {
    resetMessages();

    if (!selectedUnitId) {
      setError("Select a unit first.");
      return;
    }

    if (!bankForm.title.trim()) {
      setError("Question bank title is required.");
      return;
    }

    setSaving(true);

    const { data, error } = await supabase
      .from("question_banks")
      .insert({
        unit_id: selectedUnitId,
        title: bankForm.title.trim(),
        description: bankForm.description.trim() || null,
      })
      .select()
      .single();

    if (error) {
      setError(error.message);
    } else {
      setMessage("Question bank created.");

      setBankForm({
        title: "",
        description: "",
      });

      await loadBanksForUnit(selectedUnitId);

      if (data) {
        setSelectedBankId(data.id);
        await loadQuestionsForBank(data.id);
      }
    }

    setSaving(false);
  }

  function buildQuestionOptions() {
    if (
      questionForm.question_type !== "multiple_choice"
    ) {
      return [];
    }

    return [
      {
        id: "a",
        text: questionForm.option_a.trim(),
      },
      {
        id: "b",
        text: questionForm.option_b.trim(),
      },
      {
        id: "c",
        text: questionForm.option_c.trim(),
      },
      {
        id: "d",
        text: questionForm.option_d.trim(),
      },
    ].filter((option) => option.text);
  }

  async function createQuestion() {
    resetMessages();

    if (!selectedBankId) {
      setError("Select a question bank.");
      return;
    }

    if (!questionForm.question_text.trim()) {
      setError("Question text is required.");
      return;
    }

    if (
      questionForm.question_type === "multiple_choice" &&
      buildQuestionOptions().length < 2
    ) {
      setError(
        "Multiple-choice questions need at least two options."
      );
      return;
    }

    if (
      questionForm.question_type === "multiple_choice" &&
      !buildQuestionOptions().some(
        (option) =>
          option.id === questionForm.correct_option
      )
    ) {
      setError("The selected correct option is empty.");
      return;
    }

    if (
      questionForm.question_type === "short_answer" &&
      !questionForm.short_answer.trim()
    ) {
      setError("Enter at least one accepted short answer.");
      return;
    }

    if (
      questionForm.question_type === "numerical" &&
      !questionForm.numerical_answer.trim()
    ) {
      setError("Enter the correct numerical answer.");
      return;
    }

    setSaving(true);

    let options = buildQuestionOptions();

    if (questionForm.question_type === "true_false") {
      options = [
        { id: "true", text: "True" },
        { id: "false", text: "False" },
      ];
    }

    const { data: question, error } = await supabase
      .from("question_bank_questions")
      .insert({
        question_bank_id: selectedBankId,
        question_type: questionForm.question_type,
        question_text:
          questionForm.question_text.trim(),
        explanation:
          questionForm.explanation.trim() || null,
        points: Number(questionForm.points) || 1,
        options,
      })
      .select()
      .single();

    if (error || !question) {
      setError(error?.message || "Failed to create question.");
      setSaving(false);
      return;
    }

    let correctAnswer: unknown = null;
    let tolerance: number | null = null;

    if (
      questionForm.question_type === "multiple_choice"
    ) {
      correctAnswer = questionForm.correct_option;
    }

    if (questionForm.question_type === "true_false") {
      correctAnswer =
        questionForm.true_false_answer === "true";
    }

    if (
      questionForm.question_type === "short_answer"
    ) {
      correctAnswer = questionForm.short_answer
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
    }

    if (
      questionForm.question_type === "numerical"
    ) {
      correctAnswer = Number(
        questionForm.numerical_answer
      );

      tolerance =
        Number(questionForm.numerical_tolerance) || 0;
    }

    const { error: keyError } = await supabase
      .from("quiz_question_keys")
      .insert({
        question_id: question.id,
        correct_answer: correctAnswer,
        tolerance,
      });

    if (keyError) {
      await supabase
        .from("question_bank_questions")
        .delete()
        .eq("id", question.id);

      setError(
        `Question created but answer key failed: ${keyError.message}`
      );

      setSaving(false);
      return;
    }

    await loadQuestionsForBank(selectedBankId);

    resetQuestionForm();

    setMessage("Question added to the question bank.");

    setSaving(false);
  }

  function resetQuestionForm() {
    setQuestionForm({
      question_type: "multiple_choice",
      question_text: "",
      explanation: "",
      points: "1",
      option_a: "",
      option_b: "",
      option_c: "",
      option_d: "",
      correct_option: "a",
      true_false_answer: "true",
      short_answer: "",
      numerical_answer: "",
      numerical_tolerance: "0",
      essay_answer: "",
    });
  }

  async function deleteQuestion(id: number) {
    if (!confirm("Delete this question?")) {
      return;
    }

    const { error } = await supabase
      .from("question_bank_questions")
      .delete()
      .eq("id", id);

    if (error) {
      setError(error.message);
      return;
    }

    if (selectedBankId) {
      await loadQuestionsForBank(selectedBankId);
    }

    setMessage("Question deleted.");
  }

  async function attachQuestion(questionId: number) {
    resetMessages();

    if (!selectedQuizId) {
      setError("Select a quiz first.");
      return;
    }

    if (attachedQuestionIds.includes(questionId)) {
      return;
    }

    const position = attachedQuestionIds.length + 1;

    const question = questions.find(
      (item) => item.id === questionId
    );

    if (!question) {
      return;
    }

    const { error } = await supabase
      .from("quiz_questions")
      .insert({
        quiz_id: selectedQuizId,
        question_bank_question_id: questionId,
        position,
        points: question.points,
        required: true,
      });

    if (error) {
      setError(error.message);
      return;
    }

    setAttachedQuestionIds((current) => [
      ...current,
      questionId,
    ]);

    setMessage("Question attached to quiz.");
  }

  async function detachQuestion(questionId: number) {
    if (!selectedQuizId) {
      return;
    }

    const { error } = await supabase
      .from("quiz_questions")
      .delete()
      .eq("quiz_id", selectedQuizId)
      .eq("question_bank_question_id", questionId);

    if (error) {
      setError(error.message);
      return;
    }

    setAttachedQuestionIds((current) =>
      current.filter((id) => id !== questionId)
    );

    await resequenceQuizQuestions();

    setMessage("Question removed from quiz.");
  }

  async function resequenceQuizQuestions() {
    if (!selectedQuizId) {
      return;
    }

    const { data } = await supabase
      .from("quiz_questions")
      .select("id")
      .eq("quiz_id", selectedQuizId)
      .order("position", { ascending: true });

    if (!data) {
      return;
    }

    for (let index = 0; index < data.length; index++) {
      await supabase
        .from("quiz_questions")
        .update({
          position: index + 1,
        })
        .eq("id", data[index].id);
    }
  }

  async function moveQuestion(
    questionId: number,
    direction: "up" | "down"
  ) {
    if (!selectedQuizId) {
      return;
    }

    const { data, error } = await supabase
      .from("quiz_questions")
      .select("id, question_bank_question_id, position")
      .eq("quiz_id", selectedQuizId)
      .order("position", { ascending: true });

    if (error || !data) {
      setError(error?.message || "Failed to load quiz questions.");
      return;
    }

    const index = data.findIndex(
      (item) =>
        item.question_bank_question_id === questionId
    );

    if (index === -1) {
      return;
    }

    const targetIndex =
      direction === "up" ? index - 1 : index + 1;

    if (
      targetIndex < 0 ||
      targetIndex >= data.length
    ) {
      return;
    }

    const current = data[index];
    const target = data[targetIndex];

    await supabase
      .from("quiz_questions")
      .update({
        position: target.position,
      })
      .eq("id", current.id);

    await supabase
      .from("quiz_questions")
      .update({
        position: current.position,
      })
      .eq("id", target.id);

    await loadAttachedQuestions(selectedQuizId);
  }

  function toDateTimeLocal(
    value: string | null
  ): string {
    if (!value) {
      return "";
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return "";
    }

    const offset =
      date.getTimezoneOffset() * 60000;

    return new Date(
      date.getTime() - offset
    )
      .toISOString()
      .slice(0, 16);
  }

  const selectedQuiz = useMemo(
    () =>
      quizzes.find(
        (quiz) => quiz.id === selectedQuizId
      ) || null,
    [quizzes, selectedQuizId]
  );

  const selectedBank = useMemo(
    () =>
      banks.find(
        (bank) => bank.id === selectedBankId
      ) || null,
    [banks, selectedBankId]
  );

  const visibleQuizzes = useMemo(() => {
    if (!selectedUnitId) {
      return quizzes;
    }

    return quizzes.filter(
      (quiz) => quiz.unit_id === selectedUnitId
    );
  }, [quizzes, selectedUnitId]);

  const attachedQuestions = useMemo(
    () =>
      attachedQuestionIds
        .map((id) =>
          questions.find(
            (question) => question.id === id
          )
        )
        .filter(Boolean) as Question[],
    [attachedQuestionIds, questions]
  );

  if (loading) {
    return (
      <main className="min-h-screen bg-white p-8 text-black">
        <div className="mx-auto max-w-7xl">
          Loading quiz management...
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-white p-6 text-black">
      <div className="mx-auto max-w-7xl space-y-6">

        {/* HEADER */}
        <section>
          <h1 className="text-3xl font-bold">
            Quiz Management
          </h1>

          <p className="mt-1 text-gray-600">
            Create quizzes, build reusable question banks,
            and attach questions to assessments.
          </p>
        </section>

        {/* MESSAGES */}
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

        {/* UNIT SELECTOR */}
        <section className="rounded-xl border bg-gray-50 p-5">
          <label className="mb-2 block text-sm font-semibold">
            Unit
          </label>

          <select
            value={selectedUnitId ?? ""}
            onChange={(event) => {
              const id = event.target.value
                ? Number(event.target.value)
                : null;

              setSelectedUnitId(id);
              setSelectedQuizId(null);
              setSelectedBankId(null);
              setAttachedQuestionIds([]);
              setQuestions([]);

              if (id) {
                loadBanksForUnit(id);
              } else {
                setBanks([]);
              }
            }}
            className="w-full rounded-lg border bg-white px-4 py-3"
          >
            <option value="">
              Select a unit
            </option>

            {units.map((unit) => (
              <option
                key={unit.id}
                value={unit.id}
              >
                {unit.code
                  ? `${unit.code} — ${unit.name}`
                  : unit.name}
              </option>
            ))}
          </select>
        </section>

        {/* QUIZ BUILDER */}
        <section className="rounded-xl border p-6">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold">
                {editingQuizId
                  ? "Edit Quiz"
                  : "Create Quiz"}
              </h2>

              <p className="text-sm text-gray-500">
                Configure the assessment before adding
                questions.
              </p>
            </div>

            {editingQuizId && (
              <button
                onClick={resetQuizForm}
                className="rounded-lg border px-4 py-2"
              >
                New Quiz
              </button>
            )}
          </div>

          <div className="grid gap-4 md:grid-cols-2">

            <div className="md:col-span-2">
              <label className="mb-1 block text-sm font-medium">
                Quiz title
              </label>

              <input
                value={quizForm.title}
                onChange={(e) =>
                  setQuizForm({
                    ...quizForm,
                    title: e.target.value,
                  })
                }
                placeholder="e.g. Probability and Statistics I — CAT 1"
                className="w-full rounded-lg border px-4 py-3"
              />
            </div>

            <div className="md:col-span-2">
              <label className="mb-1 block text-sm font-medium">
                Description
              </label>

              <textarea
                value={quizForm.description}
                onChange={(e) =>
                  setQuizForm({
                    ...quizForm,
                    description: e.target.value,
                  })
                }
                rows={3}
                className="w-full rounded-lg border px-4 py-3"
              />
            </div>

            <div className="md:col-span-2">
              <label className="mb-1 block text-sm font-medium">
                Instructions
              </label>

              <textarea
                value={quizForm.instructions}
                onChange={(e) =>
                  setQuizForm({
                    ...quizForm,
                    instructions: e.target.value,
                  })
                }
                rows={3}
                placeholder="Instructions students must read before starting..."
                className="w-full rounded-lg border px-4 py-3"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">
                Time limit (minutes)
              </label>

              <input
                type="number"
                min="1"
                value={quizForm.time_limit_minutes}
                onChange={(e) =>
                  setQuizForm({
                    ...quizForm,
                    time_limit_minutes:
                      e.target.value,
                  })
                }
                placeholder="e.g. 60"
                className="w-full rounded-lg border px-4 py-3"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">
                Maximum attempts
              </label>

              <input
                type="number"
                min="1"
                value={quizForm.max_attempts}
                onChange={(e) =>
                  setQuizForm({
                    ...quizForm,
                    max_attempts:
                      e.target.value,
                  })
                }
                placeholder="Leave blank for unlimited"
                className="w-full rounded-lg border px-4 py-3"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">
                Available from
              </label>

              <input
                type="datetime-local"
                value={quizForm.available_from}
                onChange={(e) =>
                  setQuizForm({
                    ...quizForm,
                    available_from:
                      e.target.value,
                  })
                }
                className="w-full rounded-lg border px-4 py-3"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">
                Available until
              </label>

              <input
                type="datetime-local"
                value={quizForm.available_until}
                onChange={(e) =>
                  setQuizForm({
                    ...quizForm,
                    available_until:
                      e.target.value,
                  })
                }
                className="w-full rounded-lg border px-4 py-3"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">
                Due date
              </label>

              <input
                type="datetime-local"
                value={quizForm.due_date}
                onChange={(e) =>
                  setQuizForm({
                    ...quizForm,
                    due_date: e.target.value,
                  })
                }
                className="w-full rounded-lg border px-4 py-3"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">
                Points possible
              </label>

              <input
                type="number"
                min="0"
                value={quizForm.points_possible}
                onChange={(e) =>
                  setQuizForm({
                    ...quizForm,
                    points_possible:
                      e.target.value,
                  })
                }
                className="w-full rounded-lg border px-4 py-3"
              />
            </div>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-4">

            <label className="flex items-center gap-2 rounded-lg border p-3">
              <input
                type="checkbox"
                checked={quizForm.shuffle_questions}
                onChange={(e) =>
                  setQuizForm({
                    ...quizForm,
                    shuffle_questions:
                      e.target.checked,
                  })
                }
              />

              <span className="text-sm">
                Shuffle questions
              </span>
            </label>

            <label className="flex items-center gap-2 rounded-lg border p-3">
              <input
                type="checkbox"
                checked={quizForm.shuffle_answers}
                onChange={(e) =>
                  setQuizForm({
                    ...quizForm,
                    shuffle_answers:
                      e.target.checked,
                  })
                }
              />

              <span className="text-sm">
                Shuffle answers
              </span>
            </label>

            <label className="flex items-center gap-2 rounded-lg border p-3">
              <input
                type="checkbox"
                checked={quizForm.show_results}
                onChange={(e) =>
                  setQuizForm({
                    ...quizForm,
                    show_results:
                      e.target.checked,
                  })
                }
              />

              <span className="text-sm">
                Show results
              </span>
            </label>

            <label className="flex items-center gap-2 rounded-lg border p-3">
              <input
                type="checkbox"
                checked={quizForm.published}
                onChange={(e) =>
                  setQuizForm({
                    ...quizForm,
                    published:
                      e.target.checked,
                  })
                }
              />

              <span className="text-sm font-semibold">
                Published
              </span>
            </label>
          </div>

          <button
            onClick={createOrUpdateQuiz}
            disabled={saving || !selectedUnitId}
            className="mt-5 rounded-lg bg-black px-6 py-3 font-semibold text-white disabled:opacity-50"
          >
            {saving
              ? "Saving..."
              : editingQuizId
              ? "Update Quiz"
              : "Create Quiz"}
          </button>
        </section>

        {/* EXISTING QUIZZES */}
        <section className="rounded-xl border p-6">
          <h2 className="mb-4 text-xl font-bold">
            Existing Quizzes
          </h2>

          {!selectedUnitId ? (
            <p className="text-gray-500">
              Select a unit to view its quizzes.
            </p>
          ) : visibleQuizzes.length === 0 ? (
            <p className="text-gray-500">
              No quizzes have been created for this unit.
            </p>
          ) : (
            <div className="space-y-3">
              {visibleQuizzes.map((quiz) => (
                <div
                  key={quiz.id}
                  className={`rounded-lg border p-4 ${
                    selectedQuizId === quiz.id
                      ? "border-black bg-gray-50"
                      : ""
                  }`}
                >
                  <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">

                    <div>
                      <h3 className="font-semibold">
                        {quiz.title}
                      </h3>

                      <div className="mt-1 text-sm text-gray-500">
                        {quiz.time_limit_minutes
                          ? `${quiz.time_limit_minutes} min`
                          : "No time limit"}

                        {" • "}

                        {quiz.max_attempts
                          ? `${quiz.max_attempts} attempt(s)`
                          : "Unlimited attempts"}

                        {" • "}

                        {quiz.published
                          ? "Published"
                          : "Draft"}
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() =>
                          editQuiz(quiz)
                        }
                        className="rounded-lg border px-4 py-2"
                      >
                        Edit
                      </button>

                      <button
                        onClick={() => {
                          setSelectedQuizId(
                            quiz.id
                          );
                          setAttachedQuestionIds(
                            []
                          );
                          loadAttachedQuestions(
                            quiz.id
                          );
                        }}
                        className="rounded-lg border px-4 py-2"
                      >
                        Questions
                      </button>

                      <button
                        onClick={() =>
                          deleteQuiz(quiz.id)
                        }
                        className="rounded-lg border border-red-300 px-4 py-2 text-red-600"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* QUESTION BANK */}
        <section className="rounded-xl border p-6">
          <div className="mb-5">
            <h2 className="text-xl font-bold">
              Question Banks
            </h2>

            <p className="text-sm text-gray-500">
              Create reusable questions for the selected
              unit.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="md:col-span-2">
              <input
                value={bankForm.title}
                onChange={(e) =>
                  setBankForm({
                    ...bankForm,
                    title: e.target.value,
                  })
                }
                placeholder="Question bank name"
                className="w-full rounded-lg border px-4 py-3"
              />
            </div>

            <button
              onClick={createQuestionBank}
              disabled={saving || !selectedUnitId}
              className="rounded-lg bg-black px-5 py-3 font-semibold text-white disabled:opacity-50"
            >
              Create Question Bank
            </button>
          </div>

          <textarea
            value={bankForm.description}
            onChange={(e) =>
              setBankForm({
                ...bankForm,
                description: e.target.value,
              })
            }
            placeholder="Optional description"
            rows={2}
            className="mt-3 w-full rounded-lg border px-4 py-3"
          />

          <div className="mt-5 grid gap-3 md:grid-cols-3">
            {banks.map((bank) => (
              <button
                key={bank.id}
                onClick={() => {
                  setSelectedBankId(bank.id);
                  loadQuestionsForBank(bank.id);
                }}
                className={`rounded-lg border p-4 text-left ${
                  selectedBankId === bank.id
                    ? "border-black bg-gray-100"
                    : ""
                }`}
              >
                <div className="font-semibold">
                  {bank.title}
                </div>

                <div className="mt-1 text-xs text-gray-500">
                  {bank.description ||
                    "No description"}
                </div>
              </button>
            ))}
          </div>
        </section>

        {/* QUESTION CREATOR */}
        {selectedBank && (
          <section className="rounded-xl border p-6">
            <div className="mb-5">
              <h2 className="text-xl font-bold">
                Add Question
              </h2>

              <p className="text-sm text-gray-500">
                Bank: {selectedBank.title}
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">

              <div>
                <label className="mb-1 block text-sm font-medium">
                  Question type
                </label>

                <select
                  value={questionForm.question_type}
                  onChange={(e) =>
                    setQuestionForm({
                      ...questionForm,
                      question_type:
                        e.target
                          .value as Question["question_type"],
                    })
                  }
                  className="w-full rounded-lg border px-4 py-3"
                >
                  {QUESTION_TYPES.map((type) => (
                    <option
                      key={type.value}
                      value={type.value}
                    >
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">
                  Points
                </label>

                <input
                  type="number"
                  min="0"
                  value={questionForm.points}
                  onChange={(e) =>
                    setQuestionForm({
                      ...questionForm,
                      points: e.target.value,
                    })
                  }
                  className="w-full rounded-lg border px-4 py-3"
                />
              </div>

              <div className="md:col-span-2">
                <label className="mb-1 block text-sm font-medium">
                  Question
                </label>

                <textarea
                  value={questionForm.question_text}
                  onChange={(e) =>
                    setQuestionForm({
                      ...questionForm,
                      question_text:
                        e.target.value,
                    })
                  }
                  rows={4}
                  placeholder="Enter the question..."
                  className="w-full rounded-lg border px-4 py-3"
                />
              </div>

              {/* MULTIPLE CHOICE */}
              {questionForm.question_type ===
                "multiple_choice" && (
                <div className="md:col-span-2 rounded-lg bg-gray-50 p-4">
                  <h3 className="mb-3 font-semibold">
                    Answer Options
                  </h3>

                  <div className="grid gap-3 md:grid-cols-2">
                    {[
                      ["a", "option_a", "Option A"],
                      ["b", "option_b", "Option B"],
                      ["c", "option_c", "Option C"],
                      ["d", "option_d", "Option D"],
                    ].map(
                      ([id, key, placeholder]) => (
                        <div
                          key={id}
                          className="flex gap-2"
                        >
                          <div className="flex h-12 w-12 items-center justify-center rounded-lg border bg-white font-bold">
                            {id.toUpperCase()}
                          </div>

                          <input
                            value={
                              questionForm[
                                key as keyof typeof questionForm
                              ] as string
                            }
                            onChange={(e) =>
                              setQuestionForm({
                                ...questionForm,
                                [key]:
                                  e.target.value,
                              })
                            }
                            placeholder={
                              placeholder
                            }
                            className="flex-1 rounded-lg border px-4 py-3"
                          />
                        </div>
                      )
                    )}
                  </div>

                  <div className="mt-4">
                    <label className="mb-1 block text-sm font-medium">
                      Correct option
                    </label>

                    <select
                      value={
                        questionForm.correct_option
                      }
                      onChange={(e) =>
                        setQuestionForm({
                          ...questionForm,
                          correct_option:
                            e.target.value,
                        })
                      }
                      className="rounded-lg border bg-white px-4 py-3"
                    >
                      <option value="a">
                        Option A
                      </option>
                      <option value="b">
                        Option B
                      </option>
                      <option value="c">
                        Option C
                      </option>
                      <option value="d">
                        Option D
                      </option>
                    </select>
                  </div>
                </div>
              )}

              {/* TRUE FALSE */}
              {questionForm.question_type ===
                "true_false" && (
                <div className="md:col-span-2">
                  <label className="mb-1 block text-sm font-medium">
                    Correct answer
                  </label>

                  <select
                    value={
                      questionForm.true_false_answer
                    }
                    onChange={(e) =>
                      setQuestionForm({
                        ...questionForm,
                        true_false_answer:
                          e.target.value,
                      })
                    }
                    className="rounded-lg border px-4 py-3"
                  >
                    <option value="true">
                      True
                    </option>
                    <option value="false">
                      False
                    </option>
                  </select>
                </div>
              )}

              {/* SHORT ANSWER */}
              {questionForm.question_type ===
                "short_answer" && (
                <div className="md:col-span-2">
                  <label className="mb-1 block text-sm font-medium">
                    Accepted answers
                  </label>

                  <input
                    value={
                      questionForm.short_answer
                    }
                    onChange={(e) =>
                      setQuestionForm({
                        ...questionForm,
                        short_answer:
                          e.target.value,
                      })
                    }
                    placeholder="database, databases"
                    className="w-full rounded-lg border px-4 py-3"
                  />

                  <p className="mt-1 text-xs text-gray-500">
                    Separate alternative accepted answers
                    with commas.
                  </p>
                </div>
              )}

              {/* NUMERICAL */}
              {questionForm.question_type ===
                "numerical" && (
                <div className="grid gap-4 md:col-span-2 md:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-sm font-medium">
                      Correct numerical answer
                    </label>

                    <input
                      type="number"
                      step="any"
                      value={
                        questionForm.numerical_answer
                      }
                      onChange={(e) =>
                        setQuestionForm({
                          ...questionForm,
                          numerical_answer:
                            e.target.value,
                        })
                      }
                      className="w-full rounded-lg border px-4 py-3"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium">
                      Tolerance
                    </label>

                    <input
                      type="number"
                      step="any"
                      min="0"
                      value={
                        questionForm.numerical_tolerance
                      }
                      onChange={(e) =>
                        setQuestionForm({
                          ...questionForm,
                          numerical_tolerance:
                            e.target.value,
                        })
                      }
                      placeholder="0"
                      className="w-full rounded-lg border px-4 py-3"
                    />
                  </div>
                </div>
              )}

              {/* ESSAY */}
              {questionForm.question_type ===
                "essay" && (
                <div className="md:col-span-2 rounded-lg bg-gray-50 p-4 text-sm text-gray-600">
                  Essay questions do not require an
                  automatic answer key. They will be sent
                  to the lecturer/admin for manual grading.
                </div>
              )}

              <div className="md:col-span-2">
                <label className="mb-1 block text-sm font-medium">
                  Explanation
                </label>

                <textarea
                  value={questionForm.explanation}
                  onChange={(e) =>
                    setQuestionForm({
                      ...questionForm,
                      explanation:
                        e.target.value,
                    })
                  }
                  rows={3}
                  placeholder="Optional explanation shown after grading."
                  className="w-full rounded-lg border px-4 py-3"
                />
              </div>
            </div>

            <button
              onClick={createQuestion}
              disabled={saving}
              className="mt-5 rounded-lg bg-black px-6 py-3 font-semibold text-white disabled:opacity-50"
            >
              {saving
                ? "Adding..."
                : "Add Question"}
            </button>
          </section>
        )}

        {/* QUESTIONS */}
        {selectedBank && (
          <section className="rounded-xl border p-6">
            <h2 className="mb-4 text-xl font-bold">
              Questions in {selectedBank.title}
            </h2>

            {questions.length === 0 ? (
              <p className="text-gray-500">
                No questions in this bank yet.
              </p>
            ) : (
              <div className="space-y-3">
                {questions.map(
                  (question, index) => (
                    <div
                      key={question.id}
                      className="rounded-lg border p-4"
                    >
                      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">

                        <div className="flex-1">
                          <div className="mb-2 flex flex-wrap gap-2">
                            <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold">
                              {QUESTION_TYPES.find(
                                (type) =>
                                  type.value ===
                                  question.question_type
                              )?.label}
                            </span>

                            <span className="rounded-full bg-gray-100 px-3 py-1 text-xs">
                              {question.points} point
                              {question.points === 1
                                ? ""
                                : "s"}
                            </span>
                          </div>

                          <div className="font-medium">
                            {index + 1}.{" "}
                            {question.question_text}
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          {selectedQuizId && (
                            <button
                              onClick={() =>
                                attachedQuestionIds.includes(
                                  question.id
                                )
                                  ? detachQuestion(
                                      question.id
                                    )
                                  : attachQuestion(
                                      question.id
                                    )
                              }
                              className={`rounded-lg px-4 py-2 ${
                                attachedQuestionIds.includes(
                                  question.id
                                )
                                  ? "border border-red-300 text-red-600"
                                  : "bg-black text-white"
                              }`}
                            >
                              {attachedQuestionIds.includes(
                                question.id
                              )
                                ? "Remove from Quiz"
                                : "Add to Quiz"}
                            </button>
                          )}

                          <button
                            onClick={() =>
                              deleteQuestion(
                                question.id
                              )
                            }
                            className="rounded-lg border border-red-300 px-4 py-2 text-red-600"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                )}
              </div>
            )}
          </section>
        )}

        {/* QUIZ QUESTIONS */}
        {selectedQuiz && (
          <section className="rounded-xl border p-6">
            <div className="mb-5">
              <h2 className="text-xl font-bold">
                Questions in "{selectedQuiz.title}"
              </h2>

              <p className="text-sm text-gray-500">
                {attachedQuestionIds.length} question
                {attachedQuestionIds.length === 1
                  ? ""
                  : "s"} attached
              </p>
            </div>

            {attachedQuestions.length === 0 ? (
              <div className="rounded-lg border border-dashed p-8 text-center text-gray-500">
                No questions attached yet.
                <br />
                Select a question bank above and add
                questions to this quiz.
              </div>
            ) : (
              <div className="space-y-3">
                {attachedQuestions.map(
                  (question, index) => (
                    <div
                      key={question.id}
                      className="rounded-lg border p-4"
                    >
                      <div className="flex items-start gap-4">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-black text-sm font-bold text-white">
                          {index + 1}
                        </div>

                        <div className="flex-1">
                          <div className="flex flex-wrap gap-2">
                            <span className="text-xs font-semibold uppercase text-gray-500">
                              {
                                QUESTION_TYPES.find(
                                  (type) =>
                                    type.value ===
                                    question.question_type
                                )?.label
                              }
                            </span>

                            <span className="text-xs text-gray-500">
                              {question.points} point
                              {question.points === 1
                                ? ""
                                : "s"}
                            </span>
                          </div>

                          <p className="mt-1 font-medium">
                            {question.question_text}
                          </p>
                        </div>

                        <div className="flex gap-1">
                          <button
                            onClick={() =>
                              moveQuestion(
                                question.id,
                                "up"
                              )
                            }
                            disabled={index === 0}
                            className="rounded border px-3 py-2 disabled:opacity-30"
                          >
                            ↑
                          </button>

                          <button
                            onClick={() =>
                              moveQuestion(
                                question.id,
                                "down"
                              )
                            }
                            disabled={
                              index ===
                              attachedQuestions.length -
                                1
                            }
                            className="rounded border px-3 py-2 disabled:opacity-30"
                          >
                            ↓
                          </button>

                          <button
                            onClick={() =>
                              detachQuestion(
                                question.id
                              )
                            }
                            className="rounded border border-red-300 px-3 py-2 text-red-600"
                          >
                            ×
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                )}
              </div>
            )}
          </section>
        )}
      </div>
    </main>
  );
}