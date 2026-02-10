import { useLocation, useNavigate } from 'react-router-dom';

export function Header({ isConnected, demoStartTime, onStartDemo, onResetDemo, teamView, setTeamView }) {
  const location = useLocation();
  const navigate = useNavigate();

  const isDashboard = location.pathname === '/';
  const isPipeline = location.pathname === '/pipeline';

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-40 shadow-sm">
      <div className="max-w-7xl mx-auto px-8 py-4 flex items-center justify-between">
        {/* Left: Logo + Title */}
        <div className="flex items-center gap-3">
          <img src="/okta-logo.png" alt="Okta" className="h-7" />
          <div className="h-6 w-px bg-gray-300"></div>
          <span className="text-base font-semibold text-okta-dark tracking-tight">Identity Security Fabric</span>
        </div>

        {/* Center: View Toggle */}
        <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => navigate('/')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
              isDashboard
                ? 'bg-white text-okta-dark shadow-sm'
                : 'text-okta-medium-gray hover:text-okta-dark'
            }`}
          >
            Use Case View
          </button>
          <button
            onClick={() => navigate('/pipeline')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
              isPipeline
                ? 'bg-white text-okta-dark shadow-sm'
                : 'text-okta-medium-gray hover:text-okta-dark'
            }`}
          >
            Pipeline View
          </button>
        </div>

        {/* Right: Demo controls + connection status */}
        <div className="flex items-center gap-3">
          <button
            onClick={onStartDemo}
            className="px-5 py-2.5 bg-okta-blue text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition-all shadow-md border border-okta-blue"
          >
            {demoStartTime ? 'Demo Active' : 'Start Demo'}
          </button>
          {demoStartTime && (
            <span className="text-xs text-okta-medium-gray">
              Started {new Date(demoStartTime).toLocaleTimeString()}
            </span>
          )}
          <button
            onClick={onResetDemo}
            className="px-5 py-2.5 bg-white text-okta-dark border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 transition-all"
          >
            Reset
          </button>
          <div className="h-6 w-px bg-gray-200 mx-1"></div>
          <div className="flex items-center gap-2">
            <div className={`w-2.5 h-2.5 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
            <span className="text-xs text-okta-medium-gray font-medium">{isConnected ? 'Connected' : 'Disconnected'}</span>
          </div>
        </div>
      </div>

      {/* Blue/Red Team Toggle Sub-row */}
      <div className="max-w-7xl mx-auto px-8 py-1.5 flex items-center gap-4 text-sm border-t border-gray-100">
        <button
          onClick={() => {
            setTeamView('blue');
            navigate('/');
          }}
          className={teamView === 'blue' ? 'font-semibold text-okta-blue' : 'text-okta-medium-gray hover:text-okta-dark'}
        >
          Blue Team Dashboard
        </button>
        <span className="text-gray-300">|</span>
        <button
          onClick={() => {
            setTeamView('red');
            navigate('/');
          }}
          className={teamView === 'red' ? 'font-semibold text-red-600' : 'text-okta-medium-gray hover:text-okta-dark'}
        >
          Red Team Dashboard
        </button>
      </div>
    </header>
  );
}
