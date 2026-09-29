
export default function Testimonials() {
  const testimonials = [
    {
      name: "Amina",
      course: "Law",
      message: "DataSphere has made revision so much easier. Everything I need is in one place.",
    },
    {
      name: "Brian",
      course: "Computer Science",
      message: "The AI Tutor explains difficult concepts in seconds. It's like having a personal lecturer.",
    },
    {
      name: "Faith",
      course: "Medicine",
      message: "I love how organized the notes and past papers are.",
    },
  ];

  return (
    <section className="bg-slate-900 text-white py-20 px-8">
      <div className="max-w-7xl mx-auto">
        <h2 className="text-4xl font-bold text-center">
          What Students Say
        </h2>

        <div className="grid md:grid-cols-3 gap-8 mt-12">
          {testimonials.map((item) => (
            <div
              key={item.name}
              className="bg-slate-800 rounded-xl p-6"
            >
              <p className="text-gray-300">
                "{item.message}"
              </p>

              <h3 className="mt-6 font-bold">
                {item.name}
              </h3>

              <p className="text-blue-400">
                {item.course}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}