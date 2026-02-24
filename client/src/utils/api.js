/**
 * Resolves the backend API base URL for the current environment.
 * Handles local dev (port 3001) and GitHub Codespaces forwarded ports.
 */
export function getApiUrl() {
  if (window.location.hostname.includes('app.github.dev')) {
    const parts = window.location.hostname.split('-');
    const codespaceName = `${parts[0]}-${parts[1]}-${parts[2]}`;
    return `https://${codespaceName}-3001.app.github.dev`;
  }
  return `${window.location.protocol}//${window.location.hostname}:3001`;
}
