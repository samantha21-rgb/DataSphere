import Link from "next/link";
import Navbar from "./components/navigation/Navbar";

const features = [
  ["Learning", "Courses, units, notes, past papers and structured academic resources."],
  ["Assessment", "Assignments, submissions, quizzes, examinations and weighted gradebooks."],
  ["Collaboration", "Announcements, discussions and messaging that keep students and staff connected."],
  ["Intelligence", "AI-assisted study, progress analytics and career intelligence grounded in the learner's journey."],
];

export default function Home() {
  return <div className="min-h-screen bg-[#f5f1e8] text-[#292630]">
    <Navbar />
    <main>
      <section className="border-b border-[#ded8cc] bg-white px-5 py-16 lg:px-8 lg:py-20"><div className="mx-auto max-w-7xl"><div className="grid gap-10 md:grid-cols-2 lg:grid-cols-4">{features.map(([title,desc],i)=><div key={title} className="border-l-2 border-[#c28a3b] pl-5"><div className="text-xs font800 uppercase tracking-[.15em] text-[#89828d]">0{i+1}</div><h2 className="mt-3 text-lg font800 text-[#2b2033]">{title}</h2><p className="mt-2 text-sm leading-6 text-[#625d67]">{desc}</p></div>)}</div></div></section>
      <section className="px-5 py-16 lg:px-8"><div className="mx-auto max-w-7xl"><div className="flex flex-col justify-between gap-6 border-b border-[#ded8cc] pb-8 md:flex-row md:items-end"><div><p className="text-xs font800 uppercase tracking-[.15em] text-[#3f6f68]">Designed to scale</p><h2 className="mt-2 text-3xl font800 tracking-tight text-[#2b2033]">A serious platform for modern institutions.</h2></div><Link href="/signup" className="ds-btn ds-btn-accent">Create a student account →</Link></div><div className="grid divide-y divide-[#ded8cc] md:grid-cols-3 md:divide-x md:divide-y-0">{[['Institutional structure','Model your real academic hierarchy instead of forcing every programme into the same generic course shape.'],['Student continuity','Keep learning, assessment, communication, development and career activity connected to the same learner.'],['Operational clarity','Give administrators and educators workflows that reduce navigation friction and surface the work that matters.']].map(([t,d])=><div key={t} className="px-0 py-7 md:px-7 first:md:pl-0 last:md:pr-0"><h3 className="font750 text-[#2b2033]">{t}</h3><p className="mt-2 text-sm leading-6 text-[#625d67]">{d}</p></div>)}</div></div></section>
    </main>
    <footer className="border-t border-[#ded8cc] bg-[#2b2033] px-5 py-8 text-sm text-[#f5f1e8]/65 lg:px-8"><div className="mx-auto flex max-w-7xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><span>DataSphere · University learning platform</span><span>Learning · Assessment · Progress · Opportunity</span></div></footer>
  </div>;
}
