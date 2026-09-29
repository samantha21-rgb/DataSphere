"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "../lib/supabase";

type CareerProfile = {
  id?: number;
  user_id: string;
  target_roles: string[] | null;
  industries: string[] | null;
  preferred_locations: string[] | null;
  work_preference: string | null;
  experience_level: string | null;
  career_summary: string | null;
};

type Skill = {
  id: number;
  user_id: string;
  skill_name: string;
  category: string | null;
  proficiency: number | null;
};

type Opportunity = {
  id: number;
  title: string;
  company_name: string;
  description: string | null;
  opportunity_type: string;
  location: string | null;
  work_preference: string | null;
  experience_level: string | null;
  skills_required: string[] | null;
  industry: string | null;
  application_url: string | null;
  application_deadline: string | null;
  salary_min: number | null;
  salary_max: number | null;
  currency: string | null;
};

type Saved = {
  opportunity_id: number;
};

type Application = {
  id: number;
  opportunity_id: number;
  status: string;
  applied_at: string | null;
  interview_date: string | null;
  notes: string | null;
};

type Resource = {
  id: number;
  title: string;
  description: string | null;
  category: string;
  resource_url: string | null;
};

type PortfolioProfile = {
  id: number;
  user_id: string;
  headline: string | null;
  bio: string | null;
  location: string | null;
  phone: string | null;
  website_url: string | null;
  github_url: string | null;
  linkedin_url: string | null;
  profile_visibility: string;
};

type PortfolioProject = {
  id: number;
  user_id: string;
  title: string;
  description: string | null;
  technologies: string[] | null;
  project_url: string | null;
  github_url: string | null;
  image_url: string | null;
  featured: boolean;
};

type PortfolioCertificate = {
  id: number;
  user_id: string;
  title: string;
  issuer: string | null;
  issue_date: string | null;
  expiry_date: string | null;
  credential_id: string | null;
  verification_url: string | null;
  file_url: string | null;
};

type PortfolioSkill = {
  id: number;
  user_id: string;
  name: string;
  category: string | null;
  proficiency: number | null;
};

type PortfolioAchievement = {
  id: number;
  user_id: string;
  title: string;
  description: string | null;
  date: string | null;
};

type SkillGap = {
  skill: string;
  status: "missing" | "weak" | "covered";
  proficiency: number;
  source: "career" | "portfolio" | "project" | "none";
};

type RoleSkillAnalysis = {
  role: string;
  score: number;
  requiredSkills: string[];
  coveredSkills: string[];
  weakSkills: string[];
  missingSkills: string[];
  skillGaps: SkillGap[];
};

const emptyProfile: CareerProfile = {
  user_id: "",
  target_roles: [],
  industries: [],
  preferred_locations: [],
  work_preference: "Any",
  experience_level: "Student",
  career_summary: "",
};

const splitTags = (value: string) =>
  value
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);

const normalize = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[._/-]/g, " ")
    .replace(/\s+/g, " ");

const clamp = (value: number, min = 0, max = 100) =>
  Math.max(min, Math.min(max, Math.round(value)));

