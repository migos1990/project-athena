const OKTA_RISK_SCHEMA = 'https://schemas.okta.com/secevent/okta/event-type/user-risk-change';

export const PROVIDERS = {
  crowdstrike: {
    id: 'crowdstrike',
    name: 'CrowdStrike Falcon',
    defaultIssuer: 'https://falcon.crowdstrike.com',
    description: 'Endpoint detection and response platform',
    color: '#dc2626',
    events: [
      { id: 'malware-detected', label: 'Malware Detected', severity: 'high', description: 'Malware identified on user endpoint', reasonAdmin: 'Malware detected on user endpoint by CrowdStrike Falcon' },
      { id: 'suspicious-process', label: 'Suspicious Process', severity: 'medium', description: 'Suspicious process execution detected', reasonAdmin: 'Suspicious process execution detected on endpoint' },
      { id: 'ioc-match', label: 'IOC Match', severity: 'high', description: 'Indicator of compromise matched threat intelligence', reasonAdmin: 'Indicator of compromise matched known threat intelligence' },
      { id: 'credential-theft', label: 'Credential Theft Attempt', severity: 'high', description: 'Credential theft attempt detected', reasonAdmin: 'Credential theft attempt detected by CrowdStrike Falcon' },
    ],
  },
  zscaler: {
    id: 'zscaler',
    name: 'Zscaler ZIA',
    defaultIssuer: 'https://zsapi.zscaler.net',
    description: 'Cloud security and web gateway',
    color: '#2563eb',
    events: [
      { id: 'dlp-violation', label: 'DLP Policy Violation', severity: 'high', description: 'Data loss prevention policy violation detected', reasonAdmin: 'DLP policy violation: sensitive data exfiltration attempted' },
      { id: 'malware-blocked', label: 'Malware Download Blocked', severity: 'medium', description: 'Attempted malware download was blocked', reasonAdmin: 'Malware download attempt blocked by Zscaler ZIA' },
      { id: 'suspicious-cloud', label: 'Suspicious Cloud Activity', severity: 'medium', description: 'Suspicious cloud application activity detected', reasonAdmin: 'Suspicious cloud application activity detected' },
    ],
  },
  paloalto: {
    id: 'paloalto',
    name: 'Palo Alto Cortex XDR',
    defaultIssuer: 'https://api.xdr.paloaltonetworks.com',
    description: 'Extended detection and response platform',
    color: '#ea580c',
    events: [
      { id: 'c2-communication', label: 'C2 Communication Detected', severity: 'high', description: 'Command and control communication detected', reasonAdmin: 'Command and control (C2) communication detected' },
      { id: 'lateral-movement', label: 'Lateral Movement', severity: 'high', description: 'Lateral movement behavior detected', reasonAdmin: 'Lateral movement detected in network by Cortex XDR' },
      { id: 'ransomware-behavior', label: 'Ransomware Behavior', severity: 'high', description: 'Ransomware-like behavior detected', reasonAdmin: 'Ransomware behavior detected: mass file encryption attempt' },
    ],
  },
  custom: {
    id: 'custom',
    name: 'Custom',
    defaultIssuer: 'https://my-local-transmitter.com',
    description: 'Generic SSF events for testing',
    color: '#6b7280',
    events: [
      { id: 'generic-risk', label: 'Generic Risk Event', severity: 'high', description: 'Generic high-risk event for testing ITP', reasonAdmin: 'External provider reported account compromise' },
      { id: 'session-revoked', label: 'Session Revoked', severity: 'medium', description: 'User session terminated due to security concern', reasonAdmin: 'User session revoked due to security policy' },
    ],
  },
};

export const PROVIDER_LIST = Object.values(PROVIDERS);

export function buildSimulatedPayload(provider, event, config) {
  const now = Math.floor(Date.now() / 1000);
  return {
    iss: config.issuerUrl || provider.defaultIssuer,
    iat: now,
    jti: `evt_${Math.random().toString(36).slice(2, 11)}`,
    aud: `https://${config.oktaDomain || 'your-org.okta.com'}`,
    events: {
      [OKTA_RISK_SCHEMA]: {
        event_timestamp: now,
        current_level: event.severity === 'high' ? 'high' : 'medium',
        previous_level: 'low',
        initiating_entity: 'policy',
        reason_admin: { en: event.reasonAdmin },
        reason_user: { en: event.description },
        subject: {
          user: {
            format: 'email',
            email: config.subjectEmail || 'user@example.com',
          },
        },
      },
    },
  };
}

export function getSeverityColor(severity) {
  return severity === 'high' ? '#dc2626' : severity === 'medium' ? '#ea580c' : '#6b7280';
}
