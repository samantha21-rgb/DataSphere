"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

type Profile = { full_name?: string | null; university?: string | null; course?: string | null };

export default function Topbar() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [dateLabel, setDateLabel] = useState("");

  useEffect(() => {
    const now = new Date();
    setDateLabel(now.toLocaleDateString("en-KE", { weekday: "long", day: "numeric", month: "long", year: "numeric" }));
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from("profiles").select("full_name,university,course").eq("id", user.id).maybeSingle();
      if (data) setProfile(data);
    })();
  }, []);

  const initials = profile?.full_name?.split(" ").filter(Boolean).map((n) => n[0]).join("").slice(0,2).toUpperCase() || "DS";

  return (
    <header className="ds-topbar">
      <div className="ds-topbar-left">
        <span className="ds-topbar-overline">DataSphere / Student workspace</span>
        <span className="ds-topbar-date">{dateLabel}</span>
      </div>
      <div className="ds-topbar-actions">
        <Link href="/notifications" className="ds-notification-link"><span>Notifications</span><span className="ds-notification-dot" /></Link>
        <Link href="/profile" className="ds-avatar-link" aria-label="Open profile"><span className="ds-avatar">{initials}</span></Link>
      </div>
    </header>
  );
}
