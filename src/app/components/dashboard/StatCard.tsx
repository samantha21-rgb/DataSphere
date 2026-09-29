
type StatCardProps = {
  title: string;
  value: string;
  description: string;
};

export default function StatCard({
  title,
  value,
  description,
}: StatCardProps) {
  return (
    <div className="bg-slate-900 rounded-xl p-6 shadow-lg">
      <h3 className="text-gray-400 text-sm">{title}</h3>

      <p className="text-3xl font-bold text-cyan-400 mt-2">
        {value}
      </p>

      <p className="text-gray-500 mt-2 text-sm">
        {description}
      </p>
    </div>
  );
}