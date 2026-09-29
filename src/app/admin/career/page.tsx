"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabase";

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
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

type Resource = {
  id: number;
  title: string;
  description: string | null;
  category: string;
  content: string | null;
  resource_url: string | null;
  created_at: string;
  updated_at: string;
};

type OpportunityForm = {
  title: string;
  company_name: string;
  description: string;
  opportunity_type: string;
  location: string;
  work_preference: string;
  experience_level: string;
  skills_required: string;
  industry: string;
  application_url: string;
  application_deadline: string;
  salary_min: string;
  salary_max: string;
  currency: string;
  is_active: boolean;
};

type ResourceForm = {
  title: string;
  description: string;
  category: string;
  content: string;
  resource_url: string;
};

const emptyOpportunity: OpportunityForm = {
  title: "",
  company_name: "",
  description: "",
  opportunity_type: "Job",
  location: "",
  work_preference: "Any",
  experience_level: "Entry level",
  skills_required: "",
  industry: "",
  application_url: "",
  application_deadline: "",
  salary_min: "",
  salary_max: "",
  currency: "KES",
  is_active: true,
};

const emptyResource: ResourceForm = {
  title: "",
  description: "",
  category: "Career Advice",
  content: "",
  resource_url: "",
};

const inputClass =
  "w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/25 focus:border-cyan-400/50 focus:bg-white/[0.06]";

const textareaClass =
  "w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm leading-6 text-white outline-none transition placeholder:text-white/25 focus:border-cyan-400/50 focus:bg-white/[0.06]";

const normalize = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");

