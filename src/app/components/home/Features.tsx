
export default function Features() {
  const features = [
    {
      title: "AI Tutor",
      description: "Ask questions and receive instant explanations for any topic.",
      icon: "🤖",
    },
    {
      title: "Revision Notes",
      description: "Access organized notes for every unit and semester.",
      icon: "📚",
    },
    {
      title: "Past Papers",
      description: "Practice using previous university examinations.",
      icon: "📝",
    },
    {
      title: "Flashcards",
      description: "Revise faster with interactive flashcards.",
      icon: "🧠",
    },
    {
      title: "GPA Calculator",
      description: "Track your academic progress throughout your degree.",
      icon: "📊",
    },
    {
      title: "Student Community",
      description: "Discuss topics, ask questions and collaborate with classmates.",
      icon: "💬",
    },
  ];

  return (
    <section className="bg-slate-900 text-white py-20 px-8">
      <div className="max-w-7xl mx-auto">
        <h2 className="text-4xl font-bold text-center">
          Everything You Need to Succeed
        </h2>

        <p className="mt-4 text-center text-gray-400">
          DataSphere combines learning resources, AI and collaboration in one platform.
        </p>

        <div className="grid gap-8 mt-12 md:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="rounded-xl bg-slate-800 p-8 hover:bg-slate-700 transition"
            >
              <div className="text-5xl">{feature.icon}</div>

              <h3 className="mt-6 text-2xl font-semibold">
                {feature.title}
              </h3>

              <p className="mt-3 text-gray-300">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}