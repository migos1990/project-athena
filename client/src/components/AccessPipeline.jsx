import { useState, useMemo, useEffect } from 'react';
import { PipelineDiagram } from './PipelineDiagram';

// Maps each use case to the pipeline nodes it activates
const USE_CASE_NODE_MAP = {
  mfaLogin: [
    'needAccess', 'presentLogin', 'verifyIdentity', 'mfa', 'enrichUser', 'grantAccess',
    'identityVerification', 'breachedPassword', 'devicePosture', 'deviceAssurance',
  ],
  groupAssignment: [
    'needAccess', 'presentLogin', 'verifyIdentity', 'enrichUser', 'grantAccess',
    'identityVerification',
  ],
};

// Node display metadata
const NODE_META = {
  needAccess: { title: 'Need Access', layer: 'Integrations & Workflows', description: 'User initiates an access request to a protected resource.' },
  presentLogin: { title: 'Present Login Options', layer: 'Integrations & Workflows', description: 'Login page is rendered with available authentication methods.' },
  verifyIdentity: { title: 'Verify Identity', layer: 'Integrations & Workflows', description: 'Primary credentials are validated against the identity store.' },
  mfa: { title: 'MFA', layer: 'Integrations & Workflows', description: 'Multi-factor authentication challenge is issued and verified.' },
  enrichUser: { title: 'Enrich User', layer: 'Integrations & Workflows', description: 'User profile is enriched with groups, attributes, and claims.' },
  grantAccess: { title: 'Grant Access', layer: 'Integrations & Workflows', description: 'Access is granted and a session token is issued.' },
  identityVerification: { title: 'Identity Verification', layer: 'Security Evaluations', description: 'Identity is verified against Okta Universal Directory.' },
  breachedPassword: { title: 'Breached Password Detection', layer: 'Security Evaluations', description: 'Password is checked against known breach databases.' },
  customSecurity: { title: 'Custom Security Remediations', layer: 'Security Evaluations', description: 'Custom security policies and remediations are evaluated.' },
  caep: { title: 'CAEP', layer: 'Security Evaluations', description: 'Continuous Access Evaluation Protocol monitors session risk.' },
  devicePosture: { title: 'Device Posture Checks', layer: 'Unified Security Outcomes', description: 'Device compliance and security posture is evaluated.' },
  deviceAssurance: { title: 'Device Assurance Policies', layer: 'Unified Security Outcomes', description: 'Device management status and OS version are verified.' },
  tokenHooks: { title: 'Token Inline Hooks', layer: 'Unified Security Outcomes', description: 'Token claims are customized via inline hooks before issuance.' },
};

