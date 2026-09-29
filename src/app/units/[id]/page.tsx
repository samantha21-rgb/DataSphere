"use client";

import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import {
  useParams,
  usePathname,
  useSearchParams,
} from "next/navigation";
import { supabase } from "../../lib/supabase";

type Unit = {
  id: number;
  name: string;
  semester_id: number;
};

type Resource = {
  id: number;
  title: string;
  description: string | null;
  file_url: string;
  created_at: string;
};

type Assignment = Resource & {
  assignment_number: number | null;
};

type CAT = Resource & {
  cat_number: number | null;
};

type PastPaper = Resource & {
  exam_year: number | null;
  exam_type: string | null;
};

type Exam = {
  id: number;
  title: string;
  exam_type: string;
  exam_date: string | null;
  start_time: string | null;
  end_time: string | null;
  venue: string | null;
  instructions: string | null;
};

type Tab =
  | "overview"
  | "notes"
  | "cats"
  | "assignments"
  | "past-papers"
  | "exams";

export default function UnitPage() {
  const params = useParams();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const routeParam = params?.id;

  const routeId = Array.isArray(routeParam)
    ? routeParam[0]
    : routeParam;

  const pathParts = pathname
    ? pathname.split("/").filter(Boolean)
    : [];

  const pathId =
    pathParts.length > 1 && pathParts[0] === "units"
      ? pathParts[pathParts.length - 1]
      : undefined;

  const queryId = searchParams.get("id") || undefined;

  const rawId = routeId || pathId || queryId;

  const unitId = rawId ? Number(rawId) : NaN;

  const [unit, setUnit] = useState<Unit | null>(null);

  const [notes, setNotes] = useState<Resource[]>([]);
  const [cats, setCats] = useState<CAT[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [pastPapers, setPastPapers] = useState<PastPaper[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);

  const [activeTab, setActiveTab] =
    useState<Tab>("overview");

  const [search, setSearch] = useState("");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!rawId) {
      return;
    }

    if (!Number.isInteger(unitId) || unitId <= 0) {
      setError(`Invalid unit ID: ${rawId}`);
      setLoading(false);
      return;
    }

    loadUnit(unitId);
  }, [rawId, unitId]);

  async function loadUnit(id: number) {
    setLoading(true);
    setError("");

    setUnit(null);
    setNotes([]);
    setCats([]);
    setAssignments([]);
    setPastPapers([]);
    setExams([]);

    try {
      const {
        data: unitData,
        error: unitError,
      } = await supabase
        .from("units")
        .select("id, name, semester_id")
        .eq("id", id)
        .maybeSingle();

      if (unitError) {
        console.error(
          "Unit query error:",
          unitError
        );

        setError(
          `Unable to load this unit: ${unitError.message}`
        );

        setLoading(false);
        return;
      }

      if (!unitData) {
        setError(
          `Unit ${id} was not found in the database.`
        );

        setLoading(false);
        return;
      }

      setUnit(unitData);
      setLoading(false);

      await loadResources(id);
    } catch (err) {
      console.error(
        "Unexpected unit loading error:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "Unable to load this unit."
      );

      setLoading(false);
    }
  }

  async function loadResources(id: number) {
    try {
      const { data, error } = await supabase
        .from("notes")
        .select(
          "id, title, description, file_url, created_at"
        )
        .eq("unit_id", id)
        .order("created_at", {
          ascending: false,
        });

      if (error) {
        console.error("Notes query error:", error);
        setNotes([]);
      } else {
        setNotes(data || []);
      }
    } catch (err) {
      console.error("Notes loading error:", err);
      setNotes([]);
    }

    try {
      const { data, error } = await supabase
        .from("cats")
        .select(
          "id, title, description, file_url, cat_number, created_at"
        )
        .eq("unit_id", id)
        .order("cat_number", {
          ascending: true,
        });

      if (error) {
        console.error("CATs query error:", error);
        
        setCats([]);
      } else {
        setCats(data || []);
      }
    } catch (err) {
      console.error("CATs loading error:", err);
      setCats([]);
    }

    try {
      const { data, error } = await supabase
        .from("assignments")
        .select(
          "id, title, description, file_url, assignment_number, created_at"
        )
        .eq("unit_id", id)
        .order("assignment_number", {
          ascending: true,
        });

      if (error) {
        console.error(
          "Assignments query error:",
          error
        );

        setAssignments([]);
      } else {
        setAssignments(data || []);
      }
    } catch (err) {
      console.error(
        "Assignments loading error:",
        err
      );

      setAssignments([]);
    }

    try {
      const { data, error } = await supabase
        .from("past_papers")
        .select(
          "id, title, description, file_url, exam_year, exam_type, created_at"
        )
        .eq("unit_id", id)
        .order("exam_year", {
          ascending: false,
        });

      if (error) {
        console.error(
          "Past papers query error:",
          error
        );

        setPastPapers([]);
      } else {
        setPastPapers(data || []);
      }
    } catch (err) {
      console.error(
        "Past papers loading error:",
        err
      );

      setPastPapers([]);
    }

    try {
      const { data, error } = await supabase
        .from("exams")
        .select(
          "id, title, exam_type, exam_date, start_time, end_time, venue, instructions"
        )
        .eq("unit_id", id)
        .order("exam_date", {
          ascending: true,
        });

      if (error) {
        console.error(
          "Exams query error:",
          error
        );

        setExams([]);
      } else {
        setExams(data || []);
      }
    } catch (err) {
      console.error(
        "Exams loading error:",
        err
      );

      setExams([]);
    }
  }

  const filteredNotes = useMemo(() => {
    const term = search.toLowerCase().trim();

    if (!term) return notes;

    return notes.filter(
      (item) =>
        item.title
          .toLowerCase()
          .includes(term) ||
        item.description
          ?.toLowerCase()
          .includes(term)
    );
  }, [notes, search]);

  const filteredCats = useMemo(() => {
    const term = search.toLowerCase().trim();

    if (!term) return cats;

    return cats.filter(
      (item) =>
        item.title
          .toLowerCase()
          .includes(term) ||
        item.description
          ?.toLowerCase()
          .includes(term)
    );
  }, [cats, search]);

  const filteredAssignments = useMemo(() => {
    const term = search.toLowerCase().trim();

    if (!term) return assignments;

    return assignments.filter(
      (item) =>
        item.title
          .toLowerCase()
          .includes(term) ||
        item.description
          ?.toLowerCase()
          .includes(term)
    );
  }, [assignments, search]);

  const filteredPastPapers = useMemo(() => {
    const term = search.toLowerCase().trim();

    if (!term) return pastPapers;

    return pastPapers.filter(
      (item) =>
        item.title
          .toLowerCase()
          .includes(term) ||
        item.description
          ?.toLowerCase()
          .includes(term) ||
        item.exam_type
          ?.toLowerCase()
          .includes(term) ||
        item.exam_year
          ?.toString()
          .includes(term)
    );
  }, [pastPapers, search]);

  const filteredExams = useMemo(() => {
    const term = search.toLowerCase().trim();

    if (!term) return exams;

    return exams.filter(
      (exam) =>
        exam.title
          .toLowerCase()
          .includes(term) ||
        exam.exam_type
          .toLowerCase()
          .includes(term) ||
        exam.venue
          ?.toLowerCase()
          .includes(term)
    );
  }, [exams, search]);

  function openResource(url: string) {
    if (!url) return;

    window.open(
      url,
      "_blank",
      "noopener,noreferrer"
    );
  }

  function formatDate(value: string | null) {
    if (!value) return "Date not set";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return value;
    }

    return date.toLocaleDateString(undefined, {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }

  function formatTime(value: string | null) {
    if (!value) return "";

    const parts = value.split(":");

    const hour = Number(parts[0]);
    const minute = parts[1] || "00";

    if (Number.isNaN(hour)) {
      return value;
    }

    const suffix = hour >= 12 ? "PM" : "AM";

    const displayHour = hour % 12 || 12;

    return `${displayHour}:${minute} ${suffix}`;
  }

  function setTab(tab: Tab) {
    setActiveTab(tab);
    setSearch("");
  }

  const totalResources =
    notes.length +
    cats.length +
    assignments.length +
    pastPapers.length;

  const tabs: {
    id: Tab;
    label: string;
    count?: number;
  }[] = [
    {
      id: "overview",
      label: "Overview",
    },
    {
      id: "notes",
      label: "Lecture Notes",
      count: notes.length,
    },
    {
      id: "cats",
      label: "CATs",
      count: cats.length,
    },
    {
      id: "assignments",
      label: "Assignments",
      count: assignments.length,
    },
    {
      id: "past-papers",
      label: "Past Papers",
      count: pastPapers.length,
    },
    {
      id: "exams",
      label: "Exams",
      count: exams.length,
    },
  ];

  if (loading) {
    return (
      <main className="min-h-screen bg-white px-5 py-8 md:px-8">
        <div className="mx-auto max-w-7xl">

          <div className="mb-8 h-4 w-32 animate-pulse bg-[#FFB7D5]" />

          <div className="border-l-8 border-[#20D6D2] bg-[#171A21] px-7 py-9 md:px-10">
            <div className="h-4 w-28 animate-pulse bg-white/20" />

            <div className="mt-5 h-12 w-3/4 animate-pulse bg-white/10" />

            <div className="mt-4 h-4 w-1/2 animate-pulse bg-white/10" />
          </div>

          <div className="mt-8 border-y border-[#171A21]/10">
            <div className="grid grid-cols-2 md:grid-cols-5">
              {[
                "notes",
                "cats",
                "assignments",
                "papers",
                "exams",
              ].map((item) => (
                <div
                  key={item}
                  className="border-r border-[#171A21]/10 px-5 py-6"
                >
                  <div className="h-8 w-12 animate-pulse bg-[#20D6D2]/20" />
                  <div className="mt-3 h-3 w-24 animate-pulse bg-[#171A21]/10" />
                </div>
              ))}
            </div>
          </div>

          <div className="mt-8 h-20 animate-pulse bg-[#FFB7D5]/20" />
        </div>
      </main>
    );
  }

  if (error || !unit) {
    return (
      <main className="min-h-screen bg-white px-5 py-8 md:px-8">
        <div className="mx-auto max-w-3xl">

          <Link
            href="/courses"
            className="inline-flex items-center text-sm font-bold text-[#171A21] transition hover:text-[#20D6D2]"
          >
            ← Back to Courses
          </Link>

          <div className="mt-8 border-l-8 border-[#FF6B6B] bg-[#FFF0F0] p-7">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-[#FF6B6B]">
              Unit error
            </p>

            <h1 className="mt-3 text-2xl font-black text-[#171A21]">
              Unable to load unit
            </h1>

            <p className="mt-3 text-sm leading-6 text-[#5E626B]">
              {error ||
                "This unit could not be found."}
            </p>

            <button
              type="button"
              onClick={() => {
                if (
                  Number.isInteger(unitId) &&
                  unitId > 0
                ) {
                  loadUnit(unitId);
                }
              }}
              className="mt-6 bg-[#171A21] px-5 py-3 text-sm font-black text-white transition hover:bg-[#20D6D2] hover:text-[#171A21]"
            >
              Try Again
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-white px-5 py-6 md:px-8">
      <div className="mx-auto max-w-7xl">

        {/* BACK */}
        <div className="mb-6">
          <Link
            href="/courses"
            className="group inline-flex items-center gap-2 text-sm font-bold text-[#5E626B] transition hover:text-[#171A21]"
          >
            <span className="transition-transform duration-200 group-hover:-translate-x-1">
              ←
            </span>

            Back to Courses
          </Link>
        </div>

        {/* UNIT HERO */}
        <section className="relative overflow-hidden border-l-[10px] border-[#20D6D2] bg-[#171A21] text-white">

          <div className="absolute right-0 top-0 h-32 w-32 bg-[#FFB7D5]" />

          <div className="absolute right-16 top-16 h-20 w-20 bg-[#B8FF3D]" />

          <div className="relative px-7 py-9 md:px-10 md:py-12">

            <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">

              <div className="max-w-4xl">

                <div className="inline-flex items-center border border-white/20 bg-white/5 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.18em] text-[#20D6D2]">
                  Unit Workspace
                </div>

                <h1 className="mt-5 max-w-4xl text-3xl font-black leading-tight tracking-tight md:text-5xl">
                  {unit.name}
                </h1>

                <p className="mt-4 max-w-2xl text-sm leading-7 text-white/65 md:text-base">
                  Your central learning workspace for
                  lecture notes, assessments, past papers
                  and examinations.
                </p>

              </div>

              <div className="relative flex shrink-0 flex-wrap gap-3">

                <Link
                  href={`/ai-tutor?unit=${unit.id}`}
                  className="border-2 border-[#B8FF3D] bg-[#B8FF3D] px-5 py-3 text-sm font-black text-[#171A21] transition duration-200 hover:-translate-y-1 hover:bg-white hover:border-white"
                >
                  Ask AI Tutor
                </Link>

                <Link
                  href="/gpa"
                  className="border-2 border-white/20 px-5 py-3 text-sm font-black text-white transition duration-200 hover:-translate-y-1 hover:border-[#FFB7D5] hover:text-[#FFB7D5]"
                >
                  GPA Calculator
                </Link>

              </div>

            </div>

          </div>
        </section>

        {/* STAT STRIP */}
        <section className="border-b border-l border-r border-[#171A21]/10">

          <div className="grid grid-cols-2 md:grid-cols-5">

            <StatItem
              label="Lecture Notes"
              value={notes.length}
              accent="turquoise"
            />

            <StatItem
              label="CATs"
              value={cats.length}
              accent="pink"
            />

            <StatItem
              label="Assignments"
              value={assignments.length}
              accent="lime"
            />

            <StatItem
              label="Past Papers"
              value={pastPapers.length}
              accent="violet"
            />

            <StatItem
              label="Exams"
              value={exams.length}
              accent="yellow"
            />

          </div>

        </section>

        {/* TABS */}
        <section className="mt-8 border-y border-[#171A21]/10">

          <div className="flex overflow-x-auto">

            {tabs.map((tab) => {
              const active =
                activeTab === tab.id;

              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setTab(tab.id)}
                  className={`group relative shrink-0 px-5 py-4 text-sm font-black transition ${
                    active
                      ? "text-[#171A21]"
                      : "text-[#747982] hover:text-[#171A21]"
                  }`}
                >
                  {tab.label}

                  {typeof tab.count === "number" && (
                    <span
                      className={`ml-2 text-xs ${
                        active
                          ? "text-[#20D6D2]"
                          : "text-[#A1A4AA]"
                      }`}
                    >
                      {tab.count}
                    </span>
                  )}

                  <span
                    className={`absolute bottom-0 left-0 h-[3px] transition-all duration-200 ${
                      active
                        ? "w-full bg-[#20D6D2]"
                        : "w-0 bg-[#FFB7D5] group-hover:w-full"
                    }`}
                  />
                </button>
              );
            })}

          </div>

        </section>

        {/* SEARCH */}
        {activeTab !== "overview" && (
          <div className="mt-6">

            <div className="relative">

              <input
                type="search"
                value={search}
                onChange={(event) =>
                  setSearch(event.target.value)
                }
                placeholder={`Search ${
                  tabs
                    .find(
                      (tab) =>
                        tab.id === activeTab
                    )
                    ?.label.toLowerCase()
                }...`}
                className="w-full border-b-2 border-[#171A21]/15 bg-[#F8F8F8] px-5 py-4 text-sm font-semibold text-[#171A21] outline-none transition placeholder:text-[#A1A4AA] focus:border-[#20D6D2]"
              />

            </div>

          </div>
        )}

        {/* CONTENT */}
        <section className="mt-8">

          {/* OVERVIEW */}
          {activeTab === "overview" && (
            <div>

              <div className="grid gap-10 lg:grid-cols-[1.5fr_1fr]">

                {/* RESOURCE INDEX */}
                <div>

                  <div className="flex items-end justify-between border-b-2 border-[#171A21] pb-4">

                    <div>
                      <p className="text-[11px] font-black uppercase tracking-[0.2em] text-[#20D6D2]">
                        Resource Index
                      </p>

                      <h2 className="mt-2 text-2xl font-black text-[#171A21]">
                        Everything for this unit
                      </h2>
                    </div>

                    <span className="text-sm font-black text-[#747982]">
                      {totalResources}
                    </span>

                  </div>

                  <div className="mt-2">

                    <OverviewResource
                      number="01"
                      title="Lecture Notes"
                      description="Read and review uploaded lecture material."
                      count={notes.length}
                      accent="turquoise"
                      onClick={() =>
                        setTab("notes")
                      }
                    />

                    <OverviewResource
                      number="02"
                      title="CATs"
                      description="Review continuous assessment tests."
                      count={cats.length}
                      accent="pink"
                      onClick={() =>
                        setTab("cats")
                      }
                    />

                    <OverviewResource
                      number="03"
                      title="Assignments"
                      description="Access coursework and assignments."
                      count={assignments.length}
                      accent="lime"
                      onClick={() =>
                        setTab("assignments")
                      }
                    />

                    <OverviewResource
                      number="04"
                      title="Past Papers"
                      description="Practice with previous examinations."
                      count={pastPapers.length}
                      accent="violet"
                      onClick={() =>
                        setTab("past-papers")
                      }
                    />

                    <OverviewResource
                      number="05"
                      title="Exams"
                      description="View scheduled examinations."
                      count={exams.length}
                      accent="yellow"
                      onClick={() =>
                        setTab("exams")
                      }
                    />

                  </div>

                </div>

                {/* STUDY ROUTE */}
                <div>

                  <div className="border-l-4 border-[#8B5CF6] bg-[#F7F4FF] p-6">

                    <p className="text-[11px] font-black uppercase tracking-[0.2em] text-[#8B5CF6]">
                      Study Tools
                    </p>

                    <h2 className="mt-2 text-2xl font-black text-[#171A21]">
                      Study smarter
                    </h2>

                    <div className="mt-6">

                      <StudyAction
                        title="Ask DataSphere AI"
                        description="Explain concepts, solve problems and prepare for exams."
                        accent="violet"
                        href={`/ai-tutor?unit=${unit.id}`}
                      />

                      <StudyAction
                        title="GPA Calculator"
                        description="Calculate your semester or cumulative GPA."
                        accent="turquoise"
                        href="/gpa"
                      />

                      <button
                        type="button"
                        onClick={() =>
                          setTab("exams")
                        }
                        className="group block w-full border-b border-[#171A21]/10 py-5 text-left transition hover:pl-2"
                      >
                        <div className="flex items-center justify-between">

                          <div>
                            <h3 className="font-black text-[#171A21]">
                              Exam Schedule
                            </h3>

                            <p className="mt-1 text-sm leading-6 text-[#747982]">
                              Check examinations scheduled for this unit.
                            </p>
                          </div>

                          <span className="text-lg font-black text-[#FFD84D] transition-transform group-hover:translate-x-1">
                            →
                          </span>

                        </div>
                      </button>

                    </div>

                  </div>

                  {/* QUICK START */}
                  <div className="mt-8">

                    <div className="border-b-2 border-[#171A21] pb-4">

                      <p className="text-[11px] font-black uppercase tracking-[0.2em] text-[#FF6B6B]">
                        Quick Start
                      </p>

                      <h2 className="mt-2 text-2xl font-black text-[#171A21]">
                        Recommended route
                      </h2>

                    </div>

                    <div className="mt-5">

                      <Step
                        number="01"
                        text="Review the lecture notes."
                        accent="turquoise"
                      />

                      <Step
                        number="02"
                        text="Test yourself with CATs."
                        accent="pink"
                      />

                      <Step
                        number="03"
                        text="Complete your assignments."
                        accent="lime"
                      />

                      <Step
                        number="04"
                        text="Practice using past papers."
                        accent="violet"
                      />

                    </div>

                  </div>

                </div>

              </div>

            </div>
          )}

          {/* NOTES */}
          {activeTab === "notes" && (
            <ResourceSection
              title="Lecture Notes"
              description="Lecture notes and study materials uploaded for this unit."
              empty="No lecture notes have been uploaded for this unit yet."
              count={filteredNotes.length}
            >
              {filteredNotes.map((item) => (
                <ResourceRow
                  key={item.id}
                  number="NOTE"
                  title={item.title}
                  description={item.description}
                  meta={formatDate(item.created_at)}
                  accent="turquoise"
                  onOpen={() =>
                    openResource(item.file_url)
                  }
                />
              ))}
            </ResourceSection>
          )}

          {/* CATS */}
          {activeTab === "cats" && (
            <ResourceSection
              title="CATs"
              description="Continuous assessment tests for this unit."
              empty="No CATs have been uploaded for this unit yet."
              count={filteredCats.length}
            >
              {filteredCats.map((item) => (
                <ResourceRow
                  key={item.id}
                  number={
                    item.cat_number
                      ? `CAT ${item.cat_number}`
                      : "CAT"
                  }
                  title={item.title}
                  description={item.description}
                  meta={formatDate(item.created_at)}
                  accent="pink"
                  onOpen={() =>
                    openResource(item.file_url)
                  }
                />
              ))}
            </ResourceSection>
          )}

          {/* ASSIGNMENTS */}
          {activeTab === "assignments" && (
            <ResourceSection
              title="Assignments"
              description="Coursework and assignments for this unit."
              empty="No assignments have been uploaded for this unit yet."
              count={filteredAssignments.length}
            >
              {filteredAssignments.map((item) => (
                <ResourceRow
                  key={item.id}
                  number={
                    item.assignment_number
                      ? `A${item.assignment_number}`
                      : "ASSIGNMENT"
                  }
                  title={item.title}
                  description={item.description}
                  meta={formatDate(item.created_at)}
                  accent="lime"
                  onOpen={() =>
                    openResource(item.file_url)
                  }
                />
              ))}
            </ResourceSection>
          )}

          {/* PAST PAPERS */}
          {activeTab === "past-papers" && (
            <ResourceSection
              title="Past Papers"
              description="Previous examination papers for practice and revision."
              empty="No past papers have been uploaded for this unit yet."
              count={filteredPastPapers.length}
            >
              {filteredPastPapers.map((item) => (
                <ResourceRow
                  key={item.id}
                  number={
                    item.exam_year
                      ? String(item.exam_year)
                      : "PAPER"
                  }
                  title={item.title}
                  description={item.description}
                  meta={
                    item.exam_year
                      ? `${item.exam_year}${
                          item.exam_type
                            ? ` • ${item.exam_type}`
                            : ""
                        }`
                      : formatDate(
                          item.created_at
                        )
                  }
                  accent="violet"
                  onOpen={() =>
                    openResource(item.file_url)
                  }
                />
              ))}
            </ResourceSection>
          )}

          {/* EXAMS */}
          {activeTab === "exams" && (
            <ResourceSection
              title="Exams"
              description="Scheduled examinations and assessment information."
              empty="No examinations have been scheduled for this unit."
              count={filteredExams.length}
            >
              {filteredExams.map((exam) => (
                <ExamRow
                  key={exam.id}
                  exam={exam}
                  formatDate={formatDate}
                  formatTime={formatTime}
                />
              ))}
            </ResourceSection>
          )}

        </section>

      </div>
    </main>
  );
}

