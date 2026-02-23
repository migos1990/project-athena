import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { PROVIDERS, PROVIDER_LIST } from '../../config/providers';
import { EventGrid } from './EventGrid';
import { ActivityLog } from './ActivityLog';
import { generateKeyPair } from '../../utils/crypto';
import { CopyButton } from './CopyButton';

const API_KEY = import.meta.env.VITE_DEMO_API_KEY || '';

function getApiUrl() {
  if (window.location.hostname.includes('app.github.dev')) {
    const parts = window.location.hostname.split('-');
    const codespaceName = `${parts[0]}-${parts[1]}-${parts[2]}`;
    return `https://${codespaceName}-3001.app.github.dev`;
  }
  return `${window.location.protocol}//${window.location.hostname}:3001`;
}

export function SSFDashboard() {
  const [isDark, setIsDark] = useState(true);
  const [config, setConfig] = useState({
    oktaDomain: '',
    issuerUrl: '',
    subjectEmail: '',
  });
  const [selectedProvider, setSelectedProvider] = useState('crowdstrike');
  const [keys, setKeys] = useState(null);        // { privatePem, publicJwk, kid }
  const [generatingKeys, setGeneratingKeys] = useState(false);
  const [activityLog, setActivityLog] = useState([]);
  const [lastPayload, setLastPayload] = useState(null);
  const [showPayload, setShowPayload] = useState(false);
  const [transmitting, setTransmitting] = useState(false);

  // Load config from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('ssf-config');
    if (saved) {
      try { setConfig(JSON.parse(saved)); } catch {}
    }
  }, []);

  // Save config to localStorage
  useEffect(() => {
    if (config.oktaDomain || config.issuerUrl || config.subjectEmail) {
      localStorage.setItem('ssf-config', JSON.stringify(config));
    }
  }, [config]);

  const provider = PROVIDERS[selectedProvider];

  const handleProviderChange = (id) => {
    setSelectedProvider(id);
    const p = PROVIDERS[id];
    setConfig(prev => ({ ...prev, issuerUrl: p.defaultIssuer }));
  };

  // Real RSA-256 key generation using jose + Web Crypto API
  const handleGenerateKeys = async () => {
    setGeneratingKeys(true);
    setKeys(null);
    try {
      const result = await generateKeyPair();
      setKeys(result);
    } catch (err) {
      console.error('Key generation failed:', err);
    } finally {
      setGeneratingKeys(false);
    }
  };

  const handleExportJWKS = () => {
    if (!keys) return;
    const jwks = { keys: [keys.publicJwk] };
    const blob = new Blob([JSON.stringify(jwks, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'jwks.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  // Real SSF transmission — signs JWT server-side and posts to Okta
  const handleTransmitEvent = async (event) => {
    if (!keys || !isConfigured || transmitting) return;

    setTransmitting(true);
    const apiUrl = getApiUrl();
    const timestamp = Math.floor(Date.now() / 1000);
    const eventsPayload = event.buildPayload(config.subjectEmail, timestamp);

    try {
      const response = await fetch(`${apiUrl}/ssf/transmit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': API_KEY,
        },
        body: JSON.stringify({
          oktaDomain: config.oktaDomain,
          issuerUrl: config.issuerUrl,
          subjectEmail: config.subjectEmail,
          privateKeyPem: keys.privatePem,
          keyId: keys.kid,
          eventsPayload,
          providerName: provider.name,
          eventLabel: event.label,
          providerId: selectedProvider,
        }),
      });

      const data = await response.json();

      if (data.payload) {
        setLastPayload(data.payload);
        setShowPayload(true);
      }

      setActivityLog(prev => [{
        id: Date.now(),
        timestamp: new Date().toISOString(),
        provider: provider.name,
        event: event.label,
        success: data.success,
        status: data.status || response.status,
        error: data.error,
        hint: data.hint,
        jti: data.payload?.jti,
      }, ...prev]);

    } catch (err) {
      setActivityLog(prev => [{
        id: Date.now(),
        timestamp: new Date().toISOString(),
        provider: provider.name,
        event: event.label,
        success: false,
        error: 'Network error',
      }, ...prev]);
    } finally {
      setTransmitting(false);
    }
  };

  const isConfigured = config.oktaDomain && config.subjectEmail;

  return (
    <div className={isDark ? 'ssf-dark' : 'ssf-light'}>
      <div className="ssf-page min-h-screen transition-colors duration-200">
        {/* Header */}
        <header className="border-b ssf-border px-6 py-4">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link to="/" className="ssf-text-muted hover:ssf-text-primary transition-colors text-sm flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
                </svg>
                Dashboard
              </Link>
              <div className="h-5 w-px ssf-border" />
              <div>
                <h1 className="text-lg font-bold ssf-text-primary flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  SSF Threat Transmitter
                </h1>
                <p className="text-xs ssf-text-muted">Shared Signals Framework &middot; Security Event Tokens</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 text-xs ssf-text-muted">
                <div className={`w-2 h-2 rounded-full ${isConfigured && keys ? 'bg-green-500' : 'bg-yellow-500'} animate-pulse`} />
                {isConfigured && keys ? 'Ready to transmit' : 'Configure below'}
              </div>
              <button
                onClick={() => setIsDark(!isDark)}
                className="p-2 rounded-lg ssf-card hover:opacity-80 transition-opacity"
              >
                {isDark ? (
                  <svg className="w-4 h-4 ssf-text-muted" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4 ssf-text-muted" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" />
                  </svg>
                )}
              </button>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-6 py-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

            {/* Left Column: Config + Keys */}
            <div className="lg:col-span-3 space-y-4">
              {/* Configuration */}
              <div className="ssf-card rounded-xl p-4">
                <h3 className="text-sm font-semibold ssf-text-primary mb-3 flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Configuration
                </h3>

                <div className="space-y-3">
                  <div>
                    <label className="text-[11px] ssf-text-muted font-medium mb-1 block">Okta Domain</label>
                    <input
                      type="text"
                      placeholder="your-org.okta.com"
                      value={config.oktaDomain}
                      onChange={e => setConfig(prev => ({ ...prev, oktaDomain: e.target.value }))}
                      className="ssf-input w-full text-xs px-3 py-2 rounded-lg font-mono"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] ssf-text-muted font-medium mb-1 block">Provider</label>
                    <select
                      value={selectedProvider}
                      onChange={e => handleProviderChange(e.target.value)}
                      className="ssf-input w-full text-xs px-3 py-2 rounded-lg"
                    >
                      {PROVIDER_LIST.map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] ssf-text-muted font-medium mb-1 block">Issuer URL</label>
                    <input
                      type="text"
                      placeholder="https://provider.example.com"
                      value={config.issuerUrl}
                      onChange={e => setConfig(prev => ({ ...prev, issuerUrl: e.target.value }))}
                      className="ssf-input w-full text-xs px-3 py-2 rounded-lg font-mono"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] ssf-text-muted font-medium mb-1 block">Target Subject</label>
                    <input
                      type="email"
                      placeholder="user@example.com"
                      value={config.subjectEmail}
                      onChange={e => setConfig(prev => ({ ...prev, subjectEmail: e.target.value }))}
                      className="ssf-input w-full text-xs px-3 py-2 rounded-lg font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Key Management */}
              <div className="ssf-card rounded-xl p-4">
                <h3 className="text-sm font-semibold ssf-text-primary mb-3 flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z" />
                  </svg>
                  Key Management
                </h3>

                <button
                  onClick={handleGenerateKeys}
                  disabled={generatingKeys}
                  className="w-full text-xs font-semibold px-4 py-2.5 rounded-lg transition-all duration-150 text-white hover:opacity-90 active:scale-[0.98] disabled:opacity-60"
                  style={{ backgroundColor: '#1662dd' }}
                >
                  {generatingKeys ? 'Generating…' : keys ? 'Regenerate RSA-256 Keys' : 'Generate RSA-256 Keys'}
                </button>

                {keys && (
                  <div className="mt-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] ssf-text-muted">Key ID</span>
                      <CopyButton text={keys.kid} label="Key ID" compact dark />
                    </div>
                    <code className="block text-[10px] font-mono ssf-text-primary truncate w-full" title={keys.kid}>{keys.kid}</code>
                    <div className="relative">
                      <div className="ssf-code-block rounded-lg p-3 max-h-32 overflow-y-auto">
                        <pre className="text-[10px] font-mono ssf-text-secondary whitespace-pre-wrap break-all">
                          {JSON.stringify({ keys: [keys.publicJwk] }, null, 2)}
                        </pre>
                      </div>
                      <div className="absolute top-2 right-2">
                        <CopyButton text={JSON.stringify({ keys: [keys.publicJwk] }, null, 2)} label="JWKS" compact dark />
                      </div>
                    </div>
                    <button
                      onClick={handleExportJWKS}
                      className="w-full text-[11px] font-medium px-3 py-1.5 rounded-lg ssf-text-muted ssf-card hover:opacity-80 transition-opacity border ssf-border"
                    >
                      Export JWKS JSON
                    </button>
                    {/* JWKS hosting tip */}
                    <details className="group">
                      <summary className="cursor-pointer text-[11px] ssf-text-muted flex items-center gap-1 hover:ssf-text-primary list-none">
                        <svg className="w-3 h-3 group-open:rotate-90 transition-transform" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                        </svg>
                        How to host your JWKS
                      </summary>
                      <div className="mt-2 text-[10px] ssf-text-muted space-y-1 leading-relaxed p-2 rounded-lg" style={{ backgroundColor: 'rgba(22,98,221,0.08)', border: '1px solid rgba(22,98,221,0.2)' }}>
                        <p className="font-medium" style={{ color: '#6ea7ff' }}>Use npoint.io to quickly host your JWKS:</p>
                        <ol className="list-decimal list-inside space-y-1 pl-1">
                          <li>Go to npoint.io → &quot;Create JSON Bin&quot;</li>
                          <li>Paste the JWKS JSON above and save</li>
                          <li>Copy the API endpoint URL</li>
                          <li>Use this URL in your Okta SSF stream config</li>
                        </ol>
                        <p className="opacity-60">Note: GitHub Gists won&apos;t work — incorrect Content-Type.</p>
                      </div>
                    </details>
                  </div>
                )}
              </div>
            </div>

            {/* Center Column: Events + Payload */}
            <div className="lg:col-span-5 space-y-4">
              <div className="ssf-card rounded-xl p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold ssf-text-primary flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
                    </svg>
                    Transmit Events
                  </h3>
                  <span
                    className="text-[10px] font-bold px-2 py-1 rounded-full text-white"
                    style={{ backgroundColor: provider.color }}
                  >
                    {provider.name}
                  </span>
                </div>

                <EventGrid
                  events={provider.events}
                  providerColor={provider.color}
                  onEventClick={handleTransmitEvent}
                  disabled={!keys || !isConfigured || transmitting}
                  loading={transmitting}
                />

                {(!keys || !isConfigured) && (
                  <div className="mt-3 text-[11px] ssf-text-muted text-center py-2 rounded-lg" style={{ backgroundColor: 'rgba(234,179,8,0.08)' }}>
                    {!keys ? 'Generate RSA-256 keys first' : 'Enter Okta domain and target subject'}
                  </div>
                )}
              </div>

              {/* Payload Viewer */}
              {showPayload && lastPayload && (
                <div className="ssf-card rounded-xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold ssf-text-primary flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5" />
                      </svg>
                      Transmitted Payload
                    </h3>
                    <div className="flex items-center gap-2">
                      <CopyButton text={JSON.stringify(lastPayload, null, 2)} label="Payload" dark />
                      <button onClick={() => setShowPayload(false)} className="text-xs ssf-text-muted hover:opacity-70">
                        Hide
                      </button>
                    </div>
                  </div>
                  <div className="ssf-code-block rounded-lg p-3 max-h-48 overflow-y-auto">
                    <pre className="text-[10px] font-mono ssf-text-secondary whitespace-pre-wrap">
                      {JSON.stringify(lastPayload, null, 2)}
                    </pre>
                  </div>
                </div>
              )}
            </div>

            {/* Right Column: Activity Log */}
            <div className="lg:col-span-4">
              <ActivityLog logs={activityLog} />
            </div>
          </div>
        </main>

        {/* Footer */}
        <footer className="border-t ssf-border px-6 py-3 mt-8">
          <div className="max-w-7xl mx-auto flex items-center justify-between text-[11px] ssf-text-muted">
            <span>Shared Signals Framework (SSF) &middot; OpenID Foundation</span>
            <span>Okta Identity Threat Protection</span>
          </div>
        </footer>
      </div>
    </div>
  );
}
