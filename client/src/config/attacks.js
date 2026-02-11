export const ATTACK_PATTERNS = [
  {
    id: 'password-spray',
    name: 'Password Spray',
    description: 'Attempt common passwords against multiple accounts to find weak credentials.',
    severity: 'high',
    color: '#E54D4D',
    blueTeamResponse: 'Risk score elevated and additional security checks triggered',
    detectionIds: ['itpRiskElevation'],
    simulatedData: {
      affectedUser: 'john.doe@acme.com',
      severity: 'HIGH',
      details: 'Multiple failed login attempts from IP 203.0.113.42 across 15 accounts in 2 minutes - risk score elevated to HIGH'
    }
  },
  {
    id: 'partially-offboarded',
    name: 'Partially Offboarded User',
    description: 'Exploit an account removed from Okta but still with active downstream sessions.',
    severity: 'high',
    color: '#E54D4D',
    blueTeamResponse: 'User marked inactive in HR but still has active app access',
    detectionIds: ['partiallyOffboarded'],
    simulatedData: {
      affectedUser: 'jane.smith@acme.com',
      severity: 'HIGH',
      details: 'User deactivated in Okta but retains active Salesforce and AWS sessions'
    }
  },
  {
    id: 'credential-leaked',
    name: 'Credential Leaked',
    description: 'Compromised credentials used to login from unusual geographic location.',
    severity: 'high',
    color: '#E54D4D',
    blueTeamResponse: 'Impossible travel detection triggers session block and MFA challenge',
    detectionIds: ['itpImpossibleTravel'],
    simulatedData: {
      affectedUser: 'admin@acme.com',
      severity: 'HIGH',
      details: 'Login from Tokyo 30 minutes after login from New York - impossible travel detected'
    }
  },
  {
    id: 'cookie-theft',
    name: 'Cookie Theft (Session Replay)',
    description: 'Steal a session cookie and replay from a new IP to hijack an active session.',
    severity: 'high',
    color: '#E54D4D',
    blueTeamResponse: 'Account with no owner or manager in the system',
    detectionIds: ['orphanedAccount'],
    simulatedData: {
      affectedUser: 'exec@acme.com',
      severity: 'HIGH',
      details: 'Session cookie replayed from IP 198.51.100.23 (original: 10.0.1.5)'
    }
  },
  {
    id: 'ssf-transmitter',
    name: 'SSF Transmitter',
    description: 'Send Shared Signals Framework security events from external providers.',
    severity: 'medium',
    icon: '📡',
    color: '#3f59e4',
    blueTeamResponse: 'ITDR receives external threat signal and triggers response.',
    detectionIds: [],
    isSSF: true
  }
];