/* =========================================================
   STAT ITEM
========================================================= */

function StatItem({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent:
    | "turquoise"
    | "pink"
    | "lime"
    | "violet"
    | "yellow";
}) {
  const accentClasses = {
    turquoise: "border-t-[#20D6D2]",
    pink: "border-t-[#FFB7D5]",
    lime: "border-t-[#B8FF3D]",
    violet: "border-t-[#8B5CF6]",
    yellow: "border-t-[#FFD84D]",
  };

  return (
    <div
      className={`border-r border-t-4 border-[#171A21]/10 px-5 py-5 transition duration-200 hover:bg-[#FAFAFA] ${accentClasses[accent]}`}
    >
      <div className="text-3xl font-black text-[#171A21]">
        {value}
      </div>

      <div className="mt-2 text-[11px] font-black uppercase tracking-[0.12em] text-[#747982]">
        {label}
      </div>
    </div>
  );
}

/* =========================================================
   OVERVIEW RESOURCE
========================================================= */

function OverviewResource({
  number,
  title,
  description,
  count,
  accent,
  onClick,
}: {
  number: string;
  title: string;
  description: string;
  count: number;
  accent:
    | "turquoise"
    | "pink"
    | "lime"
    | "violet"
    | "yellow";
  onClick: () => void;
}) {
  const accentClasses = {
    turquoise:
      "group-hover:border-[#20D6D2] group-hover:bg-[#F1FFFE]",
    pink:
      "group-hover:border-[#FFB7D5] group-hover:bg-[#FFF5F9]",
    lime:
      "group-hover:border-[#B8FF3D] group-hover:bg-[#FAFFF0]",
    violet:
      "group-hover:border-[#8B5CF6] group-hover:bg-[#F8F5FF]",
    yellow:
      "group-hover:border-[#FFD84D] group-hover:bg-[#FFFDF0]",
  };

  return (
    <button
      type="button"
      onClick={onClick}
      className={`group flex w-full items-center gap-5 border-b border-[#171A21]/10 border-l-4 border-transparent px-4 py-5 text-left transition duration-200 hover:pl-6 ${accentClasses[accent]}`}
    >
      <span className="w-10 shrink-0 text-xs font-black text-[#A1A4AA]">
        {number}
      </span>

      <span className="min-w-0 flex-1">

        <span className="block font-black text-[#171A21]">
          {title}
        </span>

        <span className="mt-1 block text-sm leading-6 text-[#747982]">
          {description}
        </span>

      </span>

      <span className="shrink-0 text-sm font-black text-[#171A21]">
        {count}
      </span>

      <span className="shrink-0 text-lg font-black text-[#A1A4AA] transition-transform duration-200 group-hover:translate-x-1 group-hover:text-[#171A21]">
        →
      </span>

    </button>
  );
}

