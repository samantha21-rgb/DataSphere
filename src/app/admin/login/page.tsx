"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { supabase } from "../../lib/supabase";

export default function AdminLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault(); setLoading(true); setError("");
    const { data, error: loginError } = await supabase.auth.signInWithPassword({ email, password });
    if (loginError) { setError(loginError.message); setLoading(false); return; }
    if (!data.user) { setError("Administrator account could not be verified."); setLoading(false); return; }
    const { data: profile, error: profileError } = await supabase.from("profiles").select("role").eq("id", data.user.id).maybeSingle();
    if (profileError || profile?.role !== "admin") {
      await supabase.auth.signOut();
      setError("This account does not have administrator access."); setLoading(false); return;
    }
    window.location.href = "/admin";
  }

  return <main className="ds-admin-login">
    <div className="ds-admin-login-inner">
      <div className="ds-admin-login-intro"><Link href="/" className="ds-admin-login-brand">DataSphere</Link><span>Restricted access</span><h1>Administrator<br />workspace.</h1><p>Manage institutions, academic structures, learning resources, assessments and student activity from one private area.</p><Link href="/login" className="ds-admin-back">← Student sign in</Link></div>
      <div className="ds-admin-login-form"><div className="ds-admin-lock">DS / ADMIN</div><h2>Sign in as administrator</h2><p>Use the account assigned the <b>admin</b> role in DataSphere.</p>{error && <div className="ds-admin-error">{error}</div>}<form onSubmit={submit}><label>Email<input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" /></label><label>Password<input required type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" /></label><button disabled={loading}>{loading ? "Verifying access…" : "Enter administration"}</button></form><small>Administrator access is separate from the student navigation.</small></div>
    </div>
  </main>;
}
