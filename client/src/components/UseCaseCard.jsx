import { useState } from 'react';

export function UseCaseCard({
  title,
  description, // For pending state
  pillarColor = 'border-gray-300',
  businessOutcome, // For completed state
  products = [], // For completed state
  businessOutcomes = [], // For completed state - array of {label, text, color}
  completed = false,
  data = null
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

  // PENDING STATE - Simple greyed out card
  if (!completed) {
    return (
      <div className="bg-gray-50 rounded-xl border border-gray-200 p-4 opacity-50 hover:opacity-60 transition-opacity">
        <div className="flex items-start gap-3">
          <div className="w-7 h-7 rounded-full border-2 border-gray-300 flex items-center justify-center flex-shrink-0">
            <span className="text-gray-400 text-xs">•</span>
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-okta-medium-gray tracking-tight">{title}</h3>
            <p className="text-xs text-gray-400 mt-1.5 leading-relaxed">{description || businessOutcome}</p>
          </div>
        </div>
      </div>
    );
  }

  // COMPLETED STATE - Full card with all details
  return (
    <div className={`bg-white rounded-xl p-5 border-2 border-okta-success card-completed shadow-sm`}>
      {/* Header with Checkmark */}
      <div className="flex items-start gap-3 mb-4">
        <div className="w-8 h-8 rounded-full bg-okta-success flex items-center justify-center flex-shrink-0 shadow-sm">
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <path className="checkmark-path" d="M5 13l4 4L19 7"/>
          </svg>
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-okta-dark tracking-tight">{title}</h3>
          <p className="text-xs text-okta-medium-gray mt-1.5 leading-relaxed">{businessOutcome}</p>
        </div>
      </div>

      {/* Products */}
      {products.length > 0 && (
        <div className="text-xs text-okta-medium-gray mb-4">
          <span className="font-semibold">Products:</span>
          {products.map((product, idx) => (
            <span key={idx} className="ml-2 px-2 py-1 bg-gray-100 rounded-md text-okta-dark font-medium">
              {product}
            </span>
          ))}
        </div>
      )}

      {/* Event Summary */}
      {summary && (
        <div className="fade-slide-up bg-gray-50 rounded-lg p-4 mb-4 text-xs text-okta-dark border border-gray-100">
          <div className="space-y-2">
            <div><span className="font-bold">{summary.user}</span> <span className="text-okta-medium-gray">({summary.email})</span></div>
            {summary.group && <div className="text-okta-medium-gray">Group: <span className="font-semibold text-okta-dark">{summary.group}</span></div>}
            <div className="text-okta-medium-gray">Time: {summary.timestamp}</div>
            <div className="text-okta-medium-gray">
              Outcome: <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                summary.outcome === 'SUCCESS' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
              }`}>
                {summary.outcome}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Business Outcomes Section */}
      {businessOutcomes.length > 0 && (
        <div className="border-t border-gray-100 pt-4 mb-4">
          <p className="text-xs font-semibold text-okta-dark mb-3">Business Outcomes</p>
          <div className="space-y-2">
            {businessOutcomes.map((outcome, idx) => (
              <div key={idx} className={`outcome-badge flex items-start gap-2.5 p-3 rounded-lg text-xs ${outcome.bgClass} border border-gray-100`}>
                <span className={`font-bold ${outcome.textClass} whitespace-nowrap`}>{outcome.label}</span>
                <span className="text-okta-dark leading-relaxed">{outcome.text}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex items-center gap-2 pt-3 border-t border-gray-100">
        <button className="action-btn flex items-center gap-2 px-4 py-2 bg-gray-100 text-okta-dark rounded-lg text-xs font-semibold hover:bg-gray-200 transition-all">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
          </svg>
          Screenshot
        </button>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="action-btn flex items-center gap-2 px-4 py-2 bg-gray-100 text-okta-dark rounded-lg text-xs font-semibold hover:bg-gray-200 transition-all"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"/>
          </svg>
          Raw Logs
        </button>
      </div>

      {/* Expandable Raw Logs */}
      {isExpanded && (
        <pre className="mt-2 text-xs bg-gray-50 p-3 rounded border border-gray-200 overflow-auto max-h-48">
          {JSON.stringify(data, null, 2)}
        </pre>
      )}
    </div>
  );
}
