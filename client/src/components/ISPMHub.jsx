export function ISPMHub({ detections = {}, onOrphanedHover, orphanedAccountRef }) {
  const detectionCards = [
    {
      id: 'partiallyOffboarded',
      title: 'Partially Offboarded User',
      description: 'User marked inactive in HR but still has active app access',
      triggersPillar: 'IGA',
      triggerColor: 'okta-purple',
      action: 'Access certification campaign',
      badge: 'badge-iga'
    },
    {
      id: 'unmanagedServiceAccount',
      title: 'Unmanaged Service Account',
      description: 'Service account with static credentials and no rotation policy',
      triggersPillar: 'PAM',
      triggerColor: 'okta-warning',
      action: 'Credential vaulting & rotation',
      badge: 'badge-pam'
    },
    {
      id: 'weakPasswordPolicy',
      title: 'Weak Password Policy',
      description: 'Applications with insufficient authentication requirements',
      triggersPillar: 'AM',
      triggerColor: 'okta-blue',
      action: 'Policy enforcement',
      badge: 'badge-am'
    },
    {
      id: 'orphanedAccount',
      title: 'Orphaned Account',
      description: 'Account with no owner or manager in the system',
      triggersPillar: 'IGA',
      triggerColor: 'okta-purple',
      action: 'Cleanup workflow',
      badge: 'badge-iga'
    }
  ];

  const detectedCount = Object.values(detections).filter(d => d.completed).length;

  return (
    <section className="mb-8">
      <div className="bg-gradient-to-br from-teal-50 to-white rounded-2xl border-2 border-okta-teal p-8 ispm-hub shadow-md">
        {/* Section Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="w-11 h-11 rounded-xl bg-okta-teal flex items-center justify-center shadow-sm">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-bold text-okta-dark tracking-tight">Identity Security Posture Management</h2>
              <p className="text-sm text-okta-medium-gray mt-0.5">Visibility hub — discovers vulnerabilities and triggers remediation</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className={`px-3 py-1.5 text-xs font-semibold rounded-full ${
              detectedCount > 0 ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-gray-100 text-okta-medium-gray'
            }`}>
              {detectedCount} of {detectionCards.length} detected
            </span>
            <span className="px-4 py-1.5 bg-teal-100 text-okta-teal text-xs font-bold rounded-full border border-teal-200">HUB</span>
          </div>
        </div>

        {/* Detection Cards Grid */}
        <div className="grid grid-cols-2 gap-4">
          {detectionCards.map((card, idx) => {
            const detection = detections[card.id] || { completed: false, data: null };
            const isDetected = detection.completed;
            const isOrphaned = card.id === 'orphanedAccount';

            // Props for orphaned account card (hover arrow feature)
            const orphanedProps = isOrphaned ? {
              ref: orphanedAccountRef,
              onMouseEnter: () => onOrphanedHover?.(true),
              onMouseLeave: () => onOrphanedHover?.(false),
            } : {};

            // PENDING STATE - Greyed out, waiting for detection
            if (!isDetected) {
              return (
                <div key={idx} className={`bg-gray-50 rounded-xl border border-gray-200 p-4 opacity-50 hover:opacity-60 transition-all ${isOrphaned ? 'cursor-pointer hover:opacity-70' : ''}`} {...orphanedProps}>
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2.5 mb-2">
                        <div className="w-4 h-4 rounded-full border-2 border-gray-300 flex items-center justify-center flex-shrink-0">
                          <span className="text-gray-400 text-xs">•</span>
                        </div>
                        <h3 className="text-sm font-semibold text-okta-medium-gray tracking-tight">{card.title}</h3>
                      </div>
                      <p className="text-xs text-gray-400 leading-relaxed">{card.description}</p>
                    </div>
                  </div>
                </div>
              );
            }

            // DETECTED STATE - Full card with alert styling
            return (
              <div key={idx} className={`bg-white rounded-xl border-2 border-red-500 p-5 card-completed shadow-md ${isOrphaned ? 'cursor-pointer' : ''}`} {...orphanedProps}>
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2.5 mb-2">
                      <div className="w-5 h-5 rounded-full bg-red-500 flex items-center justify-center flex-shrink-0 shadow-sm">
                        <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M12 9v2m0 4h.01"/>
                        </svg>
                      </div>
                      <h3 className="text-sm font-semibold text-okta-dark tracking-tight">{card.title}</h3>
                    </div>
                    <p className="text-xs text-okta-medium-gray leading-relaxed">{card.description}</p>
                  </div>
                  {/* Trigger Badge */}
                  <span className={`${card.badge} px-3 py-1 text-xs font-semibold rounded-full flex items-center gap-1.5 flex-shrink-0 ml-3`}>
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M9 5l7 7-7 7"/>
                    </svg>
                    {card.triggersPillar}
                  </span>
                </div>

                {/* Detection Data */}
                {detection.data && (
                  <div className="fade-slide-up bg-red-50 rounded-lg p-4 mb-4 text-xs border border-red-100">
                    <div className="space-y-2 text-okta-dark">
                      {detection.data.affectedUser && (
                        <div><span className="font-bold">Affected:</span> <span className="text-okta-medium-gray">{detection.data.affectedUser}</span></div>
                      )}
                      {detection.data.detectedAt && (
                        <div><span className="font-bold">Detected:</span> <span className="text-okta-medium-gray">{new Date(detection.data.detectedAt).toLocaleString()}</span></div>
                      )}
                      {detection.data.severity && (
                        <div>
                          <span className="font-bold">Severity:</span>{' '}
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                            detection.data.severity === 'HIGH' ? 'bg-red-100 text-red-700 border border-red-200' :
                            detection.data.severity === 'MEDIUM' ? 'bg-yellow-100 text-yellow-700 border border-yellow-200' :
                            'bg-blue-100 text-blue-700 border border-blue-200'
                          }`}>
                            {detection.data.severity}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div className="pt-3 border-t border-gray-100">
                  <p className="text-xs text-okta-medium-gray">
                    <span className="font-semibold text-okta-dark">Triggers:</span> {card.action}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
