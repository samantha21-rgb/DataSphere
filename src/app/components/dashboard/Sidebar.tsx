"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

type NavItem = { name: string; href: string; icon: string };
type NavGroup = { label: string; items: NavItem[] };

const groups: NavGroup[] = [
  { label: "Learn", items: [
    { name: "Dashboard", href: "/dashboard", icon: "grid" },
    { name: "My Courses", href: "/my-courses", icon: "book" },
    { name: "Available Courses", href: "/courses", icon: "plus" },
    { name: "Timetable", href: "/timetable", icon: "clock" },
    { name: "Calendar", href: "/calendar", icon: "calendar" },
    { name: "Universities", href: "/universities", icon: "building" },
  ]},
  { label: "Assess", items: [
    { name: "Assignments", href: "/assignments", icon: "file" },
    { name: "Quizzes & Exams", href: "/exams", icon: "check" },
    { name: "Results", href: "/results", icon: "chart" },
    { name: "GPA Calculator", href: "/gpa", icon: "sigma" },
    { name: "My Progress", href: "/progress", icon: "trend" },
  ]},
  { label: "Connect", items: [
    { name: "Discussions", href: "/discussions", icon: "chat" },
    { name: "Messages", href: "/messaging", icon: "mail" },
    { name: "Announcements", href: "/announcements", icon: "megaphone" },
    { name: "Notifications", href: "/notifications", icon: "bell" },
  ]},
  { label: "Develop", items: [
    { name: "AI Tutor", href: "/ai-tutor", icon: "spark" },
    { name: "Career Hub", href: "/career", icon: "briefcase" },
    { name: "Portfolio", href: "/portfolio", icon: "layers" },
  ]},
];

