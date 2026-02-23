import { useState } from 'react';

/**
 * Copy-to-clipboard button. Shows a checkmark for 1.5s after copying.
 * Mirrors the CopyButton component from the SSF-Transmitter hackathon.
 *
 * Props:
 *   text    — string to copy
 *   label   — short label for aria / tooltip (e.g. "JWKS", "Key ID")
 *   compact — if true, renders icon-only with no label text
 *   dark    — if true, uses dark-theme colours (for SSFDashboard)
 */
export function CopyButton({ text, label = 'Copy', compact = false, dark = false }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard API unavailable — silently ignore
    }
  };

  const baseClass = dark
    ? 'inline-flex items-center gap-1 text-[11px] font-medium px-2 py-1 rounded-lg transition-all ssf-text-muted ssf-card hover:opacity-80 border ssf-border'
    : 'inline-flex items-center gap-1 text-[11px] font-medium px-2 py-1 rounded-lg transition-all text-okta-medium-gray bg-white hover:bg-gray-100 border border-gray-300';

  return (
    <button
      onClick={handleCopy}
      title={`Copy ${label}`}
      className={baseClass}
    >
      {copied ? (
        <>
          <svg className="w-3.5 h-3.5 text-green-500 shrink-0" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
          </svg>
          {!compact && <span className="text-green-500">Copied!</span>}
        </>
      ) : (
        <>
          <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" />
          </svg>
          {!compact && <span>Copy {label}</span>}
        </>
      )}
    </button>
  );
}