/* =========================================================
   STUDY ACTION
========================================================= */

function StudyAction({
  title,
  description,
  href,
  accent,
}: {
  title: string;
  description: string;
  href: string;
  accent: "violet" | "turquoise";
}) {
  const accentClasses =
    accent === "violet"
      ? "border-[#8B5CF6] hover:bg-white"
      : "border-[#20D6D2] hover:bg-white";

  return (
    <Link
      href={href}
      className={`group block border-b border-l-4 border-[#171A21]/10 py-5 pl-4 transition duration-200 hover:pl-6 ${accentClasses}`}
    >
      <div className="flex items-center justify-between gap-4">

        <div>

          <h3 className="font-black text-[#171A21]">
            {title}
          </h3>

          <p className="mt-1 text-sm leading-6 text-[#747982]">
            {description}
          </p>

        </div>

        <span className="font-black text-[#171A21] transition-transform group-hover:translate-x-1">
          →
        </span>

      </div>
    </Link>
  );
}

/* =========================================================
   STEP
========================================================= */

function Step({
  number,
  text,
  accent,
}: {
  number: string;
  text: string;
  accent:
    | "turquoise"
    | "pink"
    | "lime"
    | "violet";
}) {
  const accentClasses = {
    turquoise: "bg-[#20D6D2]",
    pink: "bg-[#FFB7D5]",
    lime: "bg-[#B8FF3D]",
    violet: "bg-[#8B5CF6] text-white",
  };

  return (
    <div className="group flex items-center gap-4 border-b border-[#171A21]/10 py-4">

      <span
        className={`grid h-9 w-9 shrink-0 place-items-center text-[10px] font-black ${accentClasses[accent]}`}
      >
        {number}
      </span>

      <span className="text-sm font-bold text-[#5E626B] transition-colors group-hover:text-[#171A21]">
        {text}
      </span>

    </div>
  );
}

