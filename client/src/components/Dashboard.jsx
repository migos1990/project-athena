import { useState, useEffect } from 'react';
import { useWebSocket } from '../hooks/useWebSocket';
import { UseCaseCard } from './UseCaseCard';

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

  const [demoStartTime, setDemoStartTime] = useState(null);

  // Update use cases when WebSocket messages arrive
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
    } else if (lastMessage.type === 'INITIAL_STATE') {
      setUseCases(lastMessage.useCaseStates);
      setDemoStartTime(lastMessage.demoStartTime);
    } else if (lastMessage.type === 'DEMO_RESET' || lastMessage.type === 'DEMO_STARTED') {
      setUseCases(lastMessage.useCaseStates);
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
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="text-sm font-semibold text-gray-900">Identity Security Fabric</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleStartDemo}
              className="px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800"
            >
              {demoStartTime ? 'Demo Active' : 'Start Demo'}
            </button>
            {demoStartTime && (
              <span className="text-xs text-gray-500">
                Started {new Date(demoStartTime).toLocaleTimeString()}
              </span>
            )}
            <button
              onClick={handleResetDemo}
              className="px-4 py-2 bg-white text-gray-900 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50"
            >
              Reset
            </button>
            <div className="h-6 w-px bg-gray-200 mx-1"></div>
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
              <span className="text-xs text-gray-600">{isConnected ? 'Connected' : 'Disconnected'}</span>
            </div>
          </div>
        </div>
      </header>

      {/* Stats Banner */}
      <div className="bg-gray-900">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold text-white">{completedCount}</span>
              <span className="text-xs text-gray-400 leading-tight">use cases<br/>demonstrated</span>
            </div>
            <div className="w-px h-8 bg-gray-600"></div>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold text-white">{productsCount}</span>
              <span className="text-xs text-gray-400 leading-tight">Okta products<br/>in action</span>
            </div>
            <div className="w-px h-8 bg-gray-600"></div>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold text-white">{pillarsCount}</span>
              <span className="text-xs text-gray-400 leading-tight">security pillars<br/>covered</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-6">
        <div className="grid grid-cols-2 gap-5">
          {/* Access Management */}
          <UseCaseCard
            title="MFA Login Protection"
            pillarColor="border-blue-600"
            businessOutcome="Prevent unauthorized access with multi-factor authentication, reducing account takeover risk by 99%"
            products={['Okta Workforce Identity', 'Adaptive MFA', 'ThreatInsight']}
            completed={useCases.mfaLogin.completed}
            data={useCases.mfaLogin.data}
          />

          {/* Identity Governance */}
          <UseCaseCard
            title="Automated Group Assignment"
            pillarColor="border-purple-600"
            businessOutcome="Streamline access provisioning with automated group membership, reducing manual IT overhead by 70%"
            products={['Okta Identity Governance', 'Lifecycle Management']}
            completed={useCases.groupAssignment.completed}
            data={useCases.groupAssignment.data}
          />

          {/* Privileged Access - Placeholder */}
          <div className="bg-white rounded-xl p-5 border-l-4 border-orange-500 opacity-60">
            <h3 className="text-sm font-bold text-gray-900 mb-1">Privileged Access Management</h3>
            <p className="text-xs text-gray-600 mb-3">Secure admin accounts and privileged sessions</p>
            <div className="text-xs text-gray-400 italic">Sample use cases: Just-in-time admin access, Session recording, Privileged credential vaulting</div>
          </div>

          {/* Security Posture - Placeholder */}
          <div className="bg-white rounded-xl p-5 border-l-4 border-teal-600 opacity-60">
            <h3 className="text-sm font-bold text-gray-900 mb-1">Identity Security Posture</h3>
            <p className="text-xs text-gray-600 mb-3">Continuous identity threat detection and response</p>
            <div className="text-xs text-gray-400 italic">Sample use cases: Identity threat detection, Risk-based access policies, Compliance monitoring</div>
          </div>
        </div>
      </main>
    </div>
  );
}
