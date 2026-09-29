import Link from "next/link";
import { supabase } from "../../../lib/supabase";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ userId: string }>;
};

type PortfolioProfile = {
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
  title: string;
  issuer: string | null;
  issue_date: string | null;
  expiry_date: string | null;
  credential_id: string | null;
  verification_url: string | null;
};

type Skill = {
  id: number;
  name: string;
  category: string;
  proficiency: number | null;
};

type Achievement = {
  id: number;
  title: string;
  description: string | null;
  achievement_date: string | null;
  organization: string | null;
  verification_url: string | null;
};

export default async function PublicPortfolioPage({
  params,
}: PageProps) {
  const { userId } = await params;

  const { data: profile, error: profileError } = await supabase
    .from("portfolio_profiles")
    .select(
      "user_id, headline, bio, location, phone, website_url, github_url, linkedin_url, profile_visibility"
    )
    .eq("user_id", userId)
    .eq("profile_visibility", "public")
    .maybeSingle();

  if (profileError || !profile) {
    return <PrivatePortfolio />;
  }

  const [
    projectsResult,
    certificatesResult,
    skillsResult,
    achievementsResult,
  ] = await Promise.all([
    supabase
      .from("portfolio_projects")
      .select(
        "id, title, description, technologies, project_url, github_url, image_url, featured"
      )
      .eq("user_id", userId)
      .order("featured", { ascending: false })
      .order("created_at", { ascending: false }),

    supabase
      .from("portfolio_certificates")
      .select(
        "id, title, issuer, issue_date, expiry_date, credential_id, verification_url"
      )
      .eq("user_id", userId)
      .order("issue_date", { ascending: false }),

    supabase
      .from("portfolio_skills")
      .select("id, name, category, proficiency")
      .eq("user_id", userId)
      .order("category", { ascending: true })
      .order("name", { ascending: true }),

    supabase
      .from("portfolio_achievements")
      .select(
        "id, title, description, achievement_date, organization, verification_url"
      )
      .eq("user_id", userId)
      .order("achievement_date", { ascending: false }),
  ]);

  const projects = (projectsResult.data || []) as Project[];
  const certificates =
    (certificatesResult.data || []) as Certificate[];
  const skills = (skillsResult.data || []) as Skill[];
  const achievements =
    (achievementsResult.data || []) as Achievement[];

  const featuredProjects = projects.filter(
    (project) => project.featured
  );

  const visibleProjects =
    featuredProjects.length > 0 ? featuredProjects : projects;

  const groupedSkills = skills.reduce<Record<string, Skill[]>>(
    (groups, skill) => {
      const category = skill.category || "Skills";

      if (!groups[category]) {
        groups[category] = [];
      }

      groups[category].push(skill);

      return groups;
    },
    {}
  );

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto max-w-6xl px-5 py-8 md:px-8">

        {/* Header */}
        <header className="flex items-center justify-between gap-4">
          <Link
            href="/"
            className="text-sm font-black tracking-wide text-white"
          >
            DataSphere
          </Link>

          <span className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-bold text-slate-300">
            Professional ePortfolio
          </span>
        </header>

        {/* Hero */}
        <section className="relative mt-8 overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.06] p-7 shadow-2xl md:p-12">

          <div className="absolute -right-24 -top-24 h-64 w-64 rounded-full bg-blue-500/20 blur-3xl" />

          <div className="absolute -bottom-32 -left-20 h-72 w-72 rounded-full bg-cyan-500/10 blur-3xl" />

          <div className="relative max-w-4xl">

            <p className="text-xs font-black uppercase tracking-[0.25em] text-blue-300">
              Open to opportunities
            </p>

            <h1 className="mt-4 text-4xl font-black tracking-tight md:text-6xl">
              {profile.headline || "Professional Portfolio"}
            </h1>

            {profile.location && (
              <p className="mt-4 text-sm font-semibold text-slate-300">
                {profile.location}
              </p>
            )}

            {profile.bio && (
              <p className="mt-7 max-w-3xl whitespace-pre-line text-base leading-8 text-slate-300 md:text-lg">
                {profile.bio}
              </p>
            )}

            <div className="mt-8 flex flex-wrap gap-3">

              {profile.github_url && (
                <ExternalLink
                  href={profile.github_url}
                  label="GitHub"
                />
              )}

              {profile.linkedin_url && (
                <ExternalLink
                  href={profile.linkedin_url}
                  label="LinkedIn"
                />
              )}

              {profile.website_url && (
                <ExternalLink
                  href={profile.website_url}
                  label="Website"
                />
              )}

              {profile.phone && (
                <a
                  href={`tel:${profile.phone}`}
                  className="rounded-xl bg-white px-4 py-3 text-sm font-black text-slate-900 hover:bg-slate-100"
                >
                  Contact
                </a>
              )}

            </div>
          </div>
        </section>

        {/* Stats */}
        <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

          <Stat
            value={projects.length}
            label="Projects"
          />

          <Stat
            value={skills.length}
            label="Skills"
          />

          <Stat
            value={certificates.length}
            label="Credentials"
          />

          <Stat
            value={achievements.length}
            label="Achievements"
          />

        </section>

        {/* Projects */}
        <section className="mt-14">

          <SectionTitle
            eyebrow="Selected work"
            title="Projects"
          />

          {visibleProjects.length === 0 ? (
            <Empty text="No projects have been published yet." />
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">

              {visibleProjects.map((project) => (
                <article
                  key={project.id}
                  className="overflow-hidden rounded-3xl border border-white/10 bg-white/[0.06]"
                >

                  {project.image_url ? (
                    <img
                      src={project.image_url}
                      alt={project.title}
                      className="h-48 w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-32 items-center justify-center bg-white/[0.04] text-4xl">
                      ◆
                    </div>
                  )}

                  <div className="p-6">

                    <div className="flex items-start justify-between gap-3">

                      <h3 className="text-xl font-black">
                        {project.title}
                      </h3>

                      {project.featured && (
                        <span className="rounded-full bg-blue-500/15 px-2 py-1 text-[10px] font-black text-blue-300">
                          FEATURED
                        </span>
                      )}

                    </div>

                    {project.description && (
                      <p className="mt-3 line-clamp-5 text-sm leading-6 text-slate-400">
                        {project.description}
                      </p>
                    )}

                    {project.technologies &&
                      project.technologies.length > 0 && (
                        <div className="mt-5 flex flex-wrap gap-2">

                          {project.technologies.map(
                            (technology) => (
                              <span
                                key={technology}
                                className="rounded-lg bg-white/5 px-2.5 py-1.5 text-[11px] font-bold text-slate-300"
                              >
                                {technology}
                              </span>
                            )
                          )}

                        </div>
                      )}

                    <div className="mt-6 flex flex-wrap gap-2">

                      {project.project_url && (
                        <ExternalLink
                          href={project.project_url}
                          label="Live Project"
                          dark
                        />
                      )}

                      {project.github_url && (
                        <ExternalLink
                          href={project.github_url}
                          label="GitHub"
                          dark
                        />
                      )}

                    </div>

                  </div>
                </article>
              ))}

            </div>
          )}
        </section>

        {/* Skills */}
        <section className="mt-16">

          <SectionTitle
            eyebrow="Capabilities"
            title="Skills"
          />

          {skills.length === 0 ? (
            <Empty text="No skills have been published yet." />
          ) : (
            <div className="space-y-8">

              {Object.entries(groupedSkills).map(
                ([category, categorySkills]) => (
                  <div key={category}>

                    <h3 className="mb-4 text-lg font-black text-white">
                      {category}
                    </h3>

                    <div className="grid gap-4 md:grid-cols-2">

                      {categorySkills.map((skill) => {
                        const proficiency = Math.min(
                          Math.max(skill.proficiency ?? 0, 0),
                          100
                        );

                        return (
                          <div
                            key={skill.id}
                            className="rounded-2xl border border-white/10 bg-white/[0.06] p-5"
                          >

                            <div className="flex items-center justify-between gap-4">

                              <span className="font-black">
                                {skill.name}
                              </span>

                              <span className="text-xs font-bold text-slate-400">
                                {proficiency}%
                              </span>

                            </div>

                            <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/10">

                              <div
                                className="h-full rounded-full bg-blue-500"
                                style={{
                                  width: `${proficiency}%`,
                                }}
                              />

                            </div>

                          </div>
                        );
                      })}

                    </div>
                  </div>
                )
              )}

            </div>
          )}
        </section>

        {/* Certificates */}
        <section className="mt-16">

          <SectionTitle
            eyebrow="Credentials"
            title="Certificates"
          />

          {certificates.length === 0 ? (
            <Empty text="No certificates have been published yet." />
          ) : (
            <div className="grid gap-5 md:grid-cols-2">

              {certificates.map((certificate) => (
                <article
                  key={certificate.id}
                  className="rounded-3xl border border-white/10 bg-white/[0.06] p-6"
                >

                  <div className="flex items-start gap-4">

                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-500/10 text-xl text-blue-300">
                      ◇
                    </div>

                    <div className="min-w-0">

                      <h3 className="font-black text-white">
                        {certificate.title}
                      </h3>

                      {certificate.issuer && (
                        <p className="mt-1 text-sm text-slate-400">
                          {certificate.issuer}
                        </p>
                      )}

                    </div>
                  </div>

                  <div className="mt-5 space-y-2 text-xs text-slate-400">

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

                  {certificate.verification_url && (
                    <a
                      href={certificate.verification_url}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-5 inline-block rounded-xl bg-blue-500/10 px-4 py-3 text-xs font-black text-blue-300 hover:bg-blue-500/20"
                    >
                      Verify Credential →
                    </a>
                  )}

                </article>
              ))}

            </div>
          )}
        </section>

        {/* Achievements */}
        <section className="mt-16">

          <SectionTitle
            eyebrow="Recognition"
            title="Achievements"
          />

          {achievements.length === 0 ? (
            <Empty text="No achievements have been published yet." />
          ) : (
            <div className="space-y-4">

              {achievements.map((achievement) => (
                <article
                  key={achievement.id}
                  className="rounded-3xl border border-white/10 bg-white/[0.06] p-6"
                >

                  <div className="flex gap-4">

                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-xl text-amber-300">
                      ★
                    </div>

                    <div className="min-w-0">

                      <h3 className="font-black text-white">
                        {achievement.title}
                      </h3>

                      {achievement.organization && (
                        <p className="mt-1 text-sm text-slate-400">
                          {achievement.organization}
                        </p>
                      )}

                      {achievement.achievement_date && (
                        <p className="mt-1 text-xs text-slate-500">
                          {formatDate(
                            achievement.achievement_date
                          )}
                        </p>
                      )}

                      {achievement.description && (
                        <p className="mt-4 text-sm leading-7 text-slate-400">
                          {achievement.description}
                        </p>
                      )}

                      {achievement.verification_url && (
                        <a
                          href={achievement.verification_url}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-4 inline-block text-xs font-black text-blue-300"
                        >
                          View verification →
                        </a>
                      )}

                    </div>
                  </div>

                </article>
              ))}

            </div>
          )}
        </section>

        {/* Footer */}
        <footer className="mt-20 border-t border-white/10 py-8 text-center">

          <p className="text-xs font-semibold text-slate-500">
            Built with DataSphere ePortfolio
          </p>

        </footer>

      </div>
    </main>
  );
}