const formatDate = (value: string | null) =>
  value
    ? new Date(
        value + (value.length === 10 ? "T00:00:00" : "")
      ).toLocaleDateString(undefined, {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "No deadline";

const daysUntil = (value: string | null) => {
  if (!value) return null;

  const d = new Date(
    value + (value.length === 10 ? "T23:59:59" : "")
  ).getTime();

  return Math.ceil((d - Date.now()) / 86400000);
};

export default function CareerPage() {
  const [userId, setUserId] = useState("");

  const [profile, setProfile] =
    useState<CareerProfile>(emptyProfile);

  const [skills, setSkills] = useState<Skill[]>([]);
  const [opportunities, setOpportunities] =
    useState<Opportunity[]>([]);
  const [saved, setSaved] = useState<Saved[]>([]);
  const [applications, setApplications] =
    useState<Application[]>([]);
  const [resources, setResources] =
    useState<Resource[]>([]);

  const [portfolioProfile, setPortfolioProfile] =
    useState<PortfolioProfile | null>(null);

  const [portfolioProjects, setPortfolioProjects] =
    useState<PortfolioProject[]>([]);

  const [portfolioCertificates, setPortfolioCertificates] =
    useState<PortfolioCertificate[]>([]);

  const [portfolioSkills, setPortfolioSkills] =
    useState<PortfolioSkill[]>([]);

  const [portfolioAchievements, setPortfolioAchievements] =
    useState<PortfolioAchievement[]>([]);

  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);

  const [message, setMessage] = useState("");

  const [activeTab, setActiveTab] = useState<
    "overview" | "opportunities" | "applications" | "profile"
  >("overview");

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("All");
  const [workFilter, setWorkFilter] = useState("All");

  const [selectedOpportunity, setSelectedOpportunity] =
    useState<Opportunity | null>(null);

  const [skillInput, setSkillInput] = useState("");
  const [skillCategory, setSkillCategory] =
    useState("Technical");
  const [skillProficiency, setSkillProficiency] =
    useState(70);

  const load = async () => {
    setLoading(true);

    const { data: auth } =
      await supabase.auth.getUser();

    const uid = auth.user?.id;

    if (!uid) {
      setLoading(false);
      return;
    }

    setUserId(uid);

    const [
      careerProfileResult,
      careerSkillsResult,
      opportunitiesResult,
      savedResult,
      applicationsResult,
      resourcesResult,
      portfolioProfileResult,
      portfolioProjectsResult,
      portfolioCertificatesResult,
      portfolioSkillsResult,
      portfolioAchievementsResult,
    ] = await Promise.all([
      supabase
        .from("career_profiles")
        .select("*")
        .eq("user_id", uid)
        .maybeSingle(),

      supabase
        .from("career_skills")
        .select(
          "id,user_id,skill_name,category,proficiency"
        )
        .eq("user_id", uid)
        .order("created_at", {
          ascending: false,
        }),

      supabase
        .from("career_opportunities")
        .select(
          "id,title,company_name,description,opportunity_type,location,work_preference,experience_level,skills_required,industry,application_url,application_deadline,salary_min,salary_max,currency"
        )
        .eq("is_active", true)
        .order("application_deadline", {
          ascending: true,
        }),

      supabase
        .from("career_saved_opportunities")
        .select("opportunity_id")
        .eq("user_id", uid),

      supabase
        .from("career_applications")
        .select(
          "id,opportunity_id,status,applied_at,interview_date,notes"
        )
        .eq("user_id", uid)
        .order("updated_at", {
          ascending: false,
        }),

      supabase
        .from("career_resources")
        .select(
          "id,title,description,category,resource_url"
        )
        .order("created_at", {
          ascending: false,
        })
        .limit(6),

      supabase
        .from("portfolio_profiles")
        .select(
          "id,user_id,headline,bio,location,phone,website_url,github_url,linkedin_url,profile_visibility"
        )
        .eq("user_id", uid)
        .maybeSingle(),

      supabase
        .from("portfolio_projects")
        .select(
          "id,user_id,title,description,technologies,project_url,github_url,image_url,featured"
        )
        .eq("user_id", uid)
        .order("featured", {
          ascending: false,
        }),

      supabase
        .from("portfolio_certificates")
        .select(
          "id,user_id,title,issuer,issue_date,expiry_date,credential_id,verification_url,file_url"
        )
        .eq("user_id", uid)
        .order("issue_date", {
          ascending: false,
        }),

      supabase
        .from("portfolio_skills")
        .select(
          "id,user_id,name,category,proficiency"
        )
        .eq("user_id", uid)
        .order("created_at", {
          ascending: false,
        }),

      supabase
        .from("portfolio_achievements")
        .select(
          "id,user_id,title,description,date"
        )
        .eq("user_id", uid)
        .order("date", {
          ascending: false,
        }),
    ]);

    if (careerProfileResult.error) {
      console.error(
        "Career profile:",
        careerProfileResult.error
      );
    }

    if (careerSkillsResult.error) {
      console.error(
        "Career skills:",
        careerSkillsResult.error
      );
    }

    if (portfolioProfileResult.error) {
      console.error(
        "Portfolio profile:",
        portfolioProfileResult.error
      );
    }

    if (portfolioProjectsResult.error) {
      console.error(
        "Portfolio projects:",
        portfolioProjectsResult.error
      );
    }

    if (portfolioCertificatesResult.error) {
      console.error(
        "Portfolio certificates:",
        portfolioCertificatesResult.error
      );
    }

    if (portfolioSkillsResult.error) {
      console.error(
        "Portfolio skills:",
        portfolioSkillsResult.error
      );
    }

    if (portfolioAchievementsResult.error) {
      console.error(
        "Portfolio achievements:",
        portfolioAchievementsResult.error
      );
    }

    setProfile(
      careerProfileResult.data
        ? (careerProfileResult.data as CareerProfile)
        : {
            ...emptyProfile,
            user_id: uid,
          }
    );

    setSkills(
      (careerSkillsResult.data || []) as Skill[]
    );

    setOpportunities(
      (opportunitiesResult.data || []) as Opportunity[]
    );

    setSaved(
      (savedResult.data || []) as Saved[]
    );

    setApplications(
      (applicationsResult.data || []) as Application[]
    );

    setResources(
      (resourcesResult.data || []) as Resource[]
    );

    setPortfolioProfile(
      portfolioProfileResult.data
        ? (portfolioProfileResult.data as PortfolioProfile)
        : null
    );

    setPortfolioProjects(
      (portfolioProjectsResult.data ||
        []) as PortfolioProject[]
    );

    setPortfolioCertificates(
      (portfolioCertificatesResult.data ||
        []) as PortfolioCertificate[]
    );

    setPortfolioSkills(
      (portfolioSkillsResult.data ||
        []) as PortfolioSkill[]
    );

    setPortfolioAchievements(
      (portfolioAchievementsResult.data ||
        []) as PortfolioAchievement[]
    );

    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  /*
   * ---------------------------------------------------
   * PROFILE COMPLETION
   * ---------------------------------------------------
   */

  const profileCompletion = useMemo(() => {
    const checks = [
      !!profile.career_summary?.trim(),
      !!profile.target_roles?.length,
      !!profile.industries?.length,
      !!profile.preferred_locations?.length,
      !!profile.work_preference,
      !!profile.experience_level,
      skills.length >= 3,
    ];

    return clamp(
      (checks.filter(Boolean).length /
        checks.length) *
        100
    );
  }, [profile, skills.length]);

  /*
   * ---------------------------------------------------
   * CAREER SKILL SCORE
   * ---------------------------------------------------
   */

  const careerSkillScore = useMemo(() => {
    if (!skills.length) return 0;

    const average =
      skills.reduce(
        (sum, skill) =>
          sum + (skill.proficiency || 0),
        0
      ) / skills.length;

    return clamp(average);
  }, [skills]);

  /*
   * ---------------------------------------------------
   * PORTFOLIO INTELLIGENCE
   * ---------------------------------------------------
   */

  const portfolioScore = useMemo(() => {
    const checks = [
      !!portfolioProfile?.headline?.trim(),
      !!portfolioProfile?.bio?.trim(),
      portfolioProjects.length > 0,
      portfolioCertificates.length > 0,
      portfolioSkills.length >= 3,
      portfolioAchievements.length > 0,
      !!portfolioProfile?.github_url,
      !!portfolioProfile?.linkedin_url,
      !!portfolioProfile?.website_url,
    ];

    return clamp(
      (checks.filter(Boolean).length /
        checks.length) *
        100
    );
  }, [
    portfolioProfile,
    portfolioProjects.length,
    portfolioCertificates.length,
    portfolioSkills.length,
    portfolioAchievements.length,
  ]);

  /*
   * ---------------------------------------------------
   * PROFESSIONAL PRESENCE
   * ---------------------------------------------------
   */

  const professionalPresenceScore = useMemo(() => {
    let score = 0;

    if (portfolioProfile?.github_url) {
      score += 35;
    }

    if (portfolioProfile?.linkedin_url) {
      score += 35;
    }

    if (portfolioProfile?.website_url) {
      score += 30;
    }

    return clamp(score);
  }, [portfolioProfile]);

  /*
   * ---------------------------------------------------
   * COMBINED CANDIDATE SKILLS
   * ---------------------------------------------------
   */

  const candidateSkillMap = useMemo(() => {
    const map = new Map<
      string,
      {
        proficiency: number;
        source:
          | "career"
          | "portfolio"
          | "project";
      }
    >();

    skills.forEach((skill) => {
      const name = normalize(
        skill.skill_name
      );

      if (!name) return;

      map.set(name, {
        proficiency:
          skill.proficiency ?? 0,
        source: "career",
      });
    });

    portfolioSkills.forEach((skill) => {
      const name = normalize(skill.name);

      if (!name) return;

      const existing = map.get(name);

      if (
        !existing ||
        (skill.proficiency ?? 0) >
          existing.proficiency
      ) {
        map.set(name, {
          proficiency:
            skill.proficiency ?? 0,
          source: "portfolio",
        });
      }
    });

    portfolioProjects.forEach(
      (project) => {
        (
          project.technologies || []
        ).forEach((technology) => {
          const name =
            normalize(technology);

          if (!name) return;

          const existing =
            map.get(name);

          if (!existing) {
            map.set(name, {
              proficiency: 60,
              source: "project",
            });
          } else if (
            existing.source !==
            "career"
          ) {
            map.set(name, {
              proficiency:
                Math.max(
                  existing.proficiency,
                  60
                ),
              source:
                existing.source,
            });
          }
        });
      }
    );

    return map;
  }, [
    skills,
    portfolioSkills,
    portfolioProjects,
  ]);

  const allCandidateSkills = useMemo(
    () =>
      Array.from(
        candidateSkillMap.keys()
      ),
    [candidateSkillMap]
  );

  /*
   * ---------------------------------------------------
   * ROLE SKILL ANALYSIS
   * ---------------------------------------------------
   */

  const roleAnalysis = useMemo<RoleSkillAnalysis>(
    () => {
      const role =
        profile.target_roles?.[0] ||
        "Target Career";

      const relatedOpportunities =
        opportunities.filter(
          (opportunity) => {
            const title =
              normalize(
                opportunity.title
              );

            const target =
              normalize(role);

            if (
              title.includes(target) ||
              target.includes(title)
            ) {
              return true;
            }

            const targetWords =
              target
                .split(" ")
                .filter(
                  (word) =>
                    word.length > 3
                );

            return targetWords.some(
              (word) =>
                title.includes(word)
            );
          }
        );

      const requirementFrequency =
        new Map<string, number>();

      relatedOpportunities.forEach(
        (opportunity) => {
          (
            opportunity.skills_required ||
            []
          ).forEach((skill) => {
            const normalizedSkill =
              normalize(skill);

            if (!normalizedSkill)
              return;

            requirementFrequency.set(
              normalizedSkill,
              (requirementFrequency.get(
                normalizedSkill
              ) || 0) + 1
            );
          });
        }
      );

      /*
       * If no direct role matches exist,
       * use the currently recommended
       * opportunities as the evidence set.
       */

      if (
        requirementFrequency.size ===
        0
      ) {
        opportunities
          .slice(0, 12)
          .forEach((opportunity) => {
            (
              opportunity.skills_required ||
              []
            ).forEach((skill) => {
              const normalizedSkill =
                normalize(skill);

              if (!normalizedSkill)
                return;

              requirementFrequency.set(
                normalizedSkill,
                (requirementFrequency.get(
                  normalizedSkill
                ) || 0) + 1
              );
            });
          });
      }

      const requiredSkills =
        Array.from(
          requirementFrequency.entries()
        )
          .sort(
            (a, b) => b[1] - a[1]
          )
          .map(([skill]) => skill)
          .slice(0, 12);

      const skillGaps: SkillGap[] =
        requiredSkills.map(
          (requiredSkill) => {
            let matched:
              | {
                  proficiency: number;
                  source:
                    | "career"
                    | "portfolio"
                    | "project";
                }
              | undefined;

            for (const [
              candidate,
              data,
            ] of candidateSkillMap.entries()) {
              if (
                candidate.includes(
                  requiredSkill
                ) ||
                requiredSkill.includes(
                  candidate
                )
              ) {
                if (
                  !matched ||
                  data.proficiency >
                    matched.proficiency
                ) {
                  matched = data;
                }
              }
            }

            if (!matched) {
              return {
                skill: requiredSkill,
                status: "missing",
                proficiency: 0,
                source: "none",
              };
            }

            if (
              matched.proficiency < 70
            ) {
              return {
                skill: requiredSkill,
                status: "weak",
                proficiency:
                  matched.proficiency,
                source:
                  matched.source,
              };
            }

            return {
              skill: requiredSkill,
              status: "covered",
              proficiency:
                matched.proficiency,
              source:
                matched.source,
            };
          }
        );

      const coveredSkills =
        skillGaps
          .filter(
            (gap) =>
              gap.status ===
              "covered"
          )
          .map(
            (gap) => gap.skill
          );

      const weakSkills =
        skillGaps
          .filter(
            (gap) =>
              gap.status ===
              "weak"
          )
          .map(
            (gap) => gap.skill
          );

      const missingSkills =
        skillGaps
          .filter(
            (gap) =>
              gap.status ===
              "missing"
          )
          .map(
            (gap) => gap.skill
          );

      const score =
        requiredSkills.length
          ? clamp(
              skillGaps.reduce(
                (total, gap) => {
                  if (
                    gap.status ===
                    "covered"
                  ) {
                    return (
                      total + 100
                    );
                  }

                  if (
                    gap.status ===
                    "weak"
                  ) {
                    return (
                      total +
                      gap.proficiency
                    );
                  }

                  return total;
                },
                0
              ) /
                requiredSkills.length
            )
          : careerSkillScore;

      return {
        role,
        score,
        requiredSkills,
        coveredSkills,
        weakSkills,
        missingSkills,
        skillGaps,
      };
    },
    [
      profile.target_roles,
      opportunities,
      candidateSkillMap,
      careerSkillScore,
    ]
  );

  /*
   * ---------------------------------------------------
   * OVERALL CAREER READINESS
   * ---------------------------------------------------
   */

  const readinessScore = useMemo(() => {
    const score =
      profileCompletion * 0.3 +
      careerSkillScore * 0.25 +
      portfolioScore * 0.3 +
      professionalPresenceScore * 0.15;

    return clamp(score);
  }, [
    profileCompletion,
    careerSkillScore,
    portfolioScore,
    professionalPresenceScore,
  ]);

  /*
   * ---------------------------------------------------
   * OPPORTUNITY MATCHING
   * ---------------------------------------------------
   */

  const savedIds = useMemo(
    () =>
      new Set(
        saved.map(
          (item) =>
            item.opportunity_id
        )
      ),
    [saved]
  );

  const applicationMap = useMemo(
    () =>
      new Map(
        applications.map(
          (item) => [
            item.opportunity_id,
            item,
          ]
        )
      ),
    [applications]
  );

  const matchScore = (
    opportunity: Opportunity
  ) => {
    const required =
      opportunity.skills_required ||
      [];

    const roleText = normalize(
      (
        profile.target_roles || []
      ).join(" ")
    );

    let score = 25;

    /*
     * Skills: 45%
     */

    if (required.length) {
      const matched =
        required.filter(
          (requiredSkill) => {
            const target =
              normalize(
                requiredSkill
              );

            return allCandidateSkills.some(
              (mine) =>
                mine.includes(target) ||
                target.includes(mine)
            );
          }
        ).length;

      score += Math.round(
        (matched /
          required.length) *
          45
      );
    } else {
      score += 30;
    }

    /*
     * Industry: 10%
     */

    if (
      opportunity.industry &&
      (
        profile.industries ||
        []
      ).some(
        (industry) =>
          normalize(industry) ===
          normalize(
            opportunity.industry || ""
          )
      )
    ) {
      score += 10;
    }

    /*
     * Role: 10%
     */

    if (
      roleText &&
      normalize(
        opportunity.title
      )
        .split(" ")
        .some(
          (word) =>
            word.length > 3 &&
            roleText.includes(word)
        )
    ) {
      score += 10;
    }

    /*
     * Work preference: 5%
     */

    if (
      profile.work_preference &&
      profile.work_preference !==
        "Any" &&
      opportunity.work_preference &&
      normalize(
        profile.work_preference
      ) ===
        normalize(
          opportunity.work_preference
        )
    ) {
      score += 5;
    }

    /*
     * Experience: 5%
     */

    if (
      profile.experience_level &&
      opportunity.experience_level &&
      normalize(
        profile.experience_level
      ) ===
        normalize(
          opportunity.experience_level
        )
    ) {
      score += 5;
    }

    return clamp(
      score,
      0,
      99
    );
  };

  /*
   * ---------------------------------------------------
   * FILTERED OPPORTUNITIES
   * ---------------------------------------------------
   */

  const filtered = useMemo(() => {
    return opportunities
      .filter((opportunity) => {
        const q =
          search.toLowerCase();

        const searchable = [
          opportunity.title,
          opportunity.company_name,
          opportunity.location,
          opportunity.industry,
          ...(opportunity.skills_required ||
            []),
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        const matchesSearch =
          !q ||
          searchable.includes(q);

        const matchesType =
          typeFilter === "All" ||
          opportunity.opportunity_type ===
            typeFilter;

        const matchesWork =
          workFilter === "All" ||
          opportunity.work_preference ===
            workFilter;

        return (
          matchesSearch &&
          matchesType &&
          matchesWork
        );
      })
      .sort(
        (a, b) =>
          matchScore(b) -
          matchScore(a)
      );
  }, [
    opportunities,
    search,
    typeFilter,
    workFilter,
    profile,
    allCandidateSkills,
  ]);

  const recommended = useMemo(
    () =>
      [...opportunities]
        .sort(
          (a, b) =>
            matchScore(b) -
            matchScore(a)
        )
        .slice(0, 3),
    [
      opportunities,
      profile,
      allCandidateSkills,
    ]
  );

  const upcoming = useMemo(
    () =>
      [...opportunities]
        .filter((opportunity) => {
          const d = daysUntil(
            opportunity.application_deadline
          );

          return (
            d !== null &&
            d >= 0 &&
            d <= 30
          );
        })
        .sort(
          (a, b) =>
            (daysUntil(
              a.application_deadline
            ) ?? 999) -
            (daysUntil(
              b.application_deadline
            ) ?? 999)
        )
        .slice(0, 4),
    [opportunities]
  );

  /*
   * ---------------------------------------------------
   * SAVE CAREER PROFILE
   * ---------------------------------------------------
   */

  const saveProfile = async () => {
    if (!userId) return;

    setSavingProfile(true);
    setMessage("");

    const payload = {
      ...profile,
      user_id: userId,
      target_roles:
        profile.target_roles || [],
      industries:
        profile.industries || [],
      preferred_locations:
        profile.preferred_locations ||
        [],
      updated_at:
        new Date().toISOString(),
    };

    const { error } =
      await supabase
        .from("career_profiles")
        .upsert(payload, {
          onConflict: "user_id",
        });

    setSavingProfile(false);

    if (error) {
      setMessage(error.message);
      return;
    }

    setMessage(
      "Career profile saved successfully."
    );

    await load();
  };

  /*
   * ---------------------------------------------------
   * SAVE / UNSAVE OPPORTUNITY
   * ---------------------------------------------------
   */

  const toggleSave = async (
    opportunityId: number
  ) => {
    if (!userId) return;

    if (
      savedIds.has(opportunityId)
    ) {
      const { error } =
        await supabase
          .from(
            "career_saved_opportunities"
          )
          .delete()
          .eq("user_id", userId)
          .eq(
            "opportunity_id",
            opportunityId
          );

      if (!error) {
        setSaved((items) =>
          items.filter(
            (item) =>
              item.opportunity_id !==
              opportunityId
          )
        );
      }
    } else {
      const { error } =
        await supabase
          .from(
            "career_saved_opportunities"
          )
          .insert({
            user_id: userId,
            opportunity_id:
              opportunityId,
          });

      if (!error) {
        setSaved((items) => [
          ...items,
          {
            opportunity_id:
              opportunityId,
          },
        ]);
      }
    }
  };

  /*
   * ---------------------------------------------------
   * APPLICATION
   * ---------------------------------------------------
   */

  const apply = async (
    opportunity: Opportunity
  ) => {
    if (!userId) return;

    const existing =
      applicationMap.get(
        opportunity.id
      );

    if (existing) return;

    const { data, error } =
      await supabase
        .from("career_applications")
        .insert({
          user_id: userId,
          opportunity_id:
            opportunity.id,
          status: "applied",
          applied_at:
            new Date().toISOString(),
        })
        .select(
          "id,opportunity_id,status,applied_at,interview_date,notes"
        )
        .single();

    if (error) {
      setMessage(error.message);
      return;
    }

    if (data) {
      setApplications((items) => [
        data as Application,
        ...items,
      ]);

      setMessage(
        "Application added to your career tracker."
      );
    }
  };

  /*
   * ---------------------------------------------------
   * SKILLS
   * ---------------------------------------------------
   */

  const addSkill = async () => {
    if (
      !userId ||
      !skillInput.trim()
    ) {
      return;
    }

    const { data, error } =
      await supabase
        .from("career_skills")
        .insert({
          user_id: userId,
          skill_name:
            skillInput.trim(),
          category:
            skillCategory,
          proficiency:
            skillProficiency,
        })
        .select(
          "id,user_id,skill_name,category,proficiency"
        )
        .single();

    if (error) {
      setMessage(error.message);
      return;
    }

    if (data) {
      setSkills((items) => [
        data as Skill,
        ...items,
      ]);

      setSkillInput("");

      setMessage(
        "Skill added successfully."
      );
    }
  };

  const deleteSkill = async (
    id: number
  ) => {
    const { error } =
      await supabase
        .from("career_skills")
        .delete()
        .eq("id", id)
        .eq("user_id", userId);

    if (error) {
      setMessage(error.message);
      return;
    }

    setSkills((items) =>
      items.filter(
        (skill) => skill.id !== id
      )
    );
  };

  const inputClass =
    "w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-400/50 focus:bg-white/[0.06]";

  if (loading) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#070b12] text-white">
        <div className="text-center">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-2 border-white/10 border-t-cyan-400" />

          <p className="text-sm text-white/50">
            Loading Career Hub...
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#070b12] text-white">
      <div className="mx-auto max-w-7xl px-5 py-8 md:px-8">
        {/* HEADER */}

        <header className="mb-8 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.2em] text-cyan-300">
              <span className="h-2 w-2 rounded-full bg-cyan-400" />
              DataSphere Career Hub
            </div>

            <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
              Build the career you want.
            </h1>

            <p className="mt-2 max-w-3xl text-sm leading-6 text-white/50">
              Discover opportunities, build
              your professional profile,
              understand your career readiness
              and close the skill gaps between
              your degree, portfolio and target
              career.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href="/portfolio"
              className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm text-white/80 hover:bg-white/[0.08]"
            >
              My Portfolio
            </Link>

            <button
              onClick={() =>
                setActiveTab("profile")
              }
              className="rounded-xl bg-cyan-400 px-4 py-2.5 text-sm font-semibold text-slate-950 hover:bg-cyan-300"
            >
              Complete Profile
            </button>
          </div>
        </header>

        {/* TABS */}

        <nav className="mb-6 flex gap-1 overflow-x-auto rounded-2xl border border-white/10 bg-white/[0.03] p-1">
          {(
            [
              ["overview", "Overview"],
              [
                "opportunities",
                "Opportunities",
              ],
              [
                "applications",
                "Applications",
              ],
              [
                "profile",
                "Career Profile",
              ],
            ] as const
          ).map(
            ([id, label]) => (
              <button
                key={id}
                onClick={() =>
                  setActiveTab(id)
                }
                className={`whitespace-nowrap rounded-xl px-4 py-2.5 text-sm transition ${
                  activeTab === id
                    ? "bg-white/10 text-white"
                    : "text-white/45 hover:text-white"
                }`}
              >
                {label}
              </button>
            )
          )}
        </nav>

        {message && (
          <div className="mb-5 rounded-xl border border-cyan-400/20 bg-cyan-400/5 px-4 py-3 text-sm text-cyan-200">
            {message}
          </div>
        )}

        {/* =====================================================
            OVERVIEW
        ====================================================== */}

        {activeTab === "overview" && (
          <>
            {/* TOP METRICS */}

            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <Metric
                label="Career readiness"
                value={`${readinessScore}%`}
                hint={
                  readinessScore >= 80
                    ? "Excellent foundation"
                    : readinessScore >= 60
                    ? "Good progress"
                    : "Keep building"
                }
              />

              <Metric
                label="Role readiness"
                value={`${roleAnalysis.score}%`}
                hint={
                  roleAnalysis.role
                }
              />

              <Metric
                label="Portfolio strength"
                value={`${portfolioScore}%`}
                hint={`${portfolioProjects.length} projects`}
              />

              <Metric
                label="Opportunities"
                value={String(
                  opportunities.length
                )}
                hint="Currently available"
              />
            </section>

            {/* MAIN GRID */}

            <div className="mt-6 grid gap-6 xl:grid-cols-[1.6fr_1fr]">
              {/* RECOMMENDED */}

              <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
                <div className="mb-5 flex items-center justify-between">
                  <div>
                    <h2 className="font-semibold">
                      Recommended for you
                    </h2>

                    <p className="mt-1 text-xs text-white/40">
                      Ranked using your career
                      profile, skills,
                      portfolio evidence and
                      opportunity requirements.
                    </p>
                  </div>

                  <button
                    onClick={() =>
                      setActiveTab(
                        "opportunities"
                      )
                    }
                    className="text-xs text-cyan-300"
                  >
                    View all →
                  </button>
                </div>

                <div className="space-y-3">
                  {recommended.map(
                    (opportunity) => (
                      <OpportunityRow
                        key={opportunity.id}
                        opportunity={
                          opportunity
                        }
                        score={matchScore(
                          opportunity
                        )}
                        saved={savedIds.has(
                          opportunity.id
                        )}
                        applied={applicationMap.has(
                          opportunity.id
                        )}
                        onSave={() =>
                          toggleSave(
                            opportunity.id
                          )
                        }
                        onOpen={() =>
                          setSelectedOpportunity(
                            opportunity
                          )
                        }
                      />
                    )
                  )}
                </div>

                {!recommended.length && (
                  <Empty text="No opportunities have been published yet." />
                )}
              </section>

              {/* READINESS */}

              <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
                <div className="mb-5">
                  <h2 className="font-semibold">
                    Career readiness
                  </h2>

                  <p className="mt-1 text-xs text-white/40">
                    A combined signal from your
                    career profile, skills,
                    portfolio and professional
                    presence.
                  </p>
                </div>

                <div
                  className="mx-auto mb-5 grid h-40 w-40 place-items-center rounded-full border-[10px] border-white/10"
                  style={{
                    background: `conic-gradient(rgb(34 211 238) ${
                      readinessScore * 3.6
                    }deg, transparent 0deg)`,
                  }}
                >
                  <div className="grid h-28 w-28 place-items-center rounded-full bg-[#070b12]">
                    <div className="text-center">
                      <div className="text-3xl font-bold">
                        {
                          readinessScore
                        }
                      </div>

                      <div className="text-[10px] uppercase tracking-wider text-white/40">
                        out of 100
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <Progress
                    label="Career profile"
                    value={
                      profileCompletion
                    }
                  />

                  <Progress
                    label="Career skills"
                    value={
                      careerSkillScore
                    }
                  />

                  <Progress
                    label="Portfolio"
                    value={
                      portfolioScore
                    }
                  />

                  <Progress
                    label="Professional presence"
                    value={
                      professionalPresenceScore
                    }
                  />
                </div>
              </section>
            </div>

            {/* PORTFOLIO INTELLIGENCE */}

            <section className="mt-6 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
              <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                <div>
                  <div className="mb-2 flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-cyan-300">
                    <span className="h-2 w-2 rounded-full bg-cyan-400" />
                    Portfolio Intelligence
                  </div>

                  <h2 className="text-xl font-semibold">
                    Your portfolio is part of your
                    career signal.
                  </h2>

                  <p className="mt-1 max-w-2xl text-sm leading-6 text-white/40">
                    DataSphere evaluates the
                    evidence you have already
                    built instead of looking only
                    at manually entered skills.
                  </p>
                </div>

                <Link
                  href="/portfolio"
                  className="text-xs text-cyan-300"
                >
                  Manage portfolio →
                </Link>
              </div>

              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
                <PortfolioStat
                  label="Projects"
                  value={
                    portfolioProjects.length
                  }
                  detail={
                    portfolioProjects.length
                      ? "Project evidence available"
                      : "Add a project"
                  }
                />

                <PortfolioStat
                  label="Certificates"
                  value={
                    portfolioCertificates.length
                  }
                  detail={
                    portfolioCertificates.length
                      ? "Credentials documented"
                      : "Add credentials"
                  }
                />

                <PortfolioStat
                  label="Portfolio skills"
                  value={
                    portfolioSkills.length
                  }
                  detail={
                    portfolioSkills.length
                      ? "Skills demonstrated"
                      : "Add portfolio skills"
                  }
                />

                <PortfolioStat
                  label="Achievements"
                  value={
                    portfolioAchievements.length
                  }
                  detail={
                    portfolioAchievements.length
                      ? "Achievements recorded"
                      : "Add achievements"
                  }
                />

                <PortfolioStat
                  label="Presence"
                  value={`${professionalPresenceScore}%`}
                  detail="Professional links"
                />
              </div>
            </section>

            {/* SKILL GAP ANALYSIS */}

            <section className="mt-6 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div>
                  <div className="mb-2 flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-cyan-400" />

                    <span className="text-xs font-medium uppercase tracking-[0.18em] text-cyan-300">
                      Career Intelligence
                    </span>
                  </div>

                  <h2 className="text-xl font-semibold">
                    Skill Gap Analysis
                  </h2>

                  <p className="mt-1 max-w-2xl text-sm leading-6 text-white/40">
                    See how prepared your current
                    skills and portfolio are for
                    your target career.
                  </p>
                </div>

                <div className="rounded-2xl border border-cyan-400/10 bg-cyan-400/[0.04] px-5 py-4 text-center">
                  <div className="text-3xl font-bold text-cyan-300">
                    {
                      roleAnalysis.score
                    }
                    %
                  </div>

                  <div className="mt-1 text-[10px] uppercase tracking-wider text-white/35">
                    Role readiness
                  </div>
                </div>
              </div>

              <div className="mt-6 rounded-xl border border-white/10 bg-white/[0.025] p-4">
                <div className="text-xs uppercase tracking-wider text-white/30">
                  Target role
                </div>

                <div className="mt-1 text-lg font-semibold">
                  {roleAnalysis.role}
                </div>
              </div>

              {roleAnalysis.requiredSkills
                .length > 0 ? (
                <>
                  <div className="mt-6 grid gap-4 md:grid-cols-3">
                    <GapMetric
                      label="Skills covered"
                      value={
                        roleAnalysis
                          .coveredSkills
                          .length
                      }
                      description="Strong evidence"
                      type="covered"
                    />

                    <GapMetric
                      label="Skills to strengthen"
                      value={
                        roleAnalysis
                          .weakSkills
                          .length
                      }
                      description="Existing but below target"
                      type="weak"
                    />

                    <GapMetric
                      label="Missing skills"
                      value={
                        roleAnalysis
                          .missingSkills
                          .length
                      }
                      description="Not yet demonstrated"
                      type="missing"
                    />
                  </div>

                  <div className="mt-6">
                    <div className="mb-3 text-xs uppercase tracking-wider text-white/30">
                      Required skill analysis
                    </div>

                    <div className="grid gap-2 md:grid-cols-2">
                      {roleAnalysis.skillGaps.map(
                        (gap) => (
                          <SkillGapCard
                            key={gap.skill}
                            gap={gap}
                          />
                        )
                      )}
                    </div>
                  </div>

                  <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.025] p-5">
                    <div className="mb-4">
                      <h3 className="font-semibold">
                        Recommended learning path
                      </h3>

                      <p className="mt-1 text-xs text-white/35">
                        Prioritized from the gaps
                        DataSphere currently
                        detects for your target
                        career.
                      </p>
                    </div>

                    <div className="space-y-3">
                      {[
                        ...roleAnalysis.missingSkills,
                        ...roleAnalysis.weakSkills,
                      ]
                        .slice(0, 5)
                        .map(
                          (
                            skill,
                            index
                          ) => (
                            <div
                              key={skill}
                              className="flex items-center gap-4 rounded-xl border border-white/10 bg-white/[0.025] p-3"
                            >
                              <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-cyan-400/10 text-xs font-bold text-cyan-300">
                                {index +
                                  1}
                              </div>

                              <div className="min-w-0 flex-1">
                                <div className="text-sm font-medium capitalize">
                                  {skill}
                                </div>

                                <div className="mt-1 text-xs text-white/35">
                                  {roleAnalysis.missingSkills.includes(
                                    skill
                                  )
                                    ? "New skill to acquire"
                                    : "Existing skill to strengthen"}
                                </div>
                              </div>

                              <Link
                                href="/ai-tutor"
                                className="rounded-lg border border-white/10 px-3 py-2 text-xs text-white/60 hover:bg-white/5"
                              >
                                Learn with AI →
                              </Link>
                            </div>
                          )
                        )}

                      {!roleAnalysis
                        .missingSkills
                        .length &&
                        !roleAnalysis
                          .weakSkills
                          .length && (
                          <div className="rounded-xl border border-cyan-400/10 bg-cyan-400/[0.03] p-5 text-center">
                            <div className="text-sm font-medium text-cyan-200">
                              Excellent skill
                              coverage.
                            </div>

                            <p className="mt-1 text-xs text-white/35">
                              Your current profile
                              covers the skills
                              DataSphere has
                              identified for this
                              career direction.
                            </p>
                          </div>
                        )}
                    </div>
                  </div>
                </>
              ) : (
                <div className="mt-6 rounded-xl border border-dashed border-white/10 p-8 text-center">
                  <div className="text-sm font-medium">
                    Not enough career data yet
                  </div>

                  <p className="mx-auto mt-2 max-w-lg text-xs leading-5 text-white/35">
                    Add a target role and
                    opportunities with skill
                    requirements to unlock
                    role-specific skill-gap
                    analysis.
                  </p>

                  <button
                    onClick={() =>
                      setActiveTab(
                        "profile"
                      )
                    }
                    className="mt-4 rounded-lg bg-cyan-400 px-4 py-2 text-xs font-semibold text-slate-950"
                  >
                    Set target role
                  </button>
                </div>
              )}
            </section>

            {/* DEADLINES + SKILLS */}

            <div className="mt-6 grid gap-6 lg:grid-cols-2">
              <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
                <div className="mb-5">
                  <h2 className="font-semibold">
                    Upcoming deadlines
                  </h2>

                  <p className="mt-1 text-xs text-white/40">
                    Opportunities closing soon.
                  </p>
                </div>

                <div className="space-y-3">
                  {upcoming.map(
                    (opportunity) => (
                      <Deadline
                        key={
                          opportunity.id
                        }
                        opportunity={
                          opportunity
                        }
                        onOpen={() =>
                          setSelectedOpportunity(
                            opportunity
                          )
                        }
                      />
                    )
                  )}

                  {!upcoming.length && (
                    <Empty text="No deadlines in the next 30 days." />
                  )}
                </div>
              </section>

              <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
                <div className="mb-5 flex items-center justify-between">
                  <div>
                    <h2 className="font-semibold">
                      Your skills
                    </h2>

                    <p className="mt-1 text-xs text-white/40">
                      Skills used for opportunity
                      matching.
                    </p>
                  </div>

                  <button
                    onClick={() =>
                      setActiveTab(
                        "profile"
                      )
                    }
                    className="text-xs text-cyan-300"
                  >
                    Manage →
                  </button>
                </div>

                <div className="flex flex-wrap gap-2">
                  {skills
                    .slice(0, 12)
                    .map((skill) => (
                      <span
                        key={skill.id}
                        className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-xs text-white/70"
                      >
                        {skill.skill_name}

                        <span className="ml-2 text-cyan-300">
                          {skill.proficiency ??
                            0}
                          %
                        </span>
                      </span>
                    ))}

                  {!skills.length && (
                    <Empty text="Add at least three skills to improve matching." />
                  )}
                </div>
              </section>
            </div>

            {/* RESOURCES */}

            <section className="mt-6 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
              <div className="mb-5">
                <h2 className="font-semibold">
                  Career resources
                </h2>

                <p className="mt-1 text-xs text-white/40">
                  Guides and resources published
                  by DataSphere.
                </p>
              </div>

              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {resources.map(
                  (resource) => (
                    <a
                      key={resource.id}
                      href={
                        resource.resource_url ||
                        "#"
                      }
                      target={
                        resource.resource_url
                          ? "_blank"
                          : undefined
                      }
                      rel="noreferrer"
                      className="rounded-xl border border-white/10 bg-white/[0.025] p-4 hover:bg-white/[0.06]"
                    >
                      <span className="text-[10px] uppercase tracking-wider text-cyan-300">
                        {
                          resource.category
                        }
                      </span>

                      <h3 className="mt-2 text-sm font-semibold">
                        {resource.title}
                      </h3>

                      <p className="mt-1 line-clamp-2 text-xs leading-5 text-white/40">
                        {resource.description ||
                          "Career development resource"}
                      </p>
                    </a>
                  )
                )}
              </div>

              {!resources.length && (
                <Empty text="Career resources will appear here." />
              )}
            </section>
          </>
        )}

        {/* =====================================================
            OPPORTUNITIES
        ====================================================== */}

        {activeTab ===
          "opportunities" && (
          <section>
            <div className="mb-5 grid gap-3 md:grid-cols-[1fr_170px_170px]">
              <input
                className={inputClass}
                placeholder="Search jobs, companies, skills..."
                value={search}
                onChange={(event) =>
                  setSearch(
                    event.target.value
                  )
                }
              />

              <select
                className={inputClass}
                value={typeFilter}
                onChange={(event) =>
                  setTypeFilter(
                    event.target.value
                  )
                }
              >
                <option>All</option>
                <option>Job</option>
                <option>
                  Internship
                </option>
                <option>
                  Attachment
                </option>
                <option>
                  Freelance
                </option>
              </select>

              <select
                className={inputClass}
                value={workFilter}
                onChange={(event) =>
                  setWorkFilter(
                    event.target.value
                  )
                }
              >
                <option>All</option>
                <option>
                  Remote
                </option>
                <option>
                  Hybrid
                </option>
                <option>
                  On-site
                </option>
              </select>
            </div>

            <div className="mb-4 flex items-center justify-between text-xs text-white/40">
              <span>
                {filtered.length}{" "}
                opportunities
              </span>

              <span>
                Sorted by career match
              </span>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              {filtered.map(
                (opportunity) => (
                  <OpportunityCard
                    key={
                      opportunity.id
                    }
                    opportunity={
                      opportunity
                    }
                    score={matchScore(
                      opportunity
                    )}
                    saved={savedIds.has(
                      opportunity.id
                    )}
                    applied={applicationMap.has(
                      opportunity.id
                    )}
                    onSave={() =>
                      toggleSave(
                        opportunity.id
                      )
                    }
                    onOpen={() =>
                      setSelectedOpportunity(
                        opportunity
                      )
                    }
                  />
                )
              )}
            </div>

            {!filtered.length && (
              <Empty text="No opportunities match your filters." />
            )}
          </section>
        )}

        {/* =====================================================
            APPLICATIONS
        ====================================================== */}

        {activeTab ===
          "applications" && (
          <section>
            <div className="mb-6 grid gap-4 md:grid-cols-3">
              <StatusMetric
                label="Applied"
                count={
                  applications.filter(
                    (application) =>
                      application.status ===
                      "applied"
                  ).length
                }
              />

              <StatusMetric
                label="Interviews"
                count={
                  applications.filter(
                    (application) =>
                      application.status ===
                      "interview"
                  ).length
                }
              />

              <StatusMetric
                label="Offers"
                count={
                  applications.filter(
                    (application) =>
                      application.status ===
                      "offer"
                  ).length
                }
              />
            </div>

            <div className="space-y-3">
              {applications.map(
                (application) => {
                  const opportunity =
                    opportunities.find(
                      (item) =>
                        item.id ===
                        application.opportunity_id
                    );

                  if (!opportunity)
                    return null;

                  return (
                    <div
                      key={
                        application.id
                      }
                      className="rounded-2xl border border-white/10 bg-white/[0.03] p-5"
                    >
                      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                        <div>
                          <h3 className="font-semibold">
                            {
                              opportunity.title
                            }
                          </h3>

                          <p className="mt-1 text-sm text-white/45">
                            {
                              opportunity.company_name
                            }{" "}
                            ·{" "}
                            {opportunity.location ||
                              "Location not specified"}
                          </p>
                        </div>

                        <span className="w-fit rounded-full bg-white/10 px-3 py-1.5 text-xs capitalize text-white/70">
                          {
                            application.status
                          }
                        </span>
                      </div>

                      <div className="mt-4 grid gap-3 text-xs text-white/45 sm:grid-cols-3">
                        <div>
                          Applied
                          <br />
                          <strong className="text-white/70">
                            {application.applied_at
                              ? formatDate(
                                  application.applied_at
                                )
                              : "—"}
                          </strong>
                        </div>

                        <div>
                          Interview
                          <br />
                          <strong className="text-white/70">
                            {application.interview_date
                              ? formatDate(
                                  application.interview_date
                                )
                              : "—"}
                          </strong>
                        </div>

                        <div>
                          Deadline
                          <br />
                          <strong className="text-white/70">
                            {formatDate(
                              opportunity.application_deadline
                            )}
                          </strong>
                        </div>
                      </div>
                    </div>
                  );
                }
              )}

              {!applications.length && (
                <Empty text="Your applications will appear here after you apply to an opportunity." />
              )}
            </div>
          </section>
        )}

        {/* =====================================================
            CAREER PROFILE
        ====================================================== */}

        {activeTab === "profile" && (
          <section className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
            {/* PROFILE */}

            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
              <div className="mb-6">
                <h2 className="text-xl font-semibold">
                  Career profile
                </h2>

                <p className="mt-1 text-sm text-white/40">
                  Tell DataSphere what kind of
                  career you are building.
                </p>
              </div>

              <div className="grid gap-5">
                <Field
                  label="Target roles"
                  hint="Separate multiple roles with commas"
                >
                  <input
                    className={inputClass}
                    value={(
                      profile.target_roles ||
                      []
                    ).join(", ")}
                    onChange={(event) =>
                      setProfile({
                        ...profile,
                        target_roles:
                          splitTags(
                            event.target
                              .value
                          ),
                      })
                    }
                    placeholder="Data Analyst, Data Scientist, ML Engineer"
                  />
                </Field>

                <Field label="Industries">
                  <input
                    className={inputClass}
                    value={(
                      profile.industries ||
                      []
                    ).join(", ")}
                    onChange={(event) =>
                      setProfile({
                        ...profile,
                        industries:
                          splitTags(
                            event.target
                              .value
                          ),
                      })
                    }
                    placeholder="Technology, Finance, Healthcare"
                  />
                </Field>

                <Field label="Preferred locations">
                  <input
                    className={inputClass}
                    value={(
                      profile.preferred_locations ||
                      []
                    ).join(", ")}
                    onChange={(event) =>
                      setProfile({
                        ...profile,
                        preferred_locations:
                          splitTags(
                            event.target
                              .value
                          ),
                      })
                    }
                    placeholder="Nairobi, Mombasa, Remote"
                  />
                </Field>

                <div className="grid gap-5 md:grid-cols-2">
                  <Field label="Work preference">
                    <select
                      className={
                        inputClass
                      }
                      value={
                        profile.work_preference ||
                        "Any"
                      }
                      onChange={(event) =>
                        setProfile({
                          ...profile,
                          work_preference:
                            event.target
                              .value,
                        })
                      }
                    >
                      <option>
                        Any
                      </option>
                      <option>
                        Remote
                      </option>
                      <option>
                        Hybrid
                      </option>
                      <option>
                        On-site
                      </option>
                    </select>
                  </Field>

                  <Field label="Experience level">
                    <select
                      className={
                        inputClass
                      }
                      value={
                        profile.experience_level ||
                        "Student"
                      }
                      onChange={(event) =>
                        setProfile({
                          ...profile,
                          experience_level:
                            event.target
                              .value,
                        })
                      }
                    >
                      <option>
                        Student
                      </option>
                      <option>
                        Entry level
                      </option>
                      <option>
                        Junior
                      </option>
                      <option>
                        Mid level
                      </option>
                      <option>
                        Senior
                      </option>
                    </select>
                  </Field>
                </div>

                <Field
                  label="Career summary"
                  hint="A short professional summary"
                >
                  <textarea
                    className={`${inputClass} min-h-32 resize-y`}
                    value={
                      profile.career_summary ||
                      ""
                    }
                    onChange={(event) =>
                      setProfile({
                        ...profile,
                        career_summary:
                          event.target
                            .value,
                      })
                    }
                    placeholder="Describe the type of professional you are becoming, your strengths and what you want to work on."
                  />
                </Field>

                <button
                  disabled={
                    savingProfile
                  }
                  onClick={
                    saveProfile
                  }
                  className="rounded-xl bg-cyan-400 px-5 py-3 text-sm font-semibold text-slate-950 disabled:opacity-50"
                >
                  {savingProfile
                    ? "Saving..."
                    : "Save career profile"}
                </button>
              </div>
            </div>

            {/* SKILLS */}

            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
              <div className="mb-5">
                <h2 className="text-xl font-semibold">
                  Skills
                </h2>

                <p className="mt-1 text-sm text-white/40">
                  Add skills and proficiency
                  levels.
                </p>
              </div>

              <div className="space-y-3">
                <input
                  className={inputClass}
                  value={skillInput}
                  onChange={(event) =>
                    setSkillInput(
                      event.target.value
                    )
                  }
                  placeholder="e.g. Python"
                />

                <div className="grid grid-cols-2 gap-2">
                  <select
                    className={inputClass}
                    value={
                      skillCategory
                    }
                    onChange={(event) =>
                      setSkillCategory(
                        event.target.value
                      )
                    }
                  >
                    <option>
                      Technical
                    </option>
                    <option>
                      Data
                    </option>
                    <option>
                      Soft Skill
                    </option>
                    <option>
                      Business
                    </option>
                    <option>
                      Design
                    </option>
                    <option>
                      Other
                    </option>
                  </select>

                  <select
                    className={inputClass}
                    value={
                      skillProficiency
                    }
                    onChange={(event) =>
                      setSkillProficiency(
                        Number(
                          event.target
                            .value
                        )
                      )
                    }
                  >
                    <option value="25">
                      25% Beginner
                    </option>
                    <option value="50">
                      50% Basic
                    </option>
                    <option value="70">
                      70% Intermediate
                    </option>
                    <option value="85">
                      85% Advanced
                    </option>
                    <option value="100">
                      100% Expert
                    </option>
                  </select>
                </div>

                <button
                  onClick={addSkill}
                  className="w-full rounded-xl border border-cyan-400/30 bg-cyan-400/10 px-4 py-3 text-sm font-semibold text-cyan-200 hover:bg-cyan-400/15"
                >
                  + Add skill
                </button>
              </div>

              <div className="mt-6 space-y-2">
                {skills.map(
                  (skill) => (
                    <div
                      key={skill.id}
                      className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.025] px-3 py-3"
                    >
                      <div>
                        <div className="text-sm font-medium">
                          {
                            skill.skill_name
                          }
                        </div>

                        <div className="mt-1 text-[11px] text-white/35">
                          {skill.category ||
                            "Technical"}{" "}
                          ·{" "}
                          {skill.proficiency ??
                            0}
                          %
                        </div>
                      </div>

                      <button
                        onClick={() =>
                          deleteSkill(
                            skill.id
                          )
                        }
                        className="text-xs text-red-300/70 hover:text-red-300"
                      >
                        Remove
                      </button>
                    </div>
                  )
                )}

                {!skills.length && (
                  <p className="py-5 text-center text-xs text-white/35">
                    No skills added yet.
                  </p>
                )}
              </div>
            </div>
          </section>
        )}
      </div>

      {/* =====================================================
          OPPORTUNITY MODAL
      ====================================================== */}

      {selectedOpportunity && (
        <div
          className="fixed inset-0 z-50 overflow-y-auto bg-black/70 p-4 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              setSelectedOpportunity(
                null
              );
            }
          }}
        >
          <div className="mx-auto my-10 max-w-2xl rounded-3xl border border-white/10 bg-[#0c121c] p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="mb-2 text-xs uppercase tracking-wider text-cyan-300">
                  {
                    selectedOpportunity.opportunity_type
                  }{" "}
                  ·{" "}
                  {matchScore(
                    selectedOpportunity
                  )}
                  % match
                </div>

                <h2 className="text-2xl font-bold">
                  {
                    selectedOpportunity.title
                  }
                </h2>

                <p className="mt-2 text-sm text-white/50">
                  {
                    selectedOpportunity.company_name
                  }{" "}
                  ·{" "}
                  {selectedOpportunity.location ||
                    "Location flexible"}
                </p>
              </div>

              <button
                onClick={() =>
                  setSelectedOpportunity(
                    null
                  )
                }
                className="rounded-lg px-2 text-2xl text-white/40 hover:text-white"
              >
                ×
              </button>
            </div>

            <div className="mt-6 rounded-2xl border border-cyan-400/10 bg-cyan-400/[0.03] p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs uppercase tracking-wider text-white/30">
                    Career match
                  </div>

                  <div className="mt-1 text-2xl font-bold text-cyan-300">
                    {matchScore(
                      selectedOpportunity
                    )}
                    %
                  </div>
                </div>

                <div className="text-right text-xs text-white/35">
                  Based on your skills,
                  profile and portfolio
                </div>
              </div>
            </div>

            <p className="mt-6 whitespace-pre-line text-sm leading-6 text-white/65">
              {selectedOpportunity.description ||
                "No description provided."}
            </p>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <Info
                label="Work preference"
                value={
                  selectedOpportunity.work_preference ||
                  "Not specified"
                }
              />

              <Info
                label="Experience"
                value={
                  selectedOpportunity.experience_level ||
                  "Not specified"
                }
              />

              <Info
                label="Industry"
                value={
                  selectedOpportunity.industry ||
                  "Not specified"
                }
              />

              <Info
                label="Deadline"
                value={formatDate(
                  selectedOpportunity.application_deadline
                )}
              />
            </div>

            {selectedOpportunity
              .skills_required
              ?.length ? (
              <div className="mt-6">
                <div className="mb-2 text-xs uppercase tracking-wider text-white/35">
                  Skills requested
                </div>

                <div className="flex flex-wrap gap-2">
                  {selectedOpportunity.skills_required.map(
                    (skill) => {
                      const target =
                        normalize(
                          skill
                        );

                      const matched =
                        allCandidateSkills.some(
                          (mine) =>
                            mine.includes(
                              target
                            ) ||
                            target.includes(
                              mine
                            )
                        );

                      return (
                        <span
                          key={skill}
                          className={`rounded-lg px-3 py-2 text-xs ${
                            matched
                              ? "bg-cyan-400/10 text-cyan-300"
                              : "bg-red-400/10 text-red-300"
                          }`}
                        >
                          {matched
                            ? "✓ "
                            : ""}
                          {skill}
                        </span>
                      );
                    }
                  )}
                </div>
              </div>
            ) : null}

            <div className="mt-7 flex flex-wrap gap-2">
              <button
                onClick={() =>
                  toggleSave(
                    selectedOpportunity.id
                  )
                }
                className="rounded-xl border border-white/10 px-4 py-3 text-sm text-white/70"
              >
                {savedIds.has(
                  selectedOpportunity.id
                )
                  ? "★ Saved"
                  : "☆ Save"}
              </button>

              {applicationMap.has(
                selectedOpportunity.id
              ) ? (
                <span className="rounded-xl bg-white/10 px-4 py-3 text-sm text-white/60">
                  Application tracked
                </span>
              ) : (
                <button
                  onClick={() =>
                    apply(
                      selectedOpportunity
                    )
                  }
                  className="rounded-xl bg-cyan-400 px-5 py-3 text-sm font-semibold text-slate-950"
                >
                  Mark as applied
                </button>
              )}

              {selectedOpportunity.application_url && (
                <a
                  href={
                    selectedOpportunity.application_url
                  }
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-xl border border-white/10 px-4 py-3 text-sm text-white/80 hover:bg-white/5"
                >
                  Open application ↗
                </a>
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

/* =========================================================
   COMPONENTS
========================================================= */

function Metric({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
      <div className="text-xs text-white/40">
        {label}
      </div>

      <div className="mt-2 text-3xl font-bold tracking-tight">
        {value}
      </div>

      <div className="mt-2 text-xs text-cyan-300/70">
        {hint}
      </div>
    </div>
  );
}

function StatusMetric({
  label,
  count,
}: {
  label: string;
  count: number;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
      <div className="text-xs text-white/40">
        {label}
      </div>

      <div className="mt-2 text-2xl font-bold">
        {count}
      </div>
    </div>
  );
}

function Progress({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div>
      <div className="mb-1 flex justify-between text-xs">
        <span className="text-white/50">
          {label}
        </span>

        <span className="text-white/70">
          {value}%
        </span>
      </div>

      <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
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
    </div>
  );
}

function PortfolioStat({
  label,
  value,
  detail,
}: {
  label: string;
  value: number | string;
  detail: string;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.025] p-4">
      <div className="text-xs text-white/40">
        {label}
      </div>

      <div className="mt-2 text-2xl font-bold">
        {value}
      </div>

      <div className="mt-1 text-[10px] leading-4 text-white/30">
        {detail}
      </div>
    </div>
  );
}

function GapMetric({
  label,
  value,
  description,
  type,
}: {
  label: string;
  value: number;
  description: string;
  type: "covered" | "weak" | "missing";
}) {
  const classes =
    type === "covered"
      ? "border-cyan-400/10 bg-cyan-400/[0.03] text-cyan-300"
      : type === "weak"
      ? "border-yellow-400/10 bg-yellow-400/[0.03] text-yellow-300"
      : "border-red-400/10 bg-red-400/[0.03] text-red-300";

  return (
    <div
      className={`rounded-xl border p-4 ${classes}`}
    >
      <div className="text-2xl font-bold">
        {value}
      </div>

      <div className="mt-1 text-xs font-medium">
        {label}
      </div>

      <div className="mt-1 text-[10px] text-white/35">
        {description}
      </div>
    </div>
  );
}

function SkillGapCard({
  gap,
}: {
  gap: SkillGap;
}) {
  const statusClass =
    gap.status === "covered"
      ? "bg-cyan-400/10 text-cyan-300"
      : gap.status === "weak"
      ? "bg-yellow-400/10 text-yellow-300"
      : "bg-red-400/10 text-red-300";

  const barClass =
    gap.status === "covered"
      ? "bg-cyan-400"
      : gap.status === "weak"
      ? "bg-yellow-400"
      : "bg-red-400";

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.025] p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="font-medium capitalize">
          {gap.skill}
        </div>

        <span
          className={`rounded-full px-2.5 py-1 text-[10px] ${statusClass}`}
        >
          {gap.status ===
          "covered"
            ? "Covered"
            : gap.status ===
              "weak"
            ? "Strengthen"
            : "Missing"}
        </span>
      </div>

      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10">
        <div
          className={`h-full rounded-full ${barClass}`}
          style={{
            width: `${Math.max(
              4,
              gap.proficiency
            )}%`,
          }}
        />
      </div>

      <div className="mt-2 flex justify-between text-[10px] text-white/30">
        <span>
          {gap.source ===
          "none"
            ? "Not demonstrated"
            : `Demonstrated through ${gap.source}`}
        </span>

        <span>
          {gap.proficiency}%
        </span>
      </div>
    </div>
  );
}

