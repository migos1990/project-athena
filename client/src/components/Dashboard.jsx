import { useState, useEffect } from 'react';
import { useWebSocket } from '../hooks/useWebSocket';
import { UseCaseCard } from './UseCaseCard';
import { ISPMHub } from './ISPMHub';
import { PillarSection } from './PillarSection';

export function Dashboard() {
  // Use Codespace public URL if available, otherwise localhost
  const getWebSocketUrl = () => {
    if (window.location.hostname.includes('app.github.dev')) {
      // Running in Codespace - use public WSS URL
      const codespaceName = window.location.hostname.split('-')[0] + '-' + window.location.hostname.split('-')[1] + '-' + window.location.hostname.split('-')[2];
      return `wss://${codespaceName}-3001.app.github.dev`;
    }
    // Local development - use same hostname as frontend
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${protocol}//${window.location.hostname}:3001`;
  };

  const WS_URL = getWebSocketUrl();
  const { isConnected, lastMessage } = useWebSocket(WS_URL);

  const [useCases, setUseCases] = useState({
    mfaLogin: { completed: false, data: null },
    groupAssignment: { completed: false, data: null }
  });

  const [detections, setDetections] = useState({
    partiallyOffboarded: { completed: false, data: null },
    unmanagedServiceAccount: { completed: false, data: null },
    weakPasswordPolicy: { completed: false, data: null },
    orphanedAccount: { completed: false, data: null }
  });

  const [demoStartTime, setDemoStartTime] = useState(null);

  // Update use cases and detections when WebSocket messages arrive
  useEffect(() => {
    if (!lastMessage) return;

    if (lastMessage.type === 'USE_CASE_COMPLETED') {
      setUseCases(prev => ({
        ...prev,
        [lastMessage.useCase]: {
          completed: true,
          data: lastMessage.data
        }
      }));
    } else if (lastMessage.type === 'DETECTION_FOUND') {
      setDetections(prev => ({
        ...prev,
        [lastMessage.detectionId]: {
          completed: true,
          data: lastMessage.data
        }
      }));
    } else if (lastMessage.type === 'INITIAL_STATE') {
      setUseCases(lastMessage.useCaseStates);
      if (lastMessage.detectionStates) {
        setDetections(lastMessage.detectionStates);
      }
      setDemoStartTime(lastMessage.demoStartTime);
    } else if (lastMessage.type === 'DEMO_RESET' || lastMessage.type === 'DEMO_STARTED') {
      setUseCases(lastMessage.useCaseStates);
      if (lastMessage.detectionStates) {
        setDetections(lastMessage.detectionStates);
      } else {
        // Reset detections if not provided
        setDetections({
          partiallyOffboarded: { completed: false, data: null },
          unmanagedServiceAccount: { completed: false, data: null },
          weakPasswordPolicy: { completed: false, data: null },
          orphanedAccount: { completed: false, data: null }
        });
      }
      setDemoStartTime(lastMessage.startTime);
    }
  }, [lastMessage]);

  const completedCount = Object.values(useCases).filter(uc => uc.completed).length;
  const productsCount = (useCases.mfaLogin.completed ? 3 : 0) + (useCases.groupAssignment.completed ? 2 : 0);
  const pillarsCount = (useCases.mfaLogin.completed ? 1 : 0) + (useCases.groupAssignment.completed ? 1 : 0);

  const getApiUrl = () => {
    if (window.location.hostname.includes('app.github.dev')) {
      const codespaceName = window.location.hostname.split('-')[0] + '-' + window.location.hostname.split('-')[1] + '-' + window.location.hostname.split('-')[2];
      return `https://${codespaceName}-3001.app.github.dev`;
    }
    // Local development - use same hostname as frontend
    return `${window.location.protocol}//${window.location.hostname}:3001`;
  };

  const handleStartDemo = async () => {
    const res = await fetch(`${getApiUrl()}/start-demo`, { method: 'POST' });
    const data = await res.json();
    setDemoStartTime(data.startTime);
  };

  const handleResetDemo = async () => {
    const res = await fetch(`${getApiUrl()}/reset-demo`, { method: 'POST' });
    const data = await res.json();
    setDemoStartTime(data.startTime);
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Okta Logo */}
            <img src="/okta-logo.png" alt="Okta" className="h-7" />
            <div className="h-6 w-px bg-gray-300"></div>
            <span className="text-base font-semibold text-okta-dark tracking-tight">Identity Security Fabric</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleStartDemo}
              className="px-5 py-2.5 bg-okta-blue text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition-all shadow-md border border-okta-blue"
            >
              {demoStartTime ? 'Demo Active' : 'Start Demo'}
            </button>
            {demoStartTime && (
              <span className="text-xs text-okta-medium-gray">
                Started {new Date(demoStartTime).toLocaleTimeString()}
              </span>
            )}
            <button
              onClick={handleResetDemo}
              className="px-5 py-2.5 bg-white text-okta-dark border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 transition-all"
            >
              Reset
            </button>
            <div className="h-6 w-px bg-gray-200 mx-1"></div>
            <div className="flex items-center gap-2">
              <div className={`w-2.5 h-2.5 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
              <span className="text-xs text-okta-medium-gray font-medium">{isConnected ? 'Connected' : 'Disconnected'}</span>
            </div>
          </div>
        </div>
      </header>

      {/* Stats Banner */}
      <div className="bg-black">
        <div className="max-w-7xl mx-auto px-8 py-5 flex items-center justify-between">
          <div className="flex items-center gap-10">
            <div className="flex items-center gap-3">
              <span className="text-4xl font-bold text-white tracking-tight">{completedCount}</span>
              <span className="text-xs text-gray-300 leading-tight font-semibold uppercase">Use cases<br/>demonstrated</span>
            </div>
            <div className="w-px h-12 bg-gray-600"></div>
            <div className="flex items-center gap-3">
              <span className="text-4xl font-bold text-white tracking-tight">{productsCount}</span>
              <span className="text-xs text-gray-300 leading-tight font-semibold uppercase">Okta products<br/>in action</span>
            </div>
            <div className="w-px h-12 bg-gray-600"></div>
            <div className="flex items-center gap-3">
              <span className="text-4xl font-bold text-white tracking-tight">{pillarsCount}</span>
              <span className="text-xs text-gray-300 leading-tight font-semibold uppercase">Parts of the Identity<br/>Security Fabric covered</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-8 py-8 bg-gray-50">
        {/* ISPM Hub Section */}
        <ISPMHub detections={detections} />

        {/* 2x2 Pillar Grid */}
        <div className="grid grid-cols-2 gap-6">
          {/* Access Management */}
          <PillarSection
            title="Access Management"
            borderColor="border-okta-blue"
            bgColor="bg-okta-blue"
            completedCount={useCases.mfaLogin.completed ? 1 : 0}
            totalCount={5}
            icon={
              <svg className="w-5 h-5 text-okta-dark" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"/>
              </svg>
            }
          >
            <UseCaseCard
              title="MFA Login Protection"
              description="Phishing-resistant authentication"
              businessOutcome="Prevent unauthorized access with multi-factor authentication, reducing account takeover risk by 99%"
              products={['Okta Workforce Identity', 'Adaptive MFA', 'ThreatInsight']}
              businessOutcomes={[
                { label: 'Risk ↓', text: 'Second factor confirmed identity, reducing impersonation risk.', bgClass: 'bg-green-50', textClass: 'text-okta-success' },
                { label: 'Productivity ↑', text: 'Adaptive MFA only challenges when risk detected.', bgClass: 'bg-blue-50', textClass: 'text-okta-blue' }
              ]}
              completed={useCases.mfaLogin.completed}
              data={useCases.mfaLogin.data}
            />
            <UseCaseCard
              title="Self-Service Password Reset"
              description="End users reset their own passwords without IT help desk involvement"
              completed={false}
            />
            <UseCaseCard
              title="Passwordless Authentication"
              description="WebAuthn/FIDO2 biometric login eliminating passwords entirely"
              completed={false}
            />
            <UseCaseCard
              title="Step-Up Authentication"
              description="High-risk apps require additional authentication factor mid-session"
              completed={false}
            />
            <UseCaseCard
              title="Device Trust Verification"
              description="Only managed/compliant devices can access corporate resources"
              completed={false}
            />
          </PillarSection>

          {/* Identity Governance */}
          <PillarSection
            title="Identity Governance & Administration"
            borderColor="border-okta-purple"
            bgColor="bg-okta-purple"
            completedCount={useCases.groupAssignment.completed ? 1 : 0}
            totalCount={4}
            icon={
              <svg className="w-5 h-5 text-okta-dark" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
            }
          >
            <UseCaseCard
              title="Automated Group Assignment"
              description="Automated access provisioning"
              businessOutcome="Streamline access provisioning with automated group membership, reducing manual IT overhead by 70%"
              products={['Okta Identity Governance', 'Lifecycle Management']}
              businessOutcomes={[
                { label: 'Risk ↓', text: 'Audit trail and approval workflow ensure compliance.', bgClass: 'bg-green-50', textClass: 'text-okta-success' },
                { label: 'Efficiency ↑', text: 'Automated provisioning eliminates manual tickets.', bgClass: 'bg-blue-50', textClass: 'text-okta-blue' }
              ]}
              completed={useCases.groupAssignment.completed}
              data={useCases.groupAssignment.data}
            />
            <UseCaseCard
              title="Access Certification Campaign"
              description="Managers review and certify their team's access quarterly for compliance"
              completed={false}
            />
            <UseCaseCard
              title="Automated User Onboarding"
              description="New hire gets all required app access automatically from HR sync"
              completed={false}
            />
            <UseCaseCard
              title="Automated User Offboarding"
              description="Terminated employee loses all access immediately across all systems"
              completed={false}
            />
          </PillarSection>

          {/* Privileged Access Management */}
          <PillarSection
            title="Privileged Access Management"
            borderColor="border-okta-warning"
            bgColor="bg-okta-warning"
            completedCount={0}
            totalCount={4}
            icon={
              <svg className="w-5 h-5 text-okta-dark" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
              </svg>
            }
          >
            <UseCaseCard
              title="Just-in-Time Admin Access"
              description="Temporary elevated privileges granted only when needed with approval"
              completed={false}
            />
            <UseCaseCard
              title="Privileged Session Recording"
              description="All admin sessions recorded for audit and compliance purposes"
              completed={false}
            />
            <UseCaseCard
              title="Credential Vaulting & Rotation"
              description="Service account passwords stored securely and auto-rotated"
              completed={false}
            />
            <UseCaseCard
              title="Break-Glass Emergency Access"
              description="Emergency admin access with automatic alert and audit trail"
              completed={false}
            />
          </PillarSection>

          {/* Identity Threat Detection & Response */}
          <PillarSection
            title="Identity Threat Detection & Response"
            borderColor="border-okta-red"
            bgColor="bg-okta-red"
            completedCount={0}
            totalCount={4}
            icon={
              <svg className="w-5 h-5 text-okta-dark" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
              </svg>
            }
          >
            <UseCaseCard
              title="Impossible Travel Detection"
              description="Login from New York then Tokyo 1 hour later triggers alert and blocks"
              completed={false}
            />
            <UseCaseCard
              title="Compromised Credential Detection"
              description="Password found in dark web breach triggers forced reset"
              completed={false}
            />
            <UseCaseCard
              title="Anomalous Behavior Analysis"
              description="Unusual access patterns trigger risk score increase and MFA challenge"
              completed={false}
            />
            <UseCaseCard
              title="Automated Session Termination"
              description="High-risk activity kills active sessions immediately"
              completed={false}
            />
          </PillarSection>
        </div>
      </main>
    </div>
  );
}