const formatDate = (value: string | null) => {
  if (!value) return "No deadline";

  return new Date(
    value + (value.length === 10 ? "T00:00:00" : "")
  ).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

const daysUntil = (value: string | null) => {
  if (!value) return null;

  const target = new Date(
    value + (value.length === 10 ? "T23:59:59" : "")
  ).getTime();

  return Math.ceil(
    (target - Date.now()) / 86400000
  );
};

export default function AdminCareerPage() {
  const [authorized, setAuthorized] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);

  const [opportunities, setOpportunities] = useState<
    Opportunity[]
  >([]);

  const [resources, setResources] = useState<Resource[]>(
    []
  );

  const [loading, setLoading] = useState(true);

  const [activeSection, setActiveSection] = useState<
    "opportunities" | "resources"
  >("opportunities");

  const [showOpportunityForm, setShowOpportunityForm] =
    useState(false);

  const [showResourceForm, setShowResourceForm] =
    useState(false);

  const [editingOpportunity, setEditingOpportunity] =
    useState<Opportunity | null>(null);

  const [editingResource, setEditingResource] =
    useState<Resource | null>(null);

  const [opportunityForm, setOpportunityForm] =
    useState<OpportunityForm>(emptyOpportunity);

  const [resourceForm, setResourceForm] =
    useState<ResourceForm>(emptyResource);

  const [savingOpportunity, setSavingOpportunity] =
    useState(false);

  const [savingResource, setSavingResource] =
    useState(false);

  const [deletingId, setDeletingId] =
    useState<number | null>(null);

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");

  const [resourceSearch, setResourceSearch] =
    useState("");

  const [resourceCategory, setResourceCategory] =
    useState("All");

  const [message, setMessage] = useState("");

  /*
   * =========================================================
   * AUTHORIZATION
   * =========================================================
   */

  const checkAuthorization = async () => {
    setCheckingAuth(true);

    const { data: auth } =
      await supabase.auth.getUser();

    const user = auth.user;

    if (!user) {
      setAuthorized(false);
      setCheckingAuth(false);
      return;
    }

    const { data: profile, error } =
      await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();

    if (error) {
      console.error(error);
      setAuthorized(false);
      setCheckingAuth(false);
      return;
    }

    const isAdmin =
      profile?.role === "admin";

    setAuthorized(isAdmin);
    setCheckingAuth(false);
  };

  /*
   * =========================================================
   * LOAD DATA
   * =========================================================
   */

  const loadData = async () => {
    setLoading(true);

    const [
      opportunitiesResult,
      resourcesResult,
    ] = await Promise.all([
      supabase
        .from("career_opportunities")
        .select(
          "id,title,company_name,description,opportunity_type,location,work_preference,experience_level,skills_required,industry,application_url,application_deadline,salary_min,salary_max,currency,is_active,created_at,updated_at"
        )
        .order("created_at", {
          ascending: false,
        }),

      supabase
        .from("career_resources")
        .select(
          "id,title,description,category,content,resource_url,created_at,updated_at"
        )
        .order("created_at", {
          ascending: false,
        }),
    ]);

    if (opportunitiesResult.error) {
      console.error(
        "Opportunities:",
        opportunitiesResult.error
      );
    }

    if (resourcesResult.error) {
      console.error(
        "Resources:",
        resourcesResult.error
      );
    }

    setOpportunities(
      (opportunitiesResult.data ||
        []) as Opportunity[]
    );

    setResources(
      (resourcesResult.data ||
        []) as Resource[]
    );

    setLoading(false);
  };

  useEffect(() => {
    const start = async () => {
      await checkAuthorization();
      await loadData();
    };

    start();
  }, []);

  /*
   * =========================================================
   * OPPORTUNITY FILTERS
   * =========================================================
   */

  const filteredOpportunities = useMemo(() => {
    const query = normalize(search);

    return opportunities.filter(
      (opportunity) => {
        const searchable = normalize(
          [
            opportunity.title,
            opportunity.company_name,
            opportunity.description,
            opportunity.location,
            opportunity.industry,
            opportunity.opportunity_type,
            ...(opportunity.skills_required ||
              []),
          ]
            .filter(Boolean)
            .join(" ")
        );

        const matchesSearch =
          !query ||
          searchable.includes(query);

        const matchesType =
          typeFilter === "All" ||
          opportunity.opportunity_type ===
            typeFilter;

        const matchesStatus =
          statusFilter === "All" ||
          (statusFilter === "Published"
            ? opportunity.is_active
            : !opportunity.is_active);

        return (
          matchesSearch &&
          matchesType &&
          matchesStatus
        );
      }
    );
  }, [
    opportunities,
    search,
    typeFilter,
    statusFilter,
  ]);

  /*
   * =========================================================
   * RESOURCE FILTERS
   * =========================================================
   */

  const resourceCategories =
    useMemo(() => {
      return Array.from(
        new Set(
          resources.map(
            (resource) =>
              resource.category
          )
        )
      ).sort();
    }, [resources]);

  const filteredResources = useMemo(() => {
    const query = normalize(
      resourceSearch
    );

    return resources.filter(
      (resource) => {
        const searchable = normalize(
          [
            resource.title,
            resource.description,
            resource.category,
            resource.content,
          ]
            .filter(Boolean)
            .join(" ")
        );

        const matchesSearch =
          !query ||
          searchable.includes(query);

        const matchesCategory =
          resourceCategory ===
            "All" ||
          resource.category ===
            resourceCategory;

        return (
          matchesSearch &&
          matchesCategory
        );
      }
    );
  }, [
    resources,
    resourceSearch,
    resourceCategory,
  ]);

  /*
   * =========================================================
   * STATISTICS
   * =========================================================
   */

  const opportunityStats = useMemo(() => {
    const active =
      opportunities.filter(
        (item) => item.is_active
      ).length;

    const inactive =
      opportunities.length -
      active;

    const internships =
      opportunities.filter(
        (item) =>
          item.opportunity_type ===
          "Internship"
      ).length;

    const jobs =
      opportunities.filter(
        (item) =>
          item.opportunity_type ===
          "Job"
      ).length;

    const attachments =
      opportunities.filter(
        (item) =>
          item.opportunity_type ===
          "Attachment"
      ).length;

    return {
      total: opportunities.length,
      active,
      inactive,
      internships,
      jobs,
      attachments,
    };
  }, [opportunities]);

  /*
   * =========================================================
   * RESET FORMS
   * =========================================================
   */

  const resetOpportunityForm = () => {
    setOpportunityForm(
      emptyOpportunity
    );

    setEditingOpportunity(null);
  };

  const resetResourceForm = () => {
    setResourceForm(
      emptyResource
    );

    setEditingResource(null);
  };

  /*
   * =========================================================
   * EDIT OPPORTUNITY
   * =========================================================
   */

  const openEditOpportunity = (
    opportunity: Opportunity
  ) => {
    setEditingOpportunity(
      opportunity
    );

    setOpportunityForm({
      title: opportunity.title,
      company_name:
        opportunity.company_name,
      description:
        opportunity.description || "",
      opportunity_type:
        opportunity.opportunity_type,
      location:
        opportunity.location || "",
      work_preference:
        opportunity.work_preference ||
        "Any",
      experience_level:
        opportunity.experience_level ||
        "Entry level",
      skills_required: (
        opportunity.skills_required ||
        []
      ).join(", "),
      industry:
        opportunity.industry || "",
      application_url:
        opportunity.application_url ||
        "",
      application_deadline:
        opportunity.application_deadline ||
        "",
      salary_min:
        opportunity.salary_min !== null
          ? String(
              opportunity.salary_min
            )
          : "",
      salary_max:
        opportunity.salary_max !== null
          ? String(
              opportunity.salary_max
            )
          : "",
      currency:
        opportunity.currency ||
        "KES",
      is_active:
        opportunity.is_active,
    });

    setShowOpportunityForm(
      true
    );
  };

  /*
   * =========================================================
   * EDIT RESOURCE
   * =========================================================
   */

  const openEditResource = (
    resource: Resource
  ) => {
    setEditingResource(resource);

    setResourceForm({
      title: resource.title,
      description:
        resource.description || "",
      category:
        resource.category ||
        "Career Advice",
      content:
        resource.content || "",
      resource_url:
        resource.resource_url || "",
    });

    setShowResourceForm(true);
  };

  /*
   * =========================================================
   * SAVE OPPORTUNITY
   * =========================================================
   */

  const saveOpportunity = async () => {
    if (
      !opportunityForm.title.trim() ||
      !opportunityForm.company_name.trim()
    ) {
      setMessage(
        "Title and company name are required."
      );
      return;
    }

    setSavingOpportunity(true);
    setMessage("");

    const skills =
      opportunityForm.skills_required
        .split(",")
        .map((skill) =>
          skill.trim()
        )
        .filter(Boolean);

    const payload = {
      title:
        opportunityForm.title.trim(),
      company_name:
        opportunityForm.company_name.trim(),
      description:
        opportunityForm.description.trim() ||
        null,
      opportunity_type:
        opportunityForm.opportunity_type,
      location:
        opportunityForm.location.trim() ||
        null,
      work_preference:
        opportunityForm.work_preference ===
        "Any"
          ? null
          : opportunityForm.work_preference,
      experience_level:
        opportunityForm.experience_level ||
        null,
      skills_required:
        skills.length
          ? skills
          : null,
      industry:
        opportunityForm.industry.trim() ||
        null,
      application_url:
        opportunityForm.application_url.trim() ||
        null,
      application_deadline:
        opportunityForm.application_deadline ||
        null,
      salary_min:
        opportunityForm.salary_min
          ? Number(
              opportunityForm.salary_min
            )
          : null,
      salary_max:
        opportunityForm.salary_max
          ? Number(
              opportunityForm.salary_max
            )
          : null,
      currency:
        opportunityForm.currency ||
        "KES",
      is_active:
        opportunityForm.is_active,
      updated_at:
        new Date().toISOString(),
    };

    let error = null;

    if (editingOpportunity) {
      const result =
        await supabase
          .from(
            "career_opportunities"
          )
          .update(payload)
          .eq(
            "id",
            editingOpportunity.id
          );

      error = result.error;
    } else {
      const result =
        await supabase
          .from(
            "career_opportunities"
          )
          .insert(payload);

      error = result.error;
    }

    setSavingOpportunity(false);

    if (error) {
      setMessage(error.message);
      return;
    }

    setMessage(
      editingOpportunity
        ? "Opportunity updated successfully."
        : "Opportunity published successfully."
    );

    setShowOpportunityForm(
      false
    );

    resetOpportunityForm();

    await loadData();
  };

  /*
   * =========================================================
   * SAVE RESOURCE
   * =========================================================
   */

  const saveResource = async () => {
    if (!resourceForm.title.trim()) {
      setMessage(
        "Resource title is required."
      );
      return;
    }

    setSavingResource(true);
    setMessage("");

    const payload = {
      title:
        resourceForm.title.trim(),
      description:
        resourceForm.description.trim() ||
        null,
      category:
        resourceForm.category,
      content:
        resourceForm.content.trim() ||
        null,
      resource_url:
        resourceForm.resource_url.trim() ||
        null,
      updated_at:
        new Date().toISOString(),
    };

    let error = null;

    if (editingResource) {
      const result =
        await supabase
          .from("career_resources")
          .update(payload)
          .eq(
            "id",
            editingResource.id
          );

      error = result.error;
    } else {
      const result =
        await supabase
          .from("career_resources")
          .insert(payload);

      error = result.error;
    }

    setSavingResource(false);

    if (error) {
      setMessage(error.message);
      return;
    }

    setMessage(
      editingResource
        ? "Career resource updated successfully."
        : "Career resource created successfully."
    );

    setShowResourceForm(false);

    resetResourceForm();

    await loadData();
  };

  /*
   * =========================================================
   * DELETE OPPORTUNITY
   * =========================================================
   */

  const deleteOpportunity = async (
    id: number
  ) => {
    const confirmed =
      window.confirm(
        "Delete this opportunity? This cannot be undone."
      );

    if (!confirmed) return;

    setDeletingId(id);
    setMessage("");

    const { error } =
      await supabase
        .from(
          "career_opportunities"
        )
        .delete()
        .eq("id", id);

    setDeletingId(null);

    if (error) {
      setMessage(error.message);
      return;
    }

    setOpportunities(
      (items) =>
        items.filter(
          (item) =>
            item.id !== id
        )
    );

    setMessage(
      "Opportunity deleted."
    );
  };

  /*
   * =========================================================
   * DELETE RESOURCE
   * =========================================================
   */

  const deleteResource = async (
    id: number
  ) => {
    const confirmed =
      window.confirm(
        "Delete this career resource? This cannot be undone."
      );

    if (!confirmed) return;

    setDeletingId(id);
    setMessage("");

    const { error } =
      await supabase
        .from("career_resources")
        .delete()
        .eq("id", id);

    setDeletingId(null);

    if (error) {
      setMessage(error.message);
      return;
    }

    setResources(
      (items) =>
        items.filter(
          (item) =>
            item.id !== id
        )
    );

    setMessage(
      "Career resource deleted."
    );
  };

  /*
   * =========================================================
   * TOGGLE PUBLISHED STATUS
   * =========================================================
   */

  const toggleOpportunityStatus = async (
    opportunity: Opportunity
  ) => {
    const nextStatus =
      !opportunity.is_active;

    const { error } =
      await supabase
        .from(
          "career_opportunities"
        )
        .update({
          is_active:
            nextStatus,
          updated_at:
            new Date().toISOString(),
        })
        .eq(
          "id",
          opportunity.id
        );

    if (error) {
      setMessage(error.message);
      return;
    }

    setOpportunities(
      (items) =>
        items.map((item) =>
          item.id ===
          opportunity.id
            ? {
                ...item,
                is_active:
                  nextStatus,
              }
            : item
        )
    );

    setMessage(
      nextStatus
        ? "Opportunity published."
        : "Opportunity unpublished."
    );
  };

  /*
   * =========================================================
   * ACCESS STATES
   * =========================================================
   */

  if (checkingAuth) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#070b12] text-white">
        <div className="text-center">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-2 border-white/10 border-t-cyan-400" />

          <p className="text-sm text-white/50">
            Checking administrator access...
          </p>
        </div>
      </main>
    );
  }

  if (!authorized) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#070b12] px-5 text-white">
        <div className="max-w-md rounded-3xl border border-red-400/10 bg-white/[0.03] p-8 text-center">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-red-400/10 text-xl text-red-300">
            !
          </div>

          <h1 className="mt-5 text-xl font-semibold">
            Administrator access required
          </h1>

          <p className="mt-2 text-sm leading-6 text-white/40">
            Your account does not have
            permission to manage Career Hub
            content.
          </p>
        </div>
      </main>
    );
  }

  if (loading) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#070b12] text-white">
        <div className="text-center">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-2 border-white/10 border-t-cyan-400" />

          <p className="text-sm text-white/50">
            Loading Career Hub administration...
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

              Career Hub Administration
            </div>

            <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
              Manage career intelligence.
            </h1>

            <p className="mt-2 max-w-3xl text-sm leading-6 text-white/50">
              Publish opportunities and career
              resources that power the student
              Career Hub, opportunity matching
              and skill-gap analysis.
            </p>
          </div>

          <div className="flex gap-2">
            {activeSection ===
              "opportunities" && (
              <button
                onClick={() => {
                  resetOpportunityForm();
                  setShowOpportunityForm(
                    true
                  );
                }}
                className="rounded-xl bg-cyan-400 px-5 py-3 text-sm font-semibold text-slate-950 hover:bg-cyan-300"
              >
                + Add Opportunity
              </button>
            )}

            {activeSection ===
              "resources" && (
              <button
                onClick={() => {
                  resetResourceForm();
                  setShowResourceForm(
                    true
                  );
                }}
                className="rounded-xl bg-cyan-400 px-5 py-3 text-sm font-semibold text-slate-950 hover:bg-cyan-300"
              >
                + Add Resource
              </button>
            )}
          </div>
        </header>

        {/* SECTION SWITCHER */}

        <nav className="mb-6 flex gap-1 rounded-2xl border border-white/10 bg-white/[0.03] p-1">
          <button
            onClick={() =>
              setActiveSection(
                "opportunities"
              )
            }
            className={`flex-1 rounded-xl px-4 py-3 text-sm transition ${
              activeSection ===
              "opportunities"
                ? "bg-white/10 text-white"
                : "text-white/40 hover:text-white"
            }`}
          >
            Opportunities
          </button>

          <button
            onClick={() =>
              setActiveSection(
                "resources"
              )
            }
            className={`flex-1 rounded-xl px-4 py-3 text-sm transition ${
              activeSection ===
              "resources"
                ? "bg-white/10 text-white"
                : "text-white/40 hover:text-white"
            }`}
          >
            Career Resources
          </button>
        </nav>

        {message && (
          <div className="mb-5 flex items-center justify-between rounded-xl border border-cyan-400/20 bg-cyan-400/5 px-4 py-3 text-sm text-cyan-200">
            <span>{message}</span>

            <button
              onClick={() =>
                setMessage("")
              }
              className="ml-4 text-white/40 hover:text-white"
            >
              ×
            </button>
          </div>
        )}

        {/* =====================================================
            OPPORTUNITIES
        ====================================================== */}

        {activeSection ===
          "opportunities" && (
          <>
            {/* STATS */}

            <section className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
              <AdminMetric
                label="Total"
                value={
                  opportunityStats.total
                }
                detail="All opportunities"
              />

              <AdminMetric
                label="Published"
                value={
                  opportunityStats.active
                }
                detail="Visible to students"
              />

              <AdminMetric
                label="Unpublished"
                value={
                  opportunityStats.inactive
                }
                detail="Hidden from students"
              />

              <AdminMetric
                label="Jobs"
                value={
                  opportunityStats.jobs
                }
                detail="Employment opportunities"
              />

              <AdminMetric
                label="Internships"
                value={
                  opportunityStats.internships
                }
                detail="Student opportunities"
              />
            </section>

            {/* FILTERS */}

            <section className="mb-5 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <div className="grid gap-3 lg:grid-cols-[1fr_180px_180px]">
                <input
                  className={inputClass}
                  value={search}
                  onChange={(event) =>
                    setSearch(
                      event.target.value
                    )
                  }
                  placeholder="Search opportunities, companies, skills..."
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
                  <option>
                    Job
                  </option>
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
                  value={statusFilter}
                  onChange={(event) =>
                    setStatusFilter(
                      event.target.value
                    )
                  }
                >
                  <option>All</option>
                  <option>
                    Published
                  </option>
                  <option>
                    Unpublished
                  </option>
                </select>
              </div>
            </section>

            <div className="mb-4 flex items-center justify-between text-xs text-white/35">
              <span>
                {
                  filteredOpportunities.length
                }{" "}
                opportunities
              </span>

              <button
                onClick={loadData}
                className="text-cyan-300 hover:text-cyan-200"
              >
                Refresh
              </button>
            </div>

            {/* OPPORTUNITY LIST */}

            <section className="space-y-3">
              {filteredOpportunities.map(
                (opportunity) => {
                  const deadline =
                    daysUntil(
                      opportunity.application_deadline
                    );

                  return (
                    <article
                      key={
                        opportunity.id
                      }
                      className="rounded-2xl border border-white/10 bg-white/[0.03] p-5"
                    >
                      <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
                        <div className="min-w-0 flex-1">
                          <div className="mb-2 flex flex-wrap gap-2">
                            <span className="rounded-full bg-cyan-400/10 px-2.5 py-1 text-[10px] uppercase tracking-wider text-cyan-300">
                              {
                                opportunity.opportunity_type
                              }
                            </span>

                            <span
                              className={`rounded-full px-2.5 py-1 text-[10px] ${
                                opportunity.is_active
                                  ? "bg-green-400/10 text-green-300"
                                  : "bg-white/10 text-white/40"
                              }`}
                            >
                              {opportunity.is_active
                                ? "Published"
                                : "Unpublished"}
                            </span>

                            {deadline !==
                              null && (
                              <span
                                className={`rounded-full px-2.5 py-1 text-[10px] ${
                                  deadline <=
                                  7
                                    ? "bg-orange-400/10 text-orange-300"
                                    : "bg-white/5 text-white/35"
                                }`}
                              >
                                {deadline <
                                0
                                  ? "Deadline passed"
                                  : deadline ===
                                    0
                                  ? "Closes today"
                                  : `${deadline} days left`}
                              </span>
                            )}
                          </div>

                          <h2 className="text-lg font-semibold">
                            {
                              opportunity.title
                            }
                          </h2>

                          <p className="mt-1 text-sm text-white/45">
                            {
                              opportunity.company_name
                            }{" "}
                            ·{" "}
                            {opportunity.location ||
                              "Location flexible"}
                          </p>

                          {opportunity.description && (
                            <p className="mt-3 line-clamp-2 max-w-3xl text-sm leading-6 text-white/40">
                              {
                                opportunity.description
                              }
                            </p>
                          )}

                          <div className="mt-4 flex flex-wrap gap-2">
                            {(
                              opportunity.skills_required ||
                              []
                            )
                              .slice(0, 10)
                              .map(
                                (
                                  skill
                                ) => (
                                  <span
                                    key={
                                      skill
                                    }
                                    className="rounded-lg border border-white/10 bg-white/[0.025] px-2.5 py-1.5 text-[10px] text-white/45"
                                  >
                                    {
                                      skill
                                    }
                                  </span>
                                )
                              )}
                          </div>

                          <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs text-white/35">
                            <span>
                              Industry:{" "}
                              <strong className="text-white/60">
                                {opportunity.industry ||
                                  "Not specified"}
                              </strong>
                            </span>

                            <span>
                              Work:{" "}
                              <strong className="text-white/60">
                                {opportunity.work_preference ||
                                  "Any"}
                              </strong>
                            </span>

                            <span>
                              Experience:{" "}
                              <strong className="text-white/60">
                                {opportunity.experience_level ||
                                  "Not specified"}
                              </strong>
                            </span>

                            <span>
                              Deadline:{" "}
                              <strong className="text-white/60">
                                {formatDate(
                                  opportunity.application_deadline
                                )}
                              </strong>
                            </span>

                            {opportunity.salary_min !==
                              null ||
                            opportunity.salary_max !==
                              null ? (
                              <span>
                                Salary:{" "}
                                <strong className="text-white/60">
                                  {opportunity.currency ||
                                    "KES"}{" "}
                                  {opportunity.salary_min ??
                                    "—"}{" "}
                                  -{" "}
                                  {opportunity.salary_max ??
                                    "—"}
                                </strong>
                              </span>
                            ) : null}
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2 xl:w-56 xl:justify-end">
                          <button
                            onClick={() =>
                              openEditOpportunity(
                                opportunity
                              )
                            }
                            className="rounded-xl border border-white/10 px-4 py-2.5 text-xs text-white/70 hover:bg-white/5"
                          >
                            Edit
                          </button>

                          <button
                            onClick={() =>
                              toggleOpportunityStatus(
                                opportunity
                              )
                            }
                            className={`rounded-xl px-4 py-2.5 text-xs ${
                              opportunity.is_active
                                ? "border border-orange-400/20 bg-orange-400/5 text-orange-300"
                                : "border border-cyan-400/20 bg-cyan-400/5 text-cyan-300"
                            }`}
                          >
                            {opportunity.is_active
                              ? "Unpublish"
                              : "Publish"}
                          </button>

                          {opportunity.application_url && (
                            <a
                              href={
                                opportunity.application_url
                              }
                              target="_blank"
                              rel="noreferrer"
                              className="rounded-xl border border-white/10 px-4 py-2.5 text-xs text-white/60 hover:bg-white/5"
                            >
                              Application ↗
                            </a>
                          )}

                          <button
                            disabled={
                              deletingId ===
                              opportunity.id
                            }
                            onClick={() =>
                              deleteOpportunity(
                                opportunity.id
                              )
                            }
                            className="rounded-xl border border-red-400/10 px-4 py-2.5 text-xs text-red-300/70 hover:bg-red-400/5 disabled:opacity-40"
                          >
                            {deletingId ===
                            opportunity.id
                              ? "Deleting..."
                              : "Delete"}
                          </button>
                        </div>
                      </div>
                    </article>
                  );
                }
              )}

              {!filteredOpportunities.length && (
                <Empty
                  text="No opportunities match your filters."
                  actionLabel="Create opportunity"
                  onAction={() => {
                    resetOpportunityForm();
                    setShowOpportunityForm(
                      true
                    );
                  }}
                />
              )}
            </section>
          </>
        )}

        {/* =====================================================
            RESOURCES
        ====================================================== */}

        {activeSection ===
          "resources" && (
          <>
            <section className="mb-6 grid gap-4 md:grid-cols-3">
              <AdminMetric
                label="Resources"
                value={
                  resources.length
                }
                detail="Published career resources"
              />

              <AdminMetric
                label="Categories"
                value={
                  resourceCategories.length
                }
                detail="Resource categories"
              />

              <AdminMetric
                label="With links"
                value={
                  resources.filter(
                    (resource) =>
                      !!resource.resource_url
                  ).length
                }
                detail="External resources"
              />
            </section>

            <section className="mb-5 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <div className="grid gap-3 lg:grid-cols-[1fr_220px]">
                <input
                  className={inputClass}
                  value={
                    resourceSearch
                  }
                  onChange={(event) =>
                    setResourceSearch(
                      event.target.value
                    )
                  }
                  placeholder="Search career resources..."
                />

                <select
                  className={inputClass}
                  value={
                    resourceCategory
                  }
                  onChange={(event) =>
                    setResourceCategory(
                      event.target.value
                    )
                  }
                >
                  <option>
                    All
                  </option>

                  {resourceCategories.map(
                    (category) => (
                      <option
                        key={
                          category
                        }
                      >
                        {category}
                      </option>
                    )
                  )}
                </select>
              </div>
            </section>

            <div className="mb-4 text-xs text-white/35">
              {
                filteredResources.length
              }{" "}
              resources
            </div>

            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {filteredResources.map(
                (resource) => (
                  <article
                    key={
                      resource.id
                    }
                    className="rounded-2xl border border-white/10 bg-white/[0.03] p-5"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <span className="rounded-full bg-cyan-400/10 px-2.5 py-1 text-[10px] uppercase tracking-wider text-cyan-300">
                        {
                          resource.category
                        }
                      </span>

                      <span className="text-[10px] text-white/25">
                        {formatDate(
                          resource.created_at
                        )}
                      </span>
                    </div>

                    <h2 className="mt-4 text-lg font-semibold">
                      {
                        resource.title
                      }
                    </h2>

                    <p className="mt-2 line-clamp-3 text-sm leading-6 text-white/40">
                      {resource.description ||
                        resource.content ||
                        "No description provided."}
                    </p>

                    {resource.resource_url && (
                      <a
                        href={
                          resource.resource_url
                        }
                        target="_blank"
                        rel="noreferrer"
                        className="mt-4 block truncate text-xs text-cyan-300 hover:text-cyan-200"
                      >
                        {
                          resource.resource_url
                        }{" "}
                        ↗
                      </a>
                    )}

                    <div className="mt-5 flex gap-2 border-t border-white/5 pt-4">
                      <button
                        onClick={() =>
                          openEditResource(
                            resource
                          )
                        }
                        className="flex-1 rounded-xl border border-white/10 px-4 py-2.5 text-xs text-white/70 hover:bg-white/5"
                      >
                        Edit
                      </button>

                      <button
                        disabled={
                          deletingId ===
                          resource.id
                        }
                        onClick={() =>
                          deleteResource(
                            resource.id
                          )
                        }
                        className="rounded-xl border border-red-400/10 px-4 py-2.5 text-xs text-red-300/70 hover:bg-red-400/5 disabled:opacity-40"
                      >
                        {deletingId ===
                        resource.id
                          ? "..."
                          : "Delete"}
                      </button>
                    </div>
                  </article>
                )
              )}
            </section>

            {!filteredResources.length && (
              <Empty
                text="No career resources match your filters."
                actionLabel="Create resource"
                onAction={() => {
                  resetResourceForm();
                  setShowResourceForm(
                    true
                  );
                }}
              />
            )}
          </>
        )}
      </div>

      {/* =====================================================
          OPPORTUNITY FORM MODAL
      ====================================================== */}

      {showOpportunityForm && (
        <Modal
          title={
            editingOpportunity
              ? "Edit opportunity"
              : "Create opportunity"
          }
          subtitle="This information will power Career Hub recommendations and skill matching."
          onClose={() => {
            setShowOpportunityForm(
              false
            );
            resetOpportunityForm();
          }}
        >
          <div className="space-y-5">
            <div className="grid gap-5 md:grid-cols-2">
              <Field label="Opportunity title *">
                <input
                  className={inputClass}
                  value={
                    opportunityForm.title
                  }
                  onChange={(event) =>
                    setOpportunityForm(
                      {
                        ...opportunityForm,
                        title:
                          event.target
                            .value,
                      }
                    )
                  }
                  placeholder="e.g. Junior Data Analyst"
                />
              </Field>

              <Field label="Company / organization *">
                <input
                  className={inputClass}
                  value={
                    opportunityForm.company_name
                  }
                  onChange={(event) =>
                    setOpportunityForm(
                      {
                        ...opportunityForm,
                        company_name:
                          event.target
                            .value,
                      }
                    )
                  }
                  placeholder="e.g. Safaricom"
                />
              </Field>
            </div>

            <Field label="Description">
              <textarea
                className={`${textareaClass} min-h-32 resize-y`}
                value={
                  opportunityForm.description
                }
                onChange={(event) =>
                  setOpportunityForm(
                    {
                      ...opportunityForm,
                      description:
                        event.target
                          .value,
                    }
                  )
                }
                placeholder="Describe the opportunity, responsibilities, requirements and what applicants should know."
              />
            </Field>

            <div className="grid gap-5 md:grid-cols-3">
              <Field label="Type">
                <select
                  className={inputClass}
                  value={
                    opportunityForm.opportunity_type
                  }
                  onChange={(event) =>
                    setOpportunityForm(
                      {
                        ...opportunityForm,
                        opportunity_type:
                          event.target
                            .value,
                      }
                    )
                  }
                >
                  <option>
                    Job
                  </option>
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
              </Field>

              <Field label="Work preference">
                <select
                  className={inputClass}
                  value={
                    opportunityForm.work_preference
                  }
                  onChange={(event) =>
                    setOpportunityForm(
                      {
                        ...opportunityForm,
                        work_preference:
                          event.target
                            .value,
                      }
                    )
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

              <Field label="Experience">
                <select
                  className={inputClass}
                  value={
                    opportunityForm.experience_level
                  }
                  onChange={(event) =>
                    setOpportunityForm(
                      {
                        ...opportunityForm,
                        experience_level:
                          event.target
                            .value,
                      }
                    )
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

            <div className="grid gap-5 md:grid-cols-2">
              <Field label="Location">
                <input
                  className={inputClass}
                  value={
                    opportunityForm.location
                  }
                  onChange={(event) =>
                    setOpportunityForm(
                      {
                        ...opportunityForm,
                        location:
                          event.target
                            .value,
                      }
                    )
                  }
                  placeholder="Nairobi, Kenya"
                />
              </Field>

              <Field label="Industry">
                <input
                  className={inputClass}
                  value={
                    opportunityForm.industry
                  }
                  onChange={(event) =>
                    setOpportunityForm(
                      {
                        ...opportunityForm,
                        industry:
                          event.target
                            .value,
                      }
                    )
                  }
                  placeholder="Technology, Finance, Healthcare..."
                />
              </Field>
            </div>

            <Field
              label="Required skills"
              hint="Separate skills with commas"
            >
              <input
                className={inputClass}
                value={
                  opportunityForm.skills_required
                }
                onChange={(event) =>
                  setOpportunityForm(
                    {
                      ...opportunityForm,
                      skills_required:
                        event.target
                          .value,
                    }
                  )
                }
                placeholder="Python, SQL, Excel, Power BI, Statistics"
              />

              <p className="mt-2 text-[10px] leading-5 text-white/30">
                These skills are used by
                DataSphere's matching and
                skill-gap engine.
              </p>
            </Field>

            <div className="grid gap-5 md:grid-cols-2">
              <Field label="Application deadline">
                <input
                  type="date"
                  className={inputClass}
                  value={
                    opportunityForm.application_deadline
                  }
                  onChange={(event) =>
                    setOpportunityForm(
                      {
                        ...opportunityForm,
                        application_deadline:
                          event.target
                            .value,
                      }
                    )
                  }
                />
              </Field>

              <Field label="Application URL">
                <input
                  type="url"
                  className={inputClass}
                  value={
                    opportunityForm.application_url
                  }
                  onChange={(event) =>
                    setOpportunityForm(
                      {
                        ...opportunityForm,
                        application_url:
                          event.target
                            .value,
                      }
                    )
                  }
                  placeholder="https://..."
                />
              </Field>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-4">
              <div className="mb-3 text-xs uppercase tracking-wider text-white/30">
                Compensation
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <Field label="Minimum">
                  <input
                    type="number"
                    min="0"
                    className={inputClass}
                    value={
                      opportunityForm.salary_min
                    }
                    onChange={(event) =>
                      setOpportunityForm(
                        {
                          ...opportunityForm,
                          salary_min:
                            event.target
                              .value,
                        }
                      )
                    }
                    placeholder="50000"
                  />
                </Field>

                <Field label="Maximum">
                  <input
                    type="number"
                    min="0"
                    className={inputClass}
                    value={
                      opportunityForm.salary_max
                    }
                    onChange={(event) =>
                      setOpportunityForm(
                        {
                          ...opportunityForm,
                          salary_max:
                            event.target
                              .value,
                        }
                      )
                    }
                    placeholder="100000"
                  />
                </Field>

                <Field label="Currency">
                  <select
                    className={inputClass}
                    value={
                      opportunityForm.currency
                    }
                    onChange={(event) =>
                      setOpportunityForm(
                        {
                          ...opportunityForm,
                          currency:
                            event.target
                              .value,
                        }
                      )
                    }
                  >
                    <option>
                      KES
                    </option>
                    <option>
                      USD
                    </option>
                    <option>
                      EUR
                    </option>
                    <option>
                      GBP
                    </option>
                  </select>
                </Field>
              </div>
            </div>

            <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-white/10 bg-white/[0.025] p-4">
              <input
                type="checkbox"
                checked={
                  opportunityForm.is_active
                }
                onChange={(event) =>
                  setOpportunityForm(
                    {
                      ...opportunityForm,
                      is_active:
                        event.target
                          .checked,
                    }
                  )
                }
                className="h-4 w-4 accent-cyan-400"
              />

              <div>
                <div className="text-sm font-medium">
                  Publish immediately
                </div>

                <div className="mt-1 text-xs text-white/35">
                  Published opportunities are
                  visible to students.
                </div>
              </div>
            </label>

            <div className="flex justify-end gap-2 border-t border-white/10 pt-5">
              <button
                onClick={() => {
                  setShowOpportunityForm(
                    false
                  );
                  resetOpportunityForm();
                }}
                className="rounded-xl border border-white/10 px-5 py-3 text-sm text-white/60 hover:bg-white/5"
              >
                Cancel
              </button>

              <button
                disabled={
                  savingOpportunity
                }
                onClick={
                  saveOpportunity
                }
                className="rounded-xl bg-cyan-400 px-6 py-3 text-sm font-semibold text-slate-950 disabled:opacity-50"
              >
                {savingOpportunity
                  ? "Saving..."
                  : editingOpportunity
                  ? "Save changes"
                  : "Publish opportunity"}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* =====================================================
          RESOURCE FORM MODAL
      ====================================================== */}

      {showResourceForm && (
        <Modal
          title={
            editingResource
              ? "Edit career resource"
              : "Create career resource"
          }
          subtitle="Give students practical career guidance they can access from Career Hub."
          onClose={() => {
            setShowResourceForm(
              false
            );
            resetResourceForm();
          }}
        >
          <div className="space-y-5">
            <Field label="Resource title *">
              <input
                className={inputClass}
                value={
                  resourceForm.title
                }
                onChange={(event) =>
                  setResourceForm(
                    {
                      ...resourceForm,
                      title:
                        event.target
                          .value,
                    }
                  )
                }
                placeholder="e.g. How to prepare for a technical interview"
              />
            </Field>

            <div className="grid gap-5 md:grid-cols-2">
              <Field label="Category">
                <select
                  className={inputClass}
                  value={
                    resourceForm.category
                  }
                  onChange={(event) =>
                    setResourceForm(
                      {
                        ...resourceForm,
                        category:
                          event.target
                            .value,
                      }
                    )
                  }
                >
                  <option>
                    Career Advice
                  </option>
                  <option>
                    CV & Resume
                  </option>
                  <option>
                    Interview Preparation
                  </option>
                  <option>
                    Certifications
                  </option>
                  <option>
                    Job Search
                  </option>
                  <option>
                    Workplace Skills
                  </option>
                  <option>
                    Networking
                  </option>
                  <option>
                    Entrepreneurship
                  </option>
                  <option>
                    Learning Resources
                  </option>
                  <option>
                    Other
                  </option>
                </select>
              </Field>

              <Field label="External resource URL">
                <input
                  type="url"
                  className={inputClass}
                  value={
                    resourceForm.resource_url
                  }
                  onChange={(event) =>
                    setResourceForm(
                      {
                        ...resourceForm,
                        resource_url:
                          event.target
                            .value,
                      }
                    )
                  }
                  placeholder="https://..."
                />
              </Field>
            </div>

            <Field label="Short description">
              <textarea
                className={`${textareaClass} min-h-24 resize-y`}
                value={
                  resourceForm.description
                }
                onChange={(event) =>
                  setResourceForm(
                    {
                      ...resourceForm,
                      description:
                        event.target
                          .value,
                    }
                  )
                }
                placeholder="Briefly explain what students will learn from this resource."
              />
            </Field>

            <Field
              label="Resource content"
              hint="Optional — can be used for an internal guide"
            >
              <textarea
                className={`${textareaClass} min-h-52 resize-y`}
                value={
                  resourceForm.content
                }
                onChange={(event) =>
                  setResourceForm(
                    {
                      ...resourceForm,
                      content:
                        event.target
                          .value,
                    }
                  )
                }
                placeholder="Write the actual career guidance here..."
              />
            </Field>

            <div className="rounded-xl border border-cyan-400/10 bg-cyan-400/[0.03] p-4 text-xs leading-5 text-white/40">
              If an external URL is
              provided, students can open the
              resource directly. If internal
              content is provided, Career Hub
              can display it as a DataSphere
              resource.
            </div>

            <div className="flex justify-end gap-2 border-t border-white/10 pt-5">
              <button
                onClick={() => {
                  setShowResourceForm(
                    false
                  );
                  resetResourceForm();
                }}
                className="rounded-xl border border-white/10 px-5 py-3 text-sm text-white/60 hover:bg-white/5"
              >
                Cancel
              </button>

              <button
                disabled={
                  savingResource
                }
                onClick={saveResource}
                className="rounded-xl bg-cyan-400 px-6 py-3 text-sm font-semibold text-slate-950 disabled:opacity-50"
              >
                {savingResource
                  ? "Saving..."
                  : editingResource
                  ? "Save changes"
                  : "Create resource"}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </main>
  );
}

/* =========================================================
   REUSABLE COMPONENTS
========================================================= */

function AdminMetric({
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
      <div className="text-xs text-white/40">
        {label}
      </div>

      <div className="mt-2 text-3xl font-bold">
        {value}
      </div>

      <div className="mt-2 text-[10px] text-cyan-300/60">
        {detail}
      </div>
    </div>
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
      <div className="mb-2 flex items-center justify-between gap-3">
        <span className="text-sm font-medium text-white/75">
          {label}
        </span>

        {hint && (
          <span className="text-[10px] text-white/25">
            {hint}
          </span>
        )}
      </div>

      {children}
    </label>
  );
}

function Empty({
  text,
  actionLabel,
  onAction,
}: {
  text: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-white/10 p-10 text-center">
      <div className="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-white/[0.04] text-white/30">
        +
      </div>

      <p className="mt-4 text-sm text-white/35">
        {text}
      </p>

      {actionLabel &&
        onAction && (
          <button
            onClick={onAction}
            className="mt-4 rounded-xl bg-cyan-400 px-4 py-2.5 text-xs font-semibold text-slate-950"
          >
            {actionLabel}
          </button>
        )}
    </div>
  );
}

function Modal({
  title,
  subtitle,
  onClose,
  children,
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/75 p-4 backdrop-blur-sm">
      <div className="mx-auto my-8 max-w-4xl rounded-3xl border border-white/10 bg-[#0c121c] shadow-2xl">
        <div className="sticky top-0 z-10 flex items-start justify-between gap-5 rounded-t-3xl border-b border-white/10 bg-[#0c121c]/95 p-6 backdrop-blur">
          <div>
            <h2 className="text-xl font-semibold">
              {title}
            </h2>

            {subtitle && (
              <p className="mt-1 max-w-2xl text-xs leading-5 text-white/35">
                {subtitle}
              </p>
            )}
          </div>

          <button
            onClick={onClose}
            className="rounded-xl px-3 py-1 text-2xl text-white/35 hover:bg-white/5 hover:text-white"
          >
            ×
          </button>
        </div>

        <div className="p-6">
          {children}
        </div>
      </div>
    </div>
  );
}