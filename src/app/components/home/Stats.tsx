
export default function Stats() {
  const stats = [
    { number: "50+", label: "Universities" },
    { number: "500+", label: "Courses" },
    { number: "20,000+", label: "Learning Resources" },
    { number: "100,000+", label: "Students (Future Goal)" },
  ];

  return (
    <section className="bg-slate-950 text-white py-20">
      <div className="max-w-7xl mx-auto px-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="bg-slate-800 rounded-xl p-8 shadow-lg"
            >
              <h2 className="text-5xl font-bold text-blue-500">
                {stat.number}
              </h2>

              <p className="mt-4 text-gray-300">
                {stat.label}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}