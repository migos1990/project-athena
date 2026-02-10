import { useState } from 'react';

export function PillarSection({
  title,
  icon,
  borderColor,
  bgColor,
  completedCount,
  totalCount,
  children,
  collapsible = false
}) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <section className={`capability-section bg-white rounded-2xl p-6 border-l-4 ${borderColor} shadow-sm hover:shadow-md transition-shadow`}>
      {/* Section Header */}
      <div
        className={`flex items-center gap-3 mb-5 ${collapsible ? 'cursor-pointer' : ''}`}
        onClick={collapsible ? () => setIsCollapsed(!isCollapsed) : undefined}
      >
        <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shadow-sm border border-gray-200">
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
        {collapsible && (
          <svg
            className={`w-5 h-5 text-okta-medium-gray transition-transform ${isCollapsed ? '-rotate-90' : 'rotate-0'}`}
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7"/>
          </svg>
        )}
      </div>

      {/* Content */}
      {!isCollapsed && (
        <div className="space-y-3">
          {children}
        </div>
      )}
    </section>
  );
}
