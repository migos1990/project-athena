import { useState, useEffect } from 'react';
import { getSeverityColor } from '../../config/providers';

// loading prop: when true (real transmit in progress from parent), disables all
// buttons. The clicked button continues to show its spinner via local loadingId.
// Non-clicked buttons are dimmed/disabled but show no spinner.
export function EventGrid({ events, providerColor, onEventClick, disabled, loading = false }) {
  const [loadingId, setLoadingId] = useState(null);

  // Clear local loading indicator when parent signals transmit is complete
  useEffect(() => {
    if (!loading) setLoadingId(null);
  }, [loading]);

  const handleClick = async (event) => {
    if (disabled || loadingId || loading) return;
    setLoadingId(event.id);
    await new Promise(r => setTimeout(r, 300)); // brief visual feedback before async transmit
    onEventClick(event);
    // loadingId stays set until `loading` prop goes false (via useEffect above)
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      {events.map((event) => {
        // Only show spinner on the specific button that was clicked
        const isSpinning = loadingId === event.id;
        const severityColor = getSeverityColor(event.severity);

        return (
          <button
            key={event.id}
            onClick={() => handleClick(event)}
            disabled={disabled || !!loadingId || loading}
            style={{ borderLeftColor: severityColor }}
            className="relative text-left p-4 rounded-lg border-l-4 transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.02] active:scale-[0.98]"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className="text-[10px] font-bold tracking-wider px-1.5 py-0.5 rounded uppercase"
                    style={{ backgroundColor: severityColor + '22', color: severityColor }}
                  >
                    {event.severity}
                  </span>
                </div>
                <div className="font-semibold text-sm ssf-text-primary">
                  {isSpinning ? 'Transmitting...' : event.label}
                </div>
                <div className="text-xs ssf-text-muted mt-0.5">{event.description}</div>
              </div>
              <div className="w-8 h-8 flex items-center justify-center rounded-lg shrink-0" style={{ backgroundColor: providerColor + '18' }}>
                {isSpinning ? (
                  <svg className="w-4 h-4 animate-spin" style={{ color: providerColor }} fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" style={{ color: providerColor }} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
                  </svg>
                )}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
