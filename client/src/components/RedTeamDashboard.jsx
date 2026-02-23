import { useState, useEffect } from 'react';
import { AttackCard } from './AttackCard';
import { ATTACK_PATTERNS } from '../config/attacks';
import { PROVIDERS, PROVIDER_LIST } from '../config/providers';
import { EventGrid } from './SSF/EventGrid';
import { PillarSection } from './PillarSection';
import { generateKeyPair } from '../utils/crypto';
import { CopyButton } from './SSF/CopyButton';

const API_KEY = import.meta.env.VITE_DEMO_API_KEY || '';

export function RedTeamDashboard({ attacks, apiUrl }) {
  const [launchedAttacks, setLaunchedAttacks] = useState({});

  // SSF Transmitter state
  const [config, setConfig] = useState({
    oktaDomain: '',
    issuerUrl: '',
    subjectEmail: '',
  });
  const [selectedProvider, setSelectedProvider] = useState('crowdstrike');
  const [keys, setKeys] = useState(null);        // { privatePem, publicJwk, kid }
  const [generatingKeys, setGeneratingKeys] = useState(false);
  const [lastPayload, setLastPayload] = useState(null);
  const [showPayload, setShowPayload] = useState(false);
  const [transmitting, setTransmitting] = useState(false);
  const [transmitResult, setTransmitResult] = useState(null); // { success, status, error?, hint?, errorDescription? }

  // Clear launchedAttacks when attacks prop is reset (demo reset)
  useEffect(() => {
    if (!attacks || attacks.length === 0) {
      setLaunchedAttacks({});
    }
  }, [attacks]);

  // Load SSF config from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('ssf-config');
    if (saved) {
      try { setConfig(JSON.parse(saved)); } catch {}
    }
  }, []);

  // Save SSF config to localStorage
  useEffect(() => {
    if (config.oktaDomain || config.issuerUrl || config.subjectEmail) {
      localStorage.setItem('ssf-config', JSON.stringify(config));
    }
  }, [config]);

  const handleLaunchAttack = async (attackId) => {
    try {
      const response = await fetch(`${apiUrl}/attack`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': API_KEY,
        },
        body: JSON.stringify({ attackType: attackId })
      });

      if (response.ok) {
        const data = await response.json();
        setLaunchedAttacks(prev => ({
          ...prev,
          [attackId]: { timestamp: Date.now(), ...data }
        }));
      }
    } catch (error) {
      // Graceful fallback: show as launched anyway
      setLaunchedAttacks(prev => ({
        ...prev,
        [attackId]: { timestamp: Date.now(), simulated: true }
      }));
    }
  };

  const regularAttacks = ATTACK_PATTERNS.filter(a => !a.isSSF);

  const provider = PROVIDERS[selectedProvider];

  const handleProviderChange = (id) => {
    setSelectedProvider(id);
    const p = PROVIDERS[id];
    setConfig(prev => ({ ...prev, issuerUrl: p.defaultIssuer }));
    setTransmitResult(null);
  };

  // Real RSA-256 key generation using jose + Web Crypto API
  const handleGenerateKeys = async () => {
    setGeneratingKeys(true);
    setKeys(null);
    setTransmitResult(null);
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
    setTransmitResult(null);
    setLastPayload(null);
    setShowPayload(false);

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
      setTransmitResult({
        success: data.success,
        status: data.status || response.status,
        error: data.error,
        errorDescription: data.errorDescription,
        hint: data.hint,
        debugInfo: data.debugInfo,
      });

      if (data.payload) {
        setLastPayload(data.payload);
        setShowPayload(true);
      }
    } catch (err) {
      setTransmitResult({ success: false, error: 'Network error', errorDescription: err.message });
    } finally {
      setTransmitting(false);
    }
  };

  const isConfigured = config.oktaDomain && config.subjectEmail;

  const firstPartyLaunched = regularAttacks.filter(a => launchedAttacks[a.id]).length;
  const ssfAttacks = attacks?.filter(a => a.attackType === 'ssf-transmitter') || [];

  return (
    <main className="max-w-7xl mx-auto px-8 py-8 bg-gray-50 min-h-screen">
      <div className="space-y-6">
        {/* 1st Party Data Section */}
        <PillarSection
          title="Threats identified by 1st Party Data"
          borderColor="border-red-500"
          bgColor="bg-red-500"
          completedCount={firstPartyLaunched}
          totalCount={regularAttacks.length}
          collapsible={true}
          icon={
            <svg className="w-5 h-5 text-okta-dark" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"/>
            </svg>
          }
        >
          <div className="grid grid-cols-2 gap-4">
            {regularAttacks.map((attack) => (
              <AttackCard
                key={attack.id}
                attack={attack}
                onLaunch={handleLaunchAttack}
                isLaunched={!!launchedAttacks[attack.id]}
                launchData={launchedAttacks[attack.id]}
                showInstructions={attack.id === 'cookie-theft'}
              />
            ))}
          </div>
        </PillarSection>

        {/* 3rd Party Data Section */}
        <PillarSection
          title="Threats identified by 3rd Party Data"
          borderColor="border-purple-500"
          bgColor="bg-purple-500"
          completedCount={ssfAttacks.length}
          totalCount={0}
          collapsible={true}
          icon={
            <svg className="w-5 h-5 text-okta-dark" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.288 15.038a5.25 5.25 0 017.424 0M5.106 11.856c3.807-3.808 9.98-3.808 13.788 0M1.924 8.674c5.565-5.565 14.587-5.565 20.152 0M12.53 18.22l-.53.53-.53-.53a.75.75 0 011.06 0z"/>
            </svg>
          }
        >
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center gap-3 mb-6">
              <div>
                <h3 className="text-base font-bold text-okta-dark">SSF Threat Transmitter</h3>
                <p className="text-xs text-okta-medium-gray">Shared Signals Framework • Security Event Tokens</p>
              </div>
              <div className="ml-auto flex items-center gap-2 text-xs">
                {transmitResult ? (
                  transmitResult.success ? (
                    <span className="flex items-center gap-1.5 text-green-600 font-semibold">
                      <span className="w-2 h-2 rounded-full bg-green-500" />
                      {transmitResult.status} Accepted
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5 text-red-600 font-semibold">
                      <span className="w-2 h-2 rounded-full bg-red-500" />
                      {transmitResult.error || 'Error'}
                    </span>
                  )
                ) : (
                  <span className="flex items-center gap-1.5 text-okta-medium-gray">
                    <span className={`w-2 h-2 rounded-full ${isConfigured && keys ? 'bg-green-500' : 'bg-yellow-500'} animate-pulse`} />
                    {isConfigured && keys ? 'Ready to transmit' : 'Configure below'}
                  </span>
                )}
              </div>
            </div>

            <div className="grid grid-cols-12 gap-6">
              {/* Left Column: Config + Keys */}
              <div className="col-span-3 space-y-4">
                {/* Configuration */}
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <h3 className="text-sm font-semibold text-okta-dark mb-3 flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    Configuration
                  </h3>
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs text-okta-medium-gray font-medium mb-1 block">Okta Domain</label>
                      <input
                        type="text"
                        placeholder="your-org.okta.com"
                        value={config.oktaDomain}
                        onChange={e => setConfig(prev => ({ ...prev, oktaDomain: e.target.value }))}
                        className="w-full text-xs px-3 py-2 rounded-lg border border-gray-300 focus:border-okta-blue focus:ring-1 focus:ring-okta-blue outline-none font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-okta-medium-gray font-medium mb-1 block">Provider</label>
                      <select
                        value={selectedProvider}
                        onChange={e => handleProviderChange(e.target.value)}
                        className="w-full text-xs px-3 py-2 rounded-lg border border-gray-300 focus:border-okta-blue focus:ring-1 focus:ring-okta-blue outline-none"
                      >
                        {PROVIDER_LIST.map(p => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-okta-medium-gray font-medium mb-1 block">Issuer URL</label>
                      <input
                        type="text"
                        placeholder="https://provider.example.com"
                        value={config.issuerUrl}
                        onChange={e => setConfig(prev => ({ ...prev, issuerUrl: e.target.value }))}
                        className="w-full text-xs px-3 py-2 rounded-lg border border-gray-300 focus:border-okta-blue focus:ring-1 focus:ring-okta-blue outline-none font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-okta-medium-gray font-medium mb-1 block">Target Subject</label>
                      <input
                        type="email"
                        placeholder="user@example.com"
                        value={config.subjectEmail}
                        onChange={e => setConfig(prev => ({ ...prev, subjectEmail: e.target.value }))}
                        className="w-full text-xs px-3 py-2 rounded-lg border border-gray-300 focus:border-okta-blue focus:ring-1 focus:ring-okta-blue outline-none font-mono"
                      />
                    </div>
                  </div>
                </div>

                {/* Key Management */}
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <h3 className="text-sm font-semibold text-okta-dark mb-3 flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z" />
                    </svg>
                    Key Management
                  </h3>
                  <button
                    onClick={handleGenerateKeys}
                    disabled={generatingKeys}
                    className="w-full text-xs font-semibold px-4 py-2.5 rounded-lg transition-all duration-150 text-white hover:opacity-90 active:scale-[0.98] disabled:opacity-60 bg-okta-blue"
                  >
                    {generatingKeys ? 'Generating…' : keys ? 'Regenerate RSA-256 Keys' : 'Generate RSA-256 Keys'}
                  </button>
                  {keys && (
                    <div className="mt-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-okta-medium-gray">Key ID</span>
                        <CopyButton text={keys.kid} label="Key ID" compact />
                      </div>
                      <code className="block text-[10px] font-mono text-okta-dark truncate w-full" title={keys.kid}>{keys.kid}</code>
                      <div className="relative">
                        <div className="bg-gray-900 rounded-lg p-3 max-h-28 overflow-y-auto">
                          <pre className="text-[10px] font-mono text-gray-300 whitespace-pre-wrap break-all">
                            {JSON.stringify({ keys: [keys.publicJwk] }, null, 2)}
                          </pre>
                        </div>
                        <div className="absolute top-2 right-2">
                          <CopyButton text={JSON.stringify({ keys: [keys.publicJwk] }, null, 2)} label="JWKS" compact />
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={handleExportJWKS}
                          className="flex-1 text-xs font-medium px-3 py-1.5 rounded-lg text-okta-medium-gray bg-white hover:bg-gray-100 transition-opacity border border-gray-300"
                        >
                          Export JWKS JSON
                        </button>
                      </div>
                      {/* JWKS hosting tip — mirrors hackathon guidance */}
                      <details className="group">
                        <summary className="cursor-pointer text-[11px] text-okta-medium-gray flex items-center gap-1 hover:text-okta-dark list-none">
                          <svg className="w-3.5 h-3.5 group-open:rotate-90 transition-transform" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                          </svg>
                          How to host your JWKS
                        </summary>
                        <div className="mt-2 text-[11px] text-okta-medium-gray bg-blue-50 border border-blue-100 rounded-lg p-3 space-y-1.5 leading-relaxed">
                          <p>Use <strong>npoint.io</strong> to quickly host your JWKS:</p>
                          <ol className="list-decimal list-inside space-y-1 pl-1">
                            <li>Go to <span className="font-mono text-okta-blue">npoint.io</span> → &quot;Create JSON Bin&quot;</li>
                            <li>Paste the JWKS JSON above and save</li>
                            <li>Copy the API endpoint URL (e.g. <span className="font-mono">https://api.npoint.io/abc123</span>)</li>
                            <li>Use this as the JWKS URL in your Okta SSF stream config</li>
                          </ol>
                          <p className="text-[10px] text-gray-500">Note: GitHub Gists won&apos;t work — they return HTML, not JSON with the correct Content-Type.</p>
                        </div>
                      </details>
                    </div>
                  )}
                </div>
              </div>

              {/* Center Column: Events */}
              <div className="col-span-5">
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-semibold text-okta-dark flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
                      </svg>
                      Transmit Events
                    </h3>
                    <span
                      className="text-xs font-bold px-2 py-1 rounded-full text-white"
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
                    <div className="mt-3 text-xs text-okta-medium-gray text-center py-2 rounded-lg bg-yellow-50">
                      {!keys ? 'Generate RSA-256 keys first' : 'Enter Okta domain and target subject'}
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column: Response + Payload */}
              <div className="col-span-4 space-y-4">
                {/* Transmit result */}
                {transmitResult && (
                  <div className={`rounded-lg p-4 border ${transmitResult.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                    <div className="flex items-center gap-2 mb-2">
                      {transmitResult.success ? (
                        <>
                          <svg className="w-4 h-4 text-green-600 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                          </svg>
                          <span className="text-sm font-semibold text-green-700">
                            {transmitResult.status} Accepted — event transmitted to Okta
                          </span>
                        </>
                      ) : (
                        <>
                          <svg className="w-4 h-4 text-red-600 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"/>
                          </svg>
                          <span className="text-sm font-semibold text-red-700">
                            {transmitResult.error || 'Transmission failed'}
                          </span>
                        </>
                      )}
                    </div>
                    {!transmitResult.success && transmitResult.errorDescription && (
                      <p className="text-xs text-red-600 mb-2">{transmitResult.errorDescription}</p>
                    )}
                    {!transmitResult.success && transmitResult.hint && (
                      <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1.5 mt-2">
                        <span className="font-semibold">Hint:</span> {transmitResult.hint}
                      </p>
                    )}
                  </div>
                )}

                {/* Payload Viewer */}
                {showPayload && lastPayload ? (
                  <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-semibold text-okta-dark flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5" />
                        </svg>
                        Transmitted Payload
                      </h3>
                      <div className="flex items-center gap-2">
                        <CopyButton text={JSON.stringify(lastPayload, null, 2)} label="Payload" />
                        <button onClick={() => setShowPayload(false)} className="text-xs text-okta-medium-gray hover:text-okta-dark">
                          Hide
                        </button>
                      </div>
                    </div>
                    <div className="bg-gray-900 rounded-lg p-3 max-h-64 overflow-y-auto">
                      <pre className="text-[10px] font-mono text-gray-300 whitespace-pre-wrap">
                        {JSON.stringify(lastPayload, null, 2)}
                      </pre>
                    </div>
                  </div>
                ) : !transmitResult && (
                  <div className="bg-gray-50 rounded-lg p-4 border border-gray-200 flex items-center justify-center min-h-[100px]">
                    <div className="text-center text-okta-medium-gray">
                      <svg className="w-10 h-10 mx-auto mb-2 text-gray-300" fill="none" stroke="currentColor" strokeWidth="1" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5" />
                      </svg>
                      <p className="text-xs">Payload will appear here after transmission</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </PillarSection>

        {/* Attack Activity Log */}
        <div className="bg-white rounded-xl border-2 border-gray-200 p-6 shadow-sm">
          <h2 className="text-base font-bold text-okta-dark mb-4 flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
            </svg>
            Attack Activity Log
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {attacks && attacks.length > 0 ? (
              attacks.map((attack, idx) => {
                const pattern = ATTACK_PATTERNS.find(p => p.id === attack.attackType);
                const isSSF = attack.attackType === 'ssf-transmitter';
                const borderColor = isSSF ? 'border-purple-500' : 'border-red-500';
                const bgColor = isSSF ? 'bg-purple-50' : 'bg-red-50';
                const sourceBadge = isSSF ? '3rd Party' : '1st Party';
                const sourceBadgeColor = isSSF ? 'bg-purple-100 text-purple-700' : 'bg-red-100 text-red-700';

                return (
                  <div
                    key={attack.id || idx}
                    className={`border-l-4 ${borderColor} ${bgColor} rounded-r-lg p-4`}
                  >
                    <div className="flex items-start gap-2">
                      <span className="text-xl">{pattern?.icon || (isSSF ? '📡' : '⚠️')}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-1.5">
                          <h3 className="text-sm font-semibold text-okta-dark">
                            {isSSF ? `${attack.providerName}: ${attack.eventLabel}` : (pattern?.name || attack.attackType)}
                          </h3>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${sourceBadgeColor} whitespace-nowrap`}>
                            {sourceBadge}
                          </span>
                        </div>
                        <p className="text-xs text-okta-medium-gray mb-2">
                          {new Date(attack.timestamp).toLocaleTimeString('en-US', {
                            hour: 'numeric', minute: '2-digit', second: '2-digit'
                          })}
                        </p>
                        <div className="flex items-center gap-2">
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-green-700">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/>
                            </svg>
                            {isSSF ? 'Transmitted' : 'Launched'}
                          </span>
                          {isSSF && attack.ssfSuccess === false && (
                            <span className="text-[10px] text-red-600 font-medium">(Okta rejected)</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="col-span-full text-center py-12">
                <svg className="w-16 h-16 mx-auto text-gray-300 mb-3" fill="none" stroke="currentColor" strokeWidth="1" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
                </svg>
                <p className="text-sm font-semibold text-okta-medium-gray">No attacks launched yet</p>
                <p className="text-xs text-gray-400 mt-1">Launch an attack or transmit an SSF event to see activity here</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