function OpportunityRow({
  opportunity: o,
  score,
  saved,
  applied,
  onSave,
  onOpen,
}: {
  opportunity: Opportunity;
  score: number;
  saved: boolean;
  applied: boolean;
  onSave: () => void;
  onOpen: () => void;
}) {
  return (
    <div className="flex items-center gap-4 rounded-xl border border-white/10 bg-white/[0.025] p-4">
      <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-cyan-400/10 text-sm font-bold text-cyan-300">
        {o.company_name
          .slice(0, 1)
          .toUpperCase()}
      </div>

      <div className="min-w-0 flex-1">
        <button
          onClick={onOpen}
          className="text-left font-medium hover:text-cyan-300"
        >
          {o.title}
        </button>

        <p className="mt-1 truncate text-xs text-white/40">
          {o.company_name} ·{" "}
          {o.location ||
            "Flexible"}
        </p>
      </div>

      <div className="hidden text-right sm:block">
        <div className="text-sm font-semibold text-cyan-300">
          {score}%
        </div>

        <div className="text-[10px] text-white/30">
          match
        </div>
      </div>

      <button
        onClick={onSave}
        className="text-lg text-white/40 hover:text-yellow-300"
      >
        {saved ? "★" : "☆"}
      </button>

      {applied && (
        <span className="hidden rounded-full bg-white/10 px-2 py-1 text-[10px] text-white/50 md:block">
          Applied
        </span>
      )}
    </div>
  );
}

