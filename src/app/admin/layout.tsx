"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

const groups = [
  ["Institution", [["Overview","/admin"],["Universities","/admin/universities"],["Schools","/admin/schools"],["Departments","/admin/departments"],["Programmes","/admin/programmes"],["Academic structure","/admin/academic"]]],
  ["Learning", [["Units","/admin/units"],["Notes","/admin/notes"],["Assignments","/admin/assignments"],["CATs","/admin/cats"],["Past papers","/admin/past-papers"]]],
  ["Assessment", [["Quizzes","/admin/quizzes"],["Quiz attempts","/admin/quiz-attempts"],["Submissions","/admin/submissions"],["Gradebook","/admin/gradebook"],["Results","/admin/results"],["Exams","/admin/exams"]]],
  ["Student life", [["Announcements","/admin/announcements"],["Calendar","/admin/calendar"],["Students","/admin/students"],["Career Hub","/admin/career"]]],
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [checking, setChecking] = useState(pathname !== "/admin/login");
  const [authorized, setAuthorized] = useState(pathname === "/admin/login");

  useEffect(() => {
    if (pathname === "/admin/login") { setChecking(false); setAuthorized(true); return; }
    let alive = true;
    (async () => {
      setChecking(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { if (alive) router.replace("/admin/login"); return; }
      const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
      if (!alive) return;
      if (profile?.role !== "admin") { setAuthorized(false); router.replace("/admin/login"); return; }
      setAuthorized(true); setChecking(false);
    })();
    return () => { alive = false; };
  }, [pathname, router]);

  if (pathname === "/admin/login") return <>{children}</>;
  if (checking || !authorized) return <div className="admin-gate"><div className="admin-gate-mark">DS</div><strong>Checking administrator access</strong><span>Please wait…</span></div>;

  return <div className="ds-admin-shell">
    <aside className="ds-admin-sidebar">
      <Link href="/admin" className="ds-admin-brand"><span className="ds-admin-symbol">DS</span><span><b>DataSphere</b><small>Administration</small></span></Link>
      <div className="ds-admin-private"><span /> Private administrator area</div>
      <nav className="ds-admin-nav" aria-label="Administration">
        {groups.map(([label, items]) => <div key={String(label)} className="ds-admin-group"><span className="ds-admin-label">{label}</span>{(items as string[][]).map(([name, href]) => <Link key={href} href={href} className={`ds-admin-link ${pathname === href || pathname.startsWith(`${href}/`) ? "active" : ""}`}>{name}</Link>)}</div>)}
      </nav>
      <div className="ds-admin-footer"><Link href="/dashboard">← Student workspace</Link><Link href="/profile">Admin profile</Link></div>
    </aside>
    <div className="ds-admin-main"><div className="ds-admin-mobile"><Link href="/admin">DataSphere Admin</Link><Link href="/dashboard">Student</Link></div>{children}</div>
  </div>;
}
