"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "../lib/supabase";

type PortfolioProfile = {
  id?: number;
  user_id: string;
  headline: string | null;
  bio: string | null;
  location: string | null;
  phone: string | null;
  website_url: string | null;
  github_url: string | null;
  linkedin_url: string | null;
  profile_visibility: "private" | "public";
};

type Project = {
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

type Certificate = {
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

type Skill = {
  id: number;
  user_id: string;
  name: string;
  category: string;
  proficiency: number | null;
};

type Achievement = {
  id: number;
  user_id: string;
  title: string;
  description: string | null;
  achievement_date: string | null;
  organization: string | null;
  verification_url: string | null;
};

type DocumentItem = {
  id: number;
  user_id: string;
  title: string;
  file_url: string;
  file_name: string | null;
  file_type: string | null;
  file_size: number | null;
};

type Tab =
  | "overview"
  | "profile"
  | "projects"
  | "certificates"
  | "skills"
  | "achievements"
  | "documents";

const emptyProfile = (): PortfolioProfile => ({
  user_id: "",
  headline: "",
  bio: "",
  location: "",
  phone: "",
  website_url: "",
  github_url: "",
  linkedin_url: "",
  profile_visibility: "private",
});

export default function PortfolioPage() {
  const [userId, setUserId] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [activeTab, setActiveTab] = useState<Tab>("overview");

  const [profile, setProfile] =
    useState<PortfolioProfile>(emptyProfile());

  const [projects, setProjects] = useState<Project[]>([]);
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [documents, setDocuments] = useState<DocumentItem[]>([]);

  const [showProjectForm, setShowProjectForm] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(
    null
  );

  const [showCertificateForm, setShowCertificateForm] =
    useState(false);
  const [editingCertificate, setEditingCertificate] =
    useState<Certificate | null>(null);

  const [showSkillForm, setShowSkillForm] = useState(false);
  const [editingSkill, setEditingSkill] = useState<Skill | null>(null);

  const [showAchievementForm, setShowAchievementForm] =
    useState(false);
  const [editingAchievement, setEditingAchievement] =
    useState<Achievement | null>(null);

  const [projectForm, setProjectForm] = useState({
    title: "",
    description: "",
    technologies: "",
    project_url: "",
    github_url: "",
    image_url: "",
    featured: false,
  });

  const [certificateForm, setCertificateForm] = useState({
    title: "",
    issuer: "",
    issue_date: "",
    expiry_date: "",
    credential_id: "",
    verification_url: "",
    file_url: "",
  });

  const [skillForm, setSkillForm] = useState({
    name: "",
    category: "Technical",
    proficiency: 75,
  });

  const [achievementForm, setAchievementForm] = useState({
    title: "",
    description: "",
    achievement_date: "",
    organization: "",
    verification_url: "",
  });

  const [documentForm, setDocumentForm] = useState({
    title: "",
  });

  useEffect(() => {
    loadPortfolio();
  }, []);

  async function loadPortfolio() {
    try {
      setLoading(true);
      setError("");

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) throw userError;

      if (!user) {
        setError("You must be logged in to access your portfolio.");
        return;
      }

      setUserId(user.id);

      const [
        profileResult,
        projectsResult,
        certificatesResult,
        skillsResult,
        achievementsResult,
        documentsResult,
      ] = await Promise.all([
        supabase
          .from("portfolio_profiles")
          .select("*")
          .eq("user_id", user.id)
          .maybeSingle(),

        supabase
          .from("portfolio_projects")
          .select("*")
          .eq("user_id", user.id)
          .order("featured", { ascending: false })
          .order("created_at", { ascending: false }),

        supabase
          .from("portfolio_certificates")
          .select("*")
          .eq("user_id", user.id)
          .order("issue_date", { ascending: false }),

        supabase
          .from("portfolio_skills")
          .select("*")
          .eq("user_id", user.id)
          .order("category", { ascending: true })
          .order("name", { ascending: true }),

        supabase
          .from("portfolio_achievements")
          .select("*")
          .eq("user_id", user.id)
          .order("achievement_date", { ascending: false }),

        supabase
          .from("portfolio_documents")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false }),
      ]);

      if (profileResult.error) throw profileResult.error;
      if (projectsResult.error) throw projectsResult.error;
      if (certificatesResult.error) throw certificatesResult.error;
      if (skillsResult.error) throw skillsResult.error;
      if (achievementsResult.error) throw achievementsResult.error;
      if (documentsResult.error) throw documentsResult.error;

      if (profileResult.data) {
        setProfile(profileResult.data);
      } else {
        setProfile({
          ...emptyProfile(),
          user_id: user.id,
        });
      }

      setProjects(projectsResult.data || []);
      setCertificates(certificatesResult.data || []);
      setSkills(skillsResult.data || []);
      setAchievements(achievementsResult.data || []);
      setDocuments(documentsResult.data || []);
    } catch (err: any) {
      console.error(err);
      setError(err?.message || "Unable to load portfolio.");
    } finally {
      setLoading(false);
    }
  }

  function notify(text: string) {
    setMessage(text);
    setTimeout(() => setMessage(""), 3000);
  }

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();

    try {
      setSaving(true);
      setError("");

      const { error: saveError } = await supabase
        .from("portfolio_profiles")
        .upsert(
          {
            user_id: userId,
            headline: profile.headline || null,
            bio: profile.bio || null,
            location: profile.location || null,
            phone: profile.phone || null,
            website_url: profile.website_url || null,
            github_url: profile.github_url || null,
            linkedin_url: profile.linkedin_url || null,
            profile_visibility: profile.profile_visibility,
            updated_at: new Date().toISOString(),
          },
          {
            onConflict: "user_id",
          }
        );

      if (saveError) throw saveError;

      notify("Portfolio profile saved.");
    } catch (err: any) {
      setError(err?.message || "Unable to save profile.");
    } finally {
      setSaving(false);
    }
  }

  function openNewProject() {
    setEditingProject(null);

    setProjectForm({
      title: "",
      description: "",
      technologies: "",
      project_url: "",
      github_url: "",
      image_url: "",
      featured: false,
    });

    setShowProjectForm(true);
  }

  function openEditProject(project: Project) {
    setEditingProject(project);

    setProjectForm({
      title: project.title,
      description: project.description || "",
      technologies: project.technologies?.join(", ") || "",
      project_url: project.project_url || "",
      github_url: project.github_url || "",
      image_url: project.image_url || "",
      featured: project.featured,
    });

    setShowProjectForm(true);
  }

  async function saveProject(e: React.FormEvent) {
    e.preventDefault();

    if (!projectForm.title.trim()) {
      setError("Project title is required.");
      return;
    }

    try {
      setSaving(true);
      setError("");

      const payload = {
        user_id: userId,
        title: projectForm.title.trim(),
        description: projectForm.description.trim() || null,
        technologies: projectForm.technologies
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean),
        project_url: projectForm.project_url.trim() || null,
        github_url: projectForm.github_url.trim() || null,
        image_url: projectForm.image_url.trim() || null,
        featured: projectForm.featured,
        updated_at: new Date().toISOString(),
      };

      if (editingProject) {
        const { error: updateError } = await supabase
          .from("portfolio_projects")
          .update(payload)
          .eq("id", editingProject.id)
          .eq("user_id", userId);

        if (updateError) throw updateError;
        notify("Project updated.");
      } else {
        const { error: insertError } = await supabase
          .from("portfolio_projects")
          .insert(payload);

        if (insertError) throw insertError;
        notify("Project added.");
      }

      setShowProjectForm(false);
      await loadPortfolio();
    } catch (err: any) {
      setError(err?.message || "Unable to save project.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteProject(id: number) {
    if (!confirm("Delete this project?")) return;

    const { error: deleteError } = await supabase
      .from("portfolio_projects")
      .delete()
      .eq("id", id)
      .eq("user_id", userId);

    if (deleteError) {
      setError(deleteError.message);
      return;
    }

    setProjects((items) => items.filter((item) => item.id !== id));
    notify("Project deleted.");
  }

  function openNewCertificate() {
    setEditingCertificate(null);

    setCertificateForm({
      title: "",
      issuer: "",
      issue_date: "",
      expiry_date: "",
      credential_id: "",
      verification_url: "",
      file_url: "",
    });

    setShowCertificateForm(true);
  }

  function openEditCertificate(certificate: Certificate) {
    setEditingCertificate(certificate);

    setCertificateForm({
      title: certificate.title,
      issuer: certificate.issuer || "",
      issue_date: certificate.issue_date || "",
      expiry_date: certificate.expiry_date || "",
      credential_id: certificate.credential_id || "",
      verification_url: certificate.verification_url || "",
      file_url: certificate.file_url || "",
    });

    setShowCertificateForm(true);
  }

  async function saveCertificate(e: React.FormEvent) {
    e.preventDefault();

    if (!certificateForm.title.trim()) {
      setError("Certificate title is required.");
      return;
    }

    try {
      setSaving(true);
      setError("");

      const payload = {
        user_id: userId,
        title: certificateForm.title.trim(),
        issuer: certificateForm.issuer.trim() || null,
        issue_date: certificateForm.issue_date || null,
        expiry_date: certificateForm.expiry_date || null,
        credential_id:
          certificateForm.credential_id.trim() || null,
        verification_url:
          certificateForm.verification_url.trim() || null,
        file_url: certificateForm.file_url.trim() || null,
        updated_at: new Date().toISOString(),
      };

      if (editingCertificate) {
        const { error: updateError } = await supabase
          .from("portfolio_certificates")
          .update(payload)
          .eq("id", editingCertificate.id)
          .eq("user_id", userId);

        if (updateError) throw updateError;
        notify("Certificate updated.");
      } else {
        const { error: insertError } = await supabase
          .from("portfolio_certificates")
          .insert(payload);

        if (insertError) throw insertError;
        notify("Certificate added.");
      }

      setShowCertificateForm(false);
      await loadPortfolio();
    } catch (err: any) {
      setError(err?.message || "Unable to save certificate.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteCertificate(id: number) {
    if (!confirm("Delete this certificate?")) return;

    const { error: deleteError } = await supabase
      .from("portfolio_certificates")
      .delete()
      .eq("id", id)
      .eq("user_id", userId);

    if (deleteError) {
      setError(deleteError.message);
      return;
    }

    setCertificates((items) =>
      items.filter((item) => item.id !== id)
    );

    notify("Certificate deleted.");
  }

  function openNewSkill() {
    setEditingSkill(null);

    setSkillForm({
      name: "",
      category: "Technical",
      proficiency: 75,
    });

    setShowSkillForm(true);
  }

  function openEditSkill(skill: Skill) {
    setEditingSkill(skill);

    setSkillForm({
      name: skill.name,
      category: skill.category,
      proficiency: skill.proficiency ?? 75,
    });

    setShowSkillForm(true);
  }

  async function saveSkill(e: React.FormEvent) {
    e.preventDefault();

    if (!skillForm.name.trim()) {
      setError("Skill name is required.");
      return;
    }

    try {
      setSaving(true);
      setError("");

      const payload = {
        user_id: userId,
        name: skillForm.name.trim(),
        category: skillForm.category.trim() || "Technical",
        proficiency: Number(skillForm.proficiency),
      };

      if (editingSkill) {
        const { error: updateError } = await supabase
          .from("portfolio_skills")
          .update(payload)
          .eq("id", editingSkill.id)
          .eq("user_id", userId);

        if (updateError) throw updateError;
        notify("Skill updated.");
      } else {
        const { error: insertError } = await supabase
          .from("portfolio_skills")
          .insert(payload);

        if (insertError) throw insertError;
        notify("Skill added.");
      }

      setShowSkillForm(false);
      await loadPortfolio();
    } catch (err: any) {
      setError(err?.message || "Unable to save skill.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteSkill(id: number) {
    if (!confirm("Delete this skill?")) return;

    const { error: deleteError } = await supabase
      .from("portfolio_skills")
      .delete()
      .eq("id", id)
      .eq("user_id", userId);

    if (deleteError) {
      setError(deleteError.message);
      return;
    }

    setSkills((items) => items.filter((item) => item.id !== id));
    notify("Skill deleted.");
  }

  function openNewAchievement() {
    setEditingAchievement(null);

    setAchievementForm({
      title: "",
      description: "",
      achievement_date: "",
      organization: "",
      verification_url: "",
    });

    setShowAchievementForm(true);
  }

  function openEditAchievement(achievement: Achievement) {
    setEditingAchievement(achievement);

    setAchievementForm({
      title: achievement.title,
      description: achievement.description || "",
      achievement_date: achievement.achievement_date || "",
      organization: achievement.organization || "",
      verification_url: achievement.verification_url || "",
    });

    setShowAchievementForm(true);
  }

  async function saveAchievement(e: React.FormEvent) {
    e.preventDefault();

    if (!achievementForm.title.trim()) {
      setError("Achievement title is required.");
      return;
    }

    try {
      setSaving(true);
      setError("");

      const payload = {
        user_id: userId,
        title: achievementForm.title.trim(),
        description: achievementForm.description.trim() || null,
        achievement_date:
          achievementForm.achievement_date || null,
        organization:
          achievementForm.organization.trim() || null,
        verification_url:
          achievementForm.verification_url.trim() || null,
      };

      if (editingAchievement) {
        const { error: updateError } = await supabase
          .from("portfolio_achievements")
          .update(payload)
          .eq("id", editingAchievement.id)
          .eq("user_id", userId);

        if (updateError) throw updateError;
        notify("Achievement updated.");
      } else {
        const { error: insertError } = await supabase
          .from("portfolio_achievements")
          .insert(payload);

        if (insertError) throw insertError;
        notify("Achievement added.");
      }

      setShowAchievementForm(false);
      await loadPortfolio();
    } catch (err: any) {
      setError(err?.message || "Unable to save achievement.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteAchievement(id: number) {
    if (!confirm("Delete this achievement?")) return;

    const { error: deleteError } = await supabase
      .from("portfolio_achievements")
      .delete()
      .eq("id", id)
      .eq("user_id", userId);

    if (deleteError) {
      setError(deleteError.message);
      return;
    }

    setAchievements((items) =>
      items.filter((item) => item.id !== id)
    );

    notify("Achievement deleted.");
  }

  async function uploadDocument(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    const file = event.target.files?.[0];

    if (!file) return;

    if (!documentForm.title.trim()) {
      setError("Enter a document title before selecting a file.");
      event.target.value = "";
      return;
    }

    if (file.size > 25 * 1024 * 1024) {
      setError("Maximum document size is 25MB.");
      event.target.value = "";
      return;
    }

    try {
      setSaving(true);
      setError("");

      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");

      const path = `${userId}/${Date.now()}-${safeName}`;

      const { error: uploadError } = await supabase.storage
        .from("portfolio_documents")
        .upload(path, file);

      if (uploadError) throw uploadError;

      const {
        data: { publicUrl },
      } = supabase.storage
        .from("portfolio_documents")
        .getPublicUrl(path);

      const { error: insertError } = await supabase
        .from("portfolio_documents")
        .insert({
          user_id: userId,
          title: documentForm.title.trim(),
          file_url: publicUrl,
          file_name: file.name,
          file_type: file.type,
          file_size: file.size,
        });

      if (insertError) throw insertError;

      setDocumentForm({ title: "" });
      event.target.value = "";

      notify("Document uploaded.");
      await loadPortfolio();
    } catch (err: any) {
      setError(err?.message || "Unable to upload document.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteDocument(document: DocumentItem) {
    if (!confirm(`Delete "${document.title}"?`)) return;

    try {
      const { error: deleteError } = await supabase
        .from("portfolio_documents")
        .delete()
        .eq("id", document.id)
        .eq("user_id", userId);

      if (deleteError) throw deleteError;

      setDocuments((items) =>
        items.filter((item) => item.id !== document.id)
      );

      notify("Document deleted.");
    } catch (err: any) {
      setError(err?.message || "Unable to delete document.");
    }
  }

  const completion = useMemo(() => {
    let completed = 0;
    const total = 7;

    if (profile.headline?.trim()) completed++;
    if (profile.bio?.trim()) completed++;
    if (
      profile.github_url ||
      profile.linkedin_url ||
      profile.website_url
    )
      completed++;
    if (skills.length > 0) completed++;
    if (projects.length > 0) completed++;
    if (certificates.length > 0) completed++;
    if (achievements.length > 0) completed++;

    return Math.round((completed / total) * 100);
  }, [
    profile,
    skills,
    projects,
    certificates,
    achievements,
  ]);

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50 p-6">
        <div className="mx-auto max-w-7xl animate-pulse space-y-6">
          <div className="h-12 w-72 rounded-xl bg-slate-200" />

          <div className="grid gap-4 md:grid-cols-4">
            {[1, 2, 3, 4].map((item) => (
              <div
                key={item}
                className="h-28 rounded-2xl bg-slate-200"
              />
            ))}
          </div>

          <div className="h-[500px] rounded-2xl bg-slate-200" />
        </div>
      </main>
    );
  }

  if (error && !userId) {
    return (
      <main className="min-h-screen bg-slate-50 p-6">
        <div className="mx-auto max-w-2xl rounded-2xl border border-red-200 bg-red-50 p-6">
          <h1 className="text-xl font-bold text-red-700">
            Portfolio unavailable
          </h1>

          <p className="mt-2 text-sm text-red-600">{error}</p>

          <button
            onClick={loadPortfolio}
            className="mt-5 rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white"
          >
            Try Again
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 p-4 md:p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        {message && (
          <div className="fixed right-5 top-5 z-50 rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white shadow-xl">
            {message}
          </div>
        )}

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
            <button
              className="ml-3 font-bold"
              onClick={() => setError("")}
            >
              ×
            </button>
          </div>
        )}

        {/* Header */}
        <section className="rounded-3xl bg-white p-6 shadow-sm md:p-8">
          <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-center">
            <div>
              <p className="text-sm font-bold uppercase tracking-wide text-blue-600">
                Professional ePortfolio
              </p>

              <h1 className="mt-1 text-3xl font-black tracking-tight text-slate-900">
                Build Your Portfolio
              </h1>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                Showcase your academic journey, projects, skills,
                certifications and achievements in one professional
                profile.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              {profile.profile_visibility === "public" && (
                <Link
                  href={`/portfolio/public/${userId}`}
                  target="_blank"
                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  View Public Portfolio
                </Link>
              )}

              <button
                onClick={() => setActiveTab("profile")}
                className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-blue-700"
              >
                Edit Profile
              </button>
            </div>
          </div>

          <div className="mt-7">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-slate-800">
                  Portfolio completion
                </p>

                <p className="mt-1 text-xs text-slate-500">
                  Add more information to make your portfolio
                  stronger.
                </p>
              </div>

              <span className="text-sm font-black text-blue-600">
                {completion}%
              </span>
            </div>

            <div className="mt-3 h-3 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-blue-600 transition-all"
                style={{ width: `${completion}%` }}
              />
            </div>
          </div>
        </section>

        {/* Navigation */}
        <section className="overflow-x-auto rounded-2xl bg-white shadow-sm">
          <div className="flex min-w-max">
            <PortfolioTab
              active={activeTab === "overview"}
              onClick={() => setActiveTab("overview")}
              label="Overview"
              icon="◈"
            />

            <PortfolioTab
              active={activeTab === "profile"}
              onClick={() => setActiveTab("profile")}
              label="Profile"
              icon="◎"
            />

            <PortfolioTab
              active={activeTab === "projects"}
              onClick={() => setActiveTab("projects")}
              label="Projects"
              icon="◆"
              count={projects.length}
            />

            <PortfolioTab
              active={activeTab === "certificates"}
              onClick={() => setActiveTab("certificates")}
              label="Certificates"
              icon="◇"
              count={certificates.length}
            />

            <PortfolioTab
              active={activeTab === "skills"}
              onClick={() => setActiveTab("skills")}
              label="Skills"
              icon="✦"
              count={skills.length}
            />

            <PortfolioTab
              active={activeTab === "achievements"}
              onClick={() => setActiveTab("achievements")}
              label="Achievements"
              icon="★"
              count={achievements.length}
            />

            <PortfolioTab
              active={activeTab === "documents"}
              onClick={() => setActiveTab("documents")}
              label="Documents"
              icon="▣"
              count={documents.length}
            />
          </div>
        </section>

        {/* Overview */}
        {activeTab === "overview" && (
          <section className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <OverviewCard
                icon="◆"
                label="Projects"
                value={projects.length}
                onClick={() => setActiveTab("projects")}
              />

              <OverviewCard
                icon="◇"
                label="Certificates"
                value={certificates.length}
                onClick={() => setActiveTab("certificates")}
              />

              <OverviewCard
                icon="✦"
                label="Skills"
                value={skills.length}
                onClick={() => setActiveTab("skills")}
              />

              <OverviewCard
                icon="★"
                label="Achievements"
                value={achievements.length}
                onClick={() => setActiveTab("achievements")}
              />
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
              <div className="rounded-2xl bg-white p-6 shadow-sm lg:col-span-2">
                <div className="flex items-start justify-between gap-5">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wide text-blue-600">
                      Profile Preview
                    </p>

                    <h2 className="mt-2 text-2xl font-black text-slate-900">
                      {profile.headline ||
                        "Your professional headline"}
                    </h2>

                    <p className="mt-1 text-sm text-slate-500">
                      {profile.location ||
                        "Add your location"}
                    </p>
                  </div>

                  <span
                    className={`rounded-full px-3 py-1 text-xs font-bold ${
                      profile.profile_visibility === "public"
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {profile.profile_visibility === "public"
                      ? "Public"
                      : "Private"}
                  </span>
                </div>

                <p className="mt-6 whitespace-pre-line text-sm leading-7 text-slate-600">
                  {profile.bio ||
                    "Write a short professional biography from the Profile section."}
                </p>

                <div className="mt-6 flex flex-wrap gap-2">
                  {profile.github_url && (
                    <a
                      href={profile.github_url}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-lg bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-700"
                    >
                      GitHub
                    </a>
                  )}

                  {profile.linkedin_url && (
                    <a
                      href={profile.linkedin_url}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-lg bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-700"
                    >
                      LinkedIn
                    </a>
                  )}

                  {profile.website_url && (
                    <a
                      href={profile.website_url}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-lg bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-700"
                    >
                      Website
                    </a>
                  )}
                </div>
              </div>

              <div className="rounded-2xl bg-white p-6 shadow-sm">
                <h2 className="text-lg font-black text-slate-900">
                  Build Checklist
                </h2>

                <div className="mt-5 space-y-3">
                  <Checklist
                    label="Professional headline"
                    complete={!!profile.headline?.trim()}
                  />

                  <Checklist
                    label="Biography"
                    complete={!!profile.bio?.trim()}
                  />

                  <Checklist
                    label="Social / website link"
                    complete={
                      !!(
                        profile.github_url ||
                        profile.linkedin_url ||
                        profile.website_url
                      )
                    }
                  />

                  <Checklist
                    label="At least one skill"
                    complete={skills.length > 0}
                  />

                  <Checklist
                    label="At least one project"
                    complete={projects.length > 0}
                  />

                  <Checklist
                    label="Certificate"
                    complete={certificates.length > 0}
                  />

                  <Checklist
                    label="Achievement"
                    complete={achievements.length > 0}
                  />
                </div>
              </div>
            </div>

            <div className="rounded-2xl bg-white p-6 shadow-sm">
              <h2 className="text-lg font-black text-slate-900">
                Featured Projects
              </h2>

              <div className="mt-5 grid gap-4 md:grid-cols-3">
                {projects.filter((project) => project.featured).length ===
                0 ? (
                  <div className="rounded-xl bg-slate-50 p-5 text-sm text-slate-500 md:col-span-3">
                    No featured projects yet. Mark a project as
                    featured to highlight it here.
                  </div>
                ) : (
                  projects
                    .filter((project) => project.featured)
                    .slice(0, 3)
                    .map((project) => (
                      <ProjectCard
                        key={project.id}
                        project={project}
                        onEdit={() => openEditProject(project)}
                        onDelete={() => deleteProject(project.id)}
                      />
                    ))
                )}
              </div>
            </div>
          </section>
        )}

        {/* Profile */}
        {activeTab === "profile" && (
          <section className="rounded-2xl bg-white p-6 shadow-sm md:p-8">
            <div className="mb-7">
              <p className="text-xs font-bold uppercase tracking-wide text-blue-600">
                Professional identity
              </p>

              <h2 className="mt-1 text-2xl font-black text-slate-900">
                Portfolio Profile
              </h2>
            </div>

            <form onSubmit={saveProfile} className="space-y-6">
              <div className="grid gap-5 md:grid-cols-2">
                <Field
                  label="Professional headline"
                  value={profile.headline || ""}
                  onChange={(value) =>
                    setProfile({
                      ...profile,
                      headline: value,
                    })
                  }
                  placeholder="e.g. Data Science Student | Full-Stack Developer"
                />

                <Field
                  label="Location"
                  value={profile.location || ""}
                  onChange={(value) =>
                    setProfile({
                      ...profile,
                      location: value,
                    })
                  }
                  placeholder="e.g. Nairobi, Kenya"
                />

                <Field
                  label="Phone"
                  value={profile.phone || ""}
                  onChange={(value) =>
                    setProfile({
                      ...profile,
                      phone: value,
                    })
                  }
                  placeholder="Optional"
                />

                <Field
                  label="Website"
                  value={profile.website_url || ""}
                  onChange={(value) =>
                    setProfile({
                      ...profile,
                      website_url: value,
                    })
                  }
                  placeholder="https://example.com"
                />

                <Field
                  label="GitHub"
                  value={profile.github_url || ""}
                  onChange={(value) =>
                    setProfile({
                      ...profile,
                      github_url: value,
                    })
                  }
                  placeholder="https://github.com/username"
                />

                <Field
                  label="LinkedIn"
                  value={profile.linkedin_url || ""}
                  onChange={(value) =>
                    setProfile({
                      ...profile,
                      linkedin_url: value,
                    })
                  }
                  placeholder="https://linkedin.com/in/username"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-bold text-slate-700">
                  Professional biography
                </label>

                <textarea
                  value={profile.bio || ""}
                  onChange={(e) =>
                    setProfile({
                      ...profile,
                      bio: e.target.value,
                    })
                  }
                  rows={7}
                  placeholder="Tell visitors who you are, what you study, what you build and what you want to accomplish."
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <div className="rounded-xl border border-slate-200 p-5">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="font-bold text-slate-900">
                      Public portfolio
                    </p>

                    <p className="mt-1 text-xs leading-5 text-slate-500">
                      Allow other people to view your professional
                      portfolio.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      setProfile({
                        ...profile,
                        profile_visibility:
                          profile.profile_visibility ===
                          "public"
                            ? "private"
                            : "public",
                      })
                    }
                    className={`relative h-7 w-12 rounded-full transition ${
                      profile.profile_visibility === "public"
                        ? "bg-blue-600"
                        : "bg-slate-300"
                    }`}
                  >
                    <span
                      className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition ${
                        profile.profile_visibility === "public"
                          ? "left-6"
                          : "left-1"
                      }`}
                    />
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={saving}
                className="rounded-xl bg-blue-600 px-6 py-3 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-60"
              >
                {saving ? "Saving..." : "Save Portfolio Profile"}
              </button>
            </form>
          </section>
        )}

        {/* Projects */}
        {activeTab === "projects" && (
          <section className="space-y-6">
            <SectionHeader
              eyebrow="Portfolio work"
              title="Projects"
              description="Show employers and collaborators what you can actually build."
              buttonLabel="Add Project"
              onClick={openNewProject}
            />

            {projects.length === 0 ? (
              <EmptySection
                icon="◆"
                title="No projects yet"
                description="Add your first project and start building your professional portfolio."
                button="Add Project"
                onClick={openNewProject}
              />
            ) : (
              <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
                {projects.map((project) => (
                  <ProjectCard
                    key={project.id}
                    project={project}
                    onEdit={() => openEditProject(project)}
                    onDelete={() => deleteProject(project.id)}
                  />
                ))}
              </div>
            )}

            {showProjectForm && (
              <Modal
                title={
                  editingProject ? "Edit Project" : "Add Project"
                }
                onClose={() => setShowProjectForm(false)}
              >
                <form onSubmit={saveProject} className="space-y-5">
                  <Field
                    label="Project title"
                    value={projectForm.title}
                    onChange={(value) =>
                      setProjectForm({
                        ...projectForm,
                        title: value,
                      })
                    }
                    placeholder="e.g. DataSphere Academic Platform"
                  />

                  <TextAreaField
                    label="Description"
                    value={projectForm.description}
                    onChange={(value) =>
                      setProjectForm({
                        ...projectForm,
                        description: value,
                      })
                    }
                    placeholder="What did you build? What problem does it solve?"
                  />

                  <Field
                    label="Technologies"
                    value={projectForm.technologies}
                    onChange={(value) =>
                      setProjectForm({
                        ...projectForm,
                        technologies: value,
                      })
                    }
                    placeholder="Next.js, TypeScript, Supabase, PostgreSQL"
                  />

                  <div className="grid gap-4 md:grid-cols-2">
                    <Field
                      label="Live project URL"
                      value={projectForm.project_url}
                      onChange={(value) =>
                        setProjectForm({
                          ...projectForm,
                          project_url: value,
                        })
                      }
                      placeholder="https://..."
                    />

                    <Field
                      label="GitHub URL"
                      value={projectForm.github_url}
                      onChange={(value) =>
                        setProjectForm({
                          ...projectForm,
                          github_url: value,
                        })
                      }
                      placeholder="https://github.com/..."
                    />
                  </div>

                  <Field
                    label="Image URL"
                    value={projectForm.image_url}
                    onChange={(value) =>
                      setProjectForm({
                        ...projectForm,
                        image_url: value,
                      })
                    }
                    placeholder="Optional image URL"
                  />

                  <label className="flex cursor-pointer items-center gap-3 rounded-xl bg-slate-50 p-4">
                    <input
                      type="checkbox"
                      checked={projectForm.featured}
                      onChange={(e) =>
                        setProjectForm({
                          ...projectForm,
                          featured: e.target.checked,
                        })
                      }
                      className="h-4 w-4"
                    />

                    <span className="text-sm font-semibold text-slate-700">
                      Feature this project
                    </span>
                  </label>

                  <ModalActions
                    saving={saving}
                    onCancel={() => setShowProjectForm(false)}
                  />
                </form>
              </Modal>
            )}
          </section>
        )}

        {/* Certificates */}
        {activeTab === "certificates" && (
          <section className="space-y-6">
            <SectionHeader
              eyebrow="Credentials"
              title="Certificates"
              description="Document certifications, courses and professional credentials."
              buttonLabel="Add Certificate"
              onClick={openNewCertificate}
            />

            {certificates.length === 0 ? (
              <EmptySection
                icon="◇"
                title="No certificates yet"
                description="Add certifications and credentials that strengthen your profile."
                button="Add Certificate"
                onClick={openNewCertificate}
              />
            ) : (
              <div className="grid gap-5 md:grid-cols-2">
                {certificates.map((certificate) => (
                  <div
                    key={certificate.id}
                    className="rounded-2xl bg-white p-6 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <span className="text-2xl">◇</span>

                        <h3 className="mt-3 font-black text-slate-900">
                          {certificate.title}
                        </h3>

                        {certificate.issuer && (
                          <p className="mt-1 text-sm text-slate-500">
                            {certificate.issuer}
                          </p>
                        )}
                      </div>

                      <button
                        onClick={() =>
                          openEditCertificate(certificate)
                        }
                        className="text-sm font-bold text-blue-600"
                      >
                        Edit
                      </button>
                    </div>

                    <div className="mt-5 space-y-2 text-xs text-slate-500">
                      {certificate.issue_date && (
                        <p>
                          Issued:{" "}
                          {formatDate(certificate.issue_date)}
                        </p>
                      )}

                      {certificate.expiry_date && (
                        <p>
                          Expires:{" "}
                          {formatDate(certificate.expiry_date)}
                        </p>
                      )}

                      {certificate.credential_id && (
                        <p>
                          Credential ID:{" "}
                          {certificate.credential_id}
                        </p>
                      )}
                    </div>

                    <div className="mt-5 flex gap-3">
                      {certificate.verification_url && (
                        <a
                          href={certificate.verification_url}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded-lg bg-blue-50 px-3 py-2 text-xs font-bold text-blue-700"
                        >
                          Verify
                        </a>
                      )}

                      <button
                        onClick={() =>
                          deleteCertificate(certificate.id)
                        }
                        className="rounded-lg bg-red-50 px-3 py-2 text-xs font-bold text-red-600"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {showCertificateForm && (
              <Modal
                title={
                  editingCertificate
                    ? "Edit Certificate"
                    : "Add Certificate"
                }
                onClose={() => setShowCertificateForm(false)}
              >
                <form
                  onSubmit={saveCertificate}
                  className="space-y-5"
                >
                  <Field
                    label="Certificate title"
                    value={certificateForm.title}
                    onChange={(value) =>
                      setCertificateForm({
                        ...certificateForm,
                        title: value,
                      })
                    }
                    placeholder="e.g. Google Data Analytics Certificate"
                  />

                  <Field
                    label="Issuing organization"
                    value={certificateForm.issuer}
                    onChange={(value) =>
                      setCertificateForm({
                        ...certificateForm,
                        issuer: value,
                      })
                    }
                    placeholder="e.g. Google"
                  />

                  <div className="grid gap-4 md:grid-cols-2">
                    <Field
                      label="Issue date"
                      type="date"
                      value={certificateForm.issue_date}
                      onChange={(value) =>
                        setCertificateForm({
                          ...certificateForm,
                          issue_date: value,
                        })
                      }
                    />

                    <Field
                      label="Expiry date"
                      type="date"
                      value={certificateForm.expiry_date}
                      onChange={(value) =>
                        setCertificateForm({
                          ...certificateForm,
                          expiry_date: value,
                        })
                      }
                    />
                  </div>

                  <Field
                    label="Credential ID"
                    value={certificateForm.credential_id}
                    onChange={(value) =>
                      setCertificateForm({
                        ...certificateForm,
                        credential_id: value,
                      })
                    }
                    placeholder="Optional"
                  />

                  <Field
                    label="Verification URL"
                    value={certificateForm.verification_url}
                    onChange={(value) =>
                      setCertificateForm({
                        ...certificateForm,
                        verification_url: value,
                      })
                    }
                    placeholder="https://..."
                  />

                  <Field
                    label="Certificate file URL"
                    value={certificateForm.file_url}
                    onChange={(value) =>
                      setCertificateForm({
                        ...certificateForm,
                        file_url: value,
                      })
                    }
                    placeholder="Optional"
                  />

                  <ModalActions
                    saving={saving}
                    onCancel={() =>
                      setShowCertificateForm(false)
                    }
                  />
                </form>
              </Modal>
            )}
          </section>
        )}

        {/* Skills */}
        {activeTab === "skills" && (
          <section className="space-y-6">
            <SectionHeader
              eyebrow="Capabilities"
              title="Skills"
              description="Show the technical and professional capabilities you have developed."
              buttonLabel="Add Skill"
              onClick={openNewSkill}
            />

            {skills.length === 0 ? (
              <EmptySection
                icon="✦"
                title="No skills yet"
                description="Add technologies, tools and professional skills."
                button="Add Skill"
                onClick={openNewSkill}
              />
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {skills.map((skill) => (
                  <div
                    key={skill.id}
                    className="rounded-2xl bg-white p-5 shadow-sm"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="font-black text-slate-900">
                          {skill.name}
                        </p>

                        <p className="mt-1 text-xs font-semibold text-slate-500">
                          {skill.category}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => openEditSkill(skill)}
                          className="text-xs font-bold text-blue-600"
                        >
                          Edit
                        </button>

                        <button
                          onClick={() => deleteSkill(skill.id)}
                          className="text-xs font-bold text-red-600"
                        >
                          Delete
                        </button>
                      </div>
                    </div>

                    <div className="mt-5 flex items-center gap-3">
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full bg-blue-600"
                          style={{
                            width: `${Math.min(
                              Math.max(
                                skill.proficiency ?? 0,
                                0
                              ),
                              100
                            )}%`,
                          }}
                        />
                      </div>

                      <span className="text-xs font-bold text-slate-500">
                        {skill.proficiency ?? 0}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {showSkillForm && (
              <Modal
                title={editingSkill ? "Edit Skill" : "Add Skill"}
                onClose={() => setShowSkillForm(false)}
              >
                <form onSubmit={saveSkill} className="space-y-5">
                  <Field
                    label="Skill"
                    value={skillForm.name}
                    onChange={(value) =>
                      setSkillForm({
                        ...skillForm,
                        name: value,
                      })
                    }
                    placeholder="e.g. Python"
                  />

                  <Field
                    label="Category"
                    value={skillForm.category}
                    onChange={(value) =>
                      setSkillForm({
                        ...skillForm,
                        category: value,
                      })
                    }
                    placeholder="Technical"
                  />

                  <div>
                    <label className="mb-2 block text-sm font-bold text-slate-700">
                      Proficiency: {skillForm.proficiency}%
                    </label>

                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={skillForm.proficiency}
                      onChange={(e) =>
                        setSkillForm({
                          ...skillForm,
                          proficiency: Number(e.target.value),
                        })
                      }
                      className="w-full"
                    />
                  </div>

                  <ModalActions
                    saving={saving}
                    onCancel={() => setShowSkillForm(false)}
                  />
                </form>
              </Modal>
            )}
          </section>
        )}

        {/* Achievements */}
        {activeTab === "achievements" && (
          <section className="space-y-6">
            <SectionHeader
              eyebrow="Recognition"
              title="Achievements"
              description="Highlight awards, competitions, leadership and academic accomplishments."
              buttonLabel="Add Achievement"
              onClick={openNewAchievement}
            />

            {achievements.length === 0 ? (
              <EmptySection
                icon="★"
                title="No achievements yet"
                description="Add awards, competition results and other accomplishments."
                button="Add Achievement"
                onClick={openNewAchievement}
              />
            ) : (
              <div className="space-y-4">
                {achievements.map((achievement) => (
                  <div
                    key={achievement.id}
                    className="rounded-2xl bg-white p-6 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-5">
                      <div className="flex gap-4">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-xl">
                          ★
                        </div>

                        <div>
                          <h3 className="font-black text-slate-900">
                            {achievement.title}
                          </h3>

                          {achievement.organization && (
                            <p className="mt-1 text-sm text-slate-500">
                              {achievement.organization}
                            </p>
                          )}

                          {achievement.achievement_date && (
                            <p className="mt-1 text-xs text-slate-400">
                              {formatDate(
                                achievement.achievement_date
                              )}
                            </p>
                          )}

                          {achievement.description && (
                            <p className="mt-4 text-sm leading-6 text-slate-600">
                              {achievement.description}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex gap-3">
                        <button
                          onClick={() =>
                            openEditAchievement(achievement)
                          }
                          className="text-xs font-bold text-blue-600"
                        >
                          Edit
                        </button>

                        <button
                          onClick={() =>
                            deleteAchievement(achievement.id)
                          }
                          className="text-xs font-bold text-red-600"
                        >
                          Delete
                        </button>
                      </div>
                    </div>

                    {achievement.verification_url && (
                      <a
                        href={achievement.verification_url}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-5 inline-block text-xs font-bold text-blue-600"
                      >
                        View verification →
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}

            {showAchievementForm && (
              <Modal
                title={
                  editingAchievement
                    ? "Edit Achievement"
                    : "Add Achievement"
                }
                onClose={() => setShowAchievementForm(false)}
              >
                <form
                  onSubmit={saveAchievement}
                  className="space-y-5"
                >
                  <Field
                    label="Achievement title"
                    value={achievementForm.title}
                    onChange={(value) =>
                      setAchievementForm({
                        ...achievementForm,
                        title: value,
                      })
                    }
                    placeholder="e.g. Hackathon Finalist"
                  />

                  <Field
                    label="Organization"
                    value={achievementForm.organization}
                    onChange={(value) =>
                      setAchievementForm({
                        ...achievementForm,
                        organization: value,
                      })
                    }
                    placeholder="Optional"
                  />

                  <Field
                    label="Date"
                    type="date"
                    value={achievementForm.achievement_date}
                    onChange={(value) =>
                      setAchievementForm({
                        ...achievementForm,
                        achievement_date: value,
                      })
                    }
                  />

                  <TextAreaField
                    label="Description"
                    value={achievementForm.description}
                    onChange={(value) =>
                      setAchievementForm({
                        ...achievementForm,
                        description: value,
                      })
                    }
                    placeholder="Describe the achievement."
                  />

                  <Field
                    label="Verification URL"
                    value={achievementForm.verification_url}
                    onChange={(value) =>
                      setAchievementForm({
                        ...achievementForm,
                        verification_url: value,
                      })
                    }
                    placeholder="Optional"
                  />

                  <ModalActions
                    saving={saving}
                    onCancel={() =>
                      setShowAchievementForm(false)
                    }
                  />
                </form>
              </Modal>
            )}
          </section>
        )}

        {/* Documents */}
        {activeTab === "documents" && (
          <section className="space-y-6">
            <SectionHeader
              eyebrow="Professional documents"
              title="Documents"
              description="Keep your CV and important professional documents attached to your portfolio."
            />

            <div className="rounded-2xl bg-white p-6 shadow-sm">
              <div className="grid gap-5 md:grid-cols-2">
                <Field
                  label="Document title"
                  value={documentForm.title}
                  onChange={(value) =>
                    setDocumentForm({
                      title: value,
                    })
                  }
                  placeholder="e.g. My CV 2026"
                />

                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-700">
                    Upload document
                  </label>

                  <input
                    type="file"
                    accept=".pdf,.doc,.docx,.txt"
                    onChange={uploadDocument}
                    disabled={saving}
                    className="block w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm"
                  />

                  <p className="mt-2 text-xs text-slate-400">
                    Maximum 25MB.
                  </p>
                </div>
              </div>
            </div>

            {documents.length === 0 ? (
              <EmptySection
                icon="▣"
                title="No documents yet"
                description="Upload your CV or other professional documents."
              />
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {documents.map((document) => (
                  <div
                    key={document.id}
                    className="rounded-2xl bg-white p-5 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-xl">
                          ▣
                        </div>

                        <h3 className="mt-4 font-black text-slate-900">
                          {document.title}
                        </h3>

                        <p className="mt-1 text-xs text-slate-500">
                          {document.file_name || "Document"}
                        </p>

                        {document.file_size && (
                          <p className="mt-1 text-xs text-slate-400">
                            {formatFileSize(document.file_size)}
                          </p>
                        )}
                      </div>

                      <button
                        onClick={() => deleteDocument(document)}
                        className="text-xs font-bold text-red-600"
                      >
                        Delete
                      </button>
                    </div>

                    <a
                      href={document.file_url}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-5 block rounded-xl bg-blue-50 px-4 py-3 text-center text-sm font-bold text-blue-700 hover:bg-blue-100"
                    >
                      Open Document
                    </a>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}
      </div>
    </main>
  );
}

/* -------------------------------------------------------------------------- */
/* Components                                                                 */
/* -------------------------------------------------------------------------- */

function PortfolioTab({
  active,
  onClick,
  label,
  icon,
  count,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  icon: string;
  count?: number;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 border-b-2 px-5 py-4 text-sm font-bold transition ${
        active
          ? "border-blue-600 text-blue-600"
          : "border-transparent text-slate-500 hover:text-slate-900"
      }`}
    >
      <span>{icon}</span>

      {label}

      {count !== undefined && (
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs">
          {count}
        </span>
      )}
    </button>
  );
}

function OverviewCard({
  icon,
  label,
  value,
  onClick,
}: {
  icon: string;
  label: string;
  value: number;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="rounded-2xl bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className="flex items-center justify-between">
        <span className="text-xl">{icon}</span>

        <span className="text-3xl font-black text-slate-900">
          {value}
        </span>
      </div>

      <p className="mt-4 text-sm font-bold text-slate-600">
        {label}
      </p>
    </button>
  );
}

function Checklist({
  label,
  complete,
}: {
  label: string;
  complete: boolean;
}) {
  return (
    <div className="flex items-center gap-3">
      <span
        className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-black ${
          complete
            ? "bg-emerald-100 text-emerald-700"
            : "bg-slate-100 text-slate-400"
        }`}
      >
        {complete ? "✓" : "○"}
      </span>

      <span
        className={`text-sm ${
          complete
            ? "font-semibold text-slate-800"
            : "text-slate-500"
        }`}
      >
        {label}
      </span>
    </div>
  );
}

function SectionHeader({
  eyebrow,
  title,
  description,
  buttonLabel,
  onClick,
}: {
  eyebrow: string;
  title: string;
  description: string;
  buttonLabel?: string;
  onClick?: () => void;
}) {
  return (
    <div className="flex flex-col justify-between gap-4 rounded-2xl bg-white p-6 shadow-sm md:flex-row md:items-center">
      <div>
        <p className="text-xs font-bold uppercase tracking-wide text-blue-600">
          {eyebrow}
        </p>

        <h2 className="mt-1 text-2xl font-black text-slate-900">
          {title}
        </h2>

        <p className="mt-1 text-sm text-slate-500">
          {description}
        </p>
      </div>

      {buttonLabel && onClick && (
        <button
          onClick={onClick}
          className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-blue-700"
        >
          + {buttonLabel}
        </button>
      )}
    </div>
  );
}

function EmptySection({
  icon,
  title,
  description,
  button,
  onClick,
}: {
  icon: string;
  title: string;
  description: string;
  button?: string;
  onClick?: () => void;
}) {
  return (
    <div className="rounded-2xl bg-white p-12 text-center shadow-sm">
      <div className="text-4xl">{icon}</div>

      <h3 className="mt-4 text-lg font-black text-slate-900">
        {title}
      </h3>

      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
        {description}
      </p>

      {button && onClick && (
        <button
          onClick={onClick}
          className="mt-6 rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white hover:bg-blue-700"
        >
          + {button}
        </button>
      )}
    </div>
  );
}

function ProjectCard({
  project,
  onEdit,
  onDelete,
}: {
  project: Project;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
      {project.image_url ? (
        <img
          src={project.image_url}
          alt={project.title}
          className="h-44 w-full object-cover"
        />
      ) : (
        <div className="flex h-32 items-center justify-center bg-slate-100 text-4xl">
          ◆
        </div>
      )}

      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <h3 className="font-black text-slate-900">
            {project.title}
          </h3>

          {project.featured && (
            <span className="rounded-full bg-amber-50 px-2 py-1 text-[10px] font-black text-amber-700">
              FEATURED
            </span>
          )}
        </div>

        {project.description && (
          <p className="mt-3 line-clamp-4 text-sm leading-6 text-slate-500">
            {project.description}
          </p>
        )}

        {project.technologies &&
          project.technologies.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-1.5">
              {project.technologies.map((technology) => (
                <span
                  key={technology}
                  className="rounded-md bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-600"
                >
                  {technology}
                </span>
              ))}
            </div>
          )}

        <div className="mt-5 flex flex-wrap gap-2">
          {project.project_url && (
            <a
              href={project.project_url}
              target="_blank"
              rel="noreferrer"
              className="rounded-lg bg-blue-50 px-3 py-2 text-xs font-bold text-blue-700"
            >
              Live Project
            </a>
          )}

          {project.github_url && (
            <a
              href={project.github_url}
              target="_blank"
              rel="noreferrer"
              className="rounded-lg bg-slate-100 px-3 py-2 text-xs font-bold text-slate-700"
            >
              GitHub
            </a>
          )}

          <button
            onClick={onEdit}
            className="rounded-lg bg-slate-100 px-3 py-2 text-xs font-bold text-slate-700"
          >
            Edit
          </button>

          <button
            onClick={onDelete}
            className="rounded-lg bg-red-50 px-3 py-2 text-xs font-bold text-red-600"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
        <div className="sticky top-0 flex items-center justify-between border-b border-slate-100 bg-white px-6 py-5">
          <h2 className="text-xl font-black text-slate-900">
            {title}
          </h2>

          <button
            onClick={onClose}
            className="text-2xl text-slate-400 hover:text-slate-700"
          >
            ×
          </button>
        </div>

        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

function ModalActions({
  saving,
  onCancel,
}: {
  saving: boolean;
  onCancel: () => void;
}) {
  return (
    <div className="flex justify-end gap-3 border-t border-slate-100 pt-5">
      <button
        type="button"
        onClick={onCancel}
        className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-bold text-slate-700"
      >
        Cancel
      </button>

      <button
        type="submit"
        disabled={saving}
        className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white disabled:opacity-60"
      >
        {saving ? "Saving..." : "Save"}
      </button>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-bold text-slate-700">
        {label}
      </label>

      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
      />
    </div>
  );
}

function TextAreaField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-bold text-slate-700">
        {label}
      </label>

      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={5}
        placeholder={placeholder}
        className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
      />
    </div>
  );
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024)
    return `${(bytes / 1024).toFixed(1)} KB`;

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}