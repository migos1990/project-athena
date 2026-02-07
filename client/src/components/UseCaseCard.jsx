import { useState } from 'react';

export function UseCaseCard({
  title,
  pillarColor,
  businessOutcome,
  products,
  completed,
  data
}) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Format event data for display
  const getEventSummary = () => {
    if (!data) return null;

    return {
      user: data.userName || data.targetUserName || 'Unknown User',
      email: data.userEmail || data.targetUserEmail || 'unknown@example.com',
      timestamp: new Date(data.timestamp).toLocaleString(),
      outcome: data.outcome || 'SUCCESS',
      ...(data.groupName && { group: data.groupName }),
      ...(data.sessionStartTime && { sessionStart: new Date(data.sessionStartTime).toLocaleString() })
    };
  };

  const summary = completed ? getEventSummary() : null;

  return (
    <div className={`bg-white rounded-xl p-5 border-l-4 ${pillarColor} transition-all ${completed ? 'ring-2 ring-green-500 ring-opacity-50' : ''}`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="text-sm font-bold text-gray-900 mb-1">{title}</h3>
          <p className="text-xs text-gray-600 leading-relaxed">{businessOutcome}</p>
        </div>
        {completed && (
          <div className="flex-shrink-0">
            <svg className="w-6 h-6 text-green-500" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
          </div>
        )}
      </div>

      {/* Products */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        {products.map((product, idx) => (
          <span
            key={idx}
            className="px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-700 rounded"
          >
            {product}
          </span>
        ))}
      </div>

      {/* Event Summary */}
      {completed && summary && (
        <div className="border-t border-gray-200 pt-3 mt-3">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-xs">
              <span className="font-medium text-gray-700">User:</span>
              <span className="text-gray-900">{summary.user}</span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="font-medium text-gray-700">Email:</span>
              <span className="text-gray-900">{summary.email}</span>
            </div>
            {summary.group && (
              <div className="flex items-center gap-2 text-xs">
                <span className="font-medium text-gray-700">Group:</span>
                <span className="text-gray-900">{summary.group}</span>
              </div>
            )}
            <div className="flex items-center gap-2 text-xs">
              <span className="font-medium text-gray-700">Time:</span>
              <span className="text-gray-900">{summary.timestamp}</span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="font-medium text-gray-700">Outcome:</span>
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                summary.outcome === 'SUCCESS' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
              }`}>
                {summary.outcome}
              </span>
            </div>
          </div>

          {/* Expandable Raw Log */}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="mt-3 text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1"
          >
            <svg
              className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            {isExpanded ? 'Hide' : 'Show'} raw event data
          </button>

          {isExpanded && (
            <pre className="mt-2 text-xs bg-gray-50 p-3 rounded border border-gray-200 overflow-auto max-h-48">
              {JSON.stringify(data, null, 2)}
            </pre>
          )}
        </div>
      )}

      {/* Pending State */}
      {!completed && (
        <div className="border-t border-gray-200 pt-3 mt-3">
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse"></div>
            <span>Waiting for event...</span>
          </div>
        </div>
      )}
    </div>
  );
}
