"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "../../lib/supabase";

type CareerProfile = {
  target_roles: string[] | null;
  industries: string[] | null;
  preferred_locations: string[] | null;
  work_preference: string | null;
  experience_level: string | null;
  career_summary: string | null;
};

type CareerSkill = {
  skill_name: string;
  proficiency: number | null;
  category: string | null;
};

type PortfolioSkill = {
  name: string;
  proficiency: number | null;
};

type PortfolioProject = {
  title: string;
  description: string | null;
  technologies: string | null;
};

type Unit = {
  id: number;
  code: string;
  name: string;
  credit_hours: number | null;
};

type Assignment = {
  id: number;
  unit_id: number;
  title: string;
  max_points: number;
  due_date: string | null;
};

type Submission = {
  id: number;
  assignment_id: number;
  grade: number | null;
  status: string;
  submitted_at: string | null;
};

type Quiz = {
  id: number;
  unit_id: number;
  title: string;
  points_possible: number;
  published: boolean;
};

type QuizAttempt = {
  id: number;
  quiz_id: number;
  score: number | null;
  points_earned: number | null;
  points_possible: number | null;
  status: string;
};

type Opportunity = {
  id: number;
  title: string;
  company_name: string;
  skills_required: string[] | null;
  industry: string | null;
  opportunity_type: string;
};

type SkillGap = {
  skill: string;
  relatedUnits: Unit[];
  covered: boolean;
  evidence: string[];
};

const normalize = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^\w\s+#.-]/g, "")
    .replace(/\s+/g, " ");

const similarity = (
  a: string,
  b: string
) => {
  const left = normalize(a);
  const right = normalize(b);

  if (!left || !right) return 0;

  if (
    left === right ||
    left.includes(right) ||
    right.includes(left)
  ) {
    return 1;
  }

  const leftWords = new Set(
    left.split(" ")
  );

  const rightWords = new Set(
    right.split(" ")
  );

  const intersection = [
    ...leftWords,
  ].filter((word) =>
    rightWords.has(word)
  );

  const union = new Set([
    ...leftWords,
    ...rightWords,
  ]);

  return union.size
    ? intersection.length /
        union.size
    : 0;
};

const skillMatchesText = (
  skill: string,
  text: string
) => {
  const s = normalize(skill);
  const t = normalize(text);

  if (!s || !t) return false;

  if (
    t.includes(s) ||
    s.includes(t)
  ) {
    return true;
  }

  const skillWords = s.split(" ");

  return skillWords.some(
    (word) =>
      word.length > 2 &&
      t.includes(word)
  );
};

const getScore = (
  value: number | null,
  max: number
) => {
  if (
    value === null ||
    !Number.isFinite(value) ||
    max <= 0
  ) {
    return null;
  }

  return Math.max(
    0,
    Math.min(100, (value / max) * 100)
  );
};

const getPerformanceLabel = (
  percentage: number
) => {
  if (percentage >= 80)
    return "Excellent";

  if (percentage >= 70)
    return "Strong";

  if (percentage >= 60)
    return "Developing";

  if (percentage >= 50)
    return "Needs attention";

  return "High priority";
};