/* -------------------------------------------------------------------------- */
/* Components                                                                 */
/* -------------------------------------------------------------------------- */

function ExternalLink({
  href,
  label,
  dark = false,
}: {
  href: string;
  label: string;
  dark?: boolean;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className={
        dark
          ? "rounded-xl bg-white/5 px-4 py-2.5 text-xs font-black text-slate-200 hover:bg-white/10"
          : "rounded-xl bg-white px-4 py-3 text-sm font-black text-slate-900 hover:bg-slate-100"
      }
    >
      {label}
    </a>
  );
}

function Stat({
  value,
  label,
}: {
  value: number;
  label: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-6">
      <p className="text-3xl font-black text-white">
        {value}
      </p>

      <p className="mt-2 text-xs font-bold uppercase tracking-wider text-slate-500">
        {label}
      </p>
    </div>
  );
}

function SectionTitle({
  eyebrow,
  title,
}: {
  eyebrow: string;
  title: string;
}) {
  return (
    <div className="mb-7">

      <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-300">
        {eyebrow}
      </p>

      <h2 className="mt-2 text-3xl font-black tracking-tight md:text-4xl">
        {title}
      </h2>

    </div>
  );
}

function Empty({
  text,
}: {
  text: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-8 text-center text-sm text-slate-500">
      {text}
    </div>
  );
}

function PrivatePortfolio() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-5 text-white">

      <div className="w-full max-w-lg rounded-3xl border border-white/10 bg-white/[0.06] p-8 text-center shadow-2xl">

        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-white/5 text-2xl">
          🔒
        </div>

        <h1 className="mt-6 text-2xl font-black">
          Portfolio unavailable
        </h1>

        <p className="mt-3 text-sm leading-6 text-slate-400">
          This portfolio is private or does not exist.
        </p>

        <Link
          href="/"
          className="mt-7 inline-block rounded-xl bg-white px-5 py-3 text-sm font-black text-slate-900"
        >
          Go to DataSphere
        </Link>

      </div>
    </main>
  );
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}