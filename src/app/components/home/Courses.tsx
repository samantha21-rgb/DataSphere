
export default function Courses() {
  const courses = [
    "Law",
    "Computer Science",
    "Data Science",
    "Medicine",
    "Nursing",
    "Business Administration",
    "Software Engineering",
    "Education",
    "Accounting",
  ];

  return (
    <section className="bg-slate-950 text-white py-20 px-8">
      <div className="max-w-7xl mx-auto">
        <h2 className="text-4xl font-bold text-center">
          Popular Courses
        </h2>

        <p className="mt-4 text-center text-gray-400">
          Choose your course and access notes, quizzes, AI tutoring, and past papers.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-12">
          {courses.map((course) => (
            <div
              key={course}
              className="rounded-xl bg-slate-800 p-6 shadow-lg hover:bg-blue-600 transition duration-300"
            >
              <h3 className="text-xl font-semibold">{course}</h3>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}