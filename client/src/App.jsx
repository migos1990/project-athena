import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useWebSocket } from './hooks/useWebSocket';
import { Header } from './components/Header';
import { StatsBanner } from './components/StatsBanner';
import { Dashboard } from './components/Dashboard';
import { GenerateThreats } from './components/GenerateThreats';
import { AccessPipeline } from './components/AccessPipeline';
import './App.css';

function getWebSocketUrl() {
  if (window.location.hostname.includes('app.github.dev')) {
    const codespaceName = window.location.hostname.split('-')[0] + '-' + window.location.hostname.split('-')[1] + '-' + window.location.hostname.split('-')[2];
    return `wss://${codespaceName}-3001.app.github.dev`;
  }
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${window.location.hostname}:3001`;
}

function getApiUrl() {
  if (window.location.hostname.includes('app.github.dev')) {
    const codespaceName = window.location.hostname.split('-')[0] + '-' + window.location.hostname.split('-')[1] + '-' + window.location.hostname.split('-')[2];
    return `https://${codespaceName}-3001.app.github.dev`;
  }
  return `${window.location.protocol}//${window.location.hostname}:3001`;
}

function App() {
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
    <BrowserRouter>
      <div className="min-h-screen bg-white">
        <Header
          isConnected={isConnected}
          demoStartTime={demoStartTime}
          onStartDemo={handleStartDemo}
          onResetDemo={handleResetDemo}
        />
        <StatsBanner useCases={useCases} />
        <Routes>
          <Route path="/" element={
            <Dashboard useCases={useCases} detections={detections} />
          } />
          <Route path="/pipeline" element={<AccessPipeline useCases={useCases} />} />
          <Route path="/generate-threats" element={<GenerateThreats />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;