// Generate event logs for a node based on completed use cases
function getNodeEventLogs(nodeId, useCases) {
  const logs = [];

  if (useCases.mfaLogin.completed) {
    const data = useCases.mfaLogin.data || {};
    const user = data.userEmail || data.user || 'user@company.com';
    const time = data.timestamp || data.detectedAt || new Date().toISOString();

    const mfaLogs = {
      needAccess: [
        { time, event: 'Access request initiated', detail: `User: ${user}`, severity: 'info' },
      ],
      presentLogin: [
        { time, event: 'Login page rendered', detail: 'Methods: Username/Password, SSO, WebAuthn', severity: 'info' },
      ],
      verifyIdentity: [
        { time, event: 'Primary authentication successful', detail: `Credentials verified for ${user}`, severity: 'success' },
      ],
      identityVerification: [
        { time, event: 'Directory lookup completed', detail: 'Okta Universal Directory match confirmed', severity: 'success' },
      ],
      breachedPassword: [
        { time, event: 'Breached password check passed', detail: 'Password not found in known breach databases', severity: 'success' },
      ],
      mfa: [
        { time, event: 'MFA challenge initiated', detail: 'Okta Verify push notification sent', severity: 'info' },
        { time, event: 'MFA challenge validated', detail: 'Second factor confirmed via Okta Verify', severity: 'success' },
      ],
      devicePosture: [
        { time, event: 'Device posture evaluated', detail: 'Device compliant with security policy', severity: 'success' },
      ],
      deviceAssurance: [
        { time, event: 'Device assurance check passed', detail: 'Managed device confirmed, OS up to date', severity: 'success' },
      ],
      enrichUser: [
        { time, event: 'User context enriched', detail: 'Groups, attributes, and claims populated in token', severity: 'info' },
      ],
      grantAccess: [
        { time, event: 'Access granted', detail: `Session token issued for ${user}`, severity: 'success' },
      ],
    };

    if (mfaLogs[nodeId]) logs.push(...mfaLogs[nodeId]);
  }

  if (useCases.groupAssignment.completed) {
    const data = useCases.groupAssignment.data || {};
    const user = data.userEmail || data.user || 'user@company.com';
    const group = data.groupName || data.group || 'Engineering';
    const time = data.timestamp || data.detectedAt || new Date().toISOString();

    const igaLogs = {
      needAccess: [
        { time, event: 'Provisioning request', detail: `Group assignment for ${user}`, severity: 'info' },
      ],
      presentLogin: [
        { time, event: 'Access provisioning triggered', detail: `Auto-provisioning via group: ${group}`, severity: 'info' },
      ],
      verifyIdentity: [
        { time, event: 'Identity confirmed', detail: `User ${user} verified in directory`, severity: 'success' },
      ],
      identityVerification: [
        { time, event: 'Directory sync confirmed', detail: `User matched in Okta Universal Directory`, severity: 'success' },
      ],
      enrichUser: [
        { time, event: 'Group membership updated', detail: `Added to group: ${group}`, severity: 'info' },
        { time, event: 'Entitlements recalculated', detail: 'Application access updated based on new group', severity: 'success' },
      ],
      grantAccess: [
        { time, event: 'Access provisioned', detail: `App access granted via group ${group}`, severity: 'success' },
      ],
    };

    if (igaLogs[nodeId]) logs.push(...igaLogs[nodeId]);
  }

  return logs;
}

function SeverityDot({ severity }) {
  const color = severity === 'success' ? '#00A870' : severity === 'warning' ? '#FF9900' : '#3f59e4';
  return (
    <div className="w-2 h-2 rounded-full flex-shrink-0 mt-1.5" style={{ backgroundColor: color }} />
  );
}

