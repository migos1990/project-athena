import { useState } from 'react';

export function AttackCard({ attack, onLaunch, isLaunched, launchData }) {
  const [isLoading, setIsLoading] = useState(false);

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
    </div>
  );
}
