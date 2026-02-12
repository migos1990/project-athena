import { useState, useEffect, useRef } from 'react';

export function UseCaseCard({
  icon = '🔐',
  pillarColor = 'border-gray-300',
  completed = false,
  data = null,
  generatedContent = null,
  title = 'Use Case',
  description = ''
}) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Typewriter state
  const [displayedText, setDisplayedText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showOutcomes, setShowOutcomes] = useState(false);
  const hasAnimated = useRef(false);
  const prevNarrative = useRef('');

  // Extract Claude-generated content (falls back to props if not completed)
  const cardTitle = generatedContent?.cardTitle || title;
  const cardDescription = generatedContent?.cardDescription || description;
  const narrative = generatedContent?.narrative || '';
  const businessOutcomes = generatedContent?.businessOutcomes || [];

  // Typewriter effect: animate narrative text when it first appears
  useEffect(() => {
    // Only animate when narrative transitions from empty to populated
    if (narrative && !prevNarrative.current && !hasAnimated.current) {
      hasAnimated.current = true;
      setIsTyping(true);
      setShowOutcomes(false);
      let i = 0;
      const interval = setInterval(() => {
        i++;
        setDisplayedText(narrative.slice(0, i));
        if (i >= narrative.length) {
          clearInterval(interval);
          setIsTyping(false);
          // Stagger business outcomes after typing completes
          setTimeout(() => setShowOutcomes(true), 300);
        }
      }, 12);
      prevNarrative.current = narrative;
      return () => clearInterval(interval);
    }

    // If narrative was already present (re-render, team switch), show immediately
    if (narrative && hasAnimated.current) {
      setDisplayedText(narrative);
      setIsTyping(false);
      setShowOutcomes(true);
    }

    prevNarrative.current = narrative;
  }, [narrative]);

  // Reset animation state when card resets (demo reset)
  useEffect(() => {
    if (!completed) {
      hasAnimated.current = false;
      prevNarrative.current = '';
      setDisplayedText('');
      setIsTyping(false);
      setShowOutcomes(false);
    }
  }, [completed]);

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
            <h3 className="text-sm font-semibold text-okta-medium-gray tracking-tight">{cardTitle}</h3>
            <p className="text-xs text-gray-400 mt-1.5 leading-relaxed">{cardDescription}</p>
          </div>
        </div>
      </div>
    );
  }

  // COMPLETED STATE - Full card with Claude-generated content
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
          <h3 className="text-sm font-semibold text-okta-dark tracking-tight">{cardTitle}</h3>
          <p className="text-xs text-okta-medium-gray mt-1.5 leading-relaxed">{cardDescription}</p>
        </div>
      </div>

      {/* ===== PRESERVED: Event Summary Section ===== */}
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

      {/* ===== AI Loading State: shown when completed but Claude hasn't responded yet ===== */}
      {completed && !narrative && (
        <div className="fade-slide-up mt-4 p-4 rounded-lg bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200">
          <div className="flex items-center gap-2">
            <span className="text-lg animate-pulse">🤖</span>
            <span className="text-xs font-semibold text-purple-700 animate-pulse tracking-wide">
              Analyzing event with Claude AI...
            </span>
          </div>
        </div>
      )}

      {/* ===== AI-Generated Insights with Typewriter Effect ===== */}
      {completed && narrative && (
        <div className="fade-slide-up mt-4 p-4 rounded-lg bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200">
          {/* Header with AI badge */}
          <div className="flex items-center gap-2 mb-2">
            <span className="text-lg">🤖</span>
            <span className="text-xs font-semibold text-purple-700 tracking-wide">
              AI-GENERATED INSIGHTS
            </span>
            <span className="text-xs text-gray-500 ml-auto">
              Claude 4.5
            </span>
          </div>

          {/* AI-generated narrative with typewriter */}
          <p className="text-xs text-gray-700 leading-relaxed mb-3">
            {displayedText || narrative}
            {isTyping && <span className="typing-cursor">|</span>}
          </p>

          {/* AI-generated business outcomes (fade in after typing) */}
          {businessOutcomes.length > 0 && showOutcomes && (
            <div className="flex flex-wrap gap-2">
              {businessOutcomes.map((outcome, idx) => (
                <div
                  key={idx}
                  className="text-xs bg-white px-3 py-1.5 rounded-full border border-purple-200 flex items-center gap-1.5 shadow-sm fade-slide-up"
                  style={{ animationDelay: `${idx * 0.15}s` }}
                >
                  <span>{outcome.icon}</span>
                  <span className="font-semibold text-gray-700">{outcome.category}:</span>
                  <span className="text-gray-600">{outcome.description}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ===== PRESERVED: Action Buttons ===== */}
      <div className="flex items-center gap-2 pt-3 border-t border-gray-100 mt-4">
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

      {/* ===== PRESERVED: Expandable Raw Logs ===== */}
      {isExpanded && (
        <pre className="mt-2 text-xs bg-gray-50 p-3 rounded border border-gray-200 overflow-auto max-h-48">
          {JSON.stringify(data, null, 2)}
        </pre>
      )}
    </div>
  );
}