export function AccessPipeline({ useCases }) {
  const [selectedNode, setSelectedNode] = useState(null);
  const [showRawLog, setShowRawLog] = useState(false);

  // Reset raw log view when switching nodes
  useEffect(() => {
    setShowRawLog(false);
  }, [selectedNode]);

  const activeNodes = useMemo(() => {
    const nodes = new Set();
    for (const [useCase, state] of Object.entries(useCases)) {
      if (state.completed && USE_CASE_NODE_MAP[useCase]) {
        USE_CASE_NODE_MAP[useCase].forEach(n => nodes.add(n));
      }
    }
    return Array.from(nodes);
  }, [useCases]);

  const selectedMeta = selectedNode ? NODE_META[selectedNode] : null;
  const selectedLogs = selectedNode ? getNodeEventLogs(selectedNode, useCases) : [];
  const isNodeActive = selectedNode ? activeNodes.includes(selectedNode) : false;

  // Get raw data for the selected node (show all completed use case data)
  const getRawData = () => {
    const rawData = {};
    if (useCases.mfaLogin.completed) {
      rawData.mfaLogin = useCases.mfaLogin.data;
    }
    if (useCases.groupAssignment.completed) {
      rawData.groupAssignment = useCases.groupAssignment.data;
    }
    return Object.keys(rawData).length > 0 ? rawData : null;
  };
  const rawData = getRawData();

  return (
    <main className="max-w-7xl mx-auto px-8 py-8 bg-gray-50 min-h-[70vh]">
      {/* Page Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-sm" style={{ backgroundColor: '#3f59e4' }}>
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z"/>
            </svg>
          </div>
          <div>
            <h1 className="text-xl font-bold text-okta-dark tracking-tight">Access Pipeline</h1>
            <p className="text-sm text-okta-medium-gray">Click any node to inspect event logs</p>
          </div>
        </div>
      </div>

      {/* Pipeline Diagram + Side Panel */}
      <div className="flex gap-4">
        {/* Diagram */}
        <div className={`bg-white rounded-2xl border border-gray-200 shadow-sm p-6 transition-all duration-300 ${selectedNode ? 'flex-1' : 'w-full'}`}>
          <PipelineDiagram
            activeNodes={activeNodes}
            selectedNode={selectedNode}
            onNodeClick={setSelectedNode}
          />
        </div>

        {/* Side Panel (Event Log Drawer) */}
        {selectedNode && selectedMeta && (
          <div className="w-80 shrink-0 bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            {/* Panel Header */}
            <div className="p-4 border-b border-gray-100" style={{ backgroundColor: isNodeActive ? '#EFF6FF' : '#FAFAFA' }}>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="text-sm font-bold text-okta-dark">{selectedMeta.title}</h3>
                  <span className="text-xs text-okta-medium-gray">{selectedMeta.layer}</span>
                </div>
                <button
                  onClick={() => setSelectedNode(null)}
                  className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-gray-200 transition-colors text-okta-medium-gray"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
                  </svg>
                </button>
              </div>
              {/* Status badge */}
              <div className="mt-2">
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-full ${
                  isNodeActive
                    ? 'bg-blue-100 text-blue-700 border border-blue-200'
                    : 'bg-gray-100 text-gray-500 border border-gray-200'
                }`}>
                  <div className={`w-1.5 h-1.5 rounded-full ${isNodeActive ? 'bg-blue-500' : 'bg-gray-400'}`} />
                  {isNodeActive ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>

            {/* Description */}
            <div className="px-4 py-3 border-b border-gray-100">
              <p className="text-xs text-okta-medium-gray leading-relaxed">{selectedMeta.description}</p>
            </div>

            {/* Event Logs */}
            <div className="p-4">
              <h4 className="text-xs font-semibold text-okta-dark uppercase tracking-wider mb-3">Event Log</h4>
              {selectedLogs.length === 0 ? (
                <div className="text-xs text-gray-400 text-center py-6">
                  No events recorded yet.
                  <br />
                  <span className="text-gray-300">Start a demo to generate events.</span>
                </div>
              ) : (
                <div className="space-y-3">
                  {selectedLogs.map((log, i) => (
                    <div key={i} className="flex gap-2">
                      <SeverityDot severity={log.severity} />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-okta-dark">{log.event}</p>
                        <p className="text-xs text-okta-medium-gray mt-0.5">{log.detail}</p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {new Date(log.time).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Raw Log Toggle Button */}
              {rawData && (
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <button
                    onClick={() => setShowRawLog(!showRawLog)}
                    className="flex items-center gap-2 px-3 py-2 bg-gray-100 text-okta-dark rounded-lg text-xs font-semibold hover:bg-gray-200 transition-all w-full justify-center"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"/>
                    </svg>
                    {showRawLog ? 'Hide' : 'Show'} Raw Log
                  </button>

                  {/* Expandable Raw Log */}
                  {showRawLog && (
                    <pre className="mt-3 text-xs bg-gray-900 text-green-400 p-3 rounded border border-gray-700 overflow-auto max-h-64 font-mono">
                      {JSON.stringify(rawData, null, 2)}
                    </pre>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="mt-4 flex items-center gap-6 text-xs text-okta-medium-gray">
        <div className="flex items-center gap-2">
          <div className="w-4 h-3 rounded" style={{ backgroundColor: '#F3F4F6', border: '1px solid #D1D5DB' }}></div>
          <span>Inactive</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-3 rounded" style={{ backgroundColor: '#3f59e4' }}></div>
          <span>Active (use case demonstrated)</span>
        </div>
        <div className="flex items-center gap-2">
          <svg width="24" height="2"><line x1="0" y1="1" x2="24" y2="1" stroke="#D1D5DB" strokeWidth="1.5" strokeDasharray="3 2"/></svg>
          <span>Security evaluation</span>
        </div>
      </div>
    </main>
  );
}