export default function CareerIntelligencePage() {
  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [careerProfile, setCareerProfile] =
    useState<CareerProfile | null>(
      null
    );

  const [careerSkills, setCareerSkills] =
    useState<CareerSkill[]>([]);

  const [portfolioSkills, setPortfolioSkills] =
    useState<PortfolioSkill[]>([]);

  const [projects, setProjects] =
    useState<PortfolioProject[]>([]);

  const [units, setUnits] =
    useState<Unit[]>([]);

  const [assignments, setAssignments] =
    useState<Assignment[]>([]);

  const [submissions, setSubmissions] =
    useState<Submission[]>([]);

  const [quizzes, setQuizzes] =
    useState<Quiz[]>([]);

  const [attempts, setAttempts] =
    useState<QuizAttempt[]>([]);

  const [opportunities, setOpportunities] =
    useState<Opportunity[]>([]);

  const [activeTab, setActiveTab] =
    useState<
      "overview" | "skills" | "learning"
    >("overview");

  /*
   * =========================================================
   * LOAD EVERYTHING
   * =========================================================
   */

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError("");

      const {
        data: auth,
      } = await supabase.auth.getUser();

      const user = auth.user;

      if (!user) {
        setError(
          "Please sign in to view Career Intelligence."
        );
        setLoading(false);
        return;
      }

      const [
        profileResult,
        careerSkillsResult,
        portfolioSkillsResult,
        projectsResult,
        unitsResult,
        assignmentsResult,
        submissionsResult,
        quizzesResult,
        attemptsResult,
        opportunitiesResult,
      ] = await Promise.all([
        supabase
          .from("career_profiles")
          .select(
            "target_roles,industries,preferred_locations,work_preference,experience_level,career_summary"
          )
          .eq("user_id", user.id)
          .maybeSingle(),

        supabase
          .from("career_skills")
          .select(
            "skill_name,proficiency,category"
          )
          .eq("user_id", user.id),

        supabase
          .from("portfolio_skills")
          .select(
            "name,proficiency"
          )
          .eq("user_id", user.id),

        supabase
          .from("portfolio_projects")
          .select(
            "title,description,technologies"
          )
          .eq("user_id", user.id),

        supabase
          .from("units")
          .select(
            "id,code,name,credit_hours"
          )
          .order("code"),

        supabase
          .from("assignments")
          .select(
            "id,unit_id,title,max_points,due_date"
          ),

        supabase
          .from("assignment_submissions")
          .select(
            "id,assignment_id,grade,status,submitted_at"
          )
          .eq(
            "student_id",
            user.id
          ),

        supabase
          .from("quizzes")
          .select(
            "id,unit_id,title,points_possible,published"
          )
          .eq(
            "published",
            true
          ),

        supabase
          .from("quiz_attempts")
          .select(
            "id,quiz_id,score,points_earned,points_possible,status"
          )
          .eq(
            "student_id",
            user.id
          ),

        supabase
          .from("career_opportunities")
          .select(
            "id,title,company_name,skills_required,industry,opportunity_type"
          )
          .eq(
            "is_active",
            true
          ),
      ]);

      if (profileResult.error) {
        console.error(
          profileResult.error
        );
      }

      if (
        careerSkillsResult.error
      ) {
        console.error(
          careerSkillsResult.error
        );
      }

      if (
        portfolioSkillsResult.error
      ) {
        console.error(
          portfolioSkillsResult.error
        );
      }

      if (projectsResult.error) {
        console.error(
          projectsResult.error
        );
      }

      if (unitsResult.error) {
        console.error(
          unitsResult.error
        );
      }

      if (
        assignmentsResult.error
      ) {
        console.error(
          assignmentsResult.error
        );
      }

      if (
        submissionsResult.error
      ) {
        console.error(
          submissionsResult.error
        );
      }

      if (quizzesResult.error) {
        console.error(
          quizzesResult.error
        );
      }

      if (attemptsResult.error) {
        console.error(
          attemptsResult.error
        );
      }

      if (
        opportunitiesResult.error
      ) {
        console.error(
          opportunitiesResult.error
        );
      }

      setCareerProfile(
        profileResult.data
          ? (profileResult.data as CareerProfile)
          : null
      );

      setCareerSkills(
        (careerSkillsResult.data ||
          []) as CareerSkill[]
      );

      setPortfolioSkills(
        (portfolioSkillsResult.data ||
          []) as PortfolioSkill[]
      );

      setProjects(
        (projectsResult.data ||
          []) as PortfolioProject[]
      );

      setUnits(
        (unitsResult.data ||
          []) as Unit[]
      );

      setAssignments(
        (assignmentsResult.data ||
          []) as Assignment[]
      );

      setSubmissions(
        (submissionsResult.data ||
          []) as Submission[]
      );

      setQuizzes(
        (quizzesResult.data ||
          []) as Quiz[]
      );

      setAttempts(
        (attemptsResult.data ||
          []) as QuizAttempt[]
      );

      setOpportunities(
        (opportunitiesResult.data ||
          []) as Opportunity[]
      );

      setLoading(false);
    };

    load();
  }, []);

  /*
   * =========================================================
   * TARGET ROLE
   * =========================================================
   */

  const targetRole = useMemo(() => {
    return (
      careerProfile?.target_roles?.[0] ||
      "Your target career"
    );
  }, [careerProfile]);

  /*
   * =========================================================
   * COMBINE STUDENT SKILLS
   * =========================================================
   */

  const candidateSkills = useMemo(() => {
    const map = new Map<
      string,
      {
        name: string;
        proficiency: number;
        sources: string[];
      }
    >();

    careerSkills.forEach(
      (skill) => {
        const key = normalize(
          skill.skill_name
        );

        if (!key) return;

        const existing =
          map.get(key);

        const proficiency =
          skill.proficiency ?? 50;

        if (!existing) {
          map.set(key, {
            name: skill.skill_name,
            proficiency,
            sources: [
              "Career profile",
            ],
          });
        } else {
          existing.proficiency =
            Math.max(
              existing.proficiency,
              proficiency
            );

          if (
            !existing.sources.includes(
              "Career profile"
            )
          ) {
            existing.sources.push(
              "Career profile"
            );
          }
        }
      }
    );

    portfolioSkills.forEach(
      (skill) => {
        const key = normalize(
          skill.name
        );

        if (!key) return;

        const proficiency =
          skill.proficiency ?? 60;

        const existing =
          map.get(key);

        if (!existing) {
          map.set(key, {
            name: skill.name,
            proficiency,
            sources: [
              "Portfolio",
            ],
          });
        } else {
          existing.proficiency =
            Math.max(
              existing.proficiency,
              proficiency
            );

          if (
            !existing.sources.includes(
              "Portfolio"
            )
          ) {
            existing.sources.push(
              "Portfolio"
            );
          }
        }
      }
    );

    projects.forEach(
      (project) => {
        if (!project.technologies)
          return;

        project.technologies
          .split(",")
          .map((item) =>
            item.trim()
          )
          .filter(Boolean)
          .forEach((technology) => {
            const key = normalize(
              technology
            );

            const existing =
              map.get(key);

            if (!existing) {
              map.set(key, {
                name: technology,
                proficiency: 55,
                sources: [
                  "Portfolio project",
                ],
              });
            } else if (
              !existing.sources.includes(
                "Portfolio project"
              )
            ) {
              existing.sources.push(
                "Portfolio project"
              );
            }
          });
      }
    );

    return Array.from(
      map.values()
    ).sort(
      (a, b) =>
        b.proficiency -
        a.proficiency
    );
  }, [
    careerSkills,
    portfolioSkills,
    projects,
  ]);

  /*
   * =========================================================
   * ROLE MATCHING
   * =========================================================
   */

  const roleOpportunities =
    useMemo(() => {
      const role =
        careerProfile?.target_roles?.[0] ||
        "";

      if (!role) {
        return opportunities.slice(
          0,
          10
        );
      }

      const scored =
        opportunities.map(
          (opportunity) => {
            const score = similarity(
              role,
              opportunity.title
            );

            return {
              opportunity,
              score,
            };
          }
        );

      scored.sort(
        (a, b) =>
          b.score - a.score
      );

      const matched =
        scored.filter(
          (item) =>
            item.score >= 0.15
        );

      return (
        matched.length
          ? matched
          : scored
      )
        .slice(0, 12)
        .map(
          (item) =>
            item.opportunity
        );
    }, [
      opportunities,
      careerProfile,
    ]);

  /*
   * =========================================================
   * REQUIRED SKILLS
   * =========================================================
   */

  const requiredSkills =
    useMemo(() => {
      const map = new Map<
        string,
        {
          name: string;
          frequency: number;
        }
      >();

      roleOpportunities.forEach(
        (opportunity) => {
          (
            opportunity.skills_required ||
            []
          ).forEach((skill) => {
            const key =
              normalize(skill);

            if (!key) return;

            const existing =
              map.get(key);

            if (existing) {
              existing.frequency++;
            } else {
              map.set(key, {
                name: skill,
                frequency: 1,
              });
            }
          });
        }
      );

      return Array.from(
        map.values()
      ).sort(
        (a, b) =>
          b.frequency -
          a.frequency
      );
    }, [roleOpportunities]);

  /*
   * =========================================================
   * SKILL GAP ANALYSIS
   * =========================================================
   */

  const skillGaps = useMemo(() => {
    const candidate =
      candidateSkills;

    return requiredSkills.map(
      (required) => {
        const matching =
          candidate.find(
            (studentSkill) =>
              similarity(
                studentSkill.name,
                required.name
              ) >= 0.45
          );

        const relatedUnits =
          units
            .map((unit) => {
              const unitText = `${unit.code} ${unit.name}`;

              return {
                unit,
                score: similarity(
                  required.name,
                  unitText
                ),
              };
            })
            .filter(
              (item) =>
                item.score >= 0.2
            )
            .sort(
              (a, b) =>
                b.score - a.score
            )
            .slice(0, 3)
            .map(
              (item) =>
                item.unit
            );

        const evidence: string[] =
          [];

        if (matching) {
          evidence.push(
            `Found in ${matching.sources.join(
              ", "
            )}`
          );

          if (
            matching.proficiency >=
            80
          ) {
            evidence.push(
              "Strong proficiency"
            );
          } else if (
            matching.proficiency >=
            60
          ) {
            evidence.push(
              "Working proficiency"
            );
          } else {
            evidence.push(
              "Needs development"
            );
          }
        } else {
          evidence.push(
            "No current evidence in your profile"
          );
        }

        return {
          skill: required.name,
          relatedUnits,
          covered:
            !!matching &&
            matching.proficiency >=
              60,
          evidence,
        } satisfies SkillGap;
      }
    );
  }, [
    candidateSkills,
    requiredSkills,
    units,
  ]);

  /*
   * =========================================================
   * LEARNING UNITS
   * =========================================================
   */

  const recommendedUnits =
    useMemo(() => {
      const missing =
        skillGaps.filter(
          (gap) =>
            !gap.covered
        );

      const unitMap = new Map<
        number,
        {
          unit: Unit;
          score: number;
          skills: string[];
        }
      >();

      missing.forEach((gap) => {
        gap.relatedUnits.forEach(
          (unit) => {
            const existing =
              unitMap.get(unit.id);

            if (existing) {
              existing.score++;
              existing.skills.push(
                gap.skill
              );
            } else {
              unitMap.set(unit.id, {
                unit,
                score: 1,
                skills: [
                  gap.skill,
                ],
              });
            }
          }
        );
      });

      return Array.from(
        unitMap.values()
      )
        .sort(
          (a, b) =>
            b.score - a.score
        )
        .slice(0, 8);
    }, [skillGaps]);

  /*
   * =========================================================
   * UNIT PERFORMANCE
   * =========================================================
   */

  const unitPerformance =
    useMemo(() => {
      return units
        .map((unit) => {
          const unitAssignments =
            assignments.filter(
              (item) =>
                item.unit_id ===
                unit.id
            );

          const assignmentScores =
            unitAssignments
              .map((assignment) => {
                const matching =
                  submissions
                    .filter(
                      (submission) =>
                        submission.assignment_id ===
                        assignment.id &&
                        submission.grade !==
                          null
                    )
                    .sort(
                      (a, b) => {
                        const aDate =
                          a.submitted_at
                            ? new Date(
                                a.submitted_at
                              ).getTime()
                            : 0;

                        const bDate =
                          b.submitted_at
                            ? new Date(
                                b.submitted_at
                              ).getTime()
                            : 0;

                        return (
                          bDate -
                          aDate
                        );
                      }
                    )[0];

                if (!matching)
                  return null;

                return getScore(
                  matching.grade,
                  assignment.max_points
                );
              })
              .filter(
                (
                  value
                ): value is number =>
                  value !== null
              );

          const unitQuizzes =
            quizzes.filter(
              (quiz) =>
                quiz.unit_id ===
                unit.id
            );

          const quizScores =
            unitQuizzes
              .map((quiz) => {
                const matching =
                  attempts
                    .filter(
                      (attempt) =>
                        attempt.quiz_id ===
                          quiz.id &&
                        (attempt.points_earned !==
                          null ||
                          attempt.score !==
                            null)
                    )
                    .map(
                      (
                        attempt
                      ) => {
                        if (
                          attempt.score !==
                            null
                        ) {
                          return Math.max(
                            0,
                            Math.min(
                              100,
                              Number(
                                attempt.score
                              )
                            )
                          );
                        }

                        return getScore(
                          attempt.points_earned,
                          attempt.points_possible ??
                            quiz.points_possible
                        );
                      }
                    )
                    .filter(
                      (
                        value
                      ): value is number =>
                        value !==
                        null
                    );

                return matching.length
                  ? Math.max(
                      ...matching
                    )
                  : null;
              })
              .filter(
                (
                  value
                ): value is number =>
                  value !== null
              );

          const allScores = [
            ...assignmentScores,
            ...quizScores,
          ];

          const percentage =
            allScores.length
              ? allScores.reduce(
                  (
                    total,
                    score
                  ) =>
                    total + score,
                  0
                ) /
                allScores.length
              : null;

          return {
            unit,
            percentage,
            assessments:
              allScores.length,
          };
        })
        .filter(
          (item) =>
            item.assessments >
            0
        )
        .sort(
          (a, b) =>
            (a.percentage ?? 0) -
            (b.percentage ?? 0)
        );
    }, [
      units,
      assignments,
      submissions,
      quizzes,
      attempts,
    ]);

  /*
   * =========================================================
   * CAREER READINESS
   * =========================================================
   */

  const readiness = useMemo(() => {
    if (!requiredSkills.length)
      return 0;

    const covered =
      skillGaps.filter(
        (gap) =>
          gap.covered
      ).length;

    return Math.round(
      (covered /
        requiredSkills.length) *
        100
    );
  }, [
    requiredSkills,
    skillGaps,
  ]);

  /*
   * =========================================================
   * ACADEMIC PERFORMANCE
   * =========================================================
   */

  const academicScore =
    useMemo(() => {
      const scores =
        unitPerformance
          .map(
            (item) =>
              item.percentage
          )
          .filter(
            (
              value
            ): value is number =>
              value !== null
          );

      if (!scores.length)
        return null;

      return Math.round(
        scores.reduce(
          (sum, score) =>
            sum + score,
          0
        ) / scores.length
      );
    }, [unitPerformance]);

  /*
   * =========================================================
   * OVERALL INTELLIGENCE SCORE
   * =========================================================
   */

  const intelligenceScore =
    useMemo(() => {
      const career =
        readiness;

      const academic =
        academicScore ?? 50;

      const portfolio =
        Math.min(
          100,
          projects.length * 25 +
            portfolioSkills.length *
              8
        );

      const profile =
        careerProfile
          ? Math.min(
              100,
              (careerProfile
                .target_roles
                ?.length || 0) *
                35 +
                (careerProfile
                  .industries
                  ?.length || 0) *
                  20 +
                (careerProfile
                  .career_summary
                  ? 25
                  : 0)
            )
          : 0;

      return Math.round(
        career * 0.45 +
          academic * 0.25 +
          portfolio * 0.2 +
          profile * 0.1
      );
    }, [
      readiness,
      academicScore,
      projects,
      portfolioSkills,
      careerProfile,
    ]);

  /*
   * =========================================================
   * PRIORITY GAPS
   * =========================================================
   */

  const priorityGaps =
    useMemo(() => {
      return skillGaps
        .filter(
          (gap) =>
            !gap.covered
        )
        .slice(0, 6);
    }, [skillGaps]);

  /*
   * =========================================================
   * STATES
   * =========================================================
   */

  if (loading) {
    return (
      <main className="min-h-screen bg-[#070b12] text-white">
        <div className="grid min-h-screen place-items-center">
          <div className="text-center">
            <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-2 border-white/10 border-t-cyan-400" />

            <p className="text-sm text-white/40">
              Building your career intelligence...
            </p>
          </div>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen bg-[#070b12] px-5 py-10 text-white">
        <div className="mx-auto max-w-xl rounded-3xl border border-red-400/10 bg-white/[0.03] p-8 text-center">
          <h1 className="text-xl font-semibold">
            Career Intelligence
          </h1>

          <p className="mt-3 text-sm text-white/40">
            {error}
          </p>

          <Link
            href="/career"
            className="mt-6 inline-flex rounded-xl bg-cyan-400 px-5 py-3 text-sm font-semibold text-slate-950"
          >
            Back to Career Hub
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#070b12] text-white">
      <div className="mx-auto max-w-7xl px-5 py-8 md:px-8">
        {/* HEADER */}

        <header className="mb-8">
          <Link
            href="/career"
            className="text-xs text-cyan-300 hover:text-cyan-200"
          >
            ← Career Hub
          </Link>

          <div className="mt-5 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="mb-2 flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-cyan-300">
                <span className="h-2 w-2 rounded-full bg-cyan-400" />

                Career Intelligence
              </div>

              <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
                Your path to{" "}
                <span className="text-cyan-300">
                  {targetRole}
                </span>
              </h1>

              <p className="mt-3 max-w-3xl text-sm leading-6 text-white/45">
                DataSphere combines your
                career profile, skills,
                portfolio, academic
                performance and available
                learning resources to identify
                what you should work on next.
              </p>
            </div>

            <Link
              href="/ai-tutor"
              className="rounded-xl border border-cyan-400/20 bg-cyan-400/5 px-5 py-3 text-center text-sm font-semibold text-cyan-300 hover:bg-cyan-400/10"
            >
              Ask AI Tutor for a roadmap →
            </Link>
          </div>
        </header>

        {/* HERO SCORE */}

        <section className="mb-6 grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-cyan-400/[0.08] via-white/[0.03] to-transparent p-6 md:p-8">
            <div className="flex flex-col gap-8 md:flex-row md:items-center">
              <ScoreRing
                score={
                  intelligenceScore
                }
              />

              <div className="flex-1">
                <div className="text-xs uppercase tracking-widest text-white/30">
                  Career intelligence
                  score
                </div>

                <h2 className="mt-2 text-2xl font-semibold">
                  {intelligenceScore >=
                  80
                    ? "You are building strong momentum."
                    : intelligenceScore >=
                      60
                    ? "You have a solid foundation."
                    : "Your roadmap has clear opportunities for growth."}
                </h2>

                <p className="mt-3 max-w-2xl text-sm leading-6 text-white/40">
                  This is an advisory score,
                  not an employment prediction.
                  It reflects the evidence currently
                  available inside DataSphere.
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
            <MiniScore
              label="Role readiness"
              value={readiness}
              detail={`${skillGaps.filter(
                (gap) =>
                  gap.covered
              ).length} of ${
                requiredSkills.length
              } identified skills covered`}
            />

            <MiniScore
              label="Academic performance"
              value={
                academicScore ??
                0
              }
              detail={
                academicScore ===
                null
                  ? "Not enough assessment data yet"
                  : getPerformanceLabel(
                      academicScore
                    )
              }
            />
          </div>
        </section>

        {/* TABS */}

        <nav className="mb-6 flex overflow-x-auto rounded-2xl border border-white/10 bg-white/[0.03] p-1">
          {[
            [
              "overview",
              "Overview",
            ],
            [
              "skills",
              "Skill Gaps",
            ],
            [
              "learning",
              "Learning Path",
            ],
          ].map(
            ([value, label]) => (
              <button
                key={value}
                onClick={() =>
                  setActiveTab(
                    value as
                      | "overview"
                      | "skills"
                      | "learning"
                  )
                }
                className={`flex-1 whitespace-nowrap rounded-xl px-5 py-3 text-sm transition ${
                  activeTab ===
                  value
                    ? "bg-white/10 text-white"
                    : "text-white/35 hover:text-white"
                }`}
              >
                {label}
              </button>
            )
          )}
        </nav>

        {/* =====================================================
            OVERVIEW
        ====================================================== */}

        {activeTab ===
          "overview" && (
          <>
            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <InsightCard
                icon="◎"
                title="Target role"
                value={
                  targetRole
                }
                detail={
                  careerProfile
                    ?.industries
                    ?.join(
                      ", "
                    ) ||
                  "Industry not specified"
                }
              />

              <InsightCard
                icon="◆"
                title="Skill inventory"
                value={`${candidateSkills.length}`}
                detail="Career + portfolio + projects"
              />

              <InsightCard
                icon="▣"
                title="Portfolio projects"
                value={`${projects.length}`}
                detail="Evidence of practical work"
              />

              <InsightCard
                icon="◈"
                title="Learning priorities"
                value={`${priorityGaps.length}`}
                detail="Skills requiring attention"
              />
            </section>

            <section className="mt-6 grid gap-5 lg:grid-cols-2">
              <Panel
                title="What you are already bringing"
                subtitle="Evidence DataSphere found in your profile."
              >
                <div className="space-y-3">
                  {candidateSkills
                    .slice(0, 8)
                    .map(
                      (skill) => (
                        <div
                          key={
                            skill.name
                          }
                          className="flex items-center gap-4"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex justify-between gap-3">
                              <span className="truncate text-sm font-medium">
                                {
                                  skill.name
                                }
                              </span>

                              <span className="text-xs text-white/30">
                                {
                                  skill.proficiency
                                }
                                %
                              </span>
                            </div>

                            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/5">
                              <div
                                className="h-full rounded-full bg-cyan-400"
                                style={{
                                  width: `${Math.min(
                                    100,
                                    skill.proficiency
                                  )}%`,
                                }}
                              />
                            </div>

                            <div className="mt-1 text-[10px] text-white/25">
                              {skill.sources.join(
                                " · "
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    )}

                  {!candidateSkills.length && (
                    <EmptyState text="Add skills to Career Hub and Portfolio to improve this analysis." />
                  )}
                </div>
              </Panel>

              <Panel
                title="Your strongest academic areas"
                subtitle="Based on available assignment and quiz results."
              >
                <div className="space-y-3">
                  {unitPerformance
                    .slice()
                    .sort(
                      (a, b) =>
                        (b.percentage ??
                          0) -
                        (a.percentage ??
                          0)
                    )
                    .slice(0, 6)
                    .map(
                      (item) => (
                        <div
                          key={
                            item.unit
                              .id
                          }
                          className="flex items-center justify-between rounded-xl border border-white/5 bg-white/[0.02] p-3"
                        >
                          <div>
                            <div className="text-xs font-semibold text-cyan-300">
                              {
                                item
                                  .unit
                                  .code
                              }
                            </div>

                            <div className="mt-1 text-sm">
                              {
                                item
                                  .unit
                                  .name
                              }
                            </div>
                          </div>

                          <div className="text-right">
                            <div className="text-sm font-semibold">
                              {Math.round(
                                item.percentage ??
                                  0
                              )}
                              %
                            </div>

                            <div className="text-[10px] text-white/25">
                              {
                                item
                                  .assessments
                              }{" "}
                              assessments
                            </div>
                          </div>
                        </div>
                      )
                    )}

                  {!unitPerformance.length && (
                    <EmptyState text="Complete assignments or quizzes to build academic evidence." />
                  )}
                </div>
              </Panel>
            </section>

            <section className="mt-6 rounded-3xl border border-orange-400/10 bg-orange-400/[0.03] p-6">
              <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
                <div>
                  <div className="text-xs uppercase tracking-widest text-orange-300/70">
                    Highest-value next step
                  </div>

                  <h2 className="mt-2 text-xl font-semibold">
                    {priorityGaps.length
                      ? `Strengthen ${priorityGaps[0].skill}`
                      : "Keep building career evidence"}
                  </h2>

                  <p className="mt-2 max-w-2xl text-sm leading-6 text-white/40">
                    {priorityGaps.length
                      ? "This skill appears in your target-role opportunity set but does not yet have enough evidence in your profile."
                      : "Your current profile has no major detected skill gaps from the available opportunity data."}
                  </p>
                </div>

                <button
                  onClick={() =>
                    setActiveTab(
                      "learning"
                    )
                  }
                  className="rounded-xl bg-orange-300 px-5 py-3 text-sm font-semibold text-slate-950 hover:bg-orange-200"
                >
                  View learning path
                </button>
              </div>
            </section>
          </>
        )}

        {/* =====================================================
            SKILLS
        ====================================================== */}

        {activeTab ===
          "skills" && (
          <>
            <section className="mb-6 rounded-3xl border border-white/10 bg-white/[0.03] p-6">
              <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
                <div>
                  <div className="text-xs uppercase tracking-widest text-white/30">
                    Target role analysis
                  </div>

                  <h2 className="mt-2 text-2xl font-semibold">
                    {targetRole}
                  </h2>

                  <p className="mt-2 max-w-2xl text-sm leading-6 text-white/40">
                    Required skills are inferred
                    from the active Career Hub
                    opportunities most relevant
                    to your target role.
                  </p>
                </div>

                <div className="text-right">
                  <div className="text-4xl font-bold text-cyan-300">
                    {readiness}%
                  </div>

                  <div className="text-xs text-white/30">
                    role readiness
                  </div>
                </div>
              </div>
            </section>

            <section className="space-y-3">
              {skillGaps.map(
                (gap) => (
                  <article
                    key={
                      gap.skill
                    }
                    className={`rounded-2xl border p-5 ${
                      gap.covered
                        ? "border-green-400/10 bg-green-400/[0.025]"
                        : "border-orange-400/10 bg-orange-400/[0.025]"
                    }`}
                  >
                    <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                      <div className="flex gap-4">
                        <div
                          className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${
                            gap.covered
                              ? "bg-green-400/10 text-green-300"
                              : "bg-orange-400/10 text-orange-300"
                          }`}
                        >
                          {gap.covered
                            ? "✓"
                            : "!"}
                        </div>

                        <div>
                          <h3 className="font-semibold">
                            {
                              gap.skill
                            }
                          </h3>

                          <div className="mt-1 text-xs text-white/35">
                            {gap.covered
                              ? "Covered"
                              : "Skill gap"}
                          </div>

                          <div className="mt-3 flex flex-wrap gap-2">
                            {gap.evidence.map(
                              (
                                evidence
                              ) => (
                                <span
                                  key={
                                    evidence
                                  }
                                  className="rounded-lg border border-white/5 bg-white/[0.03] px-2.5 py-1.5 text-[10px] text-white/40"
                                >
                                  {
                                    evidence
                                  }
                                </span>
                              )
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="lg:w-96">
                        <div className="mb-2 text-[10px] uppercase tracking-wider text-white/25">
                          Related DataSphere
                          units
                        </div>

                        <div className="flex flex-wrap gap-2">
                          {gap.relatedUnits.length ? (
                            gap.relatedUnits.map(
                              (
                                unit
                              ) => (
                                <Link
                                  key={
                                    unit.id
                                  }
                                  href={`/units/${unit.id}`}
                                  className="rounded-lg border border-cyan-400/10 bg-cyan-400/5 px-3 py-2 text-xs text-cyan-300 hover:bg-cyan-400/10"
                                >
                                  {
                                    unit.code
                                  }
                                </Link>
                              )
                            )
                          ) : (
                            <span className="text-xs text-white/25">
                              No directly
                              matched
                              unit found.
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </article>
                )
              )}

              {!skillGaps.length && (
                <EmptyState
                  text="No required skills have been inferred yet. Add career opportunities with required skills to unlock this analysis."
                  large
                />
              )}
            </section>
          </>
        )}

        {/* =====================================================
            LEARNING PATH
        ====================================================== */}

        {activeTab ===
          "learning" && (
          <>
            <section className="mb-6 rounded-3xl border border-cyan-400/10 bg-cyan-400/[0.03] p-6">
              <div className="text-xs uppercase tracking-widest text-cyan-300/70">
                Personalized learning path
              </div>

              <h2 className="mt-2 text-2xl font-semibold">
                Close the gaps between
                where you are and{" "}
                {targetRole}.
              </h2>

              <p className="mt-2 max-w-3xl text-sm leading-6 text-white/40">
                DataSphere prioritizes skills
                that appear in relevant
                opportunities and maps them to
                units already available in the
                platform.
              </p>
            </section>

            <div className="space-y-4">
              {recommendedUnits.map(
                (
                  recommendation,
                  index
                ) => (
                  <article
                    key={
                      recommendation
                        .unit.id
                    }
                    className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] p-6"
                  >
                    <div className="absolute left-0 top-0 h-full w-1 bg-cyan-400/70" />

                    <div className="flex flex-col gap-5 md:flex-row md:items-center">
                      <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-cyan-400/10 text-lg font-bold text-cyan-300">
                        {index + 1}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-semibold text-cyan-300">
                          {
                            recommendation
                              .unit
                              .code
                          }
                        </div>

                        <h3 className="mt-1 text-lg font-semibold">
                          {
                            recommendation
                              .unit
                              .name
                          }
                        </h3>

                        <p className="mt-2 text-sm text-white/35">
                          This unit is
                          connected to
                          skills you
                          currently need
                          to strengthen.
                        </p>

                        <div className="mt-3 flex flex-wrap gap-2">
                          {recommendation.skills.map(
                            (
                              skill
                            ) => (
                              <span
                                key={
                                  skill
                                }
                                className="rounded-lg bg-white/[0.04] px-2.5 py-1.5 text-[10px] text-white/45"
                              >
                                {
                                  skill
                                }
                              </span>
                            )
                          )}
                        </div>
                      </div>

                      <Link
                        href={`/units/${recommendation.unit.id}`}
                        className="rounded-xl bg-cyan-400 px-5 py-3 text-center text-xs font-semibold text-slate-950 hover:bg-cyan-300"
                      >
                        Open unit
                      </Link>
                    </div>
                  </article>
                )
              )}

              {!recommendedUnits.length && (
                <div className="rounded-3xl border border-green-400/10 bg-green-400/[0.025] p-8 text-center">
                  <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-green-400/10 text-2xl text-green-300">
                    ✓
                  </div>

                  <h2 className="mt-5 text-xl font-semibold">
                    No major learning gaps
                    detected
                  </h2>

                  <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-white/35">
                    Continue strengthening
                    your portfolio and
                    academic evidence while
                    monitoring new
                    opportunities.
                  </p>
                </div>
              )}
            </div>

            {/* AI HANDOFF */}

            <section className="mt-6 rounded-3xl border border-white/10 bg-white/[0.03] p-6">
              <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
                <div>
                  <div className="text-xs uppercase tracking-widest text-white/25">
                    Next generation layer
                  </div>

                  <h2 className="mt-2 text-xl font-semibold">
                    Turn this analysis into
                    a study plan.
                  </h2>

                  <p className="mt-2 max-w-2xl text-sm leading-6 text-white/40">
                    The AI Tutor can take these
                    career gaps and turn them
                    into a personalized study
                    schedule, explanations,
                    practice questions,
                    projects and revision
                    sessions.
                  </p>
                </div>

                <Link
                  href="/ai-tutor"
                  className="rounded-xl bg-white px-5 py-3 text-center text-sm font-semibold text-slate-950 hover:bg-white/90"
                >
                  Continue with AI Tutor →
                </Link>
              </div>
            </section>
          </>
        )}
      </div>
    </main>
  );
}

/* =========================================================
   COMPONENTS
========================================================= */

function ScoreRing({
  score,
}: {
  score: number;
}) {
  const safeScore =
    Math.max(
      0,
      Math.min(100, score)
    );

  const radius = 48;
  const circumference =
    2 *
    Math.PI *
    radius;

  const offset =
    circumference -
    (safeScore / 100) *
      circumference;

  return (
    <div className="relative h-32 w-32 shrink-0">
      <svg
        className="h-full w-full -rotate-90"
        viewBox="0 0 120 120"
      >
        <circle
          cx="60"
          cy="60"
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth="8"
        />

        <circle
          cx="60"
          cy="60"
          r={radius}
          fill="none"
          stroke="currentColor"
          className="text-cyan-400"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={
            circumference
          }
          strokeDashoffset={
            offset
          }
        />
      </svg>

      <div className="absolute inset-0 grid place-items-center">
        <div className="text-center">
          <div className="text-3xl font-bold">
            {safeScore}
          </div>

          <div className="text-[9px] uppercase tracking-wider text-white/25">
            score
          </div>
        </div>
      </div>
    </div>
  );
}

function MiniScore({
  label,
  value,
  detail,
}: {
  label: string;
  value: number;
  detail: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
      <div className="flex items-center justify-between">
        <span className="text-xs text-white/35">
          {label}
        </span>

        <span className="text-lg font-bold text-cyan-300">
          {value}%
        </span>
      </div>

      <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/5">
        <div
          className="h-full rounded-full bg-cyan-400"
          style={{
            width: `${Math.max(
              0,
              Math.min(100, value)
            )}%`,
          }}
        />
      </div>

      <p className="mt-2 text-[10px] text-white/25">
        {detail}
      </p>
    </div>
  );
}

function InsightCard({
  icon,
  title,
  value,
  detail,
}: {
  icon: string;
  title: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
      <div className="flex items-center gap-3">
        <div className="grid h-9 w-9 place-items-center rounded-xl bg-cyan-400/10 text-cyan-300">
          {icon}
        </div>

        <span className="text-xs text-white/35">
          {title}
        </span>
      </div>

      <div className="mt-4 truncate text-xl font-semibold">
        {value}
      </div>

      <div className="mt-1 truncate text-[10px] text-white/25">
        {detail}
      </div>
    </div>
  );
}

function Panel({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
      <h2 className="text-lg font-semibold">
        {title}
      </h2>

      <p className="mt-1 text-xs text-white/30">
        {subtitle}
      </p>

      <div className="mt-5">
        {children}
      </div>
    </section>
  );
}

function EmptyState({
  text,
  large = false,
}: {
  text: string;
  large?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border border-dashed border-white/10 text-center ${
        large
          ? "p-12"
          : "p-8"
      }`}
    >
      <div className="mx-auto grid h-10 w-10 place-items-center rounded-xl bg-white/[0.04] text-white/25">
        +
      </div>

      <p className="mx-auto mt-3 max-w-md text-xs leading-5 text-white/30">
        {text}
      </p>
    </div>
  );
}