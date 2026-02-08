import { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { UseCaseCard } from './UseCaseCard';
import { ISPMHub } from './ISPMHub';
import { PillarSection } from './PillarSection';
import { ConnectionArrow } from './ConnectionArrow';

export function Dashboard({ useCases, detections }) {
  const [isArrowVisible, setIsArrowVisible] = useState(false);
  const orphanedAccountRef = useRef(null);
  const offboardingCardRef = useRef(null);

  return (
    <main className="max-w-7xl mx-auto px-8 py-8 bg-gray-50">
      {/* Connection Arrow Overlay */}
      <ConnectionArrow
        sourceRef={orphanedAccountRef}
        targetRef={offboardingCardRef}
        isVisible={isArrowVisible}
      />

      {/* ISPM Hub Section */}
      <ISPMHub
        detections={detections}
        onOrphanedHover={setIsArrowVisible}
        orphanedAccountRef={orphanedAccountRef}
      />

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
            icon="🔐"
            title="MFA Login: Phishing-Resistant Authentication"
            description="User completes step-up authentication with hardware key after risk detection"
            completed={useCases.mfaLogin.completed}
            data={useCases.mfaLogin}
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
            icon="⚙️"
            title="Group Assignment: Automated Provisioning"
            description="User automatically assigned to groups based on attributes and workflows"
            completed={useCases.groupAssignment.completed}
            data={useCases.groupAssignment}
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
          <div
            ref={offboardingCardRef}
            className={`transition-all duration-300 rounded-xl ${
              isArrowVisible
                ? 'ring-2 ring-offset-2 shadow-lg'
                : ''
            }`}
            style={isArrowVisible ? { ringColor: '#6B5CE7', boxShadow: '0 0 20px rgba(107, 92, 231, 0.3)', outline: '2px solid #6B5CE7', outlineOffset: '2px' } : {}}
          >
            <UseCaseCard
              title="Automated User Offboarding"
              description="Terminated employee loses all access immediately across all systems"
              completed={false}
            />
          </div>
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
          <Link
            to="/generate-threats"
            className="block text-center px-4 py-3 rounded-xl text-sm font-semibold mt-2 shadow-sm transition-all hover:opacity-90"
            style={{ backgroundColor: '#E54D4D', color: '#ffffff' }}
          >
            <span className="inline-flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z"/>
              </svg>
              Generate Threats
            </span>
          </Link>
        </PillarSection>
      </div>
    </main>
  );
}
