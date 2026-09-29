import Link from "next/link";

export default function Hero() {
  return (
    <section className="bg-[#f5f1e8] px-5 py-20 lg:px-8 lg:py-28">
      <div className="mx-auto grid max-w-7xl gap-14 lg:grid-cols-[1.2fr_.8fr] lg:items-end">
        <div>
          <p className="mb-4 text-xs font800 uppercase tracking-[.18em] text-[#3f6f68]">The academic operating layer</p>
          <h1 className="max-w-4xl text-5xl font800 leading-[1.02] tracking-[-.045em] text-[#2b2033] sm:text-6xl lg:text-7xl">One place for learning, assessment, progress and opportunity.</h1>
          <p className="mt-7 max-w-2xl text-lg leading-8 text-[#625d67]">DataSphere brings university learning workflows into one coherent workspace — from course resources and assessments to academic progress, collaboration, AI-assisted study and career development.</p>
          <div className="mt-9 flex flex-wrap gap-3"><Link href="/signup" className="ds-btn ds-btn-primary min-h-12 px-6">Start learning</Link><Link href="/courses" className="ds-btn ds-btn-secondary min-h-12 px-6">Explore courses</Link></div>
        </div>
        <div className="border-l border-[#c9c0b2] pl-7 lg:mb-2">
          <p className="text-xs font800 uppercase tracking-[.16em] text-[#89828d]">Built for institutions</p>
          <div className="mt-6 space-y-5">
            {[['01','Academic structure','Universities, schools, departments, programmes, years, semesters and units.'],['02','Learning workflows','Resources, assignments, quizzes, exams, gradebook, discussions and messaging.'],['03','Student development','Progress analytics, portfolio, career intelligence and meaningful achievement.']].map(([n,t,d])=><div key={n} className="border-t border-[#ded8cc] pt-4"><div className="text-xs font800 text-[#c28a3b]">{n}</div><div className="mt-1 text-base font750 text-[#2b2033]">{t}</div><div className="mt-1 text-sm leading-6 text-[#625d67]">{d}</div></div>)}
          </div>
        </div>
      </div>
    </section>
  );
}