function Icon({ name }: { name: string }) {
  const common = { width: 17, height: 17, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.7, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  const paths: Record<string, React.ReactNode> = {
    grid: <><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></>,
    book: <><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v17H6.5A2.5 2.5 0 0 0 4 22z"/><path d="M4 5.5v14A2.5 2.5 0 0 1 6.5 17H20"/></>,
    plus: <><circle cx="12" cy="12" r="8.5"/><path d="M12 8v8M8 12h8"/></>,
    clock: <><circle cx="12" cy="12" r="8.5"/><path d="M12 7v5l3 2"/></>,
    calendar: <><rect x="3.5" y="5" width="17" height="15.5" rx="2"/><path d="M7 3v4M17 3v4M3.5 9h17"/></>,
    building: <><path d="M4 21V5l8-2 8 2v16"/><path d="M8 9h1M8 13h1M8 17h1M15 9h1M15 13h1M15 17h1M11.5 21v-4h1v4"/></>,
    file: <><path d="M6 3h8l4 4v14H6z"/><path d="M14 3v5h5M9 13h6M9 17h5"/></>,
    check: <><circle cx="12" cy="12" r="8.5"/><path d="m8 12 2.5 2.5L16.5 9"/></>,
    chart: <><path d="M4 19V5M4 19h16"/><path d="m7 15 4-4 3 2 5-6"/></>,
    sigma: <path d="M18 5H7l6 7-6 7h11"/>,
    trend: <><path d="M4 17 10 11l4 4 6-7"/><path d="M15 8h5v5"/></>,
    chat: <><path d="M5 5h14v10H9l-4 4z"/><path d="M8 9h8M8 12h5"/></>,
    mail: <><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m4 7 8 6 8-6"/></>,
    megaphone: <><path d="m4 12 13-5v10L4 12z"/><path d="M17 10h3v4h-3M7 14l1.5 5H12l-2-5"/></>,
    bell: <><path d="M6 17h12l-1.5-2v-5a4.5 4.5 0 0 0-9 0v5z"/><path d="M10 20h4"/></>,
    spark: <><path d="m12 3 1.5 6.5L20 12l-6.5 1.5L12 20l-1.5-6.5L4 12l6.5-2.5z"/></>,
    briefcase: <><rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V5h8v2M3 12h18M10 12v2h4v-2"/></>,
    layers: <><path d="m12 3 9 5-9 5-9-5z"/><path d="m3 12 9 5 9-5M3 16l9 5 9-5"/></>,
  };
  return <svg {...common} aria-hidden="true">{paths[name]}</svg>;
}

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [userName, setUserName] = useState("Student");
  const [userEmail, setUserEmail] = useState("");
  const [unreadCount, setUnreadCount] = useState(0);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => { loadSidebarData(); }, []);
  useEffect(() => { setOpen(false); }, [pathname]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "b") {
        event.preventDefault();
        setCollapsed((value) => !value);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  async function loadSidebarData() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserEmail(user.email || "");
      const { data: profile } = await supabase.from("profiles").select("full_name,name,role").eq("id", user.id).maybeSingle();
      if (profile) {
        setUserName(profile.full_name || profile.name || user.email?.split("@")[0] || "Student");
        setIsAdmin(profile.role === "admin");
      }
      const { count } = await supabase.from("notifications").select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("is_read", false);
      setUnreadCount(count || 0);
    } catch (error) {
      console.error("Unable to load navigation:", error);
    }
  }

  async function logout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  const active = (href: string) => href === "/dashboard" ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <>
      <button className="ds-mobile-trigger" aria-label="Open navigation" onClick={() => setOpen(true)}><span>☰</span></button>
      <div className={`ds-mobile-overlay ${open ? "ds-open" : ""}`} onClick={() => setOpen(false)} />
      <aside className={`ds-sidebar ${open ? "ds-open" : ""} ${collapsed ? "ds-collapsed" : ""}`}>
        <div className="ds-sidebar-brand">
          <Link href="/dashboard" className="ds-brand-mark" title="DataSphere">
            <span className="ds-brand-symbol" aria-hidden="true"><span /><span /><span /></span>
            <span className="ds-brand-copy"><span className="ds-brand-name">DataSphere</span><span className="ds-brand-caption">University learning workspace</span></span>
          </Link>
          <button type="button" className="ds-sidebar-toggle" onClick={() => setCollapsed((value) => !value)} aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}>{collapsed ? "→" : "←"}</button>
        </div>

        <div className="ds-sidebar-user">
          <div className="ds-user-avatar">{userName.charAt(0).toUpperCase()}</div>
          <div className="ds-user-copy"><p>{userName}</p><span>{userEmail || "Student account"}</span></div>
        </div>

        <nav className="ds-sidebar-nav" aria-label="Primary navigation">
          {groups.map((group) => (
            <div key={group.label} className="ds-nav-group">
              <div className="ds-nav-label">{group.label}</div>
              {group.items.map((item) => (
                <Link key={item.href} href={item.href} className={`ds-nav-link ${active(item.href) ? "active" : ""}`} title={collapsed ? item.name : undefined}>
                  <span className="ds-nav-icon"><Icon name={item.icon} /></span>
                  <span className="ds-nav-text">{item.name}</span>
                  {item.href === "/notifications" && unreadCount > 0 && <span className="ds-nav-count">{unreadCount > 99 ? "99+" : unreadCount}</span>}
                </Link>
              ))}
            </div>
          ))}
          {isAdmin && (
            <div className="ds-nav-group ds-admin-group">
              <div className="ds-nav-label">System</div>
              <Link href="/admin" className={`ds-nav-link ${active("/admin") ? "active" : ""}`} title={collapsed ? "Administration" : undefined}>
                <span className="ds-nav-icon"><Icon name="layers" /></span><span className="ds-nav-text">Administration</span>
              </Link>
            </div>
          )}
        </nav>

        <div className="ds-sidebar-footer">
          <Link href="/profile" className="ds-nav-link" title={collapsed ? "Profile" : undefined}><span className="ds-nav-icon"><Icon name="layers" /></span><span className="ds-nav-text">Profile</span></Link>
          <button type="button" onClick={logout} className="ds-nav-link ds-signout" title={collapsed ? "Sign out" : undefined}><span className="ds-nav-icon">↪</span><span className="ds-nav-text">Sign out</span></button>
        </div>
      </aside>
    </>
  );
}