/* =========================================================
   RESOURCE SECTION
========================================================= */

function ResourceSection({
  title,
  description,
  empty,
  count,
  children,
}: {
  title: string;
  description: string;
  empty: string;
  count: number;
  children: ReactNode;
}) {
  return (
    <div>

      <div className="flex flex-col gap-4 border-b-2 border-[#171A21] pb-5 sm:flex-row sm:items-end sm:justify-between">

        <div>

          <p className="text-[11px] font-black uppercase tracking-[0.2em] text-[#20D6D2]">
            Unit Workspace
          </p>

          <h2 className="mt-2 text-3xl font-black text-[#171A21]">
            {title}
          </h2>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#747982]">
            {description}
          </p>

        </div>

        <div className="text-sm font-black text-[#747982]">
          {count} {count === 1 ? "item" : "items"}
        </div>

      </div>

      {count === 0 ? (
        <div className="mt-8 border-l-4 border-[#FFD84D] bg-[#FFFDF0] px-6 py-10">

          <p className="text-xs font-black uppercase tracking-[0.18em] text-[#9A8010]">
            Nothing here yet
          </p>

          <p className="mt-3 text-sm font-semibold text-[#5E626B]">
            {empty}
          </p>

        </div>
      ) : (
        <div className="mt-2">
          {children}
        </div>
      )}

    </div>
  );
}