function OpportunityCard({
  opportunity: o,
  score,
  saved,
  applied,
  onSave,
  onOpen,
}: {
  opportunity: Opportunity;
  score: number;
  saved: boolean;
  applied: boolean;
  onSave: () => void;
  onOpen: () => void;
}) {
  const d = daysUntil(
    o.application_deadline
  );

  return (
    <article className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 transition hover:border-white/20 hover:bg-white/[0.045]">
      <div className="flex justify-between gap-4">
        <div>
          <div className="mb-2 flex flex-wrap gap-2">
            <span className="rounded-full bg-cyan-400/10 px-2.5 py-1 text-[10px] uppercase tracking-wider text-cyan-300">
              {o.opportunity_type}
            </span>

            <span className="rounded-full bg-white/5 px-2.5 py-1 text-[10px] text-white/40">
              {score}% match
            </span>
          </div>

          <button
            onClick={onOpen}
            className="text-left text-lg font-semibold hover:text-cyan-300"
          >
            {o.title}
          </button>

          <p className="mt-1 text-sm text-white/45">
            {o.company_name} ·{" "}
            {o.location ||
              "Location flexible"}
          </p>
        </div>

        <button
          onClick={onSave}
          className="text-xl text-white/40 hover:text-yellow-300"
        >
          {saved ? "★" : "☆"}
        </button>
      </div>

      <p className="mt-4 line-clamp-2 text-sm leading-6 text-white/45">
        {o.description ||
          "No description provided."}
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        {(o.skills_required ||
          [])
          .slice(0, 5)
          .map((skill) => (
            <span
              key={skill}
              className="rounded-md bg-white/5 px-2 py-1 text-[10px] text-white/45"
            >
              {skill}
            </span>
          ))}
      </div>

      <div className="mt-5 flex items-center justify-between border-t border-white/5 pt-4">
        <span
          className={`text-xs ${
            d !== null && d <= 7
              ? "text-orange-300"
              : "text-white/35"
          }`}
        >
          {d !== null
            ? d < 0
              ? "Closed"
              : d === 0
              ? "Closes today"
              : `${d} days left`
            : "No deadline"}
        </span>

        <div className="flex gap-2">
          {applied ? (
            <span className="rounded-lg bg-white/10 px-3 py-2 text-xs text-white/50">
              Applied
            </span>
          ) : (
            <button
              onClick={onOpen}
              className="rounded-lg bg-white/10 px-3 py-2 text-xs text-white/70 hover:bg-white/15"
            >
              View opportunity
            </button>
          )}
        </div>
      </div>
    </article>
  );
}

