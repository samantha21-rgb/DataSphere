"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Sidebar from "../components/dashboard/Sidebar";
import Topbar from "../components/dashboard/Topbar";
import { supabase } from "../lib/supabase";

type Profile = {
  id: string; full_name?: string | null; name?: string | null; email?: string | null;
  university_id?: number | null; school_id?: number | null; department_id?: number | null;
  programme_id?: number | null; program_id?: number | null; academic_year_id?: number | null;
  year_id?: number | null; semester_id?: number | null; year_number?: number | null;
  academic_year_number?: number | null; semester_number?: number | null; role?: string | null;
};
type Unit = { id: number; name: string; semester_id: number };
type Course = { id: number; name?: string | null; title?: string | null };
type Resource = { id: number; title: string; description?: string | null; file_url?: string | null; unit_id: number; created_at: string };
type Exam = { id: number; title: string; exam_type: string; exam_date: string | null; start_time: string | null; end_time: string | null; venue: string | null; instructions: string | null; unit_id: number };
type Notification = { id: number; title: string; message: string; type: string; link: string | null; is_read: boolean; created_at: string };
type AcademicInfo = { universityName: string; schoolName: string; departmentName: string; programmeName: string; yearNumber: number | null; semesterNumber: number | null };

const initialAcademic: AcademicInfo = { universityName: "", schoolName: "", departmentName: "", programmeName: "", yearNumber: null, semesterNumber: null };

