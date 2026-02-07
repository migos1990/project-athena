export function PillarSection({
  title,
  icon,
  borderColor,
  bgColor,
  completedCount,
  totalCount,
  children
}) {
  return (
    <section className={`capability-section bg-white rounded-2xl p-6 border-l-4 ${borderColor} shadow-sm hover:shadow-md transition-shadow`}>
      {/* Section Header */}
      <div className="flex items-center gap-3 mb-5">
        <div className={`w-10 h-10 rounded-xl ${bgColor} flex items-center justify-center shadow-sm`}>
          {icon}
        </div>
        <h2 className="text-base font-bold text-okta-dark tracking-tight">{title}</h2>
        <span className={`ml-auto px-3 py-1 text-xs font-semibold rounded-full ${
          completedCount > 0
            ? 'bg-blue-50 text-okta-blue'
            : 'bg-gray-100 text-okta-medium-gray'
        }`}>
          {completedCount} of {totalCount}
        </span>
      </div>

      {/* Content */}
      <div className="space-y-3">
        {children}
      </div>
    </section>
  );
}