/* =========================================================
   RESOURCE ROW
========================================================= */

function ResourceRow({
  number,
  title,
  description,
  meta,
  accent,
  onOpen,
}: {
  number: string;
  title: string;
  description: string | null;
  meta: string;
  accent:
    | "turquoise"
    | "pink"
    | "lime"
    | "violet";
  onOpen: () => void;
}) {
  const accentClasses = {
    turquoise:
      "border-l-[#20D6D2] hover:bg-[#F3FFFE]",
    pink:
      "border-l-[#FFB7D5] hover:bg-[#FFF6FA]",
    lime:
      "border-l-[#B8FF3D] hover:bg-[#FAFFF2]",
    violet:
      "border-l-[#8B5CF6] hover:bg-[#F8F5FF]",
  };

  return (
    <article
      className={`group flex flex-col gap-5 border-b border-l-4 border-[#171A21]/10 px-4 py-6 transition duration-200 hover:pl-6 md:flex-row md:items-center ${accentClasses[accent]}`}
    >

      <div className="w-24 shrink-0 text-[11px] font-black uppercase tracking-[0.12em] text-[#A1A4AA]">
        {number}
      </div>

      <div className="min-w-0 flex-1">

        <h3 className="font-black text-[#171A21]">
          {title}
        </h3>

        {description && (
          <p className="mt-2 max-w-3xl line-clamp-2 text-sm leading-6 text-[#747982]">
            {description}
          </p>
        )}

        <p className="mt-2 text-xs font-bold text-[#A1A4AA]">
          {meta}
        </p>

      </div>

      <button
        type="button"
        onClick={onOpen}
        className="shrink-0 border-b-2 border-[#171A21] px-1 py-2 text-sm font-black text-[#171A21] transition hover:border-[#20D6D2] hover:text-[#20D6D2]"
      >
        Open →
      </button>

    </article>
  );
}

