
export default function Universities() {
  const universities = [
    "University of Nairobi",
    "Kenyatta University",
    "JKUAT",
    "Moi University",
    "Egerton University",
    "Masinde Muliro University",
  ];

  return (
    <section className="bg-slate-900 text-white py-20 px-8">
      <h2 className="text-4xl font-bold text-center">
        Trusted Universities
      </h2>

      <p className="text-center text-gray-400 mt-4">
        Supporting students from universities across Kenya.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-12">
        {universities.map((university) => (
          <div
            key={university}
            className="rounded-xl bg-slate-800 p-6 hover:bg-slate-700 transition"
          >
            <h3 className="text-xl font-semibold">{university}</h3>
          </div>
        ))}
      </div>
    </section>
  );
}