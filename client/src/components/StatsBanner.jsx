export function StatsBanner({ useCases, teamView, attacks, detections }) {
  // Blue Team stats
  const completedCount = Object.values(useCases).filter(uc => uc.completed).length;
  const productsCount = (useCases.mfaLogin.completed ? 3 : 0) + (useCases.groupAssignment.completed ? 2 : 0);
  const pillarsCount = (useCases.mfaLogin.completed ? 1 : 0) + (useCases.groupAssignment.completed ? 1 : 0);

  // Red Team stats
  const attacksLaunched = attacks?.length || 0;
  const detectionsTriggered = detections ? Object.values(detections).filter(d => d.completed).length : 0;
  const attackPatternsAvailable = 5;

  if (teamView === 'red') {
    return (
      <div className="bg-black">
        <div className="max-w-7xl mx-auto px-8 py-5 flex items-center justify-between">
          <div className="flex items-center gap-10">
            <div className="flex items-center gap-3">
              <span className="text-4xl font-bold text-white tracking-tight">{attacksLaunched}</span>
              <span className="text-xs text-gray-300 leading-tight font-semibold uppercase">Attacks<br/>Launched</span>
            </div>
            <div className="w-px h-12 bg-gray-600"></div>
            <div className="flex items-center gap-3">
              <span className="text-4xl font-bold text-white tracking-tight">{detectionsTriggered}</span>
              <span className="text-xs text-gray-300 leading-tight font-semibold uppercase">Detections<br/>Triggered</span>
            </div>
            <div className="w-px h-12 bg-gray-600"></div>
            <div className="flex items-center gap-3">
              <span className="text-4xl font-bold text-white tracking-tight">{attackPatternsAvailable}</span>
              <span className="text-xs text-gray-300 leading-tight font-semibold uppercase">Attack Patterns<br/>Available</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Blue Team view (default)
  return (
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
  );
}
