import Link from "next/link";

export default function Navbar() {
  return (
    <nav className="sticky top-0 z-50 border-b border-[#ded8cc] bg-[#f5f1e8]/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 lg:px-8">
        <Link href="/" className="flex items-center gap-3">
          <span className="h-3 w-3 rounded-[3px] bg-[#c28a3b] shadow-[9px_0_0_rgba(194,138,59,.22)]" />
          <span><span className="block text-lg font800 tracking-tight text-[#2b2033]">DataSphere</span><span className="block text-[10px] text-[#89828d]">University learning workspace</span></span>
        </Link>
        <div className="hidden items-center gap-7 text-sm font650 text-[#625d67] md:flex">
          <Link href="/courses" className="hover:text-[#3f6f68]">Courses</Link>
          <Link href="/universities" className="hover:text-[#3f6f68]">Universities</Link>
          <Link href="/career" className="hover:text-[#3f6f68]">Career Hub</Link>
          <Link href="/ai-tutor" className="hover:text-[#3f6f68]">AI Tutor</Link>
        </div>
        <div className="flex gap-2"><Link href="/login" className="ds-btn ds-btn-secondary">Sign in</Link><Link href="/signup" className="ds-btn ds-btn-primary">Create account</Link></div>
      </div>
    </nav>
  );
}