function Deadline({
  opportunity: o,
  onOpen,
}: {
  opportunity: Opportunity;
  onOpen: () => void;
}) {
  const d = daysUntil(
    o.application_deadline
  );

  return (
    <button
      onClick={onOpen}
      className="flex w-full items-center gap-3 rounded-xl border border-white/10 bg-white/[0.025] p-3 text-left hover:bg-white/[0.06]"
    >
      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-orange-400/10 text-orange-300">
        !
      </div>

      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium">
          {o.title}
        </div>

        <div className="mt-1 text-xs text-white/35">
          {o.company_name} ·{" "}
          {formatDate(
            o.application_deadline
          )}
        </div>
      </div>

      <span className="text-xs text-orange-300">
        {d === 0
          ? "Today"
          : `${d}d`}
      </span>
    </button>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm font-medium text-white/75">
          {label}
        </span>

        {hint && (
          <span className="text-[10px] text-white/30">
            {hint}
          </span>
        )}
      </div>

      {children}
    </label>
  );
}

function Info({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
      <div className="text-[10px] uppercase tracking-wider text-white/30">
        {label}
      </div>

      <div className="mt-1 text-sm text-white/70">
        {value}
      </div>
    </div>
  );
}

function Empty({
  text,
}: {
  text: string;
}) {
  return (
    <div className="rounded-xl border border-dashed border-white/10 p-8 text-center text-sm text-white/30">
      {text}
    </div>
  );
}