/* =========================================================
   EXAM ROW
========================================================= */

function ExamRow({
  exam,
  formatDate,
  formatTime,
}: {
  exam: Exam;
  formatDate: (
    value: string | null
  ) => string;
  formatTime: (
    value: string | null
  ) => string;
}) {
  return (
    <article className="border-b border-l-4 border-l-[#FFD84D] px-5 py-7 transition duration-200 hover:bg-[#FFFDF2]">

      <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">

        <div className="min-w-0">

          <div className="text-[11px] font-black uppercase tracking-[0.18em] text-[#A07D00]">
            {exam.exam_type}
          </div>

          <h3 className="mt-2 text-xl font-black text-[#171A21]">
            {exam.title}
          </h3>

        </div>

        <div className="shrink-0 text-sm font-black text-[#171A21]">
          {formatDate(exam.exam_date)}
        </div>

      </div>

      <div className="mt-6 grid gap-4 border-t border-[#171A21]/10 pt-5 sm:grid-cols-3">

        <InfoItem
          label="Date"
          value={formatDate(exam.exam_date)}
        />

        <InfoItem
          label="Time"
          value={
            exam.start_time
              ? `${formatTime(
                  exam.start_time
                )}${
                  exam.end_time
                    ? ` – ${formatTime(
                        exam.end_time
                      )}`
                    : ""
                }`
              : "Time not set"
          }
        />

        <InfoItem
          label="Venue"
          value={
            exam.venue || "Venue not set"
          }
        />

      </div>

      {exam.instructions && (
        <div className="mt-5 border-l-4 border-[#FFB7D5] bg-[#FFF7FA] px-5 py-4">

          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#A95D7B]">
            Instructions
          </p>

          <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[#5E626B]">
            {exam.instructions}
          </p>

        </div>
      )}

    </article>
  );
}

/* =========================================================
   INFO ITEM
========================================================= */

function InfoItem({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div>

      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#A1A4AA]">
        {label}
      </p>

      <p className="mt-2 text-sm font-bold text-[#171A21]">
        {value}
      </p>

    </div>
  );
}