function Icon({ name, size = 18 }: { name: string; size?: number }) {
  const p: Record<string, React.ReactNode> = {
    arrow: <><path d="M5 12h13"/><path d="m13 6 6 6-6 6"/></>,
    calendar: <><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4M17 3v4M3 9h18"/></>,
    spark: <><path d="m12 3 1.6 6.4L20 12l-6.4 1.6L12 20l-1.6-6.4L4 12l6.4-2.6z"/></>,
    refresh: <><path d="M20 11a8 8 0 0 0-14.8-4L4 9"/><path d="M4 5v4h4"/><path d="M4 13a8 8 0 0 0 14.8 4L20 15"/><path d="M20 19v-4h-4"/></>,
    book: <><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v17H6.5A2.5 2.5 0 0 0 4 22z"/><path d="M4 5.5v14A2.5 2.5 0 0 1 6.5 17H20"/></>,
    file: <><path d="M6 3h8l4 4v14H6z"/><path d="M14 3v5h5M9 13h6M9 17h5"/></>,
    chart: <><path d="M4 19V5M4 19h16"/><path d="m7 15 4-4 3 2 5-6"/></>,
    clock: <><circle cx="12" cy="12" r="8.5"/><path d="M12 7v5l3 2"/></>,
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{p[name]}</svg>;
}

export default function DashboardPage() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [units, setUnits] = useState<Unit[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [notes, setNotes] = useState<Resource[]>([]);
  const [assignments, setAssignments] = useState<Resource[]>([]);
  const [cats, setCats] = useState<Resource[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [academicInfo, setAcademicInfo] = useState<AcademicInfo>(initialAcademic);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [expandedUnit, setExpandedUnit] = useState<number | null>(null);

  useEffect(() => { loadDashboard(); }, []);

  async function loadDashboard() {
    setRefreshing(true); setError("");
    try {
      const { data: { user: currentUser }, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!currentUser) { setError("You are not logged in."); return; }
      setUser(currentUser);

      const { data: profileData } = await supabase.from("profiles").select("*").eq("id", currentUser.id).maybeSingle();
      if (profileData) setProfile(profileData);
      const activeProfile = profileData as Profile | null;
      if (activeProfile) await loadAcademicContext(activeProfile);

      let courseData: Course[] = [];
      const enrollmentByStudent = await supabase.from("enrollments").select("course_id").eq("student_id", currentUser.id);
      if (!enrollmentByStudent.error && enrollmentByStudent.data?.length) {
        const ids = enrollmentByStudent.data.map((x: any) => x.course_id).filter(Boolean);
        if (ids.length) { const r = await supabase.from("courses").select("*").in("id", ids); if (!r.error) courseData = r.data || []; }
      } else {
        const enrollmentByUser = await supabase.from("enrollments").select("course_id").eq("user_id", currentUser.id);
        if (!enrollmentByUser.error && enrollmentByUser.data?.length) {
          const ids = enrollmentByUser.data.map((x: any) => x.course_id).filter(Boolean);
          if (ids.length) { const r = await supabase.from("courses").select("*").in("id", ids); if (!r.error) courseData = r.data || []; }
        }
      }
      setCourses(courseData);

      let currentUnits: Unit[] = [];
      if (activeProfile?.semester_id) {
        const r = await supabase.from("units").select("id,name,semester_id").eq("semester_id", activeProfile.semester_id).order("name", { ascending: true });
        if (!r.error) currentUnits = r.data || [];
      }
      setUnits(currentUnits);
      const unitIds = currentUnits.map((u) => u.id);
      if (unitIds.length) {
        const [n, a, c, e] = await Promise.all([
          supabase.from("notes").select("id,title,description,file_url,unit_id,created_at").in("unit_id", unitIds).order("created_at", { ascending: false }).limit(8),
          supabase.from("assignments").select("id,title,description,file_url,unit_id,created_at").in("unit_id", unitIds).order("created_at", { ascending: false }).limit(8),
          supabase.from("cats").select("id,title,description,file_url,unit_id,created_at").in("unit_id", unitIds).order("created_at", { ascending: false }).limit(8),
          supabase.from("exams").select("id,title,exam_type,exam_date,start_time,end_time,venue,instructions,unit_id").in("unit_id", unitIds).order("exam_date", { ascending: true }).limit(8),
        ]);
        if (!n.error) setNotes(n.data || []); if (!a.error) setAssignments(a.data || []); if (!c.error) setCats(c.data || []); if (!e.error) setExams(e.data || []);
      } else { setNotes([]); setAssignments([]); setCats([]); setExams([]); }

      const nr = await supabase.from("notifications").select("id,title,message,type,link,is_read,created_at").eq("user_id", currentUser.id).order("created_at", { ascending: false }).limit(6);
      if (!nr.error) setNotifications(nr.data || []);
    } catch (err) {
      console.error("Dashboard loading error:", err);
      setError(err instanceof Error ? err.message : "Unable to load your dashboard.");
    } finally { setLoading(false); setRefreshing(false); }
  }

  async function loadAcademicContext(activeProfile: Profile) {
    try {
      const setName = async (table: string, id: number | null | undefined, field: keyof AcademicInfo) => {
        if (!id) return;
        const { data } = await supabase.from(table).select("name").eq("id", id).maybeSingle();
        if (data?.name) setAcademicInfo((p) => ({ ...p, [field]: data.name }));
      };
      await Promise.all([
        setName("universities", activeProfile.university_id, "universityName"),
        setName("schools", activeProfile.school_id, "schoolName"),
        setName("departments", activeProfile.department_id, "departmentName"),
        setName("programmes", activeProfile.programme_id ?? activeProfile.program_id, "programmeName"),
      ]);
      let yearNumber = activeProfile.year_number ?? activeProfile.academic_year_number ?? null;
      let semesterNumber = activeProfile.semester_number ?? null;
      const yearId = activeProfile.academic_year_id ?? activeProfile.year_id ?? null;
      if (yearId) { const { data } = await supabase.from("academic_years").select("year_number").eq("id", yearId).maybeSingle(); if (data?.year_number != null) yearNumber = data.year_number; }
      if (activeProfile.semester_id) { const { data } = await supabase.from("semesters").select("semester_number").eq("id", activeProfile.semester_id).maybeSingle(); if (data?.semester_number != null) semesterNumber = data.semester_number; }
      setAcademicInfo((p) => ({ ...p, yearNumber, semesterNumber }));
    } catch (err) { console.error("Academic context error:", err); }
  }

  async function markNotificationRead(notification: Notification) {
    if (!notification.is_read) {
      const { error } = await supabase.from("notifications").update({ is_read: true }).eq("id", notification.id).eq("user_id", user?.id);
      if (!error) setNotifications((p) => p.map((n) => n.id === notification.id ? { ...n, is_read: true } : n));
    }
    if (notification.link) window.location.href = notification.link;
  }

  const unitNameMap = useMemo(() => new Map(units.map((u) => [u.id, u.name])), [units]);
  const unread = notifications.filter((n) => !n.is_read).length;
  const upcomingExams = exams.filter((e) => e.exam_date && new Date(`${e.exam_date}T23:59:59`) >= new Date());
  const recentNotes = notes.slice(0, 4);
  const resourceCount = notes.length + assignments.length + cats.length;
  const firstName = profile?.full_name?.split(" ")[0] || profile?.name?.split(" ")[0] || user?.email?.split("@")[0] || "Student";
  const greeting = new Date().getHours() < 12 ? "Good morning" : new Date().getHours() < 18 ? "Good afternoon" : "Good evening";

  function formatDate(value: string | null) { if (!value) return "Date not set"; const d = new Date(value); return Number.isNaN(d.getTime()) ? "Date not set" : d.toLocaleDateString("en-KE", { day: "numeric", month: "short" }); }
  function formatTime(value: string | null) { if (!value) return ""; const [h, m] = value.split(":"); const d = new Date(); d.setHours(Number(h), Number(m), 0, 0); return d.toLocaleTimeString("en-KE", { hour: "numeric", minute: "2-digit" }); }
  function relativeTime(value: string) { const s = Math.floor((Date.now() - new Date(value).getTime()) / 1000); if (s < 60) return "Just now"; const m = Math.floor(s / 60); if (m < 60) return `${m}m`; const h = Math.floor(m / 60); if (h < 24) return `${h}h`; const d = Math.floor(h / 24); return d < 7 ? `${d}d` : formatDate(value); }

  if (loading) return <div className="ds-shell flex"><Sidebar /><main className="ds-main"><Topbar /><div className="ds-dashboard-loading"><div className="ds-loader"/><p>Preparing your academic workspace</p></div></main></div>;

  return (
    <div className="ds-shell flex">
      <Sidebar />
      <main className="ds-main">
        <div className="ds-content ds-dashboard">
          <Topbar />
          {error && <div className="ds-alert">{error}</div>}

          <section className="ds-hero ds-reveal">
            <div className="ds-hero-copy">
              <p className="ds-kicker">{greeting}, {firstName}</p>
              <h1>Make today count.</h1>
              <p>Everything for your current semester, arranged around what you are learning, what needs attention and what comes next.</p>
            </div>
            <div className="ds-hero-actions">
              <Link href="/ai-tutor" className="ds-action ds-action-dark"><Icon name="spark" /> Ask DataSphere AI</Link>
              <Link href="/calendar" className="ds-action"><Icon name="calendar" /> View calendar</Link>
              <button type="button" onClick={loadDashboard} className="ds-refresh" disabled={refreshing}><Icon name="refresh" size={16} /> {refreshing ? "Updating" : "Refresh"}</button>
            </div>
          </section>

          <section className="ds-context ds-reveal ds-delay-1">
            <div className="ds-context-main"><span className="ds-kicker">Current programme</span><strong>{academicInfo.programmeName || "Programme not set"}</strong><span>{academicInfo.departmentName || "Department not set"}</span></div>
            <ContextItem label="University" value={academicInfo.universityName || "Not set"} />
            <ContextItem label="Year" value={academicInfo.yearNumber ? `Year ${academicInfo.yearNumber}` : "Not set"} />
            <ContextItem label="Semester" value={academicInfo.semesterNumber ? `Semester ${academicInfo.semesterNumber}` : "Not set"} />
            <ContextItem label="Units" value={String(units.length)} />
            <ContextItem label="Enrolled" value={String(courses.length)} />
          </section>

          <section className="ds-command-strip ds-reveal ds-delay-2">
            <div><span className="ds-command-label">Your workspace</span><strong>{units.length} current units</strong></div>
            <div className="ds-command-metrics"><span><b>{resourceCount}</b> resources</span><span><b>{assignments.length}</b> assignments</span><span><b>{upcomingExams.length}</b> upcoming exams</span><span><b>{unread}</b> unread</span></div>
          </section>

          <div className="ds-dashboard-grid">
            <section className="ds-panel ds-reveal ds-delay-2">
              <SectionHeading kicker="Learning" title="Your semester" link="/my-courses" linkText="Open courses" />
              {units.length === 0 ? <Empty text="No current units are linked to your profile yet." /> : <div className="ds-unit-list">{units.map((unit, index) => {
                const expanded = expandedUnit === unit.id;
                return <div key={unit.id} className={`ds-unit ${expanded ? "is-open" : ""}`}>
                  <button type="button" className="ds-unit-head" onClick={() => setExpandedUnit(expanded ? null : unit.id)}>
                    <span className="ds-unit-number">{String(index + 1).padStart(2, "0")}</span><span className="ds-unit-name">{unit.name}</span><span className="ds-unit-arrow"><Icon name="arrow" size={16} /></span>
                  </button>
                  <div className="ds-unit-detail"><span>{unitNameMap.get(unit.id)}</span><div><Link href={`/units/${unit.id}`}>Resources</Link><Link href={`/ai-tutor?unit=${unit.id}`}>Ask AI</Link></div></div>
                </div>;
              })}</div>}
            </section>

            <section className="ds-panel ds-reveal ds-delay-3">
              <SectionHeading kicker="Assessment" title="Coming up" link="/exams" linkText="See schedule" />
              {upcomingExams.length === 0 ? <Empty text="No upcoming examinations are scheduled." /> : <div className="ds-list">{upcomingExams.slice(0, 5).map((exam) => <Link key={exam.id} href="/exams" className="ds-list-row"><span className="ds-date-block"><b>{exam.exam_date ? new Date(exam.exam_date).getDate() : "—"}</b><small>{exam.exam_date ? new Date(exam.exam_date).toLocaleDateString("en-KE", { month: "short" }) : ""}</small></span><span className="ds-row-copy"><strong>{exam.title}</strong><span>{unitNameMap.get(exam.unit_id) || "Unit"} · {exam.exam_type}</span></span><span className="ds-row-time">{exam.start_time ? formatTime(exam.start_time) : ""}</span></Link>)}</div>}
            </section>
          </div>

          <section className="ds-panel ds-reveal ds-delay-3">
            <SectionHeading kicker="Attention" title="What needs you" link="/notifications" linkText={unread ? `${unread} unread` : "All updates"} />
            {notifications.filter((n) => !n.is_read).length === 0 ? <Empty text="Nothing urgent right now. New actions will appear here when they matter." /> : <div className="ds-list">{notifications.filter((n) => !n.is_read).slice(0, 4).map((n) => <button key={n.id} type="button" onClick={() => markNotificationRead(n)} className="ds-list-row ds-notification-row"><span className="ds-notification-mark">!</span><span className="ds-row-copy"><strong>{n.title}</strong><span>{n.message}</span></span><span className="ds-row-time">{relativeTime(n.created_at)}</span></button>)}</div>}
          </section>

          <div className="ds-three-grid">
            <section className="ds-panel ds-reveal ds-delay-4"><SectionHeading kicker="Resources" title="Recent notes" /><div className="ds-list">{recentNotes.length === 0 ? <Empty text="No notes have been uploaded for your current units." /> : recentNotes.map((note) => <Link key={note.id} href={`/units/${note.unit_id}`} className="ds-list-row"><span className="ds-index-mark">N</span><span className="ds-row-copy"><strong>{note.title}</strong><span>{unitNameMap.get(note.unit_id) || "Unit"} · {formatDate(note.created_at)}</span></span><Icon name="arrow" size={15} /></Link>)}</div></section>
            <section className="ds-panel ds-reveal ds-delay-4"><SectionHeading kicker="Continue" title="Quick routes" /><div className="ds-list">{[["/assignments","Assignments","Coursework and deadlines","file"],["/progress","My progress","Performance across assessments","chart"],["/career","Career Hub","Turn study into direction","arrow"]].map(([href,title,desc,icon]) => <Link key={href} href={href} className="ds-list-row"><span className="ds-quick-icon"><Icon name={icon} size={16} /></span><span className="ds-row-copy"><strong>{title}</strong><span>{desc}</span></span><Icon name="arrow" size={15} /></Link>)}</div></section>
            <section className="ds-panel ds-reveal ds-delay-4 ds-ai-panel"><span className="ds-kicker">Study companion</span><h2>Stuck on something?</h2><p>Open a unit with DataSphere AI and work through a concept, problem or revision session.</p><Link href="/ai-tutor" className="ds-inline-link">Start a study session <Icon name="arrow" size={15} /></Link></section>
          </div>

          <footer className="ds-dashboard-footer"><span>DataSphere · Academic learning workspace</span><span>{new Date().getFullYear()}</span></footer>
        </div>
      </main>
    </div>
  );
}

function ContextItem({ label, value }: { label: string; value: string }) { return <div className="ds-context-item"><span>{label}</span><strong title={value}>{value}</strong></div>; }
function SectionHeading({ kicker, title, link, linkText }: { kicker: string; title: string; link?: string; linkText?: string }) { return <div className="ds-panel-heading"><div><span className="ds-kicker">{kicker}</span><h2>{title}</h2></div>{link && <Link href={link}>{linkText} <Icon name="arrow" size={14} /></Link>}</div>; }
function Empty({ text }: { text: string }) { return <div className="ds-empty-state"><span>—</span><p>{text}</p></div>; }
