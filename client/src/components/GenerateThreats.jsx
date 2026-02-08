import { Link } from 'react-router-dom';

export function GenerateThreats() {
  return (
    <main className="max-w-7xl mx-auto px-8 py-16 bg-gray-50 min-h-[60vh]">
      <div className="flex flex-col items-center justify-center text-center">
        <div className="w-16 h-16 rounded-2xl bg-okta-red flex items-center justify-center mb-6">
          <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z"/>
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-okta-dark mb-2">Generate Threats</h1>
        <p className="text-okta-medium-gray text-sm mb-8">
          Threat simulation interface — awaiting integration
        </p>
        <Link
          to="/"
          className="px-4 py-2 text-sm font-medium text-okta-blue hover:text-blue-700 transition-colors"
        >
          Back to Dashboard
        </Link>
      </div>
    </main>
  );
}
