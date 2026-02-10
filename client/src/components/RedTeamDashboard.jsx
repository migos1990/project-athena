import { useState, useEffect } from 'react';
import { AttackCard } from './AttackCard';
import { ATTACK_PATTERNS } from '../config/attacks';
import { PROVIDERS, PROVIDER_LIST, buildSimulatedPayload } from '../config/providers';
import { EventGrid } from './SSF/EventGrid';
import { PillarSection } from './PillarSection';

export function RedTeamDashboard({ attacks, apiUrl }) {
  const [launchedAttacks, setLaunchedAttacks] = useState({});

  // SSF Transmitter state
  const [config, setConfig] = useState({
    oktaDomain: '',
    issuerUrl: '',
    subjectEmail: '',
  });
  const [selectedProvider, setSelectedProvider] = useState('crowdstrike');
  const [keys, setKeys] = useState(null);
  const [lastPayload, setLastPayload] = useState(null);
  const [showPayload, setShowPayload] = useState(false);

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
        headers: { 'Content-Type': 'application/json' },
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
      console.error('Failed to launch attack:', error);
      // Graceful fallback: show as launched anyway
      setLaunchedAttacks(prev => ({
        ...prev,
        [attackId]: { timestamp: Date.now(), simulated: true }
      }));
    }
  };

  // Filter out SSF transmitter for now (will add in separate section later)
  const regularAttacks = ATTACK_PATTERNS.filter(a => !a.isSSF);

  // SSF Transmitter handlers
  const provider = PROVIDERS[selectedProvider];

  const handleProviderChange = (id) => {
    setSelectedProvider(id);
    const p = PROVIDERS[id];
    setConfig(prev => ({ ...prev, issuerUrl: p.defaultIssuer }));
  };

  const handleGenerateKeys = async () => {
    setKeys(null);
    await new Promise(r => setTimeout(r, 400));
    const kid = 'key-' + Math.random().toString(36).slice(2, 9);
    const fakeN = btoa(Array.from({ length: 128 }, () => String.fromCharCode(Math.floor(Math.random() * 94) + 33)).join('')).slice(0, 172);
    setKeys({
      kid,
      jwks: {
        keys: [{
          kty: 'RSA',
          kid,
          use: 'sig',
          alg: 'RS256',
          n: fakeN,
          e: 'AQAB',
        }],
      },
    });
  };

  const handleExportJWKS = () => {
    if (!keys) return;
    const blob = new Blob([JSON.stringify(keys.jwks, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'jwks.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleTransmitEvent = async (event) => {
    const payload = buildSimulatedPayload(provider, event, config);
    setLastPayload(payload);
    setShowPayload(true);

    // Send SSF event as attack
    try {
      const response = await fetch(`${apiUrl}/attack`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          attackType: 'ssf-transmitter',
          providerName: provider.name,
          eventLabel: event.label
        })
      });

      if (response.ok) {
        console.log('SSF event transmitted successfully');
      }
    } catch (error) {
      console.error('Failed to transmit SSF event:', error);
    }
  };

  const isConfigured = config.oktaDomain && config.subjectEmail;

  // Count launched attacks by source
  const firstPartyLaunched = regularAttacks.filter(a => launchedAttacks[a.id]).length;
  const ssfAttacks = attacks?.filter(a => a.attackType === 'ssf-transmitter') || [];

  return (
    <main className="max-w-7xl mx-auto px-8 py-8 bg-gray-50 min-h-screen">
      {/* Main Layout */}
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
                <div className="ml-auto flex items-center gap-2 text-xs text-okta-medium-gray">
                  <div className={`w-2 h-2 rounded-full ${isConfigured && keys ? 'bg-green-500' : 'bg-yellow-500'} animate-pulse`} />
                  {isConfigured && keys ? 'Ready' : 'Configure below'}
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
                      className="w-full text-xs font-semibold px-4 py-2.5 rounded-lg transition-all duration-150 text-white hover:opacity-90 active:scale-[0.98] bg-okta-blue"
                    >
                      {keys ? 'Regenerate Keys' : 'Generate RSA-256 Keys'}
                    </button>
                    {keys && (
                      <div className="mt-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-okta-medium-gray">Key ID</span>
                          <code className="text-xs font-mono text-okta-dark">{keys.kid}</code>
                        </div>
                        <div className="bg-gray-900 rounded-lg p-3 max-h-32 overflow-y-auto">
                          <pre className="text-[10px] font-mono text-gray-300 whitespace-pre-wrap break-all">
                            {JSON.stringify(keys.jwks, null, 2)}
                          </pre>
                        </div>
                        <button
                          onClick={handleExportJWKS}
                          className="w-full text-xs font-medium px-3 py-1.5 rounded-lg text-okta-medium-gray bg-white hover:bg-gray-100 transition-opacity border border-gray-300"
                        >
                          Export JWKS JSON
                        </button>
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
                      disabled={!keys || !isConfigured}
                    />
                    {(!keys || !isConfigured) && (
                      <div className="mt-3 text-xs text-okta-medium-gray text-center py-2 rounded-lg bg-yellow-50">
                        {!keys ? 'Generate keys first' : 'Enter Okta domain and target subject'}
                      </div>
                    )}
                  </div>
                </div>

                {/* Right Column: Payload Viewer */}
                <div className="col-span-4">
                  {showPayload && lastPayload ? (
                    <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm font-semibold text-okta-dark flex items-center gap-2">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5" />
                          </svg>
                          Last Payload
                        </h3>
                        <button onClick={() => setShowPayload(false)} className="text-xs text-okta-medium-gray hover:text-okta-dark">
                          Hide
                        </button>
                      </div>
                      <div className="bg-gray-900 rounded-lg p-3 max-h-96 overflow-y-auto">
                        <pre className="text-[10px] font-mono text-gray-300 whitespace-pre-wrap">
                          {JSON.stringify(lastPayload, null, 2)}
                        </pre>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-gray-50 rounded-lg p-4 border border-gray-200 h-full flex items-center justify-center">
                      <div className="text-center text-okta-medium-gray">
                        <svg className="w-12 h-12 mx-auto mb-2 text-gray-300" fill="none" stroke="currentColor" strokeWidth="1" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5" />
                        </svg>
                        <p className="text-xs">No events transmitted yet</p>
                        <p className="text-xs text-gray-400 mt-1">Transmit an event to see payload</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </PillarSection>

        {/* Attack Activity Log (Full Width at Bottom) */}
        <div className="bg-white rounded-xl border-2 border-gray-200 p-6 shadow-sm">
          <h2 className="text-base font-bold text-okta-dark mb-4 flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
            </svg>
            Attack Activity Log
          </h2>

          {/* Activity Log Content */}
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
                      key={idx}
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
                              hour: 'numeric',
                              minute: '2-digit',
                              second: '2-digit'
                            })}
                          </p>
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-green-700">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/>
                            </svg>
                            {isSSF ? 'Transmitted' : 'Launched'}
                          </span>
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
                  <p className="text-xs text-gray-400 mt-1">Launch an attack from above to see activity here</p>
                </div>
              )}
          </div>
        </div>
      </div>
    </main>
  );
}
