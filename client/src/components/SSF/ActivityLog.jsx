import { useEffect, useRef } from 'react';

export function ActivityLog({ logs }) {
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = 0;
    }
  }, [logs.length]);

  const formatTime = (ts) => {
    const d = new Date(ts);
    return d.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  return (
    <div className="ssf-card rounded-xl p-4 h-full flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold ssf-text-primary flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          Activity Log
        </h3>
        <span className="text-[10px] ssf-text-muted">{logs.length} events</span>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-2 min-h-0 max-h-[500px]">
        {logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 ssf-text-muted">
            <svg className="w-8 h-8 mb-2 opacity-30" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-xs">No events transmitted yet</span>
          </div>
        ) : (
          logs.map((log) => (
            <div
              key={log.id}
              className="rounded-lg p-3 text-xs transition-all duration-200"
              style={{
                backgroundColor: log.success ? 'rgba(34,197,94,0.06)' : 'rgba(239,68,68,0.06)',
                borderLeft: `3px solid ${log.success ? '#22c55e' : '#ef4444'}`,
              }}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-semibold ssf-text-primary">{log.event}</span>
                <span className="ssf-text-muted font-mono">{formatTime(log.timestamp)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="ssf-text-muted">{log.provider}</span>
                <span
                  className="font-semibold text-[10px] px-1.5 py-0.5 rounded"
                  style={{
                    color: log.success ? '#22c55e' : '#ef4444',
                    backgroundColor: log.success ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)',
                  }}
                >
                  {log.success ? '202 Accepted' : 'Failed'}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
