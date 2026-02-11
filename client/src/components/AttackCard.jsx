import { useState } from 'react';

export function AttackCard({ attack, onLaunch, isLaunched, launchData, showInstructions }) {
  const [isLoading, setIsLoading] = useState(false);
  const [showInstructionsModal, setShowInstructionsModal] = useState(false);

  const handleLaunch = async () => {
    setIsLoading(true);
    try {
      await onLaunch(attack.id);
    } catch (error) {
      console.error('Failed to launch attack:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });
  };

  return (
    <div
      className={`bg-white rounded-xl p-5 border-2 transition-all ${
        isLaunched
          ? 'border-red-500 shadow-lg'
          : 'border-gray-200 hover:border-gray-300 shadow-sm hover:shadow-md'
      }`}
    >
      {/* Card Header */}
      <div className="mb-3">
        <h3 className="text-sm font-bold text-okta-dark mb-1">{attack.name}</h3>
        <p className="text-xs text-okta-medium-gray leading-relaxed">{attack.description}</p>
      </div>

      {/* Blue Team Response Preview */}
      <div className="bg-blue-50 rounded-lg p-3 mb-4 border border-blue-100">
        <p className="text-xs text-okta-blue">
          <span className="font-semibold">Blue Team Response:</span> {attack.blueTeamResponse}
        </p>
      </div>

      {/* Action Button or Success State */}
      {isLaunched ? (
        <div className="bg-green-50 rounded-lg p-3 border border-green-200">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/>
            </svg>
            <span className="text-xs font-semibold text-green-700">
              Attack Launched — {launchData?.timestamp ? formatTime(launchData.timestamp) : 'Just now'}
            </span>
          </div>
        </div>
      ) : showInstructions ? (
        <button
          onClick={() => setShowInstructionsModal(true)}
          className="w-full text-center px-4 py-3 rounded-lg text-sm font-semibold shadow-sm transition-all hover:opacity-90"
          style={{ backgroundColor: attack.color, color: '#ffffff' }}
        >
          <span className="inline-flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
            </svg>
            How to Simulate
          </span>
        </button>
      ) : (
        <button
          onClick={handleLaunch}
          disabled={isLoading}
          className="w-full text-center px-4 py-3 rounded-lg text-sm font-semibold shadow-sm transition-all hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ backgroundColor: attack.color, color: '#ffffff' }}
        >
          {isLoading ? (
            <span className="inline-flex items-center gap-2">
              <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Launching...
            </span>
          ) : (
            <span className="inline-flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z"/>
              </svg>
              Launch Attack
            </span>
          )}
        </button>
      )}

      {/* Instructions Modal */}
      {showInstructionsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            {/* Modal Header */}
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-xl font-bold text-okta-dark">Cookie Theft Demo Guide</h3>
                <p className="text-sm text-okta-medium-gray mt-1">
                  Follow these steps to demonstrate ITP detection in real-time
                </p>
              </div>
              <button
                onClick={() => setShowInstructionsModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
                </svg>
              </button>
            </div>

            {/* Prerequisites Section */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <h4 className="text-sm font-bold text-okta-dark mb-2 flex items-center gap-2">
                <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
                Prerequisites
              </h4>
              <ul className="text-sm text-okta-medium-gray space-y-1 ml-6 list-disc">
                <li>VPN software installed with France (or non-US/UK) server available</li>
                <li>Test user credentials: <code className="bg-white px-2 py-0.5 rounded text-xs font-mono">clare.lu@example.com</code> / <code className="bg-white px-2 py-0.5 rounded text-xs font-mono">IamL34rning!</code></li>
                <li>Okta tenant configured with ITP and Global Session Policy</li>
              </ul>
            </div>

            {/* Step-by-Step Instructions */}
            <div className="space-y-4">
              <h4 className="text-sm font-bold text-okta-dark">Demo Steps</h4>

              {/* Step 1 */}
              <div className="flex gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-okta-blue text-white flex items-center justify-center font-bold text-sm">
                  1
                </div>
                <div className="flex-1">
                  <h5 className="text-sm font-semibold text-okta-dark mb-1">Connect VPN to US</h5>
                  <p className="text-sm text-okta-medium-gray mb-2">
                    Make sure the Blue Team dashboard is visible on a separate screen/window. <strong>Connect your VPN to a US server</strong> to establish the baseline geographic location for the session.
                  </p>
                  <div className="bg-blue-50 border border-blue-200 rounded p-2 text-xs text-blue-800 mt-2">
                    <strong>💡 Why US first?</strong> This establishes the original session location. When we switch to France, ITP will detect the geographic change.
                  </div>
                </div>
              </div>

              {/* Step 2 */}
              <div className="flex gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-okta-blue text-white flex items-center justify-center font-bold text-sm">
                  2
                </div>
                <div className="flex-1">
                  <h5 className="text-sm font-semibold text-okta-dark mb-1">Log in to Okta as test user</h5>
                  <p className="text-sm text-okta-medium-gray mb-2">
                    <strong>While connected to US VPN</strong>, navigate to your Okta tenant and sign in as:
                  </p>
                  <div className="bg-gray-50 rounded p-3 font-mono text-xs">
                    <div><strong>Email:</strong> clare.lu@example.com</div>
                    <div><strong>Password:</strong> IamL34rning!</div>
                  </div>
                  <p className="text-sm text-okta-medium-gray mt-2">
                    Complete MFA if prompted. Navigate to the Okta dashboard (you should see available apps).
                  </p>
                </div>
              </div>

              {/* Step 3 */}
              <div className="flex gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-okta-blue text-white flex items-center justify-center font-bold text-sm">
                  3
                </div>
                <div className="flex-1">
                  <h5 className="text-sm font-semibold text-okta-dark mb-1">Switch VPN to France</h5>
                  <p className="text-sm text-okta-medium-gray mb-2">
                    Without closing the browser or logging out, <strong>disconnect from US VPN and connect to a French VPN server</strong> (or any non-US, non-UK location).
                  </p>
                  <div className="bg-yellow-50 border border-yellow-200 rounded p-2 text-xs text-yellow-800 mt-2">
                    <strong>⚠️ Why France?</strong> The Global Session Policy is configured to trigger Universal Logout for users accessing from locations outside US, Brazil, or UK.
                  </div>
                </div>
              </div>

              {/* Step 4 */}
              <div className="flex gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-green-600 text-white flex items-center justify-center font-bold text-sm">
                  ✓
                </div>
                <div className="flex-1">
                  <h5 className="text-sm font-semibold text-okta-dark mb-1">Refresh browser and watch results</h5>
                  <p className="text-sm text-okta-medium-gray mb-2">
                    Once VPN is connected to France, <strong>refresh the browser</strong> or click on any app in the Okta dashboard. Within 2-5 seconds, you should see:
                  </p>
                  <ul className="text-sm text-okta-medium-gray space-y-1 ml-4 list-disc">
                    <li><strong>Blue Team Dashboard:</strong> "Session Context Change" and "Universal Logout" cards light up</li>
                    <li><strong>Okta Browser:</strong> User is immediately logged out (session terminated)</li>
                    <li><strong>Backend Logs:</strong> ITP events captured and processed</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Expected Results */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mt-4">
              <h4 className="text-sm font-bold text-okta-dark mb-2 flex items-center gap-2">
                <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
                Expected Results
              </h4>
              <ul className="text-sm text-okta-medium-gray space-y-1 ml-6 list-disc">
                <li>User session immediately terminated (logged out)</li>
                <li>ITP events captured by Project Athena backend via Event Hook</li>
                <li>Blue Team dashboard shows real-time detection with AI-generated narrative</li>
                <li>Demonstrates cookie theft/session hijacking protection in action</li>
              </ul>
            </div>

            {/* Troubleshooting */}
            <details className="mt-4">
              <summary className="text-sm font-semibold text-okta-dark cursor-pointer hover:text-okta-blue">
                Troubleshooting (click to expand)
              </summary>
              <div className="mt-2 space-y-2 text-sm text-okta-medium-gray ml-4">
                <p><strong>No logout occurred:</strong> Check that Global Session Policy is active and configured for France (or chosen VPN location).</p>
                <p><strong>Cards didn't light up:</strong> Verify Event Hook is configured with <code className="bg-gray-100 px-1 rounded text-xs">user.session.context.change</code> and <code className="bg-gray-100 px-1 rounded text-xs">policy.auth_reevaluate.fail</code> events.</p>
                <p><strong>Session already established:</strong> Log out of Okta, disconnect from all VPNs, then start from Step 1 (connect to US VPN first).</p>
                <p><strong>Wrong VPN order:</strong> Make sure you connect to <strong>US VPN first</strong>, log in, then switch to France VPN.</p>
              </div>
            </details>

            {/* Close Button */}
            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setShowInstructionsModal(false)}
                className="px-6 py-2 bg-okta-blue text-white rